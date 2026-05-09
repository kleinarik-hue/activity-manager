/**
 * ============================================================
 * api.js — Backend API Service Layer
 * ============================================================
 * All calls to Google Apps Script backend go through here.
 * This keeps backend communication separate from UI logic.
 * ============================================================
 */

const API = (() => {

  // ─── Core fetch wrapper ──────────────────────────────────
  async function request(action, params = {}, method = "POST") {
    const session = Auth.getSession();

    const body = {
      action,
      sessionToken: session?.token || null,
      ...params,
    };

    try {
      const opts = {
        method,
        headers: { "Content-Type": "text/plain" }, // avoid CORS preflight
        body: JSON.stringify(body),
        redirect: "follow",
      };

      const res = await fetch(CONFIG.APPS_SCRIPT_URL, opts);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      return data;

    } catch (err) {
      console.error(`API error [${action}]:`, err);
      throw err;
    }
  }

  // ─── Auth ────────────────────────────────────────────────
  const auth = {
    login: (username, password) =>
      request("login", { username, password }),
    logout: () =>
      request("logout"),
  };

  // ─── Users ───────────────────────────────────────────────
  const users = {
    list:   ()           => request("getUsers"),
    create: (data)       => request("createUser", { data }),
    update: (id, data)   => request("updateUser", { id, data }),
    delete: (id)         => request("deleteUser", { id }),
  };

  // ─── Teams ───────────────────────────────────────────────
  const teams = {
    list:   ()         => request("getTeams"),
    create: (data)     => request("createTeam", { data }),
    update: (id, data) => request("updateTeam", { id, data }),
    delete: (id)       => request("deleteTeam", { id }),
  };

  // ─── Customers ───────────────────────────────────────────
  const customers = {
    list:   ()         => request("getCustomers"),
    get:    (id)       => request("getCustomer", { id }),
    create: (data)     => request("createCustomer", { data }),
    update: (id, data) => request("updateCustomer", { id, data }),
    delete: (id)       => request("deleteCustomer", { id }),
  };

  // ─── Orders ──────────────────────────────────────────────
  const orders = {
    list:   (filters)  => request("getOrders", { filters }),
    get:    (id)       => request("getOrder", { id }),
    create: (data)     => request("createOrder", { data }),
    update: (id, data) => request("updateOrder", { id, data }),
    delete: (id)       => request("deleteOrder", { id }),
  };

  // ─── Dashboard ───────────────────────────────────────────
  const dashboard = {
    summary: ()       => request("getDashboardSummary"),
    upcoming:()       => request("getUpcomingActivities"),
    unpaid:  ()       => request("getUnpaidOrders"),
  };

  // ─── Audit Log ───────────────────────────────────────────
  const audit = {
    list: (limit) => request("getAuditLog", { limit }),
  };

  // ─── Geocoding (client-side via Google Maps) ─────────────
  const geocode = {
    /**
     * Converts an address string to {lat, lng}.
     * Uses the browser-side Geocoder (Maps JS API).
     * No extra API calls to the backend needed.
     */
    fromAddress: (address) => {
      return new Promise((resolve, reject) => {
        if (!window.google?.maps) return reject(new Error("Maps not loaded"));
        const gc = new google.maps.Geocoder();
        gc.geocode({ address, region: "IL" }, (results, status) => {
          if (status === "OK" && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            reject(new Error("Geocoding failed: " + status));
          }
        });
      });
    },
  };

  return { auth, users, teams, customers, orders, dashboard, audit, geocode };
})();

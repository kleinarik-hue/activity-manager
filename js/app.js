/**
 * ============================================================
 * app.js — Main Application Entry Point & Router
 * ============================================================
 * Controls page routing, renders app shell, handles navigation.
 * ============================================================
 */

const App = (() => {

  const ROUTES = {
    dashboard: { label: "דשבורד",     icon: "📊", module: Dashboard },
    orders:    { label: "הזמנות",     icon: "📋", module: Orders    },
    calendar:  { label: "לוח שנה",   icon: "📅", module: Calendar  },
    map:       { label: "מפה",        icon: "🗺️", module: MapView   },
    customers: { label: "לקוחות",    icon: "🏢", module: Customers  },
    admin:     { label: "ניהול",      icon: "⚙️", module: Admin,  adminOnly: true },
  };

  let currentRoute = null;

  // ─── Boot ────────────────────────────────────────────────
  function boot() {
    if (!Auth.isLoggedIn()) {
      renderLoginPage();
    } else {
      renderAppShell();
      navigate("dashboard");
    }
  }

  // ─── Login Page ──────────────────────────────────────────
  function renderLoginPage() {
    document.body.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">📅</div>
          <h1>${CONFIG.APP_NAME}</h1>
          <p class="subtitle">${CONFIG.APP_SUBTITLE}</p>
          <form id="loginForm" novalidate>
            <div class="mb-3">
              <label class="form-label">שם משתמש</label>
              <input type="text" name="username" id="loginUsername" class="form-control form-control-lg"
                     required placeholder="הכנס שם משתמש" autocomplete="username">
              <div class="invalid-feedback">נא להזין שם משתמש</div>
            </div>
            <div class="mb-4">
              <label class="form-label">סיסמה</label>
              <input type="password" name="password" id="loginPassword" class="form-control form-control-lg"
                     required placeholder="הכנס סיסמה" autocomplete="current-password">
              <div class="invalid-feedback">נא להזין סיסמה</div>
            </div>
            <div id="loginError" class="alert alert-danger" style="display:none;"></div>
            <button type="submit" class="btn btn-primary-custom btn-lg w-100">
              🔐 כניסה למערכת
            </button>
          </form>
          <p class="text-center text-muted mt-3 fs-xs">
            ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}
          </p>
        </div>
      </div>`;

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!UI.validateForm(form)) return;
      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value;
      const errEl    = document.getElementById("loginError");
      errEl.style.display = "none";

      try {
        await Auth.login(username, password);
        renderAppShell();
        navigate("dashboard");
      } catch (err) {
        errEl.textContent = "שם משתמש או סיסמה שגויים";
        errEl.style.display = "";
      }
    });

    // Allow Enter key
    document.getElementById("loginPassword").addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("loginForm").requestSubmit();
    });
  }

  // ─── App Shell ───────────────────────────────────────────
  function renderAppShell() {
    const user = Auth.currentUser();

    document.body.innerHTML = `
      <!-- Sidebar Overlay -->
      <div id="sidebarOverlay" class="sidebar-overlay" onclick="UI.closeSidebar()"></div>

      <!-- Sidebar -->
      <nav id="sidebar" class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">📅</div>
          <div>
            <div class="brand-name">${CONFIG.APP_NAME}</div>
            <div class="brand-sub">${CONFIG.APP_SUBTITLE}</div>
          </div>
        </div>

        <div class="sidebar-nav">
          <div class="nav-section-title">ניווט ראשי</div>
          ${buildSidebarNav()}
        </div>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${UI.initials(user?.name || "U")}</div>
            <div class="user-info">
              <div class="user-name">${escHtml(user?.name || "")}</div>
              <div class="user-role">${user?.role === "admin" ? "מנהל מערכת" : "משתמש"}</div>
            </div>
            <button class="btn btn-sm btn-outline-secondary ms-auto" onclick="Auth.logout()" title="התנתק">↩</button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="main-content">
        <header class="top-header">
          <button class="header-menu-btn" onclick="UI.toggleSidebar()">☰</button>
          <h1 class="page-title" id="pageTitle">דשבורד</h1>
          <div class="header-actions">
            <button class="btn btn-sm btn-primary-custom desktop-only"
                    onclick="Orders.openOrderModal(null)">+ הזמנה חדשה</button>
          </div>
        </header>

        <main class="content-area" id="contentArea">
          <!-- Page content rendered here -->
        </main>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="mobile-nav">
        <div class="mobile-nav-items" id="mobileNavItems">
          ${buildMobileNav()}
        </div>
      </nav>

      <!-- FAB for new order on mobile -->
      <button class="btn btn-fab btn-primary-custom" onclick="Orders.openOrderModal(null)" title="הזמנה חדשה">+</button>`;
  }

  function buildSidebarNav() {
    return Object.entries(ROUTES)
      .filter(([, r]) => !r.adminOnly || Auth.isAdmin())
      .map(([key, r]) => `
        <button class="nav-item" id="nav_${key}" onclick="App.navigate('${key}')">
          <span class="nav-icon">${r.icon}</span>
          <span>${r.label}</span>
        </button>`).join("");
  }

  function buildMobileNav() {
    const mobileRoutes = ["dashboard","orders","calendar","customers"];
    return mobileRoutes.map(key => {
      const r = ROUTES[key];
      return `
        <button class="mobile-nav-item" id="mnav_${key}" onclick="App.navigate('${key}')">
          <span class="nav-icon">${r.icon}</span>
          <span class="nav-label">${r.label}</span>
        </button>`;
    }).join("");
  }

  // ─── Router ──────────────────────────────────────────────
  async function navigate(route) {
    if (!Auth.requireAuth()) return;
    if (!ROUTES[route]) return;

    // Admin guard
    if (ROUTES[route].adminOnly && !Auth.isAdmin()) {
      UI.toast("גישה מוגבלת למנהלים בלבד", "error");
      return;
    }

    currentRoute = route;
    UI.closeSidebar();
    UI.scrollTop();

    // Update active states
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById(`nav_${route}`)?.classList.add("active");

    document.querySelectorAll(".mobile-nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById(`mnav_${route}`)?.classList.add("active");

    // Update page title
    document.getElementById("pageTitle").textContent = ROUTES[route].label;
    document.title = `${ROUTES[route].label} — ${CONFIG.APP_NAME}`;

    // Render module
    const contentArea = document.getElementById("contentArea");
    contentArea.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="spinner-lg"></div></div>`;

    try {
      await ROUTES[route].module.render(contentArea);
    } catch (err) {
      console.error(`Error rendering ${route}:`, err);
      contentArea.innerHTML = `
        <div class="alert alert-danger">
          <h5>שגיאה בטעינת הדף</h5>
          <p class="mb-0">${err.message || "אנא נסה שוב"}</p>
        </div>`;
    }
  }

  // ─── Public: show login ───────────────────────────────────
  function showLoginPage() { renderLoginPage(); }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  return { boot, navigate, showLoginPage };
})();

// ─── Bootstrap the app on DOM ready ──────────────────────────
document.addEventListener("DOMContentLoaded", () => App.boot());

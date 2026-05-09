/**
 * ============================================================
 * ui.js — Shared UI Helpers
 * ============================================================
 * Toast notifications, loading overlays, confirm dialogs,
 * formatting helpers, and reusable render utilities.
 * ============================================================
 */

const UI = (() => {

  // ─── Loading overlay ─────────────────────────────────────
  let loadingEl = null;

  function showLoading(msg = "טוען...") {
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.className = "loading-overlay";
      loadingEl.innerHTML = `<div class="spinner-lg"></div><div style="font-weight:600;color:#374151;">${msg}</div>`;
      document.body.appendChild(loadingEl);
    }
    loadingEl.querySelector("div + div").textContent = msg;
    loadingEl.style.display = "flex";
  }

  function hideLoading() {
    if (loadingEl) loadingEl.style.display = "none";
  }

  // ─── Toast notifications ─────────────────────────────────
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container-custom";
      document.body.appendChild(toastContainer);
    }
  }

  function toast(msg, type = "info", duration = 3500) {
    ensureToastContainer();
    const icons = { success: "✓", error: "✕", info: "ℹ" };
    const el = document.createElement("div");
    el.className = `toast-custom ${type}`;
    el.innerHTML = `<span style="font-size:1rem;">${icons[type] || icons.info}</span><span>${msg}</span>`;
    toastContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, duration);
  }

  // ─── Confirm dialog ──────────────────────────────────────
  function confirm(message, title = "אישור פעולה") {
    return new Promise((resolve) => {
      const id = "confirmModal_" + Date.now();
      const html = `
        <div class="modal fade" id="${id}" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">⚠️ ${title}</h5>
                <button class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">${message}</div>
              <div class="modal-footer">
                <button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">ביטול</button>
                <button class="btn btn-danger btn-sm" id="${id}_confirm">אישור</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML("beforeend", html);
      const modal = new bootstrap.Modal(document.getElementById(id));
      document.getElementById(`${id}_confirm`).onclick = () => { modal.hide(); resolve(true); };
      document.getElementById(id).addEventListener("hidden.bs.modal", () => {
        document.getElementById(id)?.remove();
        resolve(false);
      }, { once: true });
      modal.show();
    });
  }

  // ─── Formatters ──────────────────────────────────────────
  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString(CONFIG.DATE_LOCALE);
    } catch { return isoStr; }
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString(CONFIG.DATE_LOCALE);
    } catch { return isoStr; }
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === "") return "—";
    const n = parseFloat(amount);
    if (isNaN(n)) return "—";
    return n.toLocaleString(CONFIG.CURRENCY_LOCALE, {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    });
  }

  function formatMonthYear(val) {
    if (!val) return "—";
    // Expect "YYYY-MM"
    const [y, m] = val.split("-");
    if (!y || !m) return val;
    const d = new Date(+y, +m - 1, 1);
    return d.toLocaleDateString(CONFIG.DATE_LOCALE, { year: "numeric", month: "long" });
  }

  // ─── Payment status badge ─────────────────────────────────
  function paymentBadge(status) {
    const map = {
      paid:    { cls: "badge-paid",    label: "שולם"    },
      unpaid:  { cls: "badge-unpaid",  label: "לא שולם" },
      partial: { cls: "badge-overdue", label: "חלקי"    },
    };
    const s = map[status] || map.unpaid;
    return `<span class="chip ${s.cls}">${s.label}</span>`;
  }

  // ─── Initials from name ───────────────────────────────────
  function initials(name = "") {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  // ─── Input validation helper ─────────────────────────────
  function validateForm(formEl) {
    formEl.classList.add("was-validated");
    return formEl.checkValidity();
  }

  function resetFormValidation(formEl) {
    formEl.classList.remove("was-validated");
    formEl.reset();
  }

  // ─── Collect form data into object ───────────────────────
  function formToObject(formEl) {
    const fd = new FormData(formEl);
    const obj = {};
    fd.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  // ─── Empty state HTML ────────────────────────────────────
  function emptyState(icon, title, desc, action = "") {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h5>${title}</h5>
        <p>${desc}</p>
        ${action}
      </div>`;
  }

  // ─── Skeleton loader rows ─────────────────────────────────
  function skeletonRows(cols = 5, rows = 5) {
    const cells = Array(cols).fill('<td><div class="skeleton" style="height:18px;width:80%;border-radius:4px;"></div></td>').join("");
    return Array(rows).fill(`<tr>${cells}</tr>`).join("");
  }

  // ─── Show/hide sidebar on mobile ─────────────────────────
  function toggleSidebar() {
    const sidebar  = document.getElementById("sidebar");
    const overlay  = document.getElementById("sidebarOverlay");
    const isOpen   = sidebar.classList.contains("open");
    sidebar.classList.toggle("open", !isOpen);
    overlay.classList.toggle("active", !isOpen);
  }

  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("active");
  }

  // ─── Scroll back to top of content ───────────────────────
  function scrollTop() {
    document.querySelector(".content-area")?.scrollTo(0, 0);
  }

  return {
    showLoading, hideLoading,
    toast, confirm,
    formatDate, formatDateTime, formatCurrency, formatMonthYear,
    paymentBadge, initials,
    validateForm, resetFormValidation, formToObject,
    emptyState, skeletonRows,
    toggleSidebar, closeSidebar, scrollTop,
  };
})();

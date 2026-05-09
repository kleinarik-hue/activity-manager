/**
 * ============================================================
 * dashboard.js — Operational Dashboard Module
 * ============================================================
 */

const Dashboard = (() => {

  async function render(container) {
    container.innerHTML = `
      <!-- Stat Cards Row -->
      <div class="row g-3 mb-4" id="statCards">
        ${statCardSkeleton()}
      </div>

      <!-- Upcoming & Unpaid -->
      <div class="row g-3 mb-4">
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header">
              <h6 class="card-header-title">📅 פעילויות קרובות</h6>
              <button class="btn btn-sm btn-outline-secondary" onclick="App.navigate('orders')">הכל</button>
            </div>
            <div class="card-body p-0" id="upcomingList"><div class="p-3">${skeletonList()}</div></div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header">
              <h6 class="card-header-title">💸 חיובים פתוחים</h6>
              <button class="btn btn-sm btn-outline-secondary" onclick="App.navigate('orders')">הכל</button>
            </div>
            <div class="card-body p-0" id="unpaidList"><div class="p-3">${skeletonList()}</div></div>
          </div>
        </div>
      </div>

      <!-- Audit Log -->
      <div class="card" id="auditCard" ${Auth.isAdmin() ? "" : "style='display:none'"}>
        <div class="card-header">
          <h6 class="card-header-title">📋 יומן פעילות אחרון</h6>
        </div>
        <div class="card-body" id="auditLogList">${skeletonList(4)}</div>
      </div>`;

    // Load data in parallel
    try {
      const [summary, upcoming, unpaid] = await Promise.all([
        API.dashboard.summary(),
        API.dashboard.upcoming(),
        API.dashboard.unpaid(),
      ]);
      renderStatCards(summary);
      renderUpcoming(upcoming.data || []);
      renderUnpaid(unpaid.data || []);
    } catch (err) {
      UI.toast("שגיאה בטעינת הדשבורד", "error");
      console.error(err);
    }

    // Audit log (admin only)
    if (Auth.isAdmin()) {
      try {
        const log = await API.audit.list(10);
        renderAuditLog(log.data || []);
      } catch {}
    }
  }

  function renderStatCards(s = {}) {
    const cards = [
      {
        icon: "📅", color: "#dbeafe", iconColor: "#1d4ed8",
        value: s.upcomingCount ?? "—",
        label: "פעילויות השבוע",
        change: "",
      },
      {
        icon: "💰", color: "#d1fae5", iconColor: "#065f46",
        value: UI.formatCurrency(s.monthRevenue),
        label: "הכנסות החודש",
        change: "",
      },
      {
        icon: "⚠️", color: "#fee2e2", iconColor: "#991b1b",
        value: s.unpaidCount ?? "—",
        label: "הזמנות לא שולמו",
        change: "",
      },
      {
        icon: "👥", color: "#fef3c7", iconColor: "#92400e",
        value: s.customerCount ?? "—",
        label: "לקוחות פעילים",
        change: "",
      },
    ];

    document.getElementById("statCards").innerHTML = cards.map(c => `
      <div class="col-6 col-xl-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:${c.color};color:${c.iconColor};">${c.icon}</div>
          <div class="stat-value">${c.value}</div>
          <div class="stat-label">${c.label}</div>
          ${c.change ? `<div class="stat-change text-success">${c.change}</div>` : ""}
        </div>
      </div>`).join("");
  }

  function renderUpcoming(items) {
    const el = document.getElementById("upcomingList");
    if (!items.length) {
      el.innerHTML = UI.emptyState("📅", "אין פעילויות קרובות", "לא נמצאו פעילויות לשבוע הקרוב");
      return;
    }
    el.innerHTML = `<ul class="list-group list-group-flush">
      ${items.map(o => `
        <li class="list-group-item list-group-item-action" style="cursor:pointer"
            onclick="Orders.openOrderModal(${JSON.stringify(o).replace(/"/g,"'")})">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-600 fs-sm">${escHtml(o.customerName || "—")}</div>
              <div class="text-muted fs-xs">${escHtml(o.description || "")} · ${UI.formatDate(o.activityDate)}</div>
            </div>
            ${UI.paymentBadge(o.paymentStatus)}
          </div>
        </li>`).join("")}
    </ul>`;
  }

  function renderUnpaid(items) {
    const el = document.getElementById("unpaidList");
    if (!items.length) {
      el.innerHTML = UI.emptyState("✅", "אין חיובים פתוחים", "כל ההזמנות שולמו");
      return;
    }
    el.innerHTML = `<ul class="list-group list-group-flush">
      ${items.map(o => `
        <li class="list-group-item list-group-item-action" style="cursor:pointer"
            onclick="Orders.openOrderModal(${JSON.stringify(o).replace(/"/g,"'")})">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-600 fs-sm">${escHtml(o.customerName || "—")}</div>
              <div class="text-muted fs-xs">${UI.formatCurrency(o.activityCost)} · ${UI.formatDate(o.activityDate)}</div>
            </div>
            <div class="text-danger fw-600 fs-sm">${UI.formatCurrency(o.activityCost)}</div>
          </div>
        </li>`).join("")}
    </ul>`;
  }

  function renderAuditLog(entries) {
    const el = document.getElementById("auditLogList");
    if (!entries.length) {
      el.innerHTML = "<p class='text-muted fs-sm mb-0'>אין רשומות</p>";
      return;
    }
    el.innerHTML = entries.map(e => `
      <div class="log-entry">
        <div class="log-dot"></div>
        <div class="flex-1">
          <span class="fw-600">${escHtml(e.userName || "—")}</span>
          <span class="text-muted"> — ${escHtml(e.action || "")}</span>
          <span class="text-muted"> · ${escHtml(e.entityType || "")}</span>
        </div>
        <div class="log-time">${UI.formatDateTime(e.timestamp)}</div>
      </div>`).join("");
  }

  // ─── Skeleton helpers ─────────────────────────────────────
  function statCardSkeleton() {
    return Array(4).fill(`
      <div class="col-6 col-xl-3">
        <div class="stat-card">
          <div class="skeleton mb-2" style="width:46px;height:46px;border-radius:10px;"></div>
          <div class="skeleton mb-1" style="width:70%;height:28px;border-radius:6px;"></div>
          <div class="skeleton" style="width:50%;height:14px;border-radius:4px;"></div>
        </div>
      </div>`).join("");
  }

  function skeletonList(n = 4) {
    return Array(n).fill(`
      <div class="d-flex gap-2 mb-3">
        <div class="skeleton" style="width:60%;height:16px;border-radius:4px;"></div>
        <div class="skeleton ms-auto" style="width:20%;height:16px;border-radius:4px;"></div>
      </div>`).join("");
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  return { render };
})();

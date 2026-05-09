/**
 * ============================================================
 * orders.js — Activity Orders Module
 * ============================================================
 * List, create, edit, delete activity orders.
 * ============================================================
 */

const Orders = (() => {

  let allOrders  = [];
  let customers  = [];
  let teams      = [];
  let currentPage = 1;
  let activeFilters = {};

  // ─── Main render ─────────────────────────────────────────
  async function render(container) {
    container.innerHTML = `
      <!-- Filters -->
      <div class="filters-bar">
        <div>
          <label class="form-label mb-1">חיפוש</label>
          <input type="text" id="orderSearch" class="form-control" placeholder="שם לקוח, תיאור..." style="width:180px;">
        </div>
        <div>
          <label class="form-label mb-1">סטטוס תשלום</label>
          <select id="filterStatus" class="form-select" style="width:140px;">
            <option value="">הכל</option>
            <option value="paid">שולם</option>
            <option value="unpaid">לא שולם</option>
            <option value="partial">חלקי</option>
          </select>
        </div>
        <div>
          <label class="form-label mb-1">צוות</label>
          <select id="filterTeam" class="form-select" style="width:140px;">
            <option value="">הכל</option>
          </select>
        </div>
        <div>
          <label class="form-label mb-1">לקוח</label>
          <select id="filterCustomer" class="form-select" style="width:160px;">
            <option value="">הכל</option>
          </select>
        </div>
        <div>
          <label class="form-label mb-1">חודש</label>
          <input type="month" id="filterMonth" class="form-control" style="width:150px;">
        </div>
        <button class="btn btn-outline-secondary align-self-end" onclick="Orders.resetFilters()">נקה</button>
        <button class="btn btn-primary-custom align-self-end desktop-only"
                onclick="Orders.openOrderModal(null)">+ הזמנה חדשה</button>
      </div>

      <!-- Table / Cards -->
      <div class="card">
        <div class="card-header">
          <h6 class="card-header-title" id="ordersCount">הזמנות</h6>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-primary-custom" onclick="Orders.openOrderModal(null)">+ חדשה</button>
          </div>
        </div>

        <!-- Desktop table -->
        <div class="table-responsive desktop-only">
          <table class="data-table">
            <thead>
              <tr>
                <th>לקוח</th>
                <th>תיאור פעילות</th>
                <th>תאריך</th>
                <th>עלות</th>
                <th>מס' הצעה</th>
                <th>מס' הזמנה</th>
                <th>תשלום</th>
                <th>צוות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody">
              ${UI.skeletonRows(9, 6)}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="p-2 mobile-only" id="ordersMobileList">
          ${mobileSkeletonCards(4)}
        </div>

        <!-- Pagination -->
        <div class="card-body py-2 border-top d-flex justify-content-between align-items-center" id="ordersPagination">
          <span class="text-muted fs-sm" id="paginationInfo"></span>
          <div class="d-flex gap-1" id="paginationButtons"></div>
        </div>
      </div>`;

    // Load supporting data
    try {
      [customers, teams] = await Promise.all([
        API.customers.list().then(r => r.data || []),
        API.teams.list().then(r => r.data || []),
      ]);
      populateFilterSelects();
    } catch (err) { console.error(err); }

    // Attach filter handlers
    ["orderSearch","filterStatus","filterTeam","filterCustomer","filterMonth"].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener("change", applyFilters);
      if (id === "orderSearch") el?.addEventListener("input", debounce(applyFilters, 350));
    });

    await loadOrders();
  }

  function populateFilterSelects() {
    const teamSel = document.getElementById("filterTeam");
    const custSel = document.getElementById("filterCustomer");
    teams.forEach(t => {
      const o = new Option(t.name, t.id);
      teamSel?.add(o);
    });
    customers.forEach(c => {
      const o = new Option(c.name, c.id);
      custSel?.add(o);
    });
  }

  async function loadOrders() {
    try {
      const filters = buildFilters();
      const result  = await API.orders.list(filters);
      allOrders = result.data || [];
      currentPage = 1;
      renderOrdersPage();
    } catch (err) {
      UI.toast("שגיאה בטעינת הזמנות", "error");
      console.error(err);
    }
  }

  function buildFilters() {
    return {
      search:   document.getElementById("orderSearch")?.value.trim()    || "",
      status:   document.getElementById("filterStatus")?.value          || "",
      teamId:   document.getElementById("filterTeam")?.value            || "",
      customerId: document.getElementById("filterCustomer")?.value      || "",
      month:    document.getElementById("filterMonth")?.value           || "",
      // Non-admin users can only see their own team
      ...(Auth.isAdmin() ? {} : { teamId: Auth.currentTeamId() }),
    };
  }

  function applyFilters() {
    currentPage = 1;
    loadOrders();
  }

  function resetFilters() {
    ["orderSearch","filterStatus","filterTeam","filterCustomer","filterMonth"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    loadOrders();
  }

  function renderOrdersPage() {
    const pageSize  = CONFIG.PAGE_SIZE;
    const total     = allOrders.length;
    const totalPages= Math.ceil(total / pageSize) || 1;
    currentPage     = Math.min(currentPage, totalPages);
    const start     = (currentPage - 1) * pageSize;
    const pageItems = allOrders.slice(start, start + pageSize);

    document.getElementById("ordersCount").textContent = `הזמנות (${total})`;

    // Desktop table
    const tbody = document.getElementById("ordersTableBody");
    if (tbody) {
      if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="9">${UI.emptyState("📋","אין הזמנות","לא נמצאו הזמנות מתאימות",
          '<button class="btn btn-sm btn-primary-custom" onclick="Orders.openOrderModal(null)">+ הזמנה חדשה</button>')}</td></tr>`;
      } else {
        tbody.innerHTML = pageItems.map(o => orderTableRow(o)).join("");
      }
    }

    // Mobile cards
    const mobileEl = document.getElementById("ordersMobileList");
    if (mobileEl) {
      if (!pageItems.length) {
        mobileEl.innerHTML = UI.emptyState("📋","אין הזמנות","לא נמצאו הזמנות מתאימות");
      } else {
        mobileEl.innerHTML = pageItems.map(o => orderMobileCard(o)).join("");
      }
    }

    // Pagination info
    document.getElementById("paginationInfo").textContent = total ? `${start+1}–${Math.min(start+pageSize,total)} מתוך ${total}` : "";
    renderPagination(totalPages);
  }

  function orderTableRow(o) {
    const cust = customers.find(c => c.id === o.customerId);
    const team = teams.find(t => t.id === o.teamId);
    return `
      <tr>
        <td class="fw-600">${escHtml(cust?.name || o.customerName || "—")}</td>
        <td class="text-truncate-2" style="max-width:200px;">${escHtml(o.description || "—")}</td>
        <td class="mono">${UI.formatDate(o.activityDate)}</td>
        <td class="mono">${UI.formatCurrency(o.activityCost)}</td>
        <td class="mono fs-sm">${escHtml(o.pqNumber || "—")}</td>
        <td class="mono fs-sm">${escHtml(o.soNumber || "—")}</td>
        <td>${UI.paymentBadge(o.paymentStatus)}</td>
        <td class="fs-sm">${escHtml(team?.name || "—")}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-icon btn-outline-primary btn-sm" title="עריכה"
                    onclick='Orders.openOrderModal(${safeJSON(o)})'>✏️</button>
            ${Auth.isAdmin() ? `
            <button class="btn btn-icon btn-outline-danger btn-sm" title="מחיקה"
                    onclick='Orders.deleteOrder("${o.id}")'>🗑️</button>` : ""}
          </div>
        </td>
      </tr>`;
  }

  function orderMobileCard(o) {
    const cust = customers.find(c => c.id === o.customerId);
    return `
      <div class="order-card-mobile" onclick='Orders.openOrderModal(${safeJSON(o)})'>
        <div class="order-top">
          <div>
            <div class="order-customer">${escHtml(cust?.name || o.customerName || "—")}</div>
            <div class="order-date">${UI.formatDate(o.activityDate)}</div>
          </div>
          ${UI.paymentBadge(o.paymentStatus)}
        </div>
        <div class="order-desc">${escHtml(o.description || "—")}</div>
        <div class="order-meta">
          <span class="order-meta-item">💰 ${UI.formatCurrency(o.activityCost)}</span>
          ${o.pqNumber ? `<span class="order-meta-item">PQ ${escHtml(o.pqNumber)}</span>` : ""}
          ${o.soNumber ? `<span class="order-meta-item">SO ${escHtml(o.soNumber)}</span>` : ""}
          ${o.participantsCount ? `<span class="order-meta-item">👥 ${o.participantsCount}</span>` : ""}
        </div>
      </div>`;
  }

  function renderPagination(totalPages) {
    const btnContainer = document.getElementById("paginationButtons");
    if (!btnContainer || totalPages <= 1) { if(btnContainer) btnContainer.innerHTML=""; return; }
    let html = "";
    for (let i = 1; i <= Math.min(totalPages, 7); i++) {
      html += `<button class="btn btn-sm ${i===currentPage?"btn-primary-custom":"btn-outline-secondary"}"
                       onclick="Orders.goToPage(${i})">${i}</button>`;
    }
    if (totalPages > 7) html += `<span class="btn btn-sm disabled">...</span>
      <button class="btn btn-sm btn-outline-secondary" onclick="Orders.goToPage(${totalPages})">${totalPages}</button>`;
    btnContainer.innerHTML = html;
  }

  function goToPage(n) { currentPage = n; renderOrdersPage(); UI.scrollTop(); }

  // ─── Order Modal (Create / Edit) ─────────────────────────
  async function openOrderModal(order = null) {
    const isEdit = !!order?.id;
    const modalId = "orderModal";

    // Load teams and customers if not yet loaded
    if (!customers.length || !teams.length) {
      try {
        [customers, teams] = await Promise.all([
          API.customers.list().then(r => r.data || []),
          API.teams.list().then(r => r.data || []),
        ]);
      } catch {}
    }

    const custOptions = customers.map(c =>
      `<option value="${c.id}" ${order?.customerId===c.id?"selected":""}>${escHtml(c.name)}</option>`).join("");
    const teamOptions = teams.map(t =>
      `<option value="${t.id}" ${order?.teamId===t.id?"selected":""}>${escHtml(t.name)}</option>`).join("");

    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${isEdit ? "✏️ עריכת הזמנה" : "➕ הזמנה חדשה"}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="orderForm" novalidate>
                <input type="hidden" name="id" value="${order?.id||""}">

                <div class="form-section-title">פרטים כלליים</div>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">לקוח *</label>
                    <select name="customerId" class="form-select" required>
                      <option value="">בחר לקוח...</option>
                      ${custOptions}
                    </select>
                    <div class="invalid-feedback">יש לבחור לקוח</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">צוות *</label>
                    <select name="teamId" class="form-select" required>
                      <option value="">בחר צוות...</option>
                      ${teamOptions}
                    </select>
                    <div class="invalid-feedback">יש לבחור צוות</div>
                  </div>
                  <div class="col-12">
                    <label class="form-label">תיאור פעילות *</label>
                    <textarea name="description" class="form-control" rows="2" required
                              placeholder="תיאור קצר של הפעילות...">${escHtml(order?.description||"")}</textarea>
                    <div class="invalid-feedback">נא להזין תיאור</div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">תאריך פעילות *</label>
                    <input type="date" name="activityDate" class="form-control" required
                           value="${order?.activityDate||""}">
                    <div class="invalid-feedback">נא להזין תאריך</div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">שעת התחלה</label>
                    <input type="time" name="startTime" class="form-control" value="${order?.startTime||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">שעת סיום</label>
                    <input type="time" name="endTime" class="form-control" value="${order?.endTime||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">מספר משתתפים</label>
                    <input type="number" name="participantsCount" class="form-control" min="0"
                           value="${order?.participantsCount||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">עלות פעילות (₪)</label>
                    <input type="number" name="activityCost" class="form-control" min="0" step="0.01"
                           value="${order?.activityCost||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">איש קשר תפעולי</label>
                    <input type="text" name="operationalStaff" class="form-control"
                           value="${escHtml(order?.operationalStaff||"")}">
                  </div>
                </div>

                <div class="form-section-title">פרטים עסקיים</div>
                <div class="row g-3">
                  <div class="col-md-3">
                    <label class="form-label">מספר PQ (הצעת מחיר)</label>
                    <input type="text" name="pqNumber" class="form-control mono"
                           value="${escHtml(order?.pqNumber||"")}">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">מספר SO (הזמנה)</label>
                    <input type="text" name="soNumber" class="form-control mono"
                           value="${escHtml(order?.soNumber||"")}">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">מספר PI (חשבונית)</label>
                    <input type="text" name="piNumber" class="form-control mono"
                           value="${escHtml(order?.piNumber||"")}">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">מספר קבלה OV</label>
                    <input type="text" name="ovNumber" class="form-control mono"
                           value="${escHtml(order?.ovNumber||"")}">
                  </div>
                </div>

                <div class="form-section-title">פרטי תשלום</div>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label">סטטוס תשלום</label>
                    <select name="paymentStatus" class="form-select">
                      <option value="unpaid" ${(order?.paymentStatus||"unpaid")==="unpaid"?"selected":""}>לא שולם</option>
                      <option value="paid"   ${order?.paymentStatus==="paid"?"selected":""}>שולם</option>
                      <option value="partial"${order?.paymentStatus==="partial"?"selected":""}>חלקי</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">חודש תשלום צפוי</label>
                    <input type="month" name="expectedPaymentMonth" class="form-control"
                           value="${order?.expectedPaymentMonth||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">תאריך תשלום צפוי</label>
                    <input type="date" name="expectedPaymentDate" class="form-control"
                           value="${order?.expectedPaymentDate||""}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">תאריך תשלום בפועל</label>
                    <input type="date" name="actualPaymentDate" class="form-control"
                           value="${order?.actualPaymentDate||""}">
                  </div>
                </div>

                <div class="form-section-title">הערות</div>
                <div class="row g-3">
                  <div class="col-12">
                    <textarea name="notes" class="form-control" rows="3"
                              placeholder="הערות חופשיות...">${escHtml(order?.notes||"")}</textarea>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ביטול</button>
              <button class="btn btn-primary-custom" onclick="Orders.saveOrder('${modalId}')">
                ${isEdit ? "💾 שמור שינויים" : "✅ צור הזמנה"}
              </button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById(modalId)?.remove();
    document.body.insertAdjacentHTML("beforeend", html);
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    document.getElementById(modalId).addEventListener("hidden.bs.modal", () =>
      document.getElementById(modalId)?.remove(), { once: true });
    modal.show();
  }

  async function saveOrder(modalId) {
    const form = document.getElementById("orderForm");
    if (!UI.validateForm(form)) return;

    const data = UI.formToObject(form);
    const isEdit = !!data.id;

    UI.showLoading(isEdit ? "שומר שינויים..." : "יוצר הזמנה...");
    try {
      if (isEdit) {
        await API.orders.update(data.id, data);
        UI.toast("ההזמנה עודכנה בהצלחה", "success");
      } else {
        await API.orders.create(data);
        UI.toast("ההזמנה נוצרה בהצלחה", "success");
      }
      bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
      await loadOrders();
    } catch (err) {
      UI.toast("שגיאה בשמירה: " + (err.message || ""), "error");
    } finally {
      UI.hideLoading();
    }
  }

  async function deleteOrder(id) {
    const ok = await UI.confirm("האם למחוק הזמנה זו לצמיתות? פעולה זו אינה ניתנת לביטול.", "מחיקת הזמנה");
    if (!ok) return;
    UI.showLoading("מוחק...");
    try {
      await API.orders.delete(id);
      UI.toast("ההזמנה נמחקה", "success");
      await loadOrders();
    } catch (err) {
      UI.toast("שגיאה במחיקה", "error");
    } finally {
      UI.hideLoading();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────
  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function safeJSON(obj) {
    return JSON.stringify(obj).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function mobileSkeletonCards(n) {
    return Array(n).fill(`
      <div class="order-card-mobile">
        <div class="skeleton mb-2" style="height:18px;width:60%;"></div>
        <div class="skeleton mb-2" style="height:14px;width:80%;"></div>
        <div class="skeleton" style="height:14px;width:40%;"></div>
      </div>`).join("");
  }

  return { render, openOrderModal, saveOrder, deleteOrder, goToPage, resetFilters };
})();

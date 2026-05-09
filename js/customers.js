/**
 * ============================================================
 * customers.js — Customer Management Module
 * ============================================================
 */

const Customers = (() => {

  let allCustomers = [];

  async function render(container) {
    container.innerHTML = `
      <div class="filters-bar">
        <input type="text" id="custSearch" class="form-control" placeholder="חיפוש לקוח..." style="width:220px;">
        <button class="btn btn-primary-custom align-self-end" onclick="Customers.openModal(null)">+ לקוח חדש</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h6 class="card-header-title" id="custCount">לקוחות</h6>
        </div>
        <div class="table-responsive desktop-only">
          <table class="data-table">
            <thead>
              <tr>
                <th>שם לקוח</th>
                <th>גוף משלם</th>
                <th>כתובת</th>
                <th>איש קשר</th>
                <th>טלפון</th>
                <th>קואורדינטות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody id="custTableBody">${UI.skeletonRows(7,5)}</tbody>
          </table>
        </div>
        <div class="p-2 mobile-only" id="custMobileList">${mobileSkeletons(4)}</div>
      </div>`;

    document.getElementById("custSearch")?.addEventListener("input", debounce(filterAndRender, 300));
    await loadCustomers();
  }

  async function loadCustomers() {
    try {
      const result = await API.customers.list();
      allCustomers = result.data || [];
      filterAndRender();
    } catch (err) {
      UI.toast("שגיאה בטעינת לקוחות", "error");
    }
  }

  function filterAndRender() {
    const q = (document.getElementById("custSearch")?.value || "").toLowerCase();
    const filtered = q
      ? allCustomers.filter(c =>
          (c.name||"").toLowerCase().includes(q) ||
          (c.contactPerson||"").toLowerCase().includes(q) ||
          (c.address||"").toLowerCase().includes(q))
      : allCustomers;

    document.getElementById("custCount").textContent = `לקוחות (${filtered.length})`;

    const tbody = document.getElementById("custTableBody");
    if (tbody) {
      tbody.innerHTML = filtered.length
        ? filtered.map(c => tableRow(c)).join("")
        : `<tr><td colspan="7">${UI.emptyState("🏢","אין לקוחות","לחץ על '+ לקוח חדש' להוספה")}</td></tr>`;
    }

    const mobileEl = document.getElementById("custMobileList");
    if (mobileEl) {
      mobileEl.innerHTML = filtered.length
        ? filtered.map(c => mobileCard(c)).join("")
        : UI.emptyState("🏢","אין לקוחות","לחץ על '+ לקוח חדש' להוספה");
    }
  }

  function tableRow(c) {
    const coordStr = (c.lat && c.lng) ? `${(+c.lat).toFixed(4)}, ${(+c.lng).toFixed(4)}` : "—";
    return `
      <tr>
        <td class="fw-700">${escHtml(c.name)}</td>
        <td>${escHtml(c.payingEntity||"—")}</td>
        <td class="fs-sm">${escHtml(c.address||"—")}</td>
        <td>${escHtml(c.contactPerson||"—")}</td>
        <td class="mono fs-sm">${escHtml(c.phone||"—")}</td>
        <td class="mono fs-xs text-muted">${coordStr}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-icon btn-outline-primary btn-sm"
                    onclick='Customers.openModal(${safeJSON(c)})'>✏️</button>
            ${Auth.isAdmin() ? `
            <button class="btn btn-icon btn-outline-danger btn-sm"
                    onclick='Customers.deleteCustomer("${c.id}")'>🗑️</button>` : ""}
          </div>
        </td>
      </tr>`;
  }

  function mobileCard(c) {
    return `
      <div class="order-card-mobile" onclick='Customers.openModal(${safeJSON(c)})'>
        <div class="order-top">
          <div class="order-customer">${escHtml(c.name)}</div>
          ${c.phone ? `<a href="tel:${escHtml(c.phone)}" class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation()">📞</a>` : ""}
        </div>
        <div class="fs-sm mb-1">${escHtml(c.payingEntity||"")}</div>
        <div class="order-meta">
          ${c.contactPerson?`<span class="order-meta-item">👤 ${escHtml(c.contactPerson)}</span>`:""}
          ${c.address?`<span class="order-meta-item">📍 ${escHtml(c.address)}</span>`:""}
        </div>
      </div>`;
  }

  // ─── Modal ───────────────────────────────────────────────
  async function openModal(customer = null) {
    const isEdit = !!customer?.id;
    const modalId = "custModal";

    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${isEdit ? "✏️ עריכת לקוח" : "➕ לקוח חדש"}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="custForm" novalidate>
                <input type="hidden" name="id" value="${customer?.id||""}">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">שם לקוח *</label>
                    <input type="text" name="name" class="form-control" required
                           value="${escHtml(customer?.name||"")}">
                    <div class="invalid-feedback">נא להזין שם לקוח</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">גוף משלם</label>
                    <input type="text" name="payingEntity" class="form-control"
                           value="${escHtml(customer?.payingEntity||"")}">
                  </div>
                  <div class="col-12">
                    <label class="form-label">כתובת</label>
                    <div class="input-group">
                      <input type="text" name="address" id="custAddressInput" class="form-control"
                             placeholder="הזן כתובת לגיאוקודינג אוטומטי"
                             value="${escHtml(customer?.address||"")}">
                      <button type="button" class="btn btn-outline-secondary" onclick="Customers.geocodeAddress()">
                        📍 מצא
                      </button>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">קו רוחב (Latitude)</label>
                    <input type="number" name="lat" id="custLat" class="form-control mono" step="any"
                           value="${customer?.lat||""}">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">קו אורך (Longitude)</label>
                    <input type="number" name="lng" id="custLng" class="form-control mono" step="any"
                           value="${customer?.lng||""}">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">איש קשר</label>
                    <input type="text" name="contactPerson" class="form-control"
                           value="${escHtml(customer?.contactPerson||"")}">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">מספר טלפון</label>
                    <input type="tel" name="phone" class="form-control mono"
                           value="${escHtml(customer?.phone||"")}">
                  </div>
                  <div class="col-12">
                    <label class="form-label">הערות</label>
                    <textarea name="notes" class="form-control" rows="2"
                              placeholder="הערות נוספות...">${escHtml(customer?.notes||"")}</textarea>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ביטול</button>
              <button class="btn btn-primary-custom" onclick="Customers.saveCustomer('${modalId}')">
                ${isEdit ? "💾 שמור" : "✅ צור לקוח"}
              </button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById(modalId)?.remove();
    document.body.insertAdjacentHTML("beforeend", html);
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    document.getElementById(modalId).addEventListener("hidden.bs.modal",
      () => document.getElementById(modalId)?.remove(), { once: true });
    modal.show();
  }

  async function geocodeAddress() {
    const addr = document.getElementById("custAddressInput")?.value?.trim();
    if (!addr) { UI.toast("נא להזין כתובת", "info"); return; }
    if (!CONFIG.ENABLE_GEOCODING) { UI.toast("גיאוקודינג לא מופעל", "info"); return; }
    UI.showLoading("מחפש כתובת...");
    try {
      const coords = await API.geocode.fromAddress(addr);
      document.getElementById("custLat").value = coords.lat.toFixed(6);
      document.getElementById("custLng").value = coords.lng.toFixed(6);
      UI.toast("קואורדינטות נמצאו!", "success");
    } catch (err) {
      UI.toast("לא ניתן למצוא כתובת זו", "error");
    } finally {
      UI.hideLoading();
    }
  }

  async function saveCustomer(modalId) {
    const form = document.getElementById("custForm");
    if (!UI.validateForm(form)) return;
    const data = UI.formToObject(form);
    const isEdit = !!data.id;
    UI.showLoading(isEdit ? "שומר..." : "יוצר לקוח...");
    try {
      if (isEdit) {
        await API.customers.update(data.id, data);
        UI.toast("הלקוח עודכן", "success");
      } else {
        await API.customers.create(data);
        UI.toast("הלקוח נוצר", "success");
      }
      bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
      await loadCustomers();
    } catch (err) {
      UI.toast("שגיאה: " + (err.message||""), "error");
    } finally {
      UI.hideLoading();
    }
  }

  async function deleteCustomer(id) {
    const ok = await UI.confirm("האם למחוק לקוח זה? כל ההזמנות הקשורות אליו עדיין יישמרו.", "מחיקת לקוח");
    if (!ok) return;
    UI.showLoading("מוחק...");
    try {
      await API.customers.delete(id);
      UI.toast("הלקוח נמחק", "success");
      await loadCustomers();
    } catch (err) {
      UI.toast("שגיאה במחיקה", "error");
    } finally { UI.hideLoading(); }
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function safeJSON(obj) {
    return JSON.stringify(obj).replace(/'/g,"&#39;").replace(/"/g,"&quot;");
  }
  function debounce(fn, delay) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),delay); }; }
  function mobileSkeletons(n) {
    return Array(n).fill(`<div class="order-card-mobile"><div class="skeleton mb-2" style="height:18px;width:60%;"></div><div class="skeleton" style="height:14px;width:40%;"></div></div>`).join("");
  }

  return { render, openModal, geocodeAddress, saveCustomer, deleteCustomer };
})();

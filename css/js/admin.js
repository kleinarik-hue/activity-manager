/**
 * ============================================================
 * admin.js — Admin Panel: Users & Teams Management
 * ============================================================
 */

const Admin = (() => {

  let users = [];
  let teams = [];
  let activeTab = "users";

  async function render(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `<div class="alert alert-danger">⛔ גישה לאזור זה מוגבלת למנהלים בלבד.</div>`;
      return;
    }

    container.innerHTML = `
      <ul class="nav nav-tabs mb-4" id="adminTabs">
        <li class="nav-item">
          <button class="nav-link ${activeTab==="users"?"active":""}" onclick="Admin.switchTab('users')">👤 משתמשים</button>
        </li>
        <li class="nav-item">
          <button class="nav-link ${activeTab==="teams"?"active":""}" onclick="Admin.switchTab('teams')">👥 צוותים</button>
        </li>
      </ul>
      <div id="adminContent"></div>`;

    await switchTab(activeTab);
  }

  async function switchTab(tab) {
    activeTab = tab;
    // Update active tab visually
    document.querySelectorAll("#adminTabs .nav-link").forEach(el => {
      el.classList.toggle("active", el.textContent.includes(tab==="users"?"משתמשים":"צוותים"));
    });

    const content = document.getElementById("adminContent");
    if (!content) return;

    if (tab === "users") await renderUsers(content);
    else await renderTeams(content);
  }

  // ─── Users ───────────────────────────────────────────────
  async function renderUsers(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="card-header-title">משתמשים (${users.length})</h6>
          <button class="btn btn-sm btn-primary-custom" onclick="Admin.openUserModal(null)">+ משתמש חדש</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>שם משתמש</th>
                <th>תפקיד</th>
                <th>צוות</th>
                <th>נוצר</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">${UI.skeletonRows(6,4)}</tbody>
          </table>
        </div>
      </div>`;

    try {
      [users, teams] = await Promise.all([
        API.users.list().then(r => r.data || []),
        API.teams.list().then(r => r.data || []),
      ]);
      renderUsersTable();
    } catch (err) {
      UI.toast("שגיאה בטעינת משתמשים", "error");
    }
  }

  function renderUsersTable() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6">${UI.emptyState("👤","אין משתמשים","")}</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => {
      const team = teams.find(t => t.id === u.teamId);
      const roleLabel = u.role === "admin" ? "🔑 מנהל" : "👤 משתמש";
      return `
        <tr>
          <td class="fw-600">${escHtml(u.name)}</td>
          <td class="mono fs-sm">${escHtml(u.username)}</td>
          <td>${roleLabel}</td>
          <td>${escHtml(team?.name || "—")}</td>
          <td class="fs-sm text-muted">${UI.formatDate(u.createdAt)}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-icon btn-outline-primary btn-sm"
                      onclick='Admin.openUserModal(${safeJSON(u)})'>✏️</button>
              <button class="btn btn-icon btn-outline-danger btn-sm"
                      onclick='Admin.deleteUser("${u.id}")'>🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  async function openUserModal(user = null) {
    if (!teams.length) {
      try { teams = await API.teams.list().then(r => r.data || []); } catch {}
    }
    const isEdit = !!user?.id;
    const modalId = "userModal";

    const teamOptions = teams.map(t =>
      `<option value="${t.id}" ${user?.teamId===t.id?"selected":""}>${escHtml(t.name)}</option>`
    ).join("");

    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${isEdit?"✏️ עריכת משתמש":"➕ משתמש חדש"}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="userForm" novalidate>
                <input type="hidden" name="id" value="${user?.id||""}">
                <div class="mb-3">
                  <label class="form-label">שם מלא *</label>
                  <input type="text" name="name" class="form-control" required value="${escHtml(user?.name||"")}">
                  <div class="invalid-feedback">נא להזין שם</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">שם משתמש *</label>
                  <input type="text" name="username" class="form-control" required value="${escHtml(user?.username||"")}">
                  <div class="invalid-feedback">נא להזין שם משתמש</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">${isEdit?"סיסמה חדשה (השאר ריק לשמור הנוכחית)":"סיסמה *"}</label>
                  <input type="password" name="password" class="form-control" ${isEdit?"":"required"}
                         autocomplete="new-password">
                  <div class="invalid-feedback">נא להזין סיסמה</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">תפקיד</label>
                  <select name="role" class="form-select">
                    <option value="user"  ${(user?.role||"user")==="user"?"selected":""}>משתמש רגיל</option>
                    <option value="admin" ${user?.role==="admin"?"selected":""}>מנהל</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">צוות</label>
                  <select name="teamId" class="form-select">
                    <option value="">ללא צוות</option>
                    ${teamOptions}
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ביטול</button>
              <button class="btn btn-primary-custom" onclick="Admin.saveUser('${modalId}')">
                ${isEdit?"💾 שמור":"✅ צור משתמש"}
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

  async function saveUser(modalId) {
    const form = document.getElementById("userForm");
    if (!UI.validateForm(form)) return;
    const data = UI.formToObject(form);
    const isEdit = !!data.id;
    UI.showLoading("שומר...");
    try {
      if (isEdit) { await API.users.update(data.id, data); UI.toast("המשתמש עודכן","success"); }
      else         { await API.users.create(data);          UI.toast("המשתמש נוצר","success"); }
      bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
      users = await API.users.list().then(r => r.data || []);
      renderUsersTable();
    } catch (err) {
      UI.toast("שגיאה: " + (err.message||""), "error");
    } finally { UI.hideLoading(); }
  }

  async function deleteUser(id) {
    const ok = await UI.confirm("האם למחוק משתמש זה?", "מחיקת משתמש");
    if (!ok) return;
    UI.showLoading("מוחק...");
    try {
      await API.users.delete(id);
      UI.toast("המשתמש נמחק","success");
      users = await API.users.list().then(r => r.data || []);
      renderUsersTable();
    } catch (err) {
      UI.toast("שגיאה במחיקה","error");
    } finally { UI.hideLoading(); }
  }

  // ─── Teams ───────────────────────────────────────────────
  async function renderTeams(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="card-header-title">צוותים</h6>
          <button class="btn btn-sm btn-primary-custom" onclick="Admin.openTeamModal(null)">+ צוות חדש</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>שם צוות</th><th>תיאור</th><th>נוצר</th><th>פעולות</th></tr>
            </thead>
            <tbody id="teamsTableBody">${UI.skeletonRows(4,3)}</tbody>
          </table>
        </div>
      </div>`;

    try {
      teams = await API.teams.list().then(r => r.data || []);
      renderTeamsTable();
    } catch (err) { UI.toast("שגיאה בטעינת צוותים","error"); }
  }

  function renderTeamsTable() {
    const tbody = document.getElementById("teamsTableBody");
    if (!tbody) return;
    tbody.innerHTML = teams.length
      ? teams.map(t => `
          <tr>
            <td class="fw-600">${escHtml(t.name)}</td>
            <td class="fs-sm">${escHtml(t.description||"—")}</td>
            <td class="fs-sm text-muted">${UI.formatDate(t.createdAt)}</td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-icon btn-outline-primary btn-sm" onclick='Admin.openTeamModal(${safeJSON(t)})'>✏️</button>
                <button class="btn btn-icon btn-outline-danger btn-sm"  onclick='Admin.deleteTeam("${t.id}")'>🗑️</button>
              </div>
            </td>
          </tr>`).join("")
      : `<tr><td colspan="4">${UI.emptyState("👥","אין צוותים","")}</td></tr>`;
  }

  async function openTeamModal(team = null) {
    const isEdit = !!team?.id;
    const modalId = "teamModal";
    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${isEdit?"✏️ עריכת צוות":"➕ צוות חדש"}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="teamForm" novalidate>
                <input type="hidden" name="id" value="${team?.id||""}">
                <div class="mb-3">
                  <label class="form-label">שם הצוות *</label>
                  <input type="text" name="name" class="form-control" required value="${escHtml(team?.name||"")}">
                  <div class="invalid-feedback">נא להזין שם צוות</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">תיאור</label>
                  <textarea name="description" class="form-control" rows="2">${escHtml(team?.description||"")}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ביטול</button>
              <button class="btn btn-primary-custom" onclick="Admin.saveTeam('${modalId}')">
                ${isEdit?"💾 שמור":"✅ צור צוות"}
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

  async function saveTeam(modalId) {
    const form = document.getElementById("teamForm");
    if (!UI.validateForm(form)) return;
    const data = UI.formToObject(form);
    const isEdit = !!data.id;
    UI.showLoading("שומר...");
    try {
      if (isEdit) { await API.teams.update(data.id, data); UI.toast("הצוות עודכן","success"); }
      else         { await API.teams.create(data);          UI.toast("הצוות נוצר","success"); }
      bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
      teams = await API.teams.list().then(r => r.data || []);
      renderTeamsTable();
    } catch (err) {
      UI.toast("שגיאה","error");
    } finally { UI.hideLoading(); }
  }

  async function deleteTeam(id) {
    const ok = await UI.confirm("האם למחוק צוות זה? משתמשים המשויכים לצוות זה לא יושפעו.", "מחיקת צוות");
    if (!ok) return;
    UI.showLoading("מוחק...");
    try {
      await API.teams.delete(id);
      UI.toast("הצוות נמחק","success");
      teams = await API.teams.list().then(r => r.data || []);
      renderTeamsTable();
    } catch (err) { UI.toast("שגיאה","error"); } finally { UI.hideLoading(); }
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function safeJSON(obj) {
    return JSON.stringify(obj).replace(/'/g,"&#39;").replace(/"/g,"&quot;");
  }

  return { render, switchTab, openUserModal, saveUser, deleteUser, openTeamModal, saveTeam, deleteTeam };
})();

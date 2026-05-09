/**
 * ============================================================
 * auth.js — Authentication & Session Management
 * ============================================================
 */

const Auth = (() => {

  const SESSION_KEY = CONFIG.SESSION_KEY;

  // ─── Get current session from sessionStorage ─────────────
  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ─── Save session ─────────────────────────────────────────
  function saveSession(sessionData) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }

  // ─── Clear session ────────────────────────────────────────
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ─── Check if logged in ───────────────────────────────────
  function isLoggedIn() {
    const s = getSession();
    return !!(s && s.token && s.user);
  }

  // ─── Check if admin ───────────────────────────────────────
  function isAdmin() {
    const s = getSession();
    return s?.user?.role === "admin";
  }

  // ─── Get current user ─────────────────────────────────────
  function currentUser() {
    return getSession()?.user || null;
  }

  // ─── Get current user's team ──────────────────────────────
  function currentTeamId() {
    return getSession()?.user?.teamId || null;
  }

  // ─── Login flow ───────────────────────────────────────────
  async function login(username, password) {
    UI.showLoading("מתחבר...");
    try {
      const result = await API.auth.login(username, password);
      saveSession({ token: result.token, user: result.user });
      UI.hideLoading();
      return result.user;
    } catch (err) {
      UI.hideLoading();
      throw err;
    }
  }

  // ─── Logout flow ──────────────────────────────────────────
  async function logout() {
    try { await API.auth.logout(); } catch {}
    clearSession();
    App.showLoginPage();
  }

  // ─── Guard: redirect if not logged in ─────────────────────
  function requireAuth() {
    if (!isLoggedIn()) {
      App.showLoginPage();
      return false;
    }
    return true;
  }

  return {
    getSession, saveSession, clearSession,
    isLoggedIn, isAdmin, currentUser, currentTeamId,
    login, logout, requireAuth,
  };
})();

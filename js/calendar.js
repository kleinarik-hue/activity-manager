/**
 * ============================================================
 * calendar.js — Calendar View Module
 * ============================================================
 */

const Calendar = (() => {

  let currentDate = new Date();
  let allOrders   = [];
  let viewMode    = "month"; // "month" | "week"

  const DAYS_HE = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                     "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

  async function render(container) {
    container.innerHTML = `
      <div class="card mb-3">
        <div class="card-header d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="Calendar.prevPeriod()">›</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="Calendar.nextPeriod()">‹</button>
          <h6 class="card-header-title mb-0 flex-1" id="calTitle"></h6>
          <button class="btn btn-sm btn-outline-secondary" onclick="Calendar.goToday()">היום</button>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary ${viewMode==="month"?"active":""}" onclick="Calendar.setView('month')">חודש</button>
            <button class="btn btn-outline-secondary ${viewMode==="week"?"active":""}"  onclick="Calendar.setView('week')">שבוע</button>
          </div>
        </div>
        <div class="card-body p-2">
          <!-- Day headers -->
          <div class="calendar-grid" id="calDayHeaders"></div>
          <!-- Calendar grid -->
          <div class="calendar-grid" id="calGrid"></div>
        </div>
      </div>

      <!-- Day detail panel -->
      <div class="card" id="dayDetailPanel" style="display:none;">
        <div class="card-header">
          <h6 class="card-header-title" id="dayDetailTitle"></h6>
          <button class="btn btn-sm btn-primary-custom" onclick="Orders.openOrderModal(null)">+ הזמנה</button>
        </div>
        <div class="card-body" id="dayDetailContent"></div>
      </div>`;

    UI.showLoading("טוען לוח שנה...");
    try {
      const result = await API.orders.list({});
      allOrders = result.data || [];
    } catch (err) {
      UI.toast("שגיאה בטעינת הזמנות", "error");
    } finally {
      UI.hideLoading();
    }

    renderCalendar();
  }

  function renderCalendar() {
    if (viewMode === "month") renderMonth();
    else renderWeek();
  }

  function renderMonth() {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    document.getElementById("calTitle").textContent = `${MONTHS_HE[m]} ${y}`;

    // Day headers (Sun–Sat in Hebrew)
    document.getElementById("calDayHeaders").innerHTML =
      DAYS_HE.map(d => `<div class="calendar-day-header">${d}</div>`).join("");

    const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const daysInPrev  = new Date(y, m, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    let cells = "";

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      cells += dayCell(new Date(y, m-1, day), true, today);
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells += dayCell(new Date(y, m, d), false, today);
    }

    // Next month padding to fill grid (always 6 rows = 42 cells)
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    let nextDay = 1;
    while ((firstDay + daysInMonth + nextDay - 1) < totalCells) {
      cells += dayCell(new Date(y, m+1, nextDay++), true, today);
    }

    document.getElementById("calGrid").innerHTML = cells;
  }

  function dayCell(date, isOtherMonth, today) {
    const dateStr = toISODate(date);
    const dayOrders = ordersForDate(dateStr);
    const isToday = date.getTime() === today.getTime();

    const events = dayOrders.slice(0, 3).map(o =>
      `<div class="cal-event" title="${escHtml(o.description||"")}">${escHtml(o.customerName||o.description||"פעילות")}</div>`
    ).join("");

    const dotsMobile = dayOrders.length
      ? `<div style="display:flex;gap:2px;flex-wrap:wrap;margin-top:2px;">
          ${dayOrders.slice(0,3).map(o => {
            const col = o.paymentStatus==="paid"?"#10b981":o.paymentStatus==="partial"?"#f59e0b":"#ef4444";
            return `<span style="width:6px;height:6px;border-radius:50%;background:${col};display:inline-block;"></span>`;
          }).join("")}
         </div>`
      : "";

    return `
      <div class="calendar-day ${isOtherMonth?"other-month":""} ${isToday?"today":""}"
           onclick="Calendar.selectDay('${dateStr}')">
        <span class="calendar-day-num">${date.getDate()}</span>
        <div class="desktop-only">${events}</div>
        <div class="mobile-only">${dotsMobile}</div>
        ${dayOrders.length>3?`<div class="cal-event" style="background:#f1f5f9;color:#64748b;">+${dayOrders.length-3} עוד</div>`:""}
      </div>`;
  }

  function renderWeek() {
    const weekStart = getWeekStart(currentDate);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
    document.getElementById("calTitle").textContent =
      `${UI.formatDate(weekStart)} – ${UI.formatDate(weekEnd)}`;

    document.getElementById("calDayHeaders").innerHTML =
      DAYS_HE.map(d => `<div class="calendar-day-header">${d}</div>`).join("");

    const today = new Date(); today.setHours(0,0,0,0);
    let cells = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      cells += dayCell(d, false, today);
    }
    document.getElementById("calGrid").innerHTML = cells;
  }

  function selectDay(dateStr) {
    const dayOrders = ordersForDate(dateStr);
    const panel = document.getElementById("dayDetailPanel");
    const titleEl = document.getElementById("dayDetailTitle");
    const contentEl = document.getElementById("dayDetailContent");

    const d = new Date(dateStr);
    titleEl.textContent = d.toLocaleDateString("he-IL", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

    if (!dayOrders.length) {
      contentEl.innerHTML = UI.emptyState("📅","אין פעילויות","לא קיימות פעילויות ביום זה",
        '<button class="btn btn-sm btn-primary-custom" onclick="Orders.openOrderModal(null)">+ הוסף פעילות</button>');
    } else {
      contentEl.innerHTML = dayOrders.map(o => `
        <div class="order-card-mobile mb-2" onclick='Orders.openOrderModal(${safeJSON(o)})' style="cursor:pointer;">
          <div class="order-top">
            <div>
              <div class="order-customer">${escHtml(o.customerName||"—")}</div>
              <div class="order-date">${o.startTime||""} ${o.endTime?"– "+o.endTime:""}</div>
            </div>
            ${UI.paymentBadge(o.paymentStatus)}
          </div>
          <div class="order-desc">${escHtml(o.description||"")}</div>
          <div class="order-meta">
            ${o.participantsCount?`<span class="order-meta-item">👥 ${o.participantsCount}</span>`:""}
            ${o.activityCost?`<span class="order-meta-item">💰 ${UI.formatCurrency(o.activityCost)}</span>`:""}
          </div>
        </div>`).join("");
    }

    panel.style.display = "";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function ordersForDate(dateStr) {
    return allOrders.filter(o => o.activityDate === dateStr);
  }

  // ─── Navigation ──────────────────────────────────────────
  function prevPeriod() {
    if (viewMode === "month") currentDate.setMonth(currentDate.getMonth()-1);
    else currentDate.setDate(currentDate.getDate()-7);
    renderCalendar();
  }

  function nextPeriod() {
    if (viewMode === "month") currentDate.setMonth(currentDate.getMonth()+1);
    else currentDate.setDate(currentDate.getDate()+7);
    renderCalendar();
  }

  function goToday() { currentDate = new Date(); renderCalendar(); }

  function setView(mode) { viewMode = mode; renderCalendar(); }

  // ─── Helpers ─────────────────────────────────────────────
  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function getWeekStart(d) {
    const day = new Date(d);
    const dow = day.getDay(); // 0=Sun
    day.setDate(day.getDate() - dow);
    day.setHours(0,0,0,0);
    return day;
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function safeJSON(obj) {
    return JSON.stringify(obj).replace(/'/g,"&#39;").replace(/"/g,"&quot;");
  }

  return { render, prevPeriod, nextPeriod, goToday, setView, selectDay };
})();

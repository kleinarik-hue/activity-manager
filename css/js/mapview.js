/**
 * ============================================================
 * mapview.js — Israel Map View Module
 * ============================================================
 * Displays activity locations on Google Maps.
 * Clicking a marker opens the order details.
 * ============================================================
 */

const MapView = (() => {

  let map       = null;
  let markers   = [];
  let allOrders = [];
  let customers = [];
  let infoWindow= null;

  async function render(container) {
    container.innerHTML = `
      <!-- Map Filters -->
      <div class="filters-bar mb-3">
        <div>
          <label class="form-label mb-1">סטטוס תשלום</label>
          <select id="mapFilterStatus" class="form-select" style="width:140px;">
            <option value="">הכל</option>
            <option value="paid">שולם</option>
            <option value="unpaid">לא שולם</option>
          </select>
        </div>
        <div>
          <label class="form-label mb-1">חודש</label>
          <input type="month" id="mapFilterMonth" class="form-control" style="width:150px;">
        </div>
        <button class="btn btn-outline-secondary align-self-end" onclick="MapView.applyFilters()">סנן</button>
        <button class="btn btn-outline-secondary align-self-end" onclick="MapView.resetFilters()">נקה</button>
        <div class="ms-auto align-self-end text-muted fs-sm" id="mapMarkerCount"></div>
      </div>

      <!-- Legend -->
      <div class="d-flex gap-3 mb-2 fs-sm">
        <span><span class="status-dot dot-paid"></span> שולם</span>
        <span><span class="status-dot dot-unpaid"></span> לא שולם</span>
        <span><span class="status-dot" style="background:#f59e0b;"></span> חלקי</span>
      </div>

      <!-- Map -->
      <div id="map-container">
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;">
          <div class="text-center">
            <div class="spinner-lg mx-auto mb-3"></div>
            <p>טוען מפה...</p>
          </div>
        </div>
      </div>`;

    // Load data
    try {
      [allOrders, customers] = await Promise.all([
        API.orders.list({}).then(r => r.data || []),
        API.customers.list().then(r => r.data || []),
      ]);
    } catch (err) {
      UI.toast("שגיאה בטעינת נתונים למפה", "error");
      return;
    }

    initMap();

    // Attach filter listeners
    document.getElementById("mapFilterStatus")?.addEventListener("change", applyFilters);
    document.getElementById("mapFilterMonth")?.addEventListener("change", applyFilters);
  }

  function initMap() {
    if (!window.google?.maps) {
      document.getElementById("map-container").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🗺️</div>
          <h5>המפה אינה זמינה</h5>
          <p>מפתח Google Maps API לא הוגדר או שה-API לא נטען. ראה הוראות התקנה.</p>
        </div>`;
      return;
    }

    map = new google.maps.Map(document.getElementById("map-container"), {
      center: CONFIG.MAP_DEFAULT_CENTER,
      zoom:   CONFIG.MAP_DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
    });

    infoWindow = new google.maps.InfoWindow();
    plotMarkers(allOrders);
  }

  function plotMarkers(orders) {
    // Clear existing markers
    markers.forEach(m => m.setMap(null));
    markers = [];

    // Group orders by customer lat/lng to avoid overlapping markers
    const grouped = {};
    orders.forEach(order => {
      const cust = customers.find(c => c.id === order.customerId);
      if (!cust?.lat || !cust?.lng) return;
      const key = `${cust.lat}_${cust.lng}`;
      if (!grouped[key]) grouped[key] = { cust, orders: [], lat: +cust.lat, lng: +cust.lng };
      grouped[key].orders.push(order);
    });

    Object.values(grouped).forEach(group => {
      const allPaid    = group.orders.every(o => o.paymentStatus === "paid");
      const anyUnpaid  = group.orders.some(o => o.paymentStatus === "unpaid");
      const color = allPaid ? "#10b981" : anyUnpaid ? "#ef4444" : "#f59e0b";

      const marker = new google.maps.Marker({
        position: { lat: group.lat, lng: group.lng },
        map,
        title: group.cust.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10 + Math.min(group.orders.length * 2, 10),
          fillColor: color,
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: "#fff",
        },
        label: group.orders.length > 1 ? {
          text: String(group.orders.length),
          color: "#fff",
          fontSize: "11px",
          fontWeight: "bold",
        } : null,
      });

      marker.addListener("click", () => {
        infoWindow.setContent(buildInfoWindow(group));
        infoWindow.open(map, marker);
      });

      markers.push(marker);
    });

    document.getElementById("mapMarkerCount").textContent =
      `${markers.length} מיקומים, ${orders.length} הזמנות`;

    // Auto-fit bounds
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m.getPosition()));
      map.fitBounds(bounds, 60);
    }
  }

  function buildInfoWindow(group) {
    const cust = group.cust;
    const ordersList = group.orders.map(o => `
      <div style="border-bottom:1px solid #f1f5f9;padding:.4rem 0;">
        <div style="font-size:.82rem;font-weight:600;">${escHtml(o.description||"פעילות")}</div>
        <div style="font-size:.75rem;color:#6b7280;">${UI.formatDate(o.activityDate)} · ${UI.formatCurrency(o.activityCost)}</div>
        <div style="margin-top:.2rem;">${UI.paymentBadge(o.paymentStatus)}</div>
      </div>`).join("");

    return `
      <div dir="rtl" style="font-family:Rubik,Arial,sans-serif;min-width:220px;max-width:280px;">
        <h6 style="margin:0 0 .5rem;font-weight:700;font-size:.95rem;">🏢 ${escHtml(cust.name)}</h6>
        ${cust.address ? `<p style="font-size:.8rem;color:#6b7280;margin:0 0 .5rem;">📍 ${escHtml(cust.address)}</p>` : ""}
        ${cust.phone ? `<p style="font-size:.8rem;margin:0 0 .5rem;">📞 <a href="tel:${escHtml(cust.phone)}">${escHtml(cust.phone)}</a></p>` : ""}
        <div style="border-top:1px solid #e2e8f0;padding-top:.5rem;">${ordersList}</div>
      </div>`;
  }

  function applyFilters() {
    const status = document.getElementById("mapFilterStatus")?.value || "";
    const month  = document.getElementById("mapFilterMonth")?.value  || "";

    let filtered = [...allOrders];
    if (status) filtered = filtered.filter(o => o.paymentStatus === status);
    if (month)  filtered = filtered.filter(o => o.activityDate?.startsWith(month));

    plotMarkers(filtered);
  }

  function resetFilters() {
    document.getElementById("mapFilterStatus").value = "";
    document.getElementById("mapFilterMonth").value  = "";
    plotMarkers(allOrders);
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  return { render, applyFilters, resetFilters };
})();

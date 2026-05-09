/**
 * ============================================================
 * config.js — Central Configuration File
 * ============================================================
 * ALL system-wide settings live here.
 * When migrating to a new Google account:
 *   1. Update APPS_SCRIPT_URL to your new deployment URL
 *   2. Update GOOGLE_MAPS_API_KEY to your new key
 *   3. No other files need to change
 * ============================================================
 */

const CONFIG = {

  // ─── Google Apps Script Backend URL ──────────────────────
  // Paste your deployed Web App URL here after deployment.
  // Example: "https://script.google.com/macros/s/ABC123.../exec"
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzouzAGYeki03l-mjYsZKiG7SM88xS3vVhapzyUEMepvvve8wPCJTkuJP0GoG8ODl1m/exec",

  // ─── Google Maps API Key ──────────────────────────────────
  // Get a key from: https://console.cloud.google.com/
  // Enable: Maps JavaScript API, Geocoding API
  GOOGLE_MAPS_API_KEY: "AIzaSyDlcWfkbxT7ci9NbNn9f7VaL0A6zsqCJ78",

  // ─── Map Defaults (Israel center) ─────────────────────────
  MAP_DEFAULT_CENTER: { lat: 31.7683, lng: 35.2137 }, // Jerusalem
  MAP_DEFAULT_ZOOM: 8,

  // ─── App Metadata ─────────────────────────────────────────
  APP_NAME: "מנהל פעילויות",
  APP_SUBTITLE: "מערכת ניהול הזמנות",
  APP_VERSION: "1.0.0",

  // ─── Session ──────────────────────────────────────────────
  // Session key stored in sessionStorage
  SESSION_KEY: "activity_mgr_session",

  // ─── Pagination ───────────────────────────────────────────
  PAGE_SIZE: 25,

  // ─── Payment Status Options ───────────────────────────────
  PAYMENT_STATUSES: [
    { value: "unpaid",  label: "לא שולם",  class: "badge-unpaid"  },
    { value: "paid",    label: "שולם",     class: "badge-paid"    },
    { value: "partial", label: "חלקי",     class: "badge-overdue" },
  ],

  // ─── Currency ─────────────────────────────────────────────
  CURRENCY: "₪",
  CURRENCY_LOCALE: "he-IL",

  // ─── Date Locale ──────────────────────────────────────────
  DATE_LOCALE: "he-IL",

  // ─── Feature Flags ────────────────────────────────────────
  ENABLE_GEOCODING: true,   // auto-geocode customer addresses
  ENABLE_AUDIT_LOG: true,   // track all changes
  ENABLE_MAP:       true,   // show map view

  // ─── Overdue threshold (days) ────────────────────────────
  // Mark expected payments as overdue after this many days
  OVERDUE_DAYS: 30,
};

// Make immutable
Object.freeze(CONFIG);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { installMobileErrorOverlay } from "./mobileErrorOverlay.js";

installMobileErrorOverlay();

console.log("BUILD_ID:", import.meta.env.VITE_BUILD_ID);

// Small visual proof that new JS executed
const boot = document.createElement("div");
boot.style.cssText =
  "position:fixed;top:8px;left:8px;z-index:99999;background:#000;color:#fff;padding:6px 8px;font:12px system-ui;border-radius:6px";
boot.textContent = `BOOT OK • ${import.meta.env.VITE_BUILD_ID || ""}`;
document.body.appendChild(boot);

/**
 * One-time emergency reset:
 * Open: https://www.zomorodmedical.com/?nuke=1
 * This unregisters SW + clears caches ONCE, then reloads clean.
 */
async function nukeOnceIfRequested() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuke") !== "1") return;

    // Remove param so it doesn't keep nuking
    url.searchParams.delete("nuke");
    window.history.replaceState({}, "", url.toString());

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Hard reload after cleanup
    window.location.reload();
  } catch {
    // ignore
  }
}

nukeOnceIfRequested();

// If using vite-plugin-pwa injectRegister:"auto", reload once on SW update.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    try {
      const key = "__zms_sw_reloaded";
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // if storage blocked, still avoid tight loops by checking a flag on window
      if (window.__zms_sw_reloaded) return;
      window.__zms_sw_reloaded = true;
    }
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

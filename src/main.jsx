import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { installMobileErrorOverlay } from "./mobileErrorOverlay.js";
installMobileErrorOverlay();
// TEMP: remove any previously-registered service workers + caches
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}



console.log("BUILD_ID:", import.meta.env.VITE_BUILD_ID);

const boot = document.createElement("div");
boot.style.cssText =
  "position:fixed;top:8px;left:8px;z-index:99999;background:#000;color:#fff;padding:6px 8px;font:12px system-ui;border-radius:6px";
boot.textContent = "BOOT OK";
document.body.appendChild(boot);
// If using vite-plugin-pwa with injectRegister:"auto", this is optional.
// But it's still useful to hard-refresh when a new SW takes control.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // New service worker took control -> load the newest bundle
    window.location.reload();
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// TEMP: remove any previously-registered service workers + caches
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

// TEMP: force-remove any old SW / cache on client devices
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { installMobileErrorOverlay } from "./mobileErrorOverlay.js";
installMobileErrorOverlay();

console.log("BUILD_ID:", import.meta.env.VITE_BUILD_ID);

const boot = document.createElement("div");
boot.style.cssText =
  "position:fixed;top:8px;left:8px;z-index:99999;background:#000;color:#fff;padding:6px 8px;font:12px system-ui;border-radius:6px";
boot.textContent = "BOOT OK";
document.body.appendChild(boot);


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

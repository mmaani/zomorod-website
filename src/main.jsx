import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { installMobileErrorOverlay } from "./mobileErrorOverlay.js";
installMobileErrorOverlay();
const boot = document.createElement("div");
boot.id = "boot-marker";
boot.style.cssText = "position:fixed;top:8px;left:8px;z-index:99999;background:#000;color:#fff;padding:6px 8px;font:12px system-ui;border-radius:6px";
boot.textContent = "BOOT: main.jsx loaded";
document.body.appendChild(boot);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

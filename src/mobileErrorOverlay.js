// src/mobileErrorOverlay.js
export function installMobileErrorOverlay() {
  if (typeof window === "undefined") return;

  // Avoid double install
  if (window.__zms_mobile_overlay_installed) return;
  window.__zms_mobile_overlay_installed = true;

  const show = (title, detail) => {
    try {
      let el = document.getElementById("__zms_error_overlay");
      if (!el) {
        el = document.createElement("div");
        el.id = "__zms_error_overlay";
        el.style.cssText = `
          position:fixed; inset:0; z-index:2147483647;
          padding:12px; overflow:auto;
          background:rgba(0,0,0,.92); color:#fff;
          font:12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial;
          white-space:pre-wrap;
        `;
        document.body.appendChild(el);
      }
      el.textContent = `ZOMOROD MOBILE ERROR\n\n${title}\n\n${detail || ""}`;
    } catch {
      // ignore
    }
  };

  window.addEventListener("error", (e) => {
    const msg = e?.message || "Unknown error";
    const src = e?.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "";
    const stack = e?.error?.stack || "";
    show(msg, `${src}\n\n${stack}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    const msg = (reason && (reason.message || String(reason))) || "Unhandled rejection";
    const stack = reason?.stack || "";
    show(msg, stack);
  });
}

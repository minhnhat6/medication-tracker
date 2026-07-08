"use client";
import { useEffect } from "react";

/**
 * Đăng ký service worker cho PWA + Web Push — CHỈ ở production.
 * Trong dev, SW cache cũ dễ gây lệch HTML/JS (hydration mismatch), nên ta
 * chủ động gỡ SW và xoá cache để lần reload thường (Ctrl+R) luôn lấy bản mới.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Gỡ mọi service worker + xoá cache còn kẹt từ các lần dev trước
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}

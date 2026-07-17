"use client";

import { useEffect } from "react";

/** Registra el service worker (instalabilidad + push). */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW la web sigue funcionando; solo se pierde instalación/push.
      });
    }
  }, []);

  return null;
}

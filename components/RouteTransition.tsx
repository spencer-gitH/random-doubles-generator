"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DiceIcon from "./DiceIcon";

const MIN_DURATION_MS = 1500;

export default function RouteTransition() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href") ?? "";
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname) return;

      startedAt.current = Date.now();
      setSpinKey((k) => k + 1);
      setShow(true);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  useEffect(() => {
    if (startedAt.current == null) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_DURATION_MS - elapsed);
    const t = setTimeout(() => {
      setShow(false);
      startedAt.current = null;
    }, remaining);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;
  return (
    <div className="route-overlay" aria-busy="true" aria-live="polite">
      <DiceIcon key={spinKey} size={64} state="spin" />
      <div className="route-overlay__label">[ LOADING ]</div>
    </div>
  );
}

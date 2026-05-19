"use client";

import { useEffect, useState } from "react";
import DiceIcon from "./DiceIcon";

const STORAGE_KEY = "rdg-splash-seen";
const SPIN_MS = 1500;
const FADE_MS = 300;

type Phase = "spinning" | "fading" | "done";

export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("spinning");

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const alreadySeen = window.sessionStorage.getItem(STORAGE_KEY) === "1";

    if (reducedMotion || alreadySeen) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      setPhase("done");
      return;
    }

    const fadeTimer = setTimeout(() => setPhase("fading"), SPIN_MS);
    const doneTimer = setTimeout(() => {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      setPhase("done");
    }, SPIN_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <>
      {children}
      {phase !== "done" && (
        <div
          className={`splash-overlay${phase === "fading" ? " splash-overlay--fading" : ""}`}
          aria-hidden="true"
        >
          <DiceIcon size={96} state="spin" />
          <div className="splash-overlay__wordmark">
            <div className="splash-overlay__title">Random Doubles</div>
            <div className="splash-overlay__sub">Draw · Roll · Play</div>
          </div>
        </div>
      )}
    </>
  );
}

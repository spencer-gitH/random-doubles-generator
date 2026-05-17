"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUdiscInput } from "@/lib/url";
import Eyebrow from "./Eyebrow";

export default function PasteUrlFallback({
  variant = "primary",
  message,
}: {
  variant?: "primary" | "footer";
  message?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseUdiscInput(input);
    if (!parsed) {
      setError("Doesn't look like a UDisc event URL.");
      return;
    }
    setSubmitting(true);
    router.push(`/event/${parsed.slug}`);
  }

  return (
    <>
      <Eyebrow rule={false}>
        [ {variant === "footer" ? "OR · PASTE URL" : "FALLBACK · PASTE URL"} ]
      </Eyebrow>
      {message && <p className="fallback-message">{message}</p>}
      <form onSubmit={onSubmit} className="fallback-input">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="udisc.com/events/..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="fallback-input__field"
          required={variant === "primary"}
          aria-label="UDisc event URL"
        />
        <button
          type="submit"
          disabled={submitting}
          className="fallback-input__btn"
        >
          {submitting ? "…" : "Load →"}
        </button>
      </form>
      {error && <p className="fallback-error">{error}</p>}
    </>
  );
}

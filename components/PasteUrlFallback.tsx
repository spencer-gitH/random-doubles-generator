"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUdiscInput } from "@/lib/url";

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

  if (variant === "footer") {
    return (
      <div className="mt-6 pt-4 border-t border-gray-200">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Or paste a UDisc URL"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Go
          </button>
        </form>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {message && <p className="text-sm text-gray-600">{message}</p>}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label htmlFor="udisc-url" className="text-sm font-medium">
          UDisc event URL
        </label>
        <input
          id="udisc-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://udisc.com/events/..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-white font-medium disabled:opacity-50"
        >
          {submitting ? "Loading..." : "Fetch roster"}
        </button>
      </form>
    </div>
  );
}

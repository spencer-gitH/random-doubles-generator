const SLUG_RE = /^[a-zA-Z0-9-]+$/;
const URL_RE = /udisc\.com\/events\/([a-zA-Z0-9-]+)/;

export function parseUdiscInput(input: string): {
  slug: string;
  participantsUrl: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (SLUG_RE.test(trimmed)) {
    return {
      slug: trimmed,
      participantsUrl: `https://udisc.com/events/${trimmed}/participants`,
    };
  }

  const match = trimmed.match(URL_RE);
  if (match) {
    const slug = match[1];
    return {
      slug,
      participantsUrl: `https://udisc.com/events/${slug}/participants`,
    };
  }

  return null;
}

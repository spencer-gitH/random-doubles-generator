/**
 * Normalized key for case-, whitespace-, punctuation-, and accent-insensitive
 * name matching. Two display names that refer to the same roster entry should
 * collapse to the same key, so callers can dedupe scraped names against each
 * other and against manually-added walk-ins.
 *
 *   "Bohrod"        -> "bohrod"
 *   "  Bohrod  "     -> "bohrod"
 *   "ryan  Bohrod"  -> "ryan bohrod"
 *   "O'Brien"       -> "o brien"
 *   "José"          -> "jose"
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // punctuation/symbols -> single space
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * True when one normalized name is a plausible nickname / partial of the other
 * (e.g. "Bo" vs "Bohrod", "Matt" vs "Matthew Marshall"). Used to surface a soft
 * "possible duplicate" hint — never to silently merge, since that would risk
 * collapsing two genuinely different players.
 */
export function isPossibleNicknameOf(a: string, b: string): boolean {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb || ka === kb) return false;
  const [shortKey, longKey] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  if (shortKey.length < 2) return false;
  // A leading token of the longer name starts with the whole shorter name.
  return longKey.split(" ").some((token) => token.startsWith(shortKey));
}

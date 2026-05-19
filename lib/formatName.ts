export function formatPlayerName(displayName: string): string {
  const cleaned = displayName.replace(/["']/g, "").trim();
  if (!cleaned) return "";

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  if (tokens.length === 1) {
    return tokens[0].toUpperCase();
  }

  const surname = tokens[tokens.length - 1];
  const firstInitial = tokens[0][0];

  if (surname === "?") {
    return `${tokens[0].toUpperCase()} ?`;
  }

  return `${surname.toUpperCase()} ${firstInitial.toUpperCase()}.`;
}

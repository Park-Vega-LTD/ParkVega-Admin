/**
 * Where to send staff after they log in. Only same-site paths are allowed:
 * "//evil.com" or "/\evil.com" would otherwise redirect off-site.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/admin") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // The login page itself is never a useful destination.
  if (next === "/login" || next.startsWith("/login?")) return fallback;
  return next;
}

/** Relative path only — must not become an open redirect. Safe for client + server. */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  const n = String(next || "").trim() || fallback;
  if (!n.startsWith("/") || n.startsWith("//") || n.includes("\\") || n.includes("://")) return fallback;
  return n;
}

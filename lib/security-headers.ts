/** Baseline security headers for Cloud Run / Next. No script-src CSP — that would break locale bootstrap, optional GA/Plausible, and OAuth redirects. */

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), geolocation=(), microphone=(self), payment=(), usb=(), browsing-topics=()",
  },
];

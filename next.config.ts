import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/basePath";

// Content-Security-Policy. All upstream lookups (HIBP, LeakCheck, XposedOrNot,
// Sherlock platforms) happen server-side, so the browser only ever talks to our
// own origin — connect-src can stay 'self'.
//
// 'unsafe-inline'/'unsafe-eval' for scripts are a pragmatic MVP allowance:
// Next's bootstrap/hydration uses inline scripts, and dev (HMR) needs eval.
// Hardening to nonce-based script-src is a later task.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only in production. On http://localhost this directive makes the browser
  // upgrade asset requests to https (which has no listener), so Firefox loads
  // the HTML but silently fails every CSS/JS sub-resource — an unstyled, dead
  // page. Chromium exempts localhost, which is why it only bites in Firefox.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Privacy tool — don't leak the URL to any external destination.
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Serve the whole app under kairakau.nz/dataleak. Next prepends this to its
  // own routes, assets, next/link and next/image automatically; raw fetch()
  // calls to API routes are prefixed manually via BASE_PATH (see lib/basePath).
  basePath: BASE_PATH,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

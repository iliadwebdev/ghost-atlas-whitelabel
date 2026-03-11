import { logResponse, logError, logFrameOverride } from "./logger.js";
import httpProxy from "http-proxy";

export const proxy = httpProxy.createProxyServer({
  secure: false, // Internal services may use self-signed certs
});

// Set forwarding headers on every proxied request.
// Per-route headers (via proxy.web `headers` option) are applied before this
// event fires — only set defaults if the route didn't already provide a value.
proxy.on("proxyReq", (proxyReq, req) => {
  const host = req.headers.host ?? "";

  const remoteIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "";

  if (!proxyReq.getHeader("x-forwarded-host")) {
    proxyReq.setHeader("X-Forwarded-Host", host);
  }

  if (!proxyReq.getHeader("x-forwarded-proto")) {
    proxyReq.setHeader("X-Forwarded-Proto", "https");
  }

  proxyReq.setHeader("X-Forwarded-For", remoteIp);
  proxyReq.setHeader("X-Real-IP", remoteIp);
});

const ALLOWED_FRAME_ORIGINS = ["atlas-cms.rest", "localhost", "iliad.dev"];

function isAllowedFrameOrigin(originHeader: string | undefined): boolean {
  if (!originHeader) return false;
  try {
    const { hostname } = new URL(originHeader);
    return ALLOWED_FRAME_ORIGINS.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

// Resolve the effective origin from the request, falling back to the Referer
// header. Iframe navigations do not include an Origin header, so Referer is
// the only signal available.
function resolveOrigin(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const origin = req.headers["origin"] as string | undefined;
  if (origin) return origin;

  const referer = req.headers["referer"] as string | undefined;
  if (!referer) return undefined;
  try {
    const { origin: o } = new URL(referer);
    return o;
  } catch {
    return undefined;
  }
}

// Static frame-ancestors value covering all approved embedding domains.
// This is always applied — frame embedding policy is about who may embed us,
// not about who is asking, so it doesn't need to vary per-request.
const FRAME_ANCESTORS = ALLOWED_FRAME_ORIGINS.map((d) =>
  d === "localhost" ? "localhost:*" : `*.${d} ${d}`
).join(" ");
const FRAME_ANCESTORS_CSP = `frame-ancestors 'self' ${FRAME_ANCESTORS}`;

proxy.on("proxyRes", (proxyRes, req) => {
  logResponse(req.method ?? "?", req.url ?? "/", proxyRes.statusCode ?? 0);

  // Always remove X-Frame-Options and apply permissive frame-ancestors CSP
  // so that approved domains can embed this site regardless of what headers
  // the browser sends on the initial iframe navigation.
  if (proxyRes.headers["x-frame-options"]) {
    logFrameOverride("static policy", req.url ?? "/");
    delete proxyRes.headers["x-frame-options"];

    const existing = proxyRes.headers["content-security-policy"] as
      | string
      | undefined;
    proxyRes.headers["content-security-policy"] = existing
      ? existing.replace(/frame-ancestors[^;]*(;|$)/, FRAME_ANCESTORS_CSP)
      : FRAME_ANCESTORS_CSP;
  }

  // Dynamic CORS — echo origin back only for approved domains.
  const origin = resolveOrigin(req as any);
  if (isAllowedFrameOrigin(origin)) {
    proxyRes.headers["access-control-allow-origin"] = origin;
    proxyRes.headers["access-control-allow-credentials"] = "true";
  }
});

proxy.on("error", (err, req, res) => {
  logError(req.method ?? "?", req.url ?? "/", err.message);

  if ("writeHead" in res && typeof res.writeHead === "function") {
    res.writeHead(502);
    res.end("Bad gateway");
  }
});

import { checkTargets } from "./lib/healthcheck.js";
import { logRequest } from "./lib/logger.js";
import { logStartup } from "./lib/logger.js";
import { proxy } from "./lib/proxy.js";

import { loadDevConfig } from "./config.js";
import { createServer } from "./server.js";

import type { IncomingMessage, ServerResponse } from "http";

const config = loadDevConfig();

const rewritePatterns = [/\.ghost\/analytics/, /\.ghost\/activitypub/];
const ghostPatterns = [/^\/ghost/, /^\/content\/images/];
const wellKnownPatterns = [
  /^\/.well-known\/webfinger/,
  /^\/.well-known\/nodeinfo/,
];

function isGhostRequest(url: string): boolean {
  return (
    wellKnownPatterns.some((p) => p.test(url)) ||
    rewritePatterns.some((p) => p.test(url)) ||
    ghostPatterns.some((p) => p.test(url))
  );
}

function devProxyRoute(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url ?? "/";

  if (isGhostRequest(url)) {
    logRequest(req.method ?? "?", url, "production proxy");
    proxy.web(req, res, { target: config.PROXY_TARGET });
  } else {
    logRequest(req.method ?? "?", url, "local nextjs");
    proxy.web(req, res, { target: config.DEV_NEXTJS_URL });
  }

  return true;
}

const targets: Record<string, string> = {
  "Production proxy": config.PROXY_TARGET,
  "Local Next.js": config.DEV_NEXTJS_URL,
};

await checkTargets(targets);

const server = createServer([devProxyRoute]);

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "/";
  const target = isGhostRequest(url) ? config.PROXY_TARGET : config.DEV_NEXTJS_URL;
  logRequest("WS", url, target);
  proxy.ws(req, socket, head, { target });
});

server.listen(config.DEV_PORT, () => {
  logStartup(config.DEV_PORT, targets);
});

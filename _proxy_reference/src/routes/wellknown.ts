import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

// WebFinger and NodeInfo are required for ActivityPub federation
const paths = ["/.well-known/webfinger", "/.well-known/nodeinfo"];

export function wellKnownRoute(activityPubTarget: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? "";
    if (!paths.some((p) => url.startsWith(p))) return false;

    logRequest(req.method ?? "?", url, "activitypub (.well-known)");
    proxy.web(req, res, { target: activityPubTarget });

    return true;
  };
}

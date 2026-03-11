import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

const pattern = /\.ghost\/activitypub(\/|$)/;

export function activityPubRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!pattern.test(req.url ?? "")) return false;

    // Do NOT rewrite the URL — the ActivityPub service expects the full path.
    logRequest(req.method ?? "?", req.url ?? "/", "activitypub");
    proxy.web(req, res, { target });
    return true;
  };
}

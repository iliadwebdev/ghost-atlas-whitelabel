import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

const pattern = /\.ghost\/analytics(\/.*)?$/;

export function analyticsRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const match = req.url?.match(pattern);
    if (!match) return false;

    req.url = match[1] || "/";
    logRequest(req.method ?? "?", req.url, "analytics");
    proxy.web(req, res, { target });

    return true;
  };
}

import http from "http";

import type { IncomingMessage, ServerResponse } from "http";

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => boolean;

export function createServer(routes: RouteHandler[]): http.Server {
  return http.createServer((req, res) => {
    // Skip upgrade requests — they're handled by the server 'upgrade' event
    if (req.headers.upgrade) return;

    for (const route of routes) {
      if (route(req, res)) return;
    }
  });
}

import chalk from "chalk";

import { checkTargets } from "./lib/healthcheck.js";
import { logStartup } from "./lib/logger.js";

import { loadProductionConfig } from "./config.js";
import { createServer } from "./server.js";

// Routers
import { activityPubRoute } from "./routes/activitypub.js";
import { wellKnownRoute } from "./routes/wellknown.js";
import { analyticsRoute } from "./routes/analytics.js";
import { nextjsRoute } from "./routes/nextjs.js";
import { ghostRoute } from "./routes/ghost.js";

const config = loadProductionConfig();

if (!config.NEXTJS_INTERNAL_URL) {
  console.warn(
    chalk.yellow.bold(
      "Warning: NEXTJS_INTERNAL_URL is not set. Falling back to GHOST_INTERNAL_URL for all non-Ghost routes.",
    ),
  );
}

const nextjsTarget = config.NEXTJS_INTERNAL_URL ?? config.GHOST_INTERNAL_URL;

const targets: Record<string, string> = {
  ActivityPub: config.ACTIVITYPUB_PROXY_TARGET,
  Ghost: config.GHOST_INTERNAL_URL,
  "Next.js": nextjsTarget,
};

await checkTargets(targets);

// ORDER IS IMPORTANT — specific routes first, Next.js catch-all last
const server = createServer([
  wellKnownRoute(config.ACTIVITYPUB_PROXY_TARGET),
  activityPubRoute(config.ACTIVITYPUB_PROXY_TARGET),
  analyticsRoute(config.ANALYTICS_PROXY_TARGET),
  ghostRoute(config.GHOST_INTERNAL_URL),

  // Next should probably come last no matter what
  nextjsRoute(nextjsTarget),
]);

server.listen(config.PORT, () => {
  logStartup(config.PORT, targets);
});

import "dotenv/config";

import chalk from "chalk";
import { z } from "zod";

const productionSchema = z.object({
  NEXTJS_INTERNAL_URL: z.string().url().optional(),
  ACTIVITYPUB_PROXY_TARGET: z.string().url(),
  ANALYTICS_PROXY_TARGET: z.string().url(),
  GHOST_INTERNAL_URL: z.string().url(),

  PORT: z.coerce.number().default(8080),
});

const devSchema = z.object({
  DEV_NEXTJS_URL: z.string().url().default("http://localhost:3000"),
  DEV_PORT: z.coerce.number().default(3001),
  PROXY_TARGET: z.string().url(),
});

export type ProductionConfig = z.output<typeof productionSchema>;
export type DevConfig = z.output<typeof devSchema>;

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  label: string,
): z.output<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error(
      chalk.red.bold(`Invalid ${label} environment configuration:\n`),
    );

    for (const issue of result.error.issues) {
      console.error(chalk.red(`  ${issue.path.join(".")}: ${issue.message}`));
    }

    process.exit(1);
  }

  return result.data;
}

export function loadProductionConfig(): ProductionConfig {
  return parseEnv(productionSchema, "production");
}

export function loadDevConfig(): DevConfig {
  return parseEnv(devSchema, "dev");
}

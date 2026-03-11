import chalk, { type ChalkInstance } from "chalk";

function timestamp(): string {
  return chalk.gray(`[${new Date().toISOString()}]`);
}

export function logRequest(method: string, url: string, target: string): void {
  console.log(
    `${timestamp()} ${chalk.bold(method)} ${url} ${chalk.gray("→")} ${chalk.cyan(target)}`,
  );
}

function resolveColor(status: number): ChalkInstance {
  if (status < 300) return chalk.green;
  if (status < 400) return chalk.cyan;
  if (status < 500) return chalk.yellow;

  return chalk.red;
}

export function logResponse(method: string, url: string, status: number): void {
  const colorStatus = resolveColor(status)(status.toString());

  console.log(
    `${timestamp()} ${method} ${url} ${chalk.gray("←")} ${colorStatus}`,
  );
}

export function logFrameOverride(origin: string, url: string): void {
  console.log(
    `${timestamp()} ${chalk.magenta.bold("[frame-override]")} ${url} ${chalk.gray("←")} ${chalk.magenta(origin)}`,
  );
}

export function logError(method: string, url: string, message: string): void {
  console.error(
    `${chalk.red.bold("[proxy error]")} ${method} ${url} — ${chalk.red(message)}`,
  );
}

export function logStartup(
  port: number,
  targets: Record<string, string>,
): void {
  console.log(chalk.green.bold(`Proxy running on port ${port}`));

  for (const [name, url] of Object.entries(targets)) {
    console.log(`  ${name}: ${chalk.cyan(url)}`);
  }
}

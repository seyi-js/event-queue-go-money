// Opt-in flow tracing: run with TRACE=1 (e.g. `npm run demo:trace`).
const enabled = process.env.TRACE === "1";

export function trace(source: string, message: string): void {
  if (enabled) console.log(`  · ${source.padEnd(14)} ${message}`);
}

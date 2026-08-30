/** Dynamic process.env lookup so Next cannot inline the value at Docker build. */
export function runtimeEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

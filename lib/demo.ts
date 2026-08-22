export const DEMO_EXPIRY_MINUTES = 10;

export function isDemoMode(env: CloudflareEnv): boolean {
  return env.DEMO_MODE?.trim().toLowerCase() === "true";
}

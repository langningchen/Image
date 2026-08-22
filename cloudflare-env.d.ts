// Secrets are intentionally absent from wrangler.toml and therefore augment
// the generated binding interface here.
interface CloudflareEnv extends CloudflareBindings {
  ADMIN_PASSWORD: string;
  CONFIG_ENCRYPTION_KEY: string;
  IP_HASH_SECRET: string;
  SESSION_SECRET: string;
}

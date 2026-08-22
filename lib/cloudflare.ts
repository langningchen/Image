import { getCloudflareContext } from "@opennextjs/cloudflare";

export function cloudflareEnv(): CloudflareEnv {
  return getCloudflareContext().env as unknown as CloudflareEnv;
}

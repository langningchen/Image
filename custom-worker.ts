// The OpenNext worker is generated during `opennextjs-cloudflare build`.
// @ts-expect-error Generated file does not exist before the Cloudflare build.
import handler from "./.open-next/worker.js";
import { cleanupExpiredImages } from "./lib/cleanup";

export default {
  fetch: handler.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      cleanupExpiredImages(env)
        .then((result) => {
          console.log("Scheduled cleanup complete", result);
        })
        .catch((error) => {
          console.error("Scheduled cleanup failed", error);
        }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

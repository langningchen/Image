import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const WRANGLER_CONFIG = join(PROJECT_DIR, "wrangler.toml");
export const SECRET_CACHE = join(PROJECT_DIR, ".vanishpic-deploy-secrets.json");
export const D1_NAME = "image-metadata";
export const R2_BUCKET = "image-data";
export const SECRET_KEYS = [
  "SESSION_SECRET",
  "IP_HASH_SECRET",
  "CONFIG_ENCRYPTION_KEY",
];

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function commandLabel(command, args) {
  return [command, ...args].join(" ");
}

export function run(command, args, options = {}) {
  const { allowFailure = false, capture = false, env = {}, input } = options;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_DIR,
      env: { ...process.env, NO_COLOR: "1", ...env },
      stdio: [
        input === undefined ? "inherit" : "pipe",
        capture ? "pipe" : "inherit",
        capture ? "pipe" : "inherit",
      ],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(
        new Error(
          error.code === "ENOENT"
            ? `${command} is not installed or is not available in PATH.`
            : error.message,
        ),
      );
    });
    child.on("close", (code) => {
      const result = { code: code ?? 1, stdout, stderr };
      if (result.code === 0 || allowFailure) {
        resolvePromise(result);
        return;
      }
      const detail = stderr.trim() || stdout.trim();
      reject(
        new Error(
          `${commandLabel(command, args)} failed with exit code ${result.code}${
            detail ? `:\n${detail}` : "."
          }`,
        ),
      );
    });
    if (input !== undefined) child.stdin?.end(input);
  });
}

export function pnpm(args, options) {
  return run(packageManager, args, options);
}

export async function step(label, task) {
  process.stdout.write(`\n==> ${label}\n`);
  return task();
}

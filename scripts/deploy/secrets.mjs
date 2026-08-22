import { randomBytes } from "node:crypto";
import { chmod, readFile, rename, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { deploymentList } from "./config.mjs";
import { pnpm, SECRET_CACHE, SECRET_KEYS } from "./shared.mjs";

export async function promptAdminPassword() {
  const envPassword =
    process.env.DEPLOY_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (envPassword) {
    if (envPassword.length < 12 || envPassword.length > 512) {
      throw new Error(
        "DEPLOY_ADMIN_PASSWORD/ADMIN_PASSWORD must contain between 12 and 512 characters.",
      );
    }
    process.stdout.write("Using admin password from environment variable.\n");
    return envPassword;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "An interactive terminal is required so the admin password can be entered securely.",
    );
  }
  let muted = false;
  const silentOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: silentOutput,
    terminal: true,
  });
  const hiddenQuestion = async (label) => {
    process.stdout.write(label);
    muted = true;
    try {
      return await new Promise((resolvePromise, reject) => {
        const onInterrupt = () => reject(new Error("Deployment cancelled."));
        prompt.once("SIGINT", onInterrupt);
        prompt.question("", (answer) => {
          prompt.off("SIGINT", onInterrupt);
          resolvePromise(answer);
        });
      });
    } finally {
      muted = false;
      process.stdout.write("\n");
    }
  };

  try {
    const password = await hiddenQuestion(
      "Choose an admin password (12–512 characters): ",
    );
    if (password.length < 12 || password.length > 512) {
      throw new Error(
        "The admin password must contain between 12 and 512 characters.",
      );
    }
    const confirmation = await hiddenQuestion("Confirm the admin password: ");
    if (password !== confirmation) {
      throw new Error("The admin passwords do not match.");
    }
    return password;
  } finally {
    prompt.close();
  }
}

export function generateSecretBundle() {
  return Object.fromEntries(
    SECRET_KEYS.map((key) => [key, randomBytes(48).toString("base64url")]),
  );
}

function isSecretBundle(value) {
  return (
    value &&
    typeof value === "object" &&
    SECRET_KEYS.every(
      (key) => typeof value[key] === "string" && value[key].length >= 43,
    )
  );
}

async function writeSecretCache(secrets) {
  const temporaryPath = `${SECRET_CACHE}.${process.pid}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(
      {
        version: 1,
        createdAt: new Date().toISOString(),
        secrets,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  await rename(temporaryPath, SECRET_CACHE);
  await chmod(SECRET_CACHE, 0o600);
}

async function readSecretCache() {
  try {
    const value = JSON.parse(await readFile(SECRET_CACHE, "utf8"));
    if (value.version !== 1 || !isSecretBundle(value.secrets)) {
      throw new Error("The cached secret file has an invalid format.");
    }
    await chmod(SECRET_CACHE, 0o600);
    return value.secrets;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function workerExists() {
  const result = await pnpm(
    ["exec", "wrangler", "deployments", "list", "--json"],
    { allowFailure: true, capture: true },
  );
  if (result.code !== 0) {
    const detail = `${result.stdout}\n${result.stderr}`.toLowerCase();
    if (
      detail.includes("not found") ||
      detail.includes("does not exist") ||
      detail.includes("could not find")
    ) {
      return false;
    }
    throw new Error(
      "Could not determine whether the Worker already exists. " +
        "No secrets were generated or rotated.\n" +
        (result.stderr.trim() || result.stdout.trim()),
    );
  }
  return deploymentList(result.stdout).length > 0;
}

export async function loadGeneratedSecrets(rotate) {
  const cached = await readSecretCache();
  if (cached && !rotate) {
    process.stdout.write(
      "Reusing the generated secrets from .vanishpic-deploy-secrets.json.\n",
    );
    return cached;
  }
  if (!cached && !rotate && (await workerExists())) {
    throw new Error(
      "This Worker already exists, but the local generated-secret cache is missing. " +
        "Restore .vanishpic-deploy-secrets.json, or explicitly run " +
        "`pnpm deploy:setup -- --rotate-secrets`. Rotation invalidates sessions, " +
        "changes source identities, and requires the stored GitHub PAT to be entered again.",
    );
  }
  const generated = generateSecretBundle();
  await writeSecretCache(generated);
  process.stdout.write(
    `${cached ? "Rotated" : "Generated"} three independent secrets and stored a local, git-ignored recovery copy with mode 0600.\n`,
  );
  return generated;
}

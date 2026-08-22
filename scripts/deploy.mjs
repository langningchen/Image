import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { databaseIdFromList, updateD1DatabaseId } from "./deploy/config.mjs";
import {
  loadGeneratedSecrets,
  promptAdminPassword,
} from "./deploy/secrets.mjs";
import {
  D1_NAME,
  pnpm,
  R2_BUCKET,
  step,
  WRANGLER_CONFIG,
} from "./deploy/shared.mjs";

export {
  databaseIdFromList,
  updateD1DatabaseId,
} from "./deploy/config.mjs";
export { generateSecretBundle } from "./deploy/secrets.mjs";

async function ensureCloudflareLogin() {
  const result = await pnpm(["exec", "wrangler", "whoami"], {
    allowFailure: true,
    capture: true,
  });
  if (result.code === 0) return;
  process.stdout.write(
    "No active Cloudflare session was found. Opening Wrangler login…\n",
  );
  await pnpm(["exec", "wrangler", "login"]);
  await pnpm(["exec", "wrangler", "whoami"]);
}

async function listD1Databases() {
  const result = await pnpm(["exec", "wrangler", "d1", "list", "--json"], {
    capture: true,
  });
  return result.stdout;
}

async function ensureD1Database() {
  let listOutput = await listD1Databases();
  let databaseId = databaseIdFromList(listOutput, D1_NAME);
  if (!databaseId) {
    process.stdout.write(`Creating D1 database "${D1_NAME}"…\n`);
    await pnpm(["exec", "wrangler", "d1", "create", D1_NAME]);
    listOutput = await listD1Databases();
    databaseId = databaseIdFromList(listOutput, D1_NAME);
  } else {
    process.stdout.write(`Reusing D1 database "${D1_NAME}".\n`);
  }
  if (!databaseId) {
    throw new Error(`Could not resolve the ID for D1 database "${D1_NAME}".`);
  }

  const currentConfig = await readFile(WRANGLER_CONFIG, "utf8");
  const updatedConfig = updateD1DatabaseId(currentConfig, D1_NAME, databaseId);
  if (updatedConfig !== currentConfig) {
    const temporaryPath = `${WRANGLER_CONFIG}.${process.pid}.tmp`;
    await writeFile(temporaryPath, updatedConfig);
    await rename(temporaryPath, WRANGLER_CONFIG);
    process.stdout.write("Updated the D1 database ID in wrangler.toml.\n");
  }
}

async function ensureR2Bucket() {
  const result = await pnpm(
    ["exec", "wrangler", "r2", "bucket", "info", R2_BUCKET, "--json"],
    { allowFailure: true, capture: true },
  );
  if (result.code === 0) {
    process.stdout.write(`Reusing R2 bucket "${R2_BUCKET}".\n`);
    return;
  }
  process.stdout.write(`Creating R2 bucket "${R2_BUCKET}"…\n`);
  await pnpm(["exec", "wrangler", "r2", "bucket", "create", R2_BUCKET]);
}

async function deployWithSecrets(adminPassword, generatedSecrets) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "vanishpic-deploy-"));
  const secretsFile = join(temporaryDirectory, "secrets.json");
  try {
    await writeFile(
      secretsFile,
      JSON.stringify({
        ADMIN_PASSWORD: adminPassword,
        ...generatedSecrets,
      }),
      { mode: 0o600 },
    );
    await pnpm(["exec", "opennextjs-cloudflare", "build"]);
    await pnpm([
      "exec",
      "wrangler",
      "deploy",
      "--autoconfig=false",
      "--secrets-file",
      secretsFile,
    ]);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const allowedArguments = new Set(["--rotate-secrets"]);
  const unknownArguments = process.argv
    .slice(2)
    .filter((argument) => !allowedArguments.has(argument));
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown option: ${unknownArguments.join(", ")}`);
  }
  const rotateSecrets = process.argv.includes("--rotate-secrets");
  process.stdout.write(
    "VanishPic guided Cloudflare deployment\n" +
      "The password is hidden, never printed, and is not cached after deployment.\n",
  );
  const adminPassword = await promptAdminPassword();

  await step("Installing locked dependencies", () =>
    pnpm(["install", "--frozen-lockfile"]),
  );
  await step("Checking Cloudflare authentication", ensureCloudflareLogin);
  const generatedSecrets = await step("Preparing deployment secrets", () =>
    loadGeneratedSecrets(rotateSecrets),
  );
  await step("Preparing D1", ensureD1Database);
  await step("Preparing R2", ensureR2Bucket);
  await step("Applying D1 migrations", () =>
    pnpm(
      ["exec", "wrangler", "d1", "migrations", "apply", D1_NAME, "--remote"],
      { env: { CI: "true" } },
    ),
  );
  await step("Building and deploying with encrypted Worker secrets", () =>
    deployWithSecrets(adminPassword, generatedSecrets),
  );
  process.stdout.write(
    "\nDeployment complete. Open the URL printed above, visit /admin, and " +
      "finish the storage setup. Keep .vanishpic-deploy-secrets.json private " +
      "and back it up securely.\n",
  );
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`\nDeployment failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

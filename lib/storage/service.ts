import { decryptSecret } from "@/lib/encryption";
import {
  GithubImageStorage,
  type GithubStorageCredentials,
  verifyGithubRepository,
} from "@/lib/storage/adapters/github-image-storage";
import { R2ImageStorage } from "@/lib/storage/adapters/r2-image-storage";
import {
  groupImagesByBackend,
  type ImageStoragePort,
  type StoredImageRecord,
  type StoredObject,
  type StoredUpload,
  type StoreImageInput,
} from "@/lib/storage/ports/image-storage";
import type { ImageRecord, StorageBackend, StorageConfig } from "@/lib/types";

async function githubCredentials(
  env: CloudflareEnv,
  config: StorageConfig,
): Promise<GithubStorageCredentials> {
  if (!config.githubOwner || !config.githubRepo || !config.githubPatEncrypted) {
    throw new Error("GitHub storage is not completely configured");
  }
  return {
    owner: config.githubOwner,
    repo: config.githubRepo,
    branch: config.githubBranch || "main",
    token: await decryptSecret(
      config.githubPatEncrypted,
      env.CONFIG_ENCRYPTION_KEY,
    ),
  };
}

async function createAdapter(
  env: CloudflareEnv,
  config: StorageConfig,
  backend: StorageBackend,
): Promise<ImageStoragePort> {
  if (backend === "r2") return new R2ImageStorage(env.IMAGE_BUCKET);
  return new GithubImageStorage(await githubCredentials(env, config));
}

export async function putStoredImage(
  env: CloudflareEnv,
  config: StorageConfig,
  input: StoreImageInput,
): Promise<StoredUpload> {
  return (await createAdapter(env, config, config.backend)).put(input);
}

export async function getStoredImage(
  env: CloudflareEnv,
  config: StorageConfig,
  image: ImageRecord,
): Promise<StoredObject | null> {
  return (await createAdapter(env, config, image.storage_backend)).get(image);
}

export async function deleteStoredImages(
  env: CloudflareEnv,
  config: StorageConfig,
  images: StoredImageRecord[],
): Promise<void> {
  const groups = groupImagesByBackend(images);
  for (const [backend, records] of groups) {
    await (await createAdapter(env, config, backend)).delete(records);
  }
}

export async function verifyGithubStorage(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<void> {
  await verifyGithubRepository({ owner, repo, branch, token });
}

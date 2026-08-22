import type {
  ImageStoragePort,
  StoredImageRecord,
  StoredObject,
  StoredUpload,
  StoreImageInput,
} from "@/lib/storage/ports/image-storage";
import { imageObjectKey } from "@/lib/storage/ports/image-storage";
import { StorageConfigurationError } from "@/lib/storage/storage-error";
import type { ImageRecord } from "@/lib/types";

interface GithubStorageReference {
  sha: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface GithubStorageCredentials {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(offset, offset + 0x8000)),
    );
  }
  return btoa(binary);
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function apiRoot(owner: string, repo: string): string {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function githubHeaders(token: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "User-Agent": "vanishpic-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function parseReference(value: string | null): GithubStorageReference | null {
  if (!value?.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("sha" in parsed) ||
      !("owner" in parsed) ||
      !("repo" in parsed) ||
      !("branch" in parsed) ||
      typeof parsed.sha !== "string" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.repo !== "string" ||
      typeof parsed.branch !== "string"
    ) {
      return null;
    }
    return {
      sha: parsed.sha,
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch,
    };
  } catch {
    return null;
  }
}

export async function verifyGithubRepository(
  credentials: GithubStorageCredentials,
): Promise<void> {
  const response = await fetch(
    `${apiRoot(credentials.owner, credentials.repo)}/branches/${encodeURIComponent(credentials.branch)}`,
    { headers: githubHeaders(credentials.token) },
  );
  if (!response.ok) {
    throw new StorageConfigurationError(
      response.status === 404
        ? "GITHUB_REPOSITORY_NOT_FOUND"
        : "GITHUB_VERIFY_FAILED",
      { status: response.status },
    );
  }
}

export class GithubImageStorage implements ImageStoragePort {
  readonly backend = "github" as const;

  constructor(private readonly credentials: GithubStorageCredentials) {}

  private reference(image: Pick<ImageRecord, "storage_ref">) {
    const stored = parseReference(image.storage_ref);
    return {
      owner: stored?.owner ?? this.credentials.owner,
      repo: stored?.repo ?? this.credentials.repo,
      branch: stored?.branch ?? this.credentials.branch,
      sha: stored?.sha ?? image.storage_ref,
      token: this.credentials.token,
    };
  }

  async put(input: StoreImageInput): Promise<StoredUpload> {
    const objectKey = imageObjectKey(input);
    const { owner, repo, branch, token } = this.credentials;
    const response = await fetch(
      `${apiRoot(owner, repo)}/contents/${encodePath(objectKey)}`,
      {
        method: "PUT",
        headers: {
          ...githubHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload ${input.id} via VanishPic`,
          content: bytesToBase64(input.bytes),
          branch,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub upload failed (HTTP ${response.status})`);
    }
    const payload: unknown = await response.json();
    const sha =
      payload &&
      typeof payload === "object" &&
      "content" in payload &&
      payload.content &&
      typeof payload.content === "object" &&
      "sha" in payload.content &&
      typeof payload.content.sha === "string"
        ? payload.content.sha
        : null;
    if (!sha) {
      throw new Error("GitHub upload response did not include a blob SHA");
    }
    return {
      objectKey,
      backend: this.backend,
      storageRef: JSON.stringify({ sha, owner, repo, branch }),
    };
  }

  async get(image: ImageRecord): Promise<StoredObject | null> {
    const { owner, repo, branch, sha, token } = this.reference(image);
    const response = await fetch(
      `${apiRoot(owner, repo)}/contents/${encodePath(image.object_key)}?ref=${encodeURIComponent(branch)}`,
      { headers: githubHeaders(token, "application/vnd.github.raw+json") },
    );
    if (response.status === 404) return null;
    if (!response.ok || !response.body) {
      throw new Error(`GitHub read failed (HTTP ${response.status})`);
    }
    return {
      body: response.body,
      etag: sha
        ? `"${sha}"`
        : (response.headers.get("etag") ?? `"${image.id}"`),
      size:
        Number.parseInt(response.headers.get("content-length") ?? "", 10) ||
        null,
      uploaded: null,
    };
  }

  async delete(images: StoredImageRecord[]): Promise<void> {
    for (const image of images) {
      await this.deleteOne(image);
    }
  }

  private async deleteOne(image: StoredImageRecord): Promise<void> {
    const reference = this.reference(image);
    let { sha } = reference;
    const root = apiRoot(reference.owner, reference.repo);
    if (!sha) {
      const metadata = await fetch(
        `${root}/contents/${encodePath(image.object_key)}?ref=${encodeURIComponent(reference.branch)}`,
        { headers: githubHeaders(reference.token) },
      );
      if (metadata.status === 404) return;
      if (!metadata.ok) {
        throw new Error(
          `GitHub metadata read failed (HTTP ${metadata.status})`,
        );
      }
      const payload: unknown = await metadata.json();
      sha =
        payload &&
        typeof payload === "object" &&
        "sha" in payload &&
        typeof payload.sha === "string"
          ? payload.sha
          : null;
    }
    if (!sha) return;

    const response = await fetch(
      `${root}/contents/${encodePath(image.object_key)}`,
      {
        method: "DELETE",
        headers: {
          ...githubHeaders(reference.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Delete expired image ${image.id} via VanishPic`,
          sha,
          branch: reference.branch,
        }),
      },
    );
    if (response.status !== 404 && !response.ok) {
      throw new Error(`GitHub delete failed (HTTP ${response.status})`);
    }
  }
}

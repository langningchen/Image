import { describe, expect, it } from "vitest";
import {
  groupImagesByBackend,
  imageObjectKey,
  type StoredImageRecord,
} from "@/lib/storage/ports/image-storage";

const image = (id: string, backend: "r2" | "github"): StoredImageRecord => ({
  id,
  object_key: `images/${id}.png`,
  storage_backend: backend,
  storage_ref: null,
});

describe("storage domain", () => {
  it("creates backend-neutral object keys", () => {
    expect(imageObjectKey({ id: "abc", extension: "webp" })).toBe(
      "images/abc.webp",
    );
  });

  it("groups mixed deletion batches by adapter", () => {
    const groups = groupImagesByBackend([
      image("r2-a", "r2"),
      image("github-a", "github"),
      image("r2-b", "r2"),
    ]);

    expect(groups.get("r2")?.map(({ id }) => id)).toEqual(["r2-a", "r2-b"]);
    expect(groups.get("github")?.map(({ id }) => id)).toEqual(["github-a"]);
  });
});

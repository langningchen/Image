import type { ImageRecord, StorageBackend } from "@/lib/types";

export type StoredImageRecord = Pick<
  ImageRecord,
  "id" | "object_key" | "storage_backend" | "storage_ref"
>;

export interface StoreImageInput {
  id: string;
  extension: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface StoredUpload {
  objectKey: string;
  storageRef: string | null;
  backend: StorageBackend;
}

export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  etag: string;
  size: number | null;
  uploaded: Date | null;
}

export interface ImageStoragePort {
  readonly backend: StorageBackend;
  put(input: StoreImageInput): Promise<StoredUpload>;
  get(image: ImageRecord): Promise<StoredObject | null>;
  delete(images: StoredImageRecord[]): Promise<void>;
}

export function imageObjectKey(input: {
  id: string;
  extension: string;
}): string {
  return `images/${input.id}.${input.extension}`;
}

export function groupImagesByBackend(
  images: StoredImageRecord[],
): Map<StorageBackend, StoredImageRecord[]> {
  const groups = new Map<StorageBackend, StoredImageRecord[]>();
  for (const image of images) {
    const current = groups.get(image.storage_backend) ?? [];
    current.push(image);
    groups.set(image.storage_backend, current);
  }
  return groups;
}

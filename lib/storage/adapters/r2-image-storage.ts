import type {
  ImageStoragePort,
  StoredImageRecord,
  StoredObject,
  StoredUpload,
  StoreImageInput,
} from "@/lib/storage/ports/image-storage";
import { imageObjectKey } from "@/lib/storage/ports/image-storage";
import type { ImageRecord } from "@/lib/types";

export class R2ImageStorage implements ImageStoragePort {
  readonly backend = "r2" as const;

  constructor(private readonly bucket: R2Bucket) {}

  async put(input: StoreImageInput): Promise<StoredUpload> {
    const objectKey = imageObjectKey(input);
    const object = await this.bucket.put(objectKey, input.bytes, {
      httpMetadata: {
        contentType: input.contentType,
        cacheControl: "public, max-age=3600",
      },
      customMetadata: { imageId: input.id },
    });
    if (!object) throw new Error("R2 rejected the image write");
    return {
      objectKey,
      storageRef: object.etag,
      backend: this.backend,
    };
  }

  async get(image: ImageRecord): Promise<StoredObject | null> {
    const object = await this.bucket.get(image.object_key);
    if (!object) return null;
    return {
      body: object.body,
      etag: object.httpEtag,
      size: object.size,
      uploaded: object.uploaded,
    };
  }

  async delete(images: StoredImageRecord[]): Promise<void> {
    if (images.length === 0) return;
    await this.bucket.delete(images.map(({ object_key }) => object_key));
  }
}

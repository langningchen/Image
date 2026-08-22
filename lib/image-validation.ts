const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export class ImageValidationError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
    readonly params?: Record<string, string | number>,
  ) {
    super(code);
  }
}

function bytesEqual(
  bytes: Uint8Array,
  expected: number[],
  offset = 0,
): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytesEqual(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesEqual(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (
    bytesEqual(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    bytesEqual(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  )
    return "image/gif";
  if (
    bytesEqual(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesEqual(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "image/webp";
  if (
    bytesEqual(bytes, [0x66, 0x74, 0x79, 0x70], 4) &&
    ["avif", "avis"].includes(
      String.fromCharCode(...Array.from(bytes.slice(8, 12))),
    )
  )
    return "image/avif";
  return null;
}

export function maxUploadBytes(env: CloudflareEnv): number {
  const configured = Number.parseInt(env.MAX_UPLOAD_MIB ?? "10", 10);
  const mib = Number.isFinite(configured)
    ? Math.min(25, Math.max(1, configured))
    : 10;
  return mib * 1024 * 1024;
}

export function validateImage(
  file: File,
  bytes: Uint8Array,
  maxBytes: number,
): { contentType: string; extension: string; safeName: string } {
  if (file.size <= 0) throw new ImageValidationError("EMPTY_FILE");
  if (file.size > maxBytes)
    throw new ImageValidationError("FILE_TOO_LARGE", 413, {
      maxMiB: Math.floor(maxBytes / 1024 / 1024),
    });
  const detected = detectImageMime(bytes);
  if (!detected || !MIME_EXTENSIONS[detected])
    throw new ImageValidationError("UNSUPPORTED_IMAGE", 415);
  const normalizedName = file.name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 120);
  const dotIndex = normalizedName.lastIndexOf(".");
  const baseName =
    dotIndex > 0 ? normalizedName.slice(0, dotIndex) : normalizedName;
  const extension = MIME_EXTENSIONS[detected];
  return {
    contentType: detected,
    extension,
    safeName: `${baseName || "image"}.${extension}`,
  };
}

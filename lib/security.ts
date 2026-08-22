const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(secret),
    encoder.encode(value),
  );
  return bytesToHex(new Uint8Array(signature));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function randomToken(byteLength = 24): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createSession(
  secret: string,
  purpose: string,
  ttlSeconds: number,
): Promise<string> {
  const payload = `${purpose}.${Math.floor(Date.now() / 1000) + ttlSeconds}.${randomToken(12)}`;
  return `${payload}.${await hmacHex(secret, payload)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  purpose: string,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== purpose) return false;
  const payload = parts.slice(0, 3).join(".");
  const expiresAt = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000)
    return false;
  const expected = await hmacHex(secret, payload);
  return constantTimeEqual(expected, parts[3]);
}

export function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function sessionCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function accessPasswordHash(
  password: string,
  secret: string,
): Promise<string> {
  return hmacHex(secret, `access-password:${password}`);
}

export async function subjectIdForIp(
  ip: string,
  secret: string,
): Promise<string> {
  return hmacHex(secret, `uploader-ip:${ip}`);
}

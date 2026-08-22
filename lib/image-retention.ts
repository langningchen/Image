export const DAY_MS = 86_400_000;
export const IMAGE_INACTIVITY_RETENTION_DAYS = 7;
export const IMAGE_INACTIVITY_RETENTION_MS =
  IMAGE_INACTIVITY_RETENTION_DAYS * DAY_MS;
export const HOME_PREVIEW_QUERY_KEY = "preview";

export function isHomePreviewRequest(request: Request): boolean {
  return new URL(request.url).searchParams.get(HOME_PREVIEW_QUERY_KEY) === "1";
}

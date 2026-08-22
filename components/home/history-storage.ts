import type { LocalImage } from "@/components/home/types";

const HISTORY_KEY = "vanishpic-upload-history-v1";

export function readHistory(): LocalImage[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? value.filter((item): item is LocalImage =>
          Boolean(
            item &&
              typeof item === "object" &&
              "id" in item &&
              "deleteToken" in item &&
              typeof item.id === "string" &&
              typeof item.deleteToken === "string",
          ),
        )
      : [];
  } catch {
    return [];
  }
}

export function saveHistory(images: LocalImage[], limit = 100) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(images.slice(0, Math.max(1, limit))),
  );
}

export function mergeHistory(
  current: LocalImage[],
  additions: LocalImage[],
): LocalImage[] {
  const additionIds = new Set(additions.map(({ id }) => id));
  return [...additions, ...current.filter(({ id }) => !additionIds.has(id))];
}

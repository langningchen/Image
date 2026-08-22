export interface ApiErrorPayload {
  code: string;
  params?: Record<string, string | number | boolean | null>;
}

export class ApiError extends Error {
  constructor(
    readonly payload: ApiErrorPayload,
    readonly status: number,
  ) {
    super(payload.code);
  }
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({ code: "UNKNOWN" }, response.status);
  }
  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("ok" in payload) ||
    payload.ok !== true
  ) {
    const error =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "code" in payload.error &&
      typeof payload.error.code === "string"
        ? (payload.error as ApiErrorPayload)
        : { code: "UNKNOWN" };
    throw new ApiError(error, response.status);
  }
  return payload as T;
}

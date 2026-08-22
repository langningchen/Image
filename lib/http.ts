export function jsonError(
  code: string,
  status: number,
  params?: Record<string, string | number | boolean | null>,
) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        ...(params ? { params } : {}),
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return Response.json(
    { ok: true, ...data },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function withApiErrorBoundary(
  label: string,
  operation: () => Response | Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    console.error(label, error);
    return jsonError("INTERNAL_ERROR", 500);
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

export function maskIp(ip: string): string {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts.slice(0, 3).join(".")}.*` : "IPv4";
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return `${parts.slice(0, 3).join(":")}::/48`;
  }
  return "unknown";
}

export function requestHasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function truncate(value: string, maxLength: number): string {
  const normalized = value.trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

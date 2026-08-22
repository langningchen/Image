"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { ApiError } from "@/lib/api-client";

function intlParams(
  params?: Record<string, string | number | boolean | null>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params ?? {})
      .filter(
        (entry): entry is [string, string | number | boolean] =>
          entry[1] !== null,
      )
      .map(([key, value]) => [
        key,
        typeof value === "boolean" ? String(value) : value,
      ]),
  );
}

export function useApiError() {
  const errors = useTranslations("Errors");
  return useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiError)) return errors("UNKNOWN");
      return errors.has(error.payload.code)
        ? errors(error.payload.code, intlParams(error.payload.params))
        : errors("UNKNOWN");
    },
    [errors],
  );
}

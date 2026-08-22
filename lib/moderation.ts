import type { AppSettings, ModerationResult } from "@/lib/types";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(offset, offset + chunkSize)),
    );
  }
  return btoa(binary);
}

function parseJsonObject(value: string): Record<string, unknown> {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return JSON");
  return JSON.parse(withoutFence.slice(start, end + 1)) as Record<
    string,
    unknown
  >;
}

function responseText(response: Record<string, unknown>): string {
  if (typeof response.response === "string") return response.response;
  if (typeof response.result === "string") return response.result;

  const choice = Array.isArray(response.choices) ? response.choices[0] : null;
  if (choice && typeof choice === "object") {
    const message = "message" in choice ? choice.message : null;
    if (
      message &&
      typeof message === "object" &&
      "content" in message &&
      typeof message.content === "string"
    ) {
      return message.content;
    }
  }
  return JSON.stringify(response);
}

function moderationErrorReason(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "AI moderation failed";
  if (
    message.includes("5016") ||
    message.toLowerCase().includes("submit the prompt 'agree'")
  ) {
    return "The selected AI model requires the administrator to accept its provider license. Choose another vision model or accept the license in Cloudflare first.";
  }
  return message.slice(0, 500);
}

export async function moderateImage(
  env: CloudflareEnv,
  bytes: Uint8Array,
  contentType: string,
  settings: AppSettings,
): Promise<ModerationResult> {
  if (!settings.aiModerationEnabled) {
    return {
      status: "skipped",
      reason: "AI moderation is disabled",
      categories: [],
      confidence: null,
    };
  }

  try {
    const prompt = `You are a strict image-content safety classifier.
Policy: ${settings.aiPolicy}
Inspect the supplied image. Return ONLY one compact JSON object with this exact shape:
{"allowed":true,"categories":[],"reason":"brief reason","confidence":0.0}
Set allowed to false when the image violates the policy. confidence must be 0 to 1. Do not add Markdown.`;
    const imageUrl = `data:${contentType};base64,${toBase64(bytes)}`;
    const response = (await (
      env.AI as unknown as {
        run: (
          model: string,
          input: Record<string, unknown>,
        ) => Promise<unknown>;
      }
    ).run(settings.aiModel, {
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this uploaded image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 220,
      temperature: 0,
    })) as Record<string, unknown>;

    const raw = responseText(response);
    const parsed = parseJsonObject(raw);
    const allowed = parsed.allowed === true;
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
          .filter((item): item is string => typeof item === "string")
          .slice(0, 12)
      : [];
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : null;
    const reason =
      typeof parsed.reason === "string"
        ? parsed.reason.slice(0, 500)
        : allowed
          ? "AI classified the image as allowed"
          : "AI classified the image as a policy violation";
    return {
      status: allowed ? "allowed" : "blocked",
      reason,
      categories,
      confidence,
      raw: raw.slice(0, 2_000),
    };
  } catch (error) {
    return {
      status: "error",
      reason: moderationErrorReason(error),
      categories: [],
      confidence: null,
    };
  }
}

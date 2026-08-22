import { describe, expect, it, vi } from "vitest";
import { moderateImage } from "@/lib/moderation";
import type { AppSettings } from "@/lib/types";

const settings: AppSettings = {
  siteName: "VanishPic",
  uploadTitle: "Upload an image",
  uploadDescription: "",
  siteFooter: "",
  showRecentUploads: true,
  pasteUploadEnabled: true,
  maxBatchSize: 20,
  uploadConcurrency: 3,
  historyLimit: 24,
  allowUploaderDelete: true,
  showExpiryTime: true,
  showViewCount: true,
  accessMode: "public",
  accessPasswordHash: "",
  retentionDays: 30,
  warningBanThreshold: 3,
  autoBanHours: 168,
  uploadLimitPerHour: 30,
  violationAction: "delete_warn",
  aiModerationEnabled: true,
  aiFailMode: "allow",
  aiModel: "@cf/mistralai/mistral-small-3.1-24b-instruct",
  aiPolicy: "Reject unsafe images.",
  siteNotice: "",
  auditLogDays: 90,
};

describe("AI moderation", () => {
  it("supports multimodal chat-completion responses", async () => {
    const run = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"allowed":false,"categories":["violence"],"reason":"Unsafe","confidence":0.9}',
          },
        },
      ],
    });
    const env = { AI: { run } } as unknown as CloudflareEnv;

    const result = await moderateImage(
      env,
      new Uint8Array([1, 2, 3]),
      "image/png",
      settings,
    );

    expect(result.status).toBe("blocked");
    expect(result.categories).toEqual(["violence"]);
    expect(run).toHaveBeenCalledWith(
      settings.aiModel,
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image_url",
                image_url: {
                  url: expect.stringMatching(/^data:image\/png;base64,/u),
                },
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("turns model-license failures into an actionable error", async () => {
    const env = {
      AI: {
        run: vi
          .fn()
          .mockRejectedValue(
            new Error("5016: You must submit the prompt 'agree'."),
          ),
      },
    } as unknown as CloudflareEnv;

    const result = await moderateImage(env, new Uint8Array([1]), "image/jpeg", {
      ...settings,
      aiModel: "@cf/meta/llama-3.2-11b-vision-instruct",
    });

    expect(result.status).toBe("error");
    expect(result.reason).toContain("requires the administrator");
  });
});

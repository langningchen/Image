export const moderationLabels: Record<string, string> = {
  allowed: "moderationAllowed",
  blocked: "moderationBlocked",
  error: "moderationError",
  skipped: "moderationSkipped",
};

export const eventLabels: Record<string, string> = {
  warning: "eventWarning",
  ai_rejected: "eventAiRejected",
  ai_error: "eventAiError",
  admin_delete: "eventAdminDelete",
  uploader_delete: "eventUploaderDelete",
  ban_temporary: "eventTemporaryBan",
  ban_permanent: "eventPermanentBan",
  unban: "eventUnban",
  reset_warnings: "eventResetWarnings",
};

export const actorLabels: Record<string, string> = {
  admin: "actorAdmin",
  ai: "actorAi",
  system: "actorSystem",
};

export const aiModelOptions = [
  {
    value: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    label: "aiModelMistral",
  },
  {
    value: "@cf/google/gemma-4-26b-a4b-it",
    label: "aiModelGemma",
  },
] as const;

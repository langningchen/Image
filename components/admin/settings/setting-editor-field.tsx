"use client";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import { aiModelOptions } from "@/components/admin/constants";
import type { SettingEditorId, SiteSettings } from "@/components/admin/types";

type TextKey =
  | "siteName"
  | "uploadTitle"
  | "uploadDescription"
  | "siteNotice"
  | "siteFooter"
  | "aiPolicy";
type NumberKey =
  | "maxBatchSize"
  | "uploadConcurrency"
  | "historyLimit"
  | "uploadLimitPerHour"
  | "retentionDays"
  | "warningBanThreshold"
  | "autoBanHours"
  | "auditLogDays";
type BooleanKey =
  | "showRecentUploads"
  | "pasteUploadEnabled"
  | "allowUploaderDelete"
  | "showExpiryTime"
  | "showViewCount"
  | "aiModerationEnabled";

const textFields: Partial<
  Record<
    TextKey,
    { label: string; maxLength: number; multiline?: boolean; minRows?: number }
  >
> = {
  siteName: { label: "siteName", maxLength: 60 },
  uploadTitle: { label: "uploadTitle", maxLength: 120 },
  uploadDescription: {
    label: "uploadDescription",
    maxLength: 300,
    multiline: true,
    minRows: 3,
  },
  siteNotice: {
    label: "siteNotice",
    maxLength: 1_000,
    multiline: true,
    minRows: 4,
  },
  siteFooter: {
    label: "siteFooter",
    maxLength: 500,
    multiline: true,
    minRows: 3,
  },
  aiPolicy: {
    label: "aiPolicy",
    maxLength: 2_000,
    multiline: true,
    minRows: 8,
  },
};

const numberFields: Partial<
  Record<NumberKey, { label: string; min: number; max: number }>
> = {
  maxBatchSize: { label: "maxBatchSize", min: 1, max: 50 },
  uploadConcurrency: { label: "uploadConcurrency", min: 1, max: 6 },
  historyLimit: { label: "historyLimit", min: 1, max: 100 },
  uploadLimitPerHour: { label: "uploadLimit", min: 1, max: 1_000 },
  retentionDays: { label: "retentionDays", min: 1, max: 365 },
  warningBanThreshold: { label: "warningThreshold", min: 0, max: 100 },
  autoBanHours: { label: "autoBanHours", min: 0, max: 8_760 },
  auditLogDays: { label: "auditLogDays", min: 7, max: 365 },
};

const booleanFields: Partial<Record<BooleanKey, string>> = {
  showRecentUploads: "showRecentUploads",
  pasteUploadEnabled: "pasteUploadEnabled",
  allowUploaderDelete: "allowUploaderDelete",
  showExpiryTime: "showExpiryTime",
  showViewCount: "showViewCount",
  aiModerationEnabled: "aiModeration",
};

export function SettingEditorField({
  id,
  settings,
  accessPassword,
  clearAccessPassword,
  onChange,
  onAccessPasswordChange,
  onClearAccessPasswordChange,
}: {
  id: Exclude<SettingEditorId, "storage">;
  settings: SiteSettings;
  accessPassword: string;
  clearAccessPassword: boolean;
  onChange: (settings: SiteSettings) => void;
  onAccessPasswordChange: (value: string) => void;
  onClearAccessPasswordChange: (value: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const textField = textFields[id as TextKey];
  if (textField) {
    const key = id as TextKey;
    return (
      <TextField
        fullWidth
        autoFocus
        label={t(textField.label)}
        value={settings[key]}
        multiline={textField.multiline}
        minRows={textField.minRows}
        disabled={key === "aiPolicy" && !settings.aiModerationEnabled}
        onChange={(event) =>
          onChange({ ...settings, [key]: event.target.value })
        }
        slotProps={{ htmlInput: { maxLength: textField.maxLength } }}
      />
    );
  }

  const numberField = numberFields[id as NumberKey];
  if (numberField) {
    const key = id as NumberKey;
    return (
      <TextField
        fullWidth
        autoFocus
        type="number"
        label={t(numberField.label)}
        value={settings[key]}
        onChange={(event) =>
          onChange({ ...settings, [key]: Number(event.target.value) })
        }
        slotProps={{
          htmlInput: { min: numberField.min, max: numberField.max },
        }}
      />
    );
  }

  const booleanLabel = booleanFields[id as BooleanKey];
  if (booleanLabel) {
    const key = id as BooleanKey;
    return (
      <FormControlLabel
        control={
          <Switch
            autoFocus
            checked={settings[key]}
            onChange={(event) =>
              onChange({ ...settings, [key]: event.target.checked })
            }
          />
        }
        label={t(booleanLabel)}
      />
    );
  }

  if (id === "accessMode") {
    return (
      <Stack spacing={3}>
        <TextField
          select
          fullWidth
          autoFocus
          label={t("accessMode")}
          value={settings.accessMode}
          onChange={(event) =>
            onChange({
              ...settings,
              accessMode: event.target.value as "public" | "password",
            })
          }
        >
          <MenuItem value="public">{t("publicAccess")}</MenuItem>
          <MenuItem value="password">{t("passwordAccess")}</MenuItem>
        </TextField>
        <TextField
          fullWidth
          type="password"
          autoComplete="new-password"
          label={t("newAccessPassword")}
          value={accessPassword}
          onChange={(event) => onAccessPasswordChange(event.target.value)}
          disabled={settings.accessMode !== "password"}
          helperText={
            settings.accessPasswordConfigured
              ? t("accessPasswordConfigured")
              : t("accessPasswordNotConfigured")
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={clearAccessPassword}
              onChange={(event) =>
                onClearAccessPasswordChange(event.target.checked)
              }
            />
          }
          label={t("clearAccessPassword")}
        />
      </Stack>
    );
  }

  if (id === "violationAction" || id === "aiFailMode") {
    return (
      <TextField
        select
        fullWidth
        autoFocus
        label={t(id === "violationAction" ? "violationAction" : "aiFailMode")}
        value={settings[id]}
        disabled={id === "aiFailMode" && !settings.aiModerationEnabled}
        onChange={(event) =>
          onChange({ ...settings, [id]: event.target.value })
        }
      >
        {id === "violationAction"
          ? [
              <MenuItem key="delete" value="delete">
                {t("deleteOnly")}
              </MenuItem>,
              <MenuItem key="delete_warn" value="delete_warn">
                {t("deleteAndWarn")}
              </MenuItem>,
            ]
          : [
              <MenuItem key="allow" value="allow">
                {t("allowOnFailure")}
              </MenuItem>,
              <MenuItem key="block" value="block">
                {t("blockOnFailure")}
              </MenuItem>,
            ]}
      </TextField>
    );
  }

  return (
    <TextField
      select
      fullWidth
      autoFocus
      label={t("aiModel")}
      value={settings.aiModel}
      disabled={!settings.aiModerationEnabled}
      onChange={(event) =>
        onChange({ ...settings, aiModel: event.target.value })
      }
    >
      {!aiModelOptions.some(({ value }) => value === settings.aiModel) && (
        <MenuItem value={settings.aiModel}>{settings.aiModel}</MenuItem>
      )}
      {aiModelOptions.map(({ value, label }) => (
        <MenuItem key={value} value={value}>
          {t(label)}
        </MenuItem>
      ))}
    </TextField>
  );
}

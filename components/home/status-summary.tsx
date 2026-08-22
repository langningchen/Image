"use client";

import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";
import type { PublicConfigResponse } from "@/components/home/types";

export function StatusSummary({
  config,
  warningText,
}: {
  config: PublicConfigResponse;
  warningText: string | null;
}) {
  const t = useTranslations("Home");
  const retention = config.config.demoMode
    ? t("demoRetention")
    : t("retention", { days: config.config.retentionDays });
  const hasWarning = Boolean(warningText || config.viewer.warningCount);
  return (
    <Stack spacing={1.5}>
      <Alert severity="info" variant="outlined" icon={<ScheduleOutlined />}>
        <strong>{t("defaultNotice")}</strong> · {retention}
      </Alert>
      {config.config.siteNotice && (
        <Alert severity="info" variant="outlined" icon={<CampaignOutlined />}>
          {config.config.siteNotice}
        </Alert>
      )}
      {hasWarning && (
        <Alert
          severity="warning"
          variant="outlined"
          icon={<WarningAmberRounded />}
        >
          {warningText || t("sourceWarning")}
          {config.viewer.warningCount
            ? ` (${t("warningCount", { count: config.viewer.warningCount })})`
            : ""}
        </Alert>
      )}
    </Stack>
  );
}

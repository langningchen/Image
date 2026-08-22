"use client";

import BlockRounded from "@mui/icons-material/BlockRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import StorageRounded from "@mui/icons-material/StorageRounded";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { PanelHeading } from "@/components/admin/panel-heading";
import type { AdminOverview } from "@/components/admin/types";

export function OverviewPanel({
  overview,
  formatBytes,
  onStorageSettings,
}: {
  overview: AdminOverview;
  formatBytes: (value: number) => string;
  onStorageSettings: () => void;
}) {
  const t = useTranslations("Admin");
  const cards = [
    [t("statImages"), String(overview.stats.images), <ImageRounded key="i" />],
    [
      t("statStorage"),
      formatBytes(overview.stats.bytes),
      <StorageRounded key="s" />,
    ],
    [
      t("statSubjects"),
      String(overview.stats.subjects),
      <PeopleAltRounded key="u" />,
    ],
    [t("statBanned"), String(overview.stats.banned), <BlockRounded key="b" />],
  ];

  return (
    <Stack spacing={2}>
      <PanelHeading
        title={t("overview")}
        description={t("overviewDescription")}
      />
      <Grid container spacing={2}>
        {cards.map(([label, value, icon]) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={String(label)}>
            <Card variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  <Avatar variant="rounded">{icon}</Avatar>
                  <Stack spacing={0.25} sx={{ minWidth: 0, width: "100%" }}>
                    <Typography color="text.secondary" variant="body2">
                      {label}
                    </Typography>
                    <Typography
                      variant="h5"
                      color="text.primary"
                      noWrap
                      sx={{ minWidth: 0 }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid size={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Stack sx={{ minWidth: 0 }}>
                  <Typography color="text.secondary" variant="body2">
                    {t("storage")}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.primary"
                    sx={{ mt: 0.25, minWidth: 0, wordBreak: "break-word" }}
                  >
                    {overview.setup.backend === "r2"
                      ? t("r2")
                      : `${t("github")} · ${overview.setup.githubOwner}/${overview.setup.githubRepo}@${overview.setup.githubBranch}`}
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onStorageSettings}
                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                >
                  {t("storageSettings")}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

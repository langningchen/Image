"use client";

import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import LaunchRounded from "@mui/icons-material/LaunchRounded";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { PanelHeading } from "@/components/admin/panel-heading";
import type { LocalImage } from "@/components/home/types";

function previewUrl(url: string): string {
  const preview = new URL(url);
  preview.searchParams.set("preview", "1");
  return preview.href;
}

export function UploadHistory({
  images,
  formatDate,
  showExpiryTime,
  showViewCount,
  allowUploaderDelete,
  onCopy,
  onDelete,
}: {
  images: LocalImage[];
  formatDate: (value: number) => string;
  showExpiryTime: boolean;
  showViewCount: boolean;
  allowUploaderDelete: boolean;
  onCopy: (url: string) => void;
  onDelete: (image: LocalImage) => void;
}) {
  const t = useTranslations("Home");
  const common = useTranslations("Common");
  return (
    <Stack component="section" spacing={2}>
      <PanelHeading title={t("historyTitle")} description={t("historyHint")} />
      {images.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography align="center" color="text.secondary">
              {t("emptyHistory")}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={image.id}>
              <Card variant="outlined">
                <CardMedia
                  component="img"
                  src={previewUrl(image.url)}
                  alt={image.originalName}
                  loading="lazy"
                  height="190"
                />
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    noWrap
                    title={image.originalName}
                  >
                    {image.originalName}
                  </Typography>
                  <Stack spacing={0.5}>
                    {showExpiryTime && (
                      <Typography variant="caption" color="text.secondary">
                        {t("expiresAt", { date: formatDate(image.expiresAt) })}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {t("lastAccessedAt", {
                        date: formatDate(image.lastAccessedAt),
                      })}
                    </Typography>
                    {showViewCount && (
                      <Typography variant="caption" color="text.secondary">
                        {t("views", { count: image.viewCount ?? 0 })}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
                <CardActions>
                  <Tooltip title={common("copy")}>
                    <IconButton
                      aria-label={common("copy")}
                      onClick={() => onCopy(image.url)}
                    >
                      <ContentCopyRounded />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={common("open")}>
                    <IconButton
                      component="a"
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={common("open")}
                    >
                      <LaunchRounded />
                    </IconButton>
                  </Tooltip>
                  {allowUploaderDelete && (
                    <Tooltip title={common("delete")}>
                      <IconButton
                        color="error"
                        aria-label={common("delete")}
                        onClick={() => onDelete(image)}
                      >
                        <DeleteOutlineRounded />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

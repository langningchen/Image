"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { DeleteOwnImageDialog } from "@/components/home/delete-image-dialog";
import { StatusSummary } from "@/components/home/status-summary";
import { UploadAccessGate } from "@/components/home/upload-access-gate";
import { UploadHistory } from "@/components/home/upload-history";
import { UploadPanel } from "@/components/home/upload-panel";
import { useHomeUploader } from "@/components/home/use-home-uploader";
import { NotificationCenter } from "@/components/notification-center";
import { useApiError } from "@/components/use-api-error";

export function HomeClient() {
  const t = useTranslations("Home");
  const common = useTranslations("Common");
  const format = useFormatter();
  const translateError = useApiError();
  const uploader = useHomeUploader();
  const config = uploader.config;
  const formatDate = (value: number) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <AppShell brand={config?.config.siteName}>
      <Container component="main" maxWidth="lg">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography component="h1" variant="h4">
              {config?.config.uploadTitle || t("title")}
            </Typography>
            <Typography color="text.secondary">
              {config?.config.uploadDescription || t("uploadDescription")}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t("sevenDayExpiry")}
            </Typography>
          </Stack>

          {!config ? (
            <Card variant="outlined">
              <CardContent>
                <Stack>
                  <CircularProgress />
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                {config.viewer.banned ||
                (!config.viewer.hasAccess &&
                  config.config.accessMode === "password") ? (
                  <UploadAccessGate
                    banned={config.viewer.banned}
                    permanentBan={config.viewer.permanentBan}
                    bannedUntil={config.viewer.bannedUntil}
                    locked={!config.viewer.hasAccess}
                    password={uploader.password}
                    unlocking={uploader.unlocking}
                    formatDate={formatDate}
                    onPasswordChange={uploader.setPassword}
                    onUnlock={() => void uploader.unlock()}
                  />
                ) : (
                  <UploadPanel
                    files={uploader.files}
                    maxUploadMiB={config.config.maxUploadMiB}
                    pasteEnabled={config.config.pasteUploadEnabled}
                    uploading={uploader.uploading}
                    progress={uploader.progress}
                    onFiles={uploader.addFiles}
                    onRemove={(index) =>
                      uploader.setFiles((current) =>
                        current.filter(
                          (_file, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                    onUpload={() => void uploader.upload()}
                  />
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <StatusSummary
                  config={config}
                  warningText={uploader.warningText}
                />
              </Grid>
              {config.config.showRecentUploads && (
                <Grid size={12}>
                  <UploadHistory
                    images={uploader.history}
                    formatDate={formatDate}
                    showExpiryTime={config.config.showExpiryTime}
                    showViewCount={config.config.showViewCount}
                    allowUploaderDelete={config.config.allowUploaderDelete}
                    onCopy={(url) =>
                      void navigator.clipboard
                        .writeText(url)
                        .then(() =>
                          uploader.setMessage({
                            severity: "success",
                            text: common("copied"),
                          }),
                        )
                        .catch((error) =>
                          uploader.setMessage({
                            severity: "error",
                            text: translateError(error),
                          }),
                        )
                    }
                    onDelete={uploader.setDeleting}
                  />
                </Grid>
              )}
              {config.config.siteFooter && (
                <Grid size={12}>
                  <Typography
                    component="footer"
                    align="center"
                    color="text.secondary"
                    variant="body2"
                  >
                    {config.config.siteFooter}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </Stack>
      </Container>

      <DeleteOwnImageDialog
        image={uploader.deleting}
        onConfirm={() => void uploader.deleteImage()}
        onClose={() => uploader.setDeleting(null)}
      />
      <NotificationCenter
        message={uploader.message}
        onClose={() => uploader.setMessage(null)}
      />
    </AppShell>
  );
}

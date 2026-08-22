"use client";

import LogoutRounded from "@mui/icons-material/LogoutRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import {
  DeleteImageDialog,
  SubjectActionDialog,
} from "@/components/admin/moderation-dialogs";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { SiteSettingsPanel } from "@/components/admin/site-settings-panel";
import { StorageSetupDrawer } from "@/components/admin/storage-setup-drawer";
import { useAdminDashboard } from "@/components/admin/use-admin-dashboard";
import { AppShell } from "@/components/app-shell";
import { NotificationCenter } from "@/components/notification-center";

function GridLoading() {
  return (
    <Stack>
      <CircularProgress />
    </Stack>
  );
}

const DataViewPanel = dynamic(
  () =>
    import("@/components/admin/data-view-panel").then(
      ({ DataViewPanel: Component }) => Component,
    ),
  { loading: GridLoading },
);

export function AdminClient() {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const format = useFormatter();
  const dashboard = useAdminDashboard();
  const formatDate = useCallback(
    (value: number | null) =>
      value
        ? format.dateTime(new Date(value), {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : common("never"),
    [common, format],
  );
  const formatBytes = useCallback(
    (value: number) =>
      value < 1_048_576
        ? `${format.number(value / 1024, { maximumFractionDigits: 1 })} KiB`
        : `${format.number(value / 1_048_576, { maximumFractionDigits: 1 })} MiB`,
    [format],
  );

  if (dashboard.checking) {
    return (
      <AppShell admin>
        <Container component="main" maxWidth="xl">
          <Stack>
            <CircularProgress />
          </Stack>
        </Container>
      </AppShell>
    );
  }

  if (!dashboard.authenticated) {
    return (
      <AppShell admin>
        <AdminLogin
          password={dashboard.password}
          busy={dashboard.busy}
          onPasswordChange={dashboard.setPassword}
          onSubmit={() => void dashboard.login()}
        />
        <NotificationCenter
          message={dashboard.message}
          onClose={() => dashboard.setMessage(null)}
        />
      </AppShell>
    );
  }

  const overview = dashboard.overview;
  return (
    <AppShell admin brand={overview?.settings.siteName}>
      <Container component="main" maxWidth="xl">
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              justifyContent: "space-between",
              alignItems: {
                xs: "flex-start",
                sm: "center",
              },
            }}
          >
            <Stack spacing={0.5}>
              <Typography component="h1" variant="h4">
                {t("title")}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {t("dashboardDescription")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
              <Tooltip title={common("refresh")}>
                <IconButton
                  aria-label={common("refresh")}
                  disabled={dashboard.busy}
                  onClick={() => void dashboard.refresh()}
                >
                  <RefreshRounded />
                </IconButton>
              </Tooltip>
              {!overview?.demoMode && (
                <Tooltip title={t("logout")}>
                  <IconButton
                    aria-label={t("logout")}
                    onClick={() => void dashboard.logout()}
                  >
                    <LogoutRounded />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {overview?.demoMode && (
            <Alert severity="info">{t("demoBanner")}</Alert>
          )}

          <AdminNavigation view={dashboard.view} onChange={dashboard.setView} />

          {!overview ? (
            <GridLoading />
          ) : dashboard.view === "overview" ? (
            <OverviewPanel
              overview={overview}
              formatBytes={formatBytes}
              onStorageSettings={() => dashboard.setSetupOpen(true)}
            />
          ) : dashboard.view === "settings" ? (
            dashboard.settings ? (
              <SiteSettingsPanel
                settings={dashboard.settings}
                setup={overview.setup}
                newPassword={dashboard.newAccessPassword}
                clearPassword={dashboard.clearAccessPassword}
                busy={dashboard.busy}
                onNewPasswordChange={dashboard.setNewAccessPassword}
                onClearPasswordChange={dashboard.setClearAccessPassword}
                onStorageSettings={() => dashboard.setSetupOpen(true)}
                onSave={dashboard.saveSettings}
              />
            ) : (
              <GridLoading />
            )
          ) : (
            <DataViewPanel
              view={dashboard.view}
              overview={overview}
              manualIp={dashboard.manualIp}
              formatDate={formatDate}
              formatBytes={formatBytes}
              onManualIpChange={dashboard.setManualIp}
              onDelete={dashboard.openDelete}
              onAction={dashboard.openAction}
            />
          )}
        </Stack>
      </Container>

      <StorageSetupDrawer
        open={dashboard.setupOpen}
        required={!overview?.setup.setupCompleted}
        setup={dashboard.setup}
        busy={dashboard.busy}
        onChange={dashboard.setSetup}
        onSave={() => void dashboard.saveSetup()}
        onClose={() => dashboard.setSetupOpen(false)}
      />
      <DeleteImageDialog
        target={dashboard.deleteTarget}
        warn={dashboard.deleteWarn}
        reason={dashboard.reason}
        busy={dashboard.busy}
        onWarnChange={dashboard.setDeleteWarn}
        onReasonChange={dashboard.setReason}
        onConfirm={() => void dashboard.deleteImage()}
        onClose={() => dashboard.setDeleteTarget(null)}
      />
      <SubjectActionDialog
        target={dashboard.actionTarget}
        subjects={overview?.subjects ?? []}
        reason={dashboard.reason}
        durationHours={dashboard.durationHours}
        busy={dashboard.busy}
        onReasonChange={dashboard.setReason}
        onDurationChange={dashboard.setDurationHours}
        onConfirm={() => void dashboard.applySubjectAction()}
        onClose={() => dashboard.setActionTarget(null)}
      />
      <NotificationCenter
        message={dashboard.message}
        onClose={() => dashboard.setMessage(null)}
      />
    </AppShell>
  );
}

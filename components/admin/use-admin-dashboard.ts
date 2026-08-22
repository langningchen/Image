"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type {
  AdminImage,
  AdminOverview,
  AdminView,
  SiteSettings,
  StorageSetup,
  SubjectActionTarget,
} from "@/components/admin/types";
import type { UiMessage } from "@/components/notification-center";
import { useApiError } from "@/components/use-api-error";
import { apiFetch } from "@/lib/api-client";

const initialSetup: StorageSetup = {
  backend: "r2",
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
  githubPat: "",
};

export function useAdminDashboard() {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const translateError = useApiError();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AdminView>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setup, setSetup] = useState<StorageSetup>(initialSetup);
  const [newAccessPassword, setNewAccessPassword] = useState("");
  const [clearAccessPassword, setClearAccessPassword] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminImage | null>(null);
  const [deleteWarn, setDeleteWarn] = useState(true);
  const [actionTarget, setActionTarget] = useState<SubjectActionTarget | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState(24);

  const loadOverview = useCallback(async () => {
    const data = await apiFetch<AdminOverview>("/api/admin/overview");
    setOverview(data);
    setSettings(data.settings);
    setSetup({
      backend: data.setup.backend,
      githubOwner: data.setup.githubOwner,
      githubRepo: data.setup.githubRepo,
      githubBranch: data.setup.githubBranch || "main",
      githubPat: "",
    });
    if (!data.setup.setupCompleted) setSetupOpen(true);
  }, []);

  useEffect(() => {
    void apiFetch<{
      ok: true;
      authenticated: boolean;
      demoMode: boolean;
      setupCompleted: boolean;
    }>("/api/admin/session")
      .then(async (session) => {
        setAuthenticated(session.authenticated);
        if (session.authenticated) await loadOverview();
      })
      .catch((error) =>
        setMessage({ severity: "error", text: translateError(error) }),
      )
      .finally(() => setChecking(false));
  }, [loadOverview, translateError]);

  const run = useCallback(
    async (operation: () => Promise<void>) => {
      setBusy(true);
      try {
        await operation();
        return true;
      } catch (error) {
        setMessage({ severity: "error", text: translateError(error) });
        return false;
      } finally {
        setBusy(false);
        setChecking(false);
      }
    },
    [translateError],
  );

  const login = () =>
    run(async () => {
      await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setAuthenticated(true);
      setPassword("");
      await loadOverview();
    });

  const logout = async () => {
    await apiFetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setOverview(null);
  };

  const saveSetup = () =>
    run(async () => {
      const result = await apiFetch<{ ok: true; simulated: boolean }>(
        "/api/admin/setup",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(setup),
        },
      );
      setMessage({
        severity: "success",
        text: result.simulated ? common("simulated") : t("setupSaved"),
      });
      setSetupOpen(false);
      await loadOverview();
    });

  const saveSettings = (
    nextSettings: SiteSettings,
    accessPassword: string,
    clearPassword: boolean,
  ) =>
    run(async () => {
      const result = await apiFetch<{ ok: true; simulated: boolean }>(
        "/api/admin/settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...nextSettings,
            accessPassword,
            clearAccessPassword: clearPassword,
          }),
        },
      );
      setNewAccessPassword("");
      setClearAccessPassword(false);
      setMessage({
        severity: "success",
        text: result.simulated ? common("simulated") : t("settingsSaved"),
      });
      await loadOverview();
    });

  const deleteImage = () =>
    run(async () => {
      if (!deleteTarget) return;
      const result = await apiFetch<{ ok: true; simulated: boolean }>(
        `/api/admin/images/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warn: deleteWarn, reason }),
        },
      );
      setDeleteTarget(null);
      setReason("");
      setMessage({
        severity: "success",
        text: result.simulated ? common("simulated") : t("imageDeleted"),
      });
      await loadOverview();
    });

  const applySubjectAction = () =>
    run(async () => {
      if (!actionTarget) return;
      const endpoint = actionTarget.id
        ? `/api/admin/subjects/${encodeURIComponent(actionTarget.id)}`
        : "/api/admin/subjects";
      const result = await apiFetch<{ ok: true; simulated: boolean }>(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(actionTarget.ip ? { ip: actionTarget.ip } : {}),
            action: actionTarget.action,
            reason,
            durationHours,
          }),
        },
      );
      setActionTarget(null);
      setReason("");
      setMessage({
        severity: "success",
        text: result.simulated ? common("simulated") : t("actionApplied"),
      });
      await loadOverview();
    });

  const openDelete = (image: AdminImage) => {
    setDeleteTarget(image);
    setDeleteWarn(overview?.settings.violationAction === "delete_warn");
    setReason("");
  };

  const openAction = (target: SubjectActionTarget) => {
    setActionTarget(target);
    setReason("");
    setDurationHours(24);
  };

  const refresh = () =>
    run(async () => {
      await loadOverview();
      setMessage({ severity: "success", text: common("refreshed") });
    });

  return {
    checking,
    authenticated,
    password,
    busy,
    view,
    overview,
    settings,
    message,
    setupOpen,
    setup,
    newAccessPassword,
    clearAccessPassword,
    manualIp,
    deleteTarget,
    deleteWarn,
    actionTarget,
    reason,
    durationHours,
    setPassword,
    setView,
    setMessage,
    setSetupOpen,
    setSetup,
    setNewAccessPassword,
    setClearAccessPassword,
    setManualIp,
    setDeleteTarget,
    setDeleteWarn,
    setActionTarget,
    setReason,
    setDurationHours,
    login,
    logout,
    saveSetup,
    saveSettings,
    deleteImage,
    applySubjectAction,
    openDelete,
    openAction,
    refresh,
  };
}

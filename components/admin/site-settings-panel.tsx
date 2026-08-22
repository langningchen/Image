"use client";

import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PanelHeading } from "@/components/admin/panel-heading";
import { SettingsEditorDrawer } from "@/components/admin/settings/settings-editor-drawer";
import { SettingsListSection } from "@/components/admin/settings/settings-list-section";
import { SettingsToc } from "@/components/admin/settings/settings-toc";
import { useSettingSections } from "@/components/admin/settings/use-setting-sections";
import type {
  AdminOverview,
  SettingEditorId,
  SiteSettings,
} from "@/components/admin/types";

export function SiteSettingsPanel({
  settings,
  setup,
  newPassword,
  clearPassword,
  busy,
  onNewPasswordChange,
  onClearPasswordChange,
  onStorageSettings,
  onSave,
}: {
  settings: SiteSettings;
  setup: AdminOverview["setup"];
  newPassword: string;
  clearPassword: boolean;
  busy: boolean;
  onNewPasswordChange: (value: string) => void;
  onClearPasswordChange: (value: boolean) => void;
  onStorageSettings: () => void;
  onSave: (
    settings: SiteSettings,
    accessPassword: string,
    clearAccessPassword: boolean,
  ) => Promise<boolean>;
}) {
  const t = useTranslations("Admin");
  const sections = useSettingSections(settings, setup);
  const [active, setActive] = useState<SettingEditorId | null>(null);
  const [draft, setDraft] = useState(settings);
  const entry =
    sections
      .flatMap((section) => section.entries)
      .find(({ id }) => id === active) ?? null;

  useEffect(() => {
    if (!active) setDraft(settings);
  }, [active, settings]);

  const edit = (id: SettingEditorId) => {
    if (id === "storage") {
      onStorageSettings();
      return;
    }
    setDraft(settings);
    onNewPasswordChange("");
    onClearPasswordChange(false);
    setActive(id);
  };

  const cancel = () => {
    setActive(null);
    setDraft(settings);
    onNewPasswordChange("");
    onClearPasswordChange(false);
  };

  const save = async () => {
    const saved = await onSave(draft, newPassword, clearPassword);
    if (saved) setActive(null);
  };

  return (
    <Stack spacing={3}>
      <PanelHeading
        title={t("settings")}
        description={t("settingsDescription")}
      />
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <SettingsToc sections={sections} />
        </Grid>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Stack spacing={3}>
            {sections.map((section) => (
              <SettingsListSection
                key={section.id}
                section={section}
                onEdit={edit}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
      <SettingsEditorDrawer
        entry={entry}
        settings={draft}
        accessPassword={newPassword}
        clearAccessPassword={clearPassword}
        busy={busy}
        onChange={setDraft}
        onAccessPasswordChange={onNewPasswordChange}
        onClearAccessPasswordChange={onClearPasswordChange}
        onCancel={cancel}
        onSave={() => void save()}
      />
    </Stack>
  );
}

"use client";

import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { SettingEditorField } from "@/components/admin/settings/setting-editor-field";
import type { SettingListEntry } from "@/components/admin/settings/settings-list-section";
import { SideDrawerPaper } from "@/components/admin/side-drawer-paper";
import type { SiteSettings } from "@/components/admin/types";

export function SettingsEditorDrawer({
  entry,
  settings,
  accessPassword,
  clearAccessPassword,
  busy,
  onChange,
  onAccessPasswordChange,
  onClearAccessPasswordChange,
  onCancel,
  onSave,
}: {
  entry: SettingListEntry | null;
  settings: SiteSettings;
  accessPassword: string;
  clearAccessPassword: boolean;
  busy: boolean;
  onChange: (settings: SiteSettings) => void;
  onAccessPasswordChange: (value: string) => void;
  onClearAccessPasswordChange: (value: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const common = useTranslations("Common");
  const editorId: Exclude<SettingListEntry["id"], "storage"> | null =
    entry?.id && entry.id !== "storage" ? entry.id : null;
  const editable = editorId ? entry : null;

  return (
    <Drawer
      anchor="right"
      open={Boolean(editable)}
      onClose={onCancel}
      slots={{ paper: SideDrawerPaper }}
    >
      <DialogTitle>{editable?.label}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography color="text.secondary">
            {editable?.description}
          </Typography>
          {editorId && (
            <SettingEditorField
              id={editorId}
              settings={settings}
              accessPassword={accessPassword}
              clearAccessPassword={clearAccessPassword}
              onChange={onChange}
              onAccessPasswordChange={onAccessPasswordChange}
              onClearAccessPasswordChange={onClearAccessPasswordChange}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onCancel}>
          {common("cancel")}
        </Button>
        <Button variant="contained" disabled={busy} onClick={onSave}>
          {common("save")}
        </Button>
      </DialogActions>
    </Drawer>
  );
}

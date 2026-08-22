"use client";

import CloudOutlined from "@mui/icons-material/CloudOutlined";
import GitHub from "@mui/icons-material/GitHub";
import SaveRounded from "@mui/icons-material/SaveRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { SideDrawerPaper } from "@/components/admin/side-drawer-paper";
import type { StorageSetup } from "@/components/admin/types";

export function StorageSetupDrawer({
  open,
  required,
  setup,
  busy,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean;
  required: boolean;
  setup: StorageSetup;
  busy: boolean;
  onChange: (setup: StorageSetup) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={required ? undefined : onClose}
      slots={{ paper: SideDrawerPaper }}
    >
      <DialogTitle>{t("setupTitle")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography color="text.secondary">{t("setupHint")}</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={setup.backend}
            onChange={(_event, value: "r2" | "github" | null) => {
              if (value) onChange({ ...setup, backend: value });
            }}
            aria-label={t("storage")}
          >
            <ToggleButton value="r2">
              <CloudOutlined />
              <span>{t("r2Short")}</span>
            </ToggleButton>
            <ToggleButton value="github">
              <GitHub />
              <span>{t("github")}</span>
            </ToggleButton>
          </ToggleButtonGroup>
          <Alert severity={setup.backend === "r2" ? "success" : "warning"}>
            {setup.backend === "r2" ? t("r2Hint") : t("githubHint")}
          </Alert>
          {setup.backend === "github" && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label={t("githubOwner")}
                value={setup.githubOwner}
                onChange={(event) =>
                  onChange({ ...setup, githubOwner: event.target.value })
                }
              />
              <TextField
                fullWidth
                label={t("githubRepo")}
                value={setup.githubRepo}
                onChange={(event) =>
                  onChange({ ...setup, githubRepo: event.target.value })
                }
              />
              <TextField
                fullWidth
                label={t("githubBranch")}
                value={setup.githubBranch}
                onChange={(event) =>
                  onChange({ ...setup, githubBranch: event.target.value })
                }
              />
              <TextField
                fullWidth
                type="password"
                autoComplete="new-password"
                label={t("githubPat")}
                helperText={t("githubPatKeep")}
                value={setup.githubPat}
                onChange={(event) =>
                  onChange({ ...setup, githubPat: event.target.value })
                }
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!required && <Button onClick={onClose}>{common("cancel")}</Button>}
        <Button
          variant="contained"
          disabled={busy}
          onClick={onSave}
          startIcon={<SaveRounded />}
        >
          {t("completeSetup")}
        </Button>
      </DialogActions>
    </Drawer>
  );
}

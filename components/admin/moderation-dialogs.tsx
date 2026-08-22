"use client";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type {
  AdminImage,
  AdminSubject,
  SubjectActionTarget,
} from "@/components/admin/types";

function actionLabel(
  action: SubjectActionTarget["action"],
): "warn" | "temporaryBan" | "permanentBan" | "unban" | "resetWarnings" {
  if (action === "warn") return "warn";
  if (action === "ban_temporary") return "temporaryBan";
  if (action === "ban_permanent") return "permanentBan";
  if (action === "unban") return "unban";
  return "resetWarnings";
}

export function DeleteImageDialog({
  target,
  warn,
  reason,
  busy,
  onWarnChange,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  target: AdminImage | null;
  warn: boolean;
  reason: string;
  busy: boolean;
  onWarnChange: (value: boolean) => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("deleteImage")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>{target?.originalName}</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={warn}
                onChange={(event) => onWarnChange(event.target.checked)}
              />
            }
            label={t("warnSource")}
          />
          <TextField
            fullWidth
            label={t("reason")}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{common("cancel")}</Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy}
          onClick={onConfirm}
        >
          {t("confirmDelete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function SubjectActionDialog({
  target,
  subjects,
  reason,
  durationHours,
  busy,
  onReasonChange,
  onDurationChange,
  onConfirm,
  onClose,
}: {
  target: SubjectActionTarget | null;
  subjects: AdminSubject[];
  reason: string;
  durationHours: number;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const source =
    target?.ip ?? subjects.find(({ id }) => id === target?.id)?.ipMasked;
  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{target ? t(actionLabel(target.action)) : ""}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary">{source}</Typography>
          {target?.action === "ban_temporary" && (
            <TextField
              fullWidth
              label={t("durationHours")}
              type="number"
              value={durationHours}
              onChange={(event) => onDurationChange(Number(event.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 8760 } }}
            />
          )}
          {target && !["unban", "reset_warnings"].includes(target.action) && (
            <TextField
              fullWidth
              label={t("reason")}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              multiline
              minRows={3}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{common("cancel")}</Button>
        <Button variant="contained" disabled={busy} onClick={onConfirm}>
          {common("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

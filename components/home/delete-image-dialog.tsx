"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useTranslations } from "next-intl";
import type { LocalImage } from "@/components/home/types";

export function DeleteOwnImageDialog({
  image,
  onConfirm,
  onClose,
}: {
  image: LocalImage | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Home");
  const common = useTranslations("Common");
  return (
    <Dialog open={Boolean(image)} onClose={onClose}>
      <DialogTitle>{t("deleteOwnTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t("deleteOwnHint")}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{common("cancel")}</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {common("delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

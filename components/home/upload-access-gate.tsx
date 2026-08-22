"use client";

import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

export function UploadAccessGate({
  banned,
  permanentBan,
  bannedUntil,
  locked,
  password,
  unlocking,
  formatDate,
  onPasswordChange,
  onUnlock,
}: {
  banned: boolean;
  permanentBan: boolean;
  bannedUntil: number | null;
  locked: boolean;
  password: string;
  unlocking: boolean;
  formatDate: (value: number) => string;
  onPasswordChange: (value: string) => void;
  onUnlock: () => void;
}) {
  const t = useTranslations("Home");
  return (
    <Card variant="outlined">
      <CardContent>
        {banned ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <WarningAmberRounded color="error" fontSize="large" />
              <Typography variant="h6">
                {permanentBan
                  ? t("bannedPermanent")
                  : t("bannedTemporary", {
                      date: formatDate(bannedUntil ?? Date.now()),
                    })}
              </Typography>
            </Stack>
          </Stack>
        ) : locked ? (
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) => {
              event.preventDefault();
              onUnlock();
            }}
          >
            <Typography variant="h6">{t("accessTitle")}</Typography>
            <TextField
              label={t("accessPassword")}
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onPaste={(event) => {
                const pasted =
                  event.clipboardData?.getData("text")?.trim() ?? "";
                if (!pasted) return;
                event.preventDefault();
                onPasswordChange(pasted);
                window.requestAnimationFrame(() => onUnlock());
              }}
              autoComplete="current-password"
              autoFocus
            />
            <Button type="submit" variant="contained" disabled={unlocking}>
              {unlocking ? <CircularProgress size={22} /> : t("unlock")}
            </Button>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

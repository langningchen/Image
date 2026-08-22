"use client";

import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

export function AdminLogin({
  password,
  busy,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("Admin");
  return (
    <Container component="main" maxWidth="xs">
      <Toolbar />
      <Paper variant="outlined">
        <CardContent>
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <Typography component="h1" variant="h5">
              {t("loginTitle")}
            </Typography>
            <TextField
              label={t("password")}
              type="password"
              autoComplete="current-password"
              onPaste={(event) => {
                const pasted =
                  event.clipboardData?.getData("text")?.trim() ?? "";
                if (!pasted) return;
                event.preventDefault();
                onPasswordChange(pasted);
                window.requestAnimationFrame(() => onSubmit());
              }}
              autoFocus
              fullWidth
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
            <Button variant="contained" type="submit" disabled={busy}>
              {busy ? <CircularProgress size={22} /> : t("login")}
            </Button>
          </Stack>
        </CardContent>
      </Paper>
      <Toolbar />
    </Container>
  );
}

"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export interface UiMessage {
  severity: "success" | "error" | "info" | "warning";
  text: string;
}

export function NotificationCenter({
  message,
  onClose,
}: {
  message: UiMessage | null;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        variant="filled"
        severity={message?.severity ?? "success"}
        onClose={onClose}
      >
        {message?.text}
      </Alert>
    </Snackbar>
  );
}

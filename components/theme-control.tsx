"use client";

import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRounded from "@mui/icons-material/SettingsBrightnessRounded";
import IconButton from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function ThemeControl() {
  const t = useTranslations("Navigation");
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const nextMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  const ModeIcon =
    mode === "light"
      ? LightModeRounded
      : mode === "dark"
        ? DarkModeRounded
        : SettingsBrightnessRounded;

  return (
    <Tooltip
      title={
        mounted
          ? t(mode === "light" ? "light" : mode === "dark" ? "dark" : "system")
          : t("system")
      }
    >
      <IconButton
        aria-label={t("theme")}
        onClick={() => setMode(nextMode)}
        disabled={!mounted}
        color="inherit"
      >
        <ModeIcon />
      </IconButton>
    </Tooltip>
  );
}

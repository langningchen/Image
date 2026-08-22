"use client";

import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslations } from "next-intl";
import type { AdminView } from "@/components/admin/types";

const views = ["overview", "settings", "images", "subjects", "events"] as const;

export function AdminNavigation({
  view,
  onChange,
}: {
  view: AdminView;
  onChange: (view: AdminView) => void;
}) {
  const t = useTranslations("Admin");
  return (
    <Paper component="nav" square variant="outlined">
      <Tabs
        value={view}
        onChange={(_event, value: AdminView) => onChange(value)}
        aria-label={t("section")}
        variant="scrollable"
        scrollButtons="auto"
        textColor="primary"
        indicatorColor="primary"
        sx={{
          minHeight: 36,
          "& .MuiTab-root": {
            minHeight: 36,
            paddingY: 0.25,
            paddingX: 1.25,
            textTransform: "none",
            fontWeight: 500,
          },
        }}
      >
        {views.map((value) => (
          <Tab key={value} value={value} label={t(value)} />
        ))}
      </Tabs>
      <Divider />
    </Paper>
  );
}

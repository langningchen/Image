"use client";

import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { SettingListSection } from "@/components/admin/settings/settings-list-section";

export function SettingsToc({ sections }: { sections: SettingListSection[] }) {
  const t = useTranslations("Admin");
  const [active, setActive] = useState<string | undefined>(sections[0]?.id);
  const visibility = useRef<Record<string, number>>({});

  useEffect(() => {
    visibility.current = {};
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.current[entry.target.id] = entry.intersectionRatio;
        }

        let activeSection: string | undefined;
        let highestRatio = -1;

        for (const section of sections) {
          const ratio = visibility.current[section.id] ?? 0;
          if (ratio <= 0) continue;
          if (ratio > highestRatio) {
            highestRatio = ratio;
            activeSection = section.id;
          }
        }

        if (activeSection) {
          setActive(activeSection);
        }
      },
      {
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  const jumpTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    setActive(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <Paper
      component="aside"
      variant="outlined"
      square
      sx={{
        position: "sticky",
        top: 88,
        zIndex: 1,
        alignSelf: "flex-start",
      }}
    >
      <List
        dense
        disablePadding
        subheader={
          <ListSubheader component="div" disableSticky>
            {t("onThisPage")}
          </ListSubheader>
        }
        sx={{
          py: 0,
          maxHeight: "calc(100vh - 180px)",
          overflow: "auto",
          "& .MuiListItemButton-root": {
            px: 1.5,
          },
          "& .MuiListItemText-secondary": {
            fontSize: "0.75rem",
          },
        }}
      >
        {sections.map((section) => (
          <Tooltip key={section.id} title={section.description} describeChild>
            <ListItemButton
              selected={active === section.id}
              onClick={() => jumpTo(section.id)}
              aria-label={section.title}
            >
              <ListItemText
                primary={section.title}
                secondary={section.description}
                slotProps={{
                  primary: { variant: "body2" },
                  secondary: { color: "text.secondary", variant: "body2" },
                }}
              />
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Paper>
  );
}

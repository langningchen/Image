"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type {
  SettingEditorId,
  SettingsSectionId,
} from "@/components/admin/types";

export interface SettingListEntry {
  id: SettingEditorId;
  label: string;
  description: string;
  summary: string;
}

export interface SettingListSection {
  id: SettingsSectionId;
  title: string;
  description: string;
  entries: SettingListEntry[];
}

export function SettingsListSection({
  section,
  onEdit,
}: {
  section: SettingListSection;
  onEdit: (id: SettingEditorId) => void;
}) {
  const common = useTranslations("Common");
  return (
    <Paper component="section" id={section.id} variant="outlined">
      <List
        dense
        disablePadding
        subheader={
          <ListSubheader component="div" disableSticky>
            <Typography variant="subtitle2">{section.title}</Typography>
            <Typography color="text.secondary" variant="body2">
              {section.description}
            </Typography>
          </ListSubheader>
        }
      >
        <Divider />
        {section.entries.map((entry, index) => (
          <ListItem
            key={entry.id}
            divider={index < section.entries.length - 1}
            disablePadding
            sx={{
              alignItems: "flex-start",
              px: 1.5,
              py: 1,
            }}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Tooltip title={entry.summary}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{
                      maxWidth: 220,
                    }}
                  >
                    {entry.summary}
                  </Typography>
                </Tooltip>
                <Tooltip title={common("edit")}>
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label={`${common("edit")} ${entry.label}`}
                    onClick={() => onEdit(entry.id)}
                  >
                    <EditRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemText
              sx={{ minWidth: 0, flex: 1 }}
              primary={
                <Tooltip title={entry.description} describeChild>
                  <Typography variant="subtitle2">{entry.label}</Typography>
                </Tooltip>
              }
              secondary={
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  {entry.description}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

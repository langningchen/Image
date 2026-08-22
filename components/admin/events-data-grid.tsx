"use client";

import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid } from "@mui/x-data-grid/DataGrid";
import type { GridColDef } from "@mui/x-data-grid/models";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  adminGridDefaultProps,
  adminGridSx,
} from "@/components/admin/admin-data-grid";
import { actorLabels, eventLabels } from "@/components/admin/constants";
import { PanelHeading } from "@/components/admin/panel-heading";
import type { ModerationEvent } from "@/components/admin/types";

function formatDetails(value: string | null): string {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function TextCell({ value }: { value: string | null }) {
  const text = value || "—";
  return (
    <Tooltip title={text}>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "normal",
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
}

function LogField({
  label,
  value,
  mono = false,
  isEmpty = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isEmpty?: boolean;
}) {
  return (
    <Grid container spacing={1}>
      <Grid size={{ xs: 12, sm: 3 }}>
        <Typography color="text.secondary" variant="subtitle2">
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 9 }}>
        {mono ? (
          <Typography
            component="pre"
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0,
              p: 1,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 360,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {value}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            color={isEmpty ? "text.disabled" : "text.primary"}
            sx={{ wordBreak: "break-word" }}
          >
            {value}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}

function LogRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      spacing={1}
      sx={{
        py: 0.5,
        "& + &": {
          borderTop: "1px solid",
          borderColor: "divider",
          pt: 1,
        },
      }}
    >
      {children}
    </Stack>
  );
}

export function EventsDataGrid({
  events,
  formatDate,
}: {
  events: ModerationEvent[];
  formatDate: (value: number | null) => string;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const [selected, setSelected] = useState<ModerationEvent | null>(null);
  const columns = useMemo<GridColDef<ModerationEvent>[]>(
    () => [
      {
        field: "createdAt",
        headerName: t("time"),
        width: 180,
        renderCell: ({ value }) => formatDate(value),
      },
      {
        field: "eventType",
        headerName: t("eventType"),
        width: 190,
        renderCell: ({ value }) => t(eventLabels[value] ?? "eventUnknown"),
      },
      {
        field: "actor",
        headerName: t("actor"),
        width: 150,
        renderCell: ({ value }) => t(actorLabels[value] ?? "actorUnknown"),
      },
      {
        field: "subjectId",
        headerName: t("sourceId"),
        minWidth: 210,
        flex: 0.8,
        renderCell: ({ value }) => <TextCell value={value} />,
      },
      {
        field: "imageId",
        headerName: t("imageId"),
        minWidth: 190,
        flex: 0.7,
        renderCell: ({ value }) => <TextCell value={value} />,
      },
      {
        field: "reason",
        headerName: t("reason"),
        minWidth: 240,
        flex: 1.2,
        renderCell: ({ value }) => <TextCell value={value} />,
      },
      {
        field: "details",
        headerName: common("details"),
        minWidth: 240,
        flex: 1.2,
        renderCell: ({ value }) => <TextCell value={value} />,
      },
      {
        field: "actions",
        headerName: t("actions"),
        width: 88,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <Tooltip title={t("viewLogEntry")}>
            <IconButton
              size="small"
              aria-label={t("viewLogEntry")}
              onClick={() => setSelected(row)}
            >
              <VisibilityOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [common, formatDate, t],
  );

  return (
    <>
      <Stack spacing={2}>
        <PanelHeading
          title={t("events")}
          description={t("eventsDescription")}
        />
        <DataGrid
          {...adminGridDefaultProps}
          rows={events}
          columns={columns}
          localeText={{ noRowsLabel: t("noEvents") }}
          sx={adminGridSx}
        />
      </Stack>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {selected ? t("logEntryTitle", { id: selected.id }) : ""}
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack
              spacing={0}
              sx={{
                "& .MuiGrid-root": {
                  minWidth: 0,
                },
              }}
            >
              <LogRow>
                <LogField
                  label={t("time")}
                  value={formatDate(selected.createdAt)}
                />
              </LogRow>
              <LogRow>
                <LogField
                  label={t("eventType")}
                  value={t(eventLabels[selected.eventType] ?? "eventUnknown")}
                />
              </LogRow>
              <LogRow>
                <LogField
                  label={t("actor")}
                  value={t(actorLabels[selected.actor] ?? "actorUnknown")}
                />
              </LogRow>
              <LogRow>
                <LogField label={t("sourceId")} value={selected.subjectId} />
              </LogRow>
              <LogRow>
                <LogField
                  label={t("imageId")}
                  value={selected.imageId || "—"}
                />
              </LogRow>
              <LogRow>
                <LogField
                  label={t("reason")}
                  value={selected.reason || "—"}
                  isEmpty={!selected.reason}
                />
              </LogRow>
              <LogRow>
                <LogField
                  label={common("details")}
                  value={formatDetails(selected.details)}
                  mono
                />
              </LogRow>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>{common("close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

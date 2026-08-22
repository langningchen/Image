"use client";

import BlockRounded from "@mui/icons-material/BlockRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid } from "@mui/x-data-grid/DataGrid";
import type { GridColDef } from "@mui/x-data-grid/models";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  adminGridDefaultProps,
  adminGridSx,
} from "@/components/admin/admin-data-grid";
import { PanelHeading } from "@/components/admin/panel-heading";
import type {
  AdminSubject,
  SubjectActionTarget,
} from "@/components/admin/types";

function ActionButton({
  title,
  color,
  onClick,
  children,
}: {
  title: string;
  color?: "default" | "error" | "warning" | "primary";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        color={color}
        aria-label={title}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export function SubjectsDataGrid({
  subjects,
  manualIp,
  formatDate,
  onManualIpChange,
  onAction,
}: {
  subjects: AdminSubject[];
  manualIp: string;
  formatDate: (value: number | null) => string;
  onManualIpChange: (value: string) => void;
  onAction: (target: SubjectActionTarget) => void;
}) {
  const t = useTranslations("Admin");
  const columns = useMemo<GridColDef<AdminSubject>[]>(
    () => [
      {
        field: "ipMasked",
        headerName: t("source"),
        minWidth: 190,
        flex: 1,
        renderCell: ({ row }) => (
          <Stack>
            <Typography variant="body2">{row.ipMasked}</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={row.id}
            >
              {row.id}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "warningCount",
        headerName: t("warnings"),
        type: "number",
        width: 100,
      },
      {
        field: "uploadCount",
        headerName: t("uploads"),
        type: "number",
        width: 100,
      },
      {
        field: "status",
        headerName: t("status"),
        width: 170,
        valueGetter: (_value, row) =>
          row.permanentBan
            ? "permanent"
            : row.bannedUntil && row.bannedUntil > Date.now()
              ? "temporary"
              : "active",
        renderCell: ({ value }) => (
          <Chip
            size="small"
            color={value === "active" ? "success" : "error"}
            label={t(
              value === "permanent"
                ? "permanentlyBanned"
                : value === "temporary"
                  ? "temporarilyBanned"
                  : "active",
            )}
          />
        ),
      },
      {
        field: "lastSeenAt",
        headerName: t("lastSeen"),
        width: 180,
        renderCell: ({ value }) => formatDate(value),
      },
      {
        field: "actions",
        headerName: t("actions"),
        width: 240,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => {
          const banned =
            row.permanentBan ||
            Boolean(row.bannedUntil && row.bannedUntil > Date.now());
          return (
            <Stack direction="row">
              <ActionButton
                title={t("warn")}
                color="warning"
                onClick={() => onAction({ id: row.id, action: "warn" })}
              >
                <ReportProblemOutlined fontSize="small" />
              </ActionButton>
              <ActionButton
                title={t("temporaryBan")}
                onClick={() =>
                  onAction({ id: row.id, action: "ban_temporary" })
                }
              >
                <TimerOutlined fontSize="small" />
              </ActionButton>
              <ActionButton
                title={t("permanentBan")}
                color="error"
                onClick={() =>
                  onAction({ id: row.id, action: "ban_permanent" })
                }
              >
                <BlockRounded fontSize="small" />
              </ActionButton>
              {banned && (
                <ActionButton
                  title={t("unban")}
                  color="primary"
                  onClick={() => onAction({ id: row.id, action: "unban" })}
                >
                  <LockOpenRounded fontSize="small" />
                </ActionButton>
              )}
              <ActionButton
                title={t("resetWarnings")}
                onClick={() =>
                  onAction({ id: row.id, action: "reset_warnings" })
                }
              >
                <RestartAltRounded fontSize="small" />
              </ActionButton>
            </Stack>
          );
        },
      },
    ],
    [formatDate, onAction, t],
  );

  return (
    <Stack spacing={2}>
      <PanelHeading
        title={t("subjects")}
        description={t("subjectsDescription")}
      />
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label={t("source")}
              placeholder="203.0.113.42"
              value={manualIp}
              onChange={(event) => onManualIpChange(event.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              disabled={!manualIp.trim()}
              onClick={() =>
                onAction({
                  ip: manualIp.trim(),
                  action: "ban_temporary",
                })
              }
            >
              {t("temporaryBan")}
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={!manualIp.trim()}
              onClick={() =>
                onAction({
                  ip: manualIp.trim(),
                  action: "ban_permanent",
                })
              }
            >
              {t("permanentBan")}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <DataGrid
        {...adminGridDefaultProps}
        rows={subjects}
        columns={columns}
        localeText={{ noRowsLabel: t("noSubjects") }}
        sx={adminGridSx}
      />
    </Stack>
  );
}

"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { DataGrid } from "@mui/x-data-grid/DataGrid";
import type { GridColDef } from "@mui/x-data-grid/models";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  adminGridDefaultProps,
  adminGridSx,
} from "@/components/admin/admin-data-grid";
import { moderationLabels } from "@/components/admin/constants";
import { PanelHeading } from "@/components/admin/panel-heading";
import type { AdminImage } from "@/components/admin/types";

export function ImagesDataGrid({
  images,
  formatDate,
  formatBytes,
  onDelete,
}: {
  images: AdminImage[];
  formatDate: (value: number | null) => string;
  formatBytes: (value: number) => string;
  onDelete: (image: AdminImage) => void;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const columns = useMemo<GridColDef<AdminImage>[]>(
    () => [
      {
        field: "originalName",
        headerName: t("image"),
        minWidth: 250,
        flex: 1.4,
        sortable: false,
        renderCell: ({ row }) => (
          <ListItem disablePadding>
            <ListItemAvatar>
              <Avatar variant="rounded" src={`/${row.id}`} alt="" />
            </ListItemAvatar>
            <ListItemText
              primary={row.originalName}
              secondary={`${formatBytes(row.byteSize)} · ${row.storageBackend.toUpperCase()}`}
              slotProps={{ primary: { noWrap: true, title: row.originalName } }}
            />
          </ListItem>
        ),
      },
      {
        field: "createdAt",
        headerName: t("created"),
        width: 180,
        renderCell: ({ value }) => formatDate(value),
      },
      {
        field: "expiresAt",
        headerName: t("expires"),
        width: 180,
        renderCell: ({ value }) => formatDate(value),
      },
      {
        field: "ipMasked",
        headerName: t("source"),
        minWidth: 150,
        flex: 0.7,
        renderCell: ({ value }) => value || common("unknown"),
      },
      {
        field: "viewCount",
        headerName: t("views"),
        width: 90,
        type: "number",
      },
      {
        field: "moderationStatus",
        headerName: t("status"),
        width: 130,
        renderCell: ({ value }) => (
          <Chip
            size="small"
            label={t(moderationLabels[value] ?? "moderationSkipped")}
          />
        ),
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
          <Tooltip title={t("deleteImage")}>
            <IconButton
              color="error"
              size="small"
              aria-label={t("deleteImage")}
              onClick={() => onDelete(row)}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [common, formatBytes, formatDate, onDelete, t],
  );

  return (
    <Stack spacing={2}>
      <PanelHeading title={t("images")} description={t("imagesDescription")} />
      <DataGrid
        {...adminGridDefaultProps}
        rows={images}
        columns={columns}
        localeText={{ noRowsLabel: t("noImages") }}
        sx={adminGridSx}
      />
    </Stack>
  );
}

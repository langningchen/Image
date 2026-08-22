"use client";

import type { Theme } from "@mui/material/styles";
import type { DataGridProps } from "@mui/x-data-grid";

export const adminGridDefaultProps: Pick<
  DataGridProps,
  | "autoHeight"
  | "density"
  | "disableRowSelectionOnClick"
  | "getRowHeight"
  | "initialState"
  | "pageSizeOptions"
  | "slotProps"
> = {
  autoHeight: true,
  density: "compact",
  disableRowSelectionOnClick: true,
  getRowHeight: () => "auto",
  pageSizeOptions: [10, 25, 50, 100],
  initialState: {
    pagination: {
      paginationModel: {
        pageSize: 25,
        page: 0,
      },
    },
  },
  slotProps: {
    loadingOverlay: {
      variant: "linear-progress",
    },
  },
} as const;

export const adminGridSx = (theme: Theme) => ({
  borderRadius: 0,
  "& .MuiDataGrid-cell": {
    alignItems: "center",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: theme.palette.action.hover,
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 600,
  },
  "& .MuiDataGrid-row": {
    minHeight: "44px !important",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: theme.palette.action.hover,
  },
});

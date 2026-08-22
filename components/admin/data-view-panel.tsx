"use client";

import { EventsDataGrid } from "@/components/admin/events-data-grid";
import { ImagesDataGrid } from "@/components/admin/images-data-grid";
import { SubjectsDataGrid } from "@/components/admin/subjects-data-grid";
import type {
  AdminImage,
  AdminOverview,
  SubjectActionTarget,
} from "@/components/admin/types";

export function DataViewPanel({
  view,
  overview,
  manualIp,
  formatDate,
  formatBytes,
  onManualIpChange,
  onDelete,
  onAction,
}: {
  view: "images" | "subjects" | "events";
  overview: AdminOverview;
  manualIp: string;
  formatDate: (value: number | null) => string;
  formatBytes: (value: number) => string;
  onManualIpChange: (value: string) => void;
  onDelete: (image: AdminImage) => void;
  onAction: (target: SubjectActionTarget) => void;
}) {
  if (view === "images") {
    return (
      <ImagesDataGrid
        images={overview.images}
        formatDate={formatDate}
        formatBytes={formatBytes}
        onDelete={onDelete}
      />
    );
  }

  if (view === "subjects") {
    return (
      <SubjectsDataGrid
        subjects={overview.subjects}
        manualIp={manualIp}
        formatDate={formatDate}
        onManualIpChange={onManualIpChange}
        onAction={onAction}
      />
    );
  }

  return <EventsDataGrid events={overview.events} formatDate={formatDate} />;
}

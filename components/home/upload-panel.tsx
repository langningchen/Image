"use client";

import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import InsertPhotoRounded from "@mui/icons-material/InsertPhotoRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import type { UploadProgress } from "@/components/home/types";

export function UploadPanel({
  files,
  maxUploadMiB,
  pasteEnabled,
  uploading,
  progress,
  onFiles,
  onRemove,
  onUpload,
}: {
  files: File[];
  maxUploadMiB: number;
  pasteEnabled: boolean;
  uploading: boolean;
  progress: UploadProgress | null;
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onUpload: () => void;
}) {
  const t = useTranslations("Home");
  const common = useTranslations("Common");
  const format = useFormatter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const progressValue =
    progress && progress.total > 0
      ? (progress.completed / progress.total) * 100
      : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Button
              fullWidth
              size="medium"
              variant="contained"
              color={dragging ? "secondary" : "primary"}
              startIcon={<CloudUploadRounded />}
              onDragOver={(event: DragEvent<HTMLButtonElement>) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event: DragEvent<HTMLButtonElement>) => {
                event.preventDefault();
                setDragging(false);
                onFiles(Array.from(event.dataTransfer.files));
              }}
              onClick={() => input.current?.click()}
            >
              {t("dropTitle")}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {t("dropHint", { maxMiB: maxUploadMiB })}
            </Typography>
            {pasteEnabled && (
              <Typography variant="body2" color="text.secondary">
                {t("pasteHint")}
              </Typography>
            )}
          </Stack>
          <input
            ref={input}
            hidden
            multiple
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          {files.length > 0 && (
            <List dense disablePadding>
              {files.map((file, index) => (
                <ListItem
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  secondaryAction={
                    <Tooltip title={common("remove")}>
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={common("remove")}
                        disabled={uploading}
                        onClick={() => onRemove(index)}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemIcon>
                    <InsertPhotoRounded color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${file.type || common("autoDetect")} · ${format.number(
                      file.size / 1_048_576,
                      { maximumFractionDigits: 2 },
                    )} MiB`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {uploading && progress && (
            <Stack spacing={0.5}>
              <LinearProgress variant="determinate" value={progressValue} />
              <Typography variant="caption" color="text.secondary">
                {t("uploadProgress", {
                  completed: progress.completed,
                  total: progress.total,
                })}
              </Typography>
            </Stack>
          )}
          <Button
            size="medium"
            variant="contained"
            startIcon={
              uploading ? (
                <CircularProgress size={20} />
              ) : (
                <CloudUploadRounded />
              )
            }
            disabled={files.length === 0 || uploading}
            onClick={onUpload}
          >
            {uploading
              ? t("uploading")
              : t("uploadSelected", { count: files.length })}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

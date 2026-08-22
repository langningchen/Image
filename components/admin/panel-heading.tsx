import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      <Grid size="grow" sx={{ minWidth: 0 }}>
        <Stack spacing={0.5}>
          <Typography component="h2" variant="h6">
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          )}
        </Stack>
      </Grid>
      {action && <Grid size="auto">{action}</Grid>}
    </Grid>
  );
}

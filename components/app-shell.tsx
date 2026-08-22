"use client";

import ImageRounded from "@mui/icons-material/ImageRounded";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeControl } from "@/components/theme-control";

export function AppShell({
  children,
  admin = false,
  brand,
}: {
  children: React.ReactNode;
  admin?: boolean;
  brand?: string;
}) {
  const common = useTranslations("Common");
  return (
    <>
      <AppBar position="static">
        <Container maxWidth={admin ? "xl" : "lg"}>
          <Toolbar disableGutters>
            <Grid container spacing={1}>
              <Grid size="grow">
                <Button
                  component={Link}
                  href="/"
                  color="inherit"
                  startIcon={<ImageRounded />}
                >
                  <Typography variant="h6" component="span">
                    {brand || common("brand")}
                  </Typography>
                </Button>
              </Grid>
              <Grid size="auto">
                <Button
                  component={Link}
                  href={admin ? "/" : "/admin"}
                  prefetch={admin}
                  color="inherit"
                  size="small"
                >
                  {admin ? common("home") : common("admin")}
                </Button>
                <ThemeControl />
              </Grid>
            </Grid>
          </Toolbar>
        </Container>
      </AppBar>
      {children}
    </>
  );
}

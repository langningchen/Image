import Container from "@mui/material/Container";
import type { PaperProps } from "@mui/material/Paper";
import Paper from "@mui/material/Paper";
import { forwardRef } from "react";

export const SideDrawerPaper = forwardRef<HTMLDivElement, PaperProps>(
  function SideDrawerPaper(props, ref) {
    return (
      <Paper
        {...props}
        ref={ref}
        component={Container}
        maxWidth="sm"
        fixed
        disableGutters
      />
    );
  },
);

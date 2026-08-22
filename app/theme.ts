"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#8adbae",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#8adbae",
        },
      },
    },
  },
});

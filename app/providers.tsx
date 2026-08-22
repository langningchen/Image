"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { theme } from "@/app/theme";
import { defaultTimeZone } from "@/i18n/config";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  return (
    <AppRouterCacheProvider options={{ key: "vanishpic" }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone={defaultTimeZone}
      >
        <ThemeProvider
          theme={theme}
          defaultMode="system"
          modeStorageKey="vanishpic-color-mode"
        >
          <CssBaseline enableColorScheme />
          {children}
        </ThemeProvider>
      </NextIntlClientProvider>
    </AppRouterCacheProvider>
  );
}

import { getRequestConfig } from "next-intl/server";
import { defaultLocale, defaultTimeZone } from "@/i18n/config";
import messages from "@/messages/en.json";

export default getRequestConfig(async () => {
  return {
    locale: defaultLocale,
    messages,
    timeZone: defaultTimeZone,
  };
});

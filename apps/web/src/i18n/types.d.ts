import type messages from "../../messages/tr/index";
import type { Locale } from "./config";

// Turkish is the source of truth for message keys: `t("…")` is type-checked
// against it, and a unit test keeps the English file in sync.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

"use client";

import { LanguageProvider } from "@/lib/i18n/language-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

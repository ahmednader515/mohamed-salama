"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/** refetchInterval: إعادة التحقق من الجلسة كل ٥ ثوانٍ حتى يُسجّل خروج الجهاز الآخر فوراً دون حاجة لريفرش */
const SESSION_REFETCH_INTERVAL = 5;

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={SESSION_REFETCH_INTERVAL}>
      {children}
    </NextAuthSessionProvider>
  );
}

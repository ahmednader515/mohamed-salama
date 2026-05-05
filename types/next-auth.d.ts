import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: UserRole;
    sessionId?: string;
  }

  interface Session {
    user: User & {
      id: string;
      role: UserRole;
    };
    forceLogout?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    sessionId?: string;
  }
}

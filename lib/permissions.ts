import type { UserRole } from "@/lib/types";

export function isStaffRole(role: string): role is "ADMIN" | "ASSISTANT_ADMIN" | "TEACHER" {
  return role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER";
}

/** أدمن أو مساعد: يديرون كل الكورسات؛ مدرس: كورساته فقط */
export function canManageCourse(
  role: UserRole | string,
  sessionUserId: string,
  courseCreatedById: string | null | undefined,
): boolean {
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") return true;
  if (role === "TEACHER") {
    return !!courseCreatedById && courseCreatedById === sessionUserId;
  }
  return false;
}

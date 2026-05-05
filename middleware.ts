import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/dashboard/teachers")) {
      if (role === "ADMIN") return NextResponse.next();
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/subscription-students")) {
      if (role === "ADMIN") return NextResponse.next();
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/students") || path.startsWith("/dashboard/courses/new")) {
      if (path.startsWith("/dashboard/students")) {
        if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const teacherBlocked =
      role === "TEACHER" &&
      (path.startsWith("/dashboard/settings/homepage") ||
        path.startsWith("/dashboard/reviews") ||
        path.startsWith("/dashboard/password-change-requests"));
    if (teacherBlocked) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};

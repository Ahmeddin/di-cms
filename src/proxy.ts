import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasAuthCookie(req: NextRequest) {
  // When using NextAuth, the session token cookie name differs between
  // secure (HTTPS) and non-secure (HTTP) environments.
  return (
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token")
  );
}

export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isLoggedIn = hasAuthCookie(req);

  const isAuthRoute = nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuthRoute) return NextResponse.next();
  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("next", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

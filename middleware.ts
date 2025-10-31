import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/verifyToken";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log("🧠 Middleware running on:", path);

  const token = request.cookies.get("token")?.value;
  console.log("📦 Token:", token);

  if (!token || !verifyToken(token)) {
    console.log("❌ Unauthorized. Redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("✅ Authorized. Proceeding...");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|login|register).*)"],
};

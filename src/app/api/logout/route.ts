import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear the token cookie by setting it to expired
  res.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return res;
}

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = jwt.sign({ userId: user._id.toString(),email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}

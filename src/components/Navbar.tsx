import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function Navbar() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let isAuthenticated = false;

  try {
    if (token && jwt.verify(token, process.env.JWT_SECRET!)) {
      isAuthenticated = true;
    }
  } catch {
    isAuthenticated = false;
  }

  return (
    <nav className="bg-surface border-b border-line sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-md">
          <div className="w-8 h-8 bg-ink rounded-md flex items-center justify-center">
            <span className="text-surface font-bold text-base">F</span>
          </div>
          <span className="text-lg font-bold text-ink tracking-tight">
            Finflow
          </span>
        </Link>

        <div>
          {isAuthenticated ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="bg-accent text-surface font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
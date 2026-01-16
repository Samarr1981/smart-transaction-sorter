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
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Finflow
          </span>
        </Link>
        
        <div>
          {isAuthenticated ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
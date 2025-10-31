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
    <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-blue-700">
        💸 Smart Transaction Sorter
      </Link>
      <div>
        {isAuthenticated ? (
          <LogoutButton />
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

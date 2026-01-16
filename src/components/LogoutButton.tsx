'use client';

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
    >
      Logout
    </button>
  );
}
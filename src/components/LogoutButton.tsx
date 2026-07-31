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
      className="bg-negative text-surface font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-negative focus-visible:ring-offset-2"
    >
      Logout
    </button>
  );
}
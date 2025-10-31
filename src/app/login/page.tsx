'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side – Branding */}
      <div className="w-1/2 hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-10">
        <h1 className="text-5xl font-extrabold mb-4">Smart Transaction Sorter 💸</h1>
        <p className="text-lg max-w-md text-center text-blue-100">
          Your intelligent companion for managing finances with AI.
        </p>
        {/* Optional: Add a simple SVG or emoji illustration */}
        <div className="mt-10 text-7xl">📊</div>
      </div>

      {/* Right Side – Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Login</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-base focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-base focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-3 rounded-md transition"
            >
              Sign In
            </button>
          </form>
          <p className="text-xs text-center text-gray-400 pt-4">
  Don’t have an account? <a href="/Register" className="text-blue-500 underline">Sign up</a>
</p>

          <p className="text-xs text-center text-gray-400 pt-4">
            Demo: test@example.com — Pass: Test123
          </p>
        </div>
      </div>
    </div>
  );
}

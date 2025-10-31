'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Registration failed.');
    } else {
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => router.push('/login'), 1500);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left – Branding */}
      <div className="w-1/2 hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-10">
        <h1 className="text-5xl font-extrabold mb-4">Smart Transaction Sorter 💸</h1>
        <p className="text-lg max-w-md text-center text-purple-100">
          Create an account to start organizing your money smarter.
        </p>
        <div className="mt-10 text-7xl">📥</div>
      </div>

      {/* Right – Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-purple-700 mb-6 text-center">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-base focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-base focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg py-3 rounded-md transition"
            >
              Sign Up
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 pt-4">
            Already have an account? <a href="/login" className="text-purple-500 underline">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

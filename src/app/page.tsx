import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CSVUploader from "@/app/CSVUploader";
import jwt from "jsonwebtoken";
import LogoutButton from "@/components/LogoutButton";
import Navbar from "@/components/Navbar";

export default async function Home() {
  const cookieStore = await cookies(); 
  const token = cookieStore.get("token")?.value;

  try {
    if (!token || !jwt.verify(token, process.env.JWT_SECRET!)) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return (
    <>
    <Navbar />
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 transition-colors duration-300 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <CSVUploader />
      </div>
    </main>
    </>
  );
}

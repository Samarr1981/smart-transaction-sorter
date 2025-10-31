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
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-blue-800 mb-4">
          Smart Transaction Sorter 💸
        </h1>
        <p className="text-center text-gray-600 mb-10 text-lg max-w-2xl mx-auto">
          Upload your bank CSV and instantly see categorized insights with beautiful visuals.
        </p>
        <CSVUploader />
      </div>
    </main>
    </>
  );
}

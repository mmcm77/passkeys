import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-gray-600">Sign in with your passkey</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

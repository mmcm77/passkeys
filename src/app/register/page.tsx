import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
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
          <h1 className="mt-4 text-3xl font-bold">Create Your Account</h1>
          <p className="mt-2 text-gray-600">
            Register with a passkey for secure, passwordless login
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}

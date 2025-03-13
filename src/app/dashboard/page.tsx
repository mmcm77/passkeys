import Link from "next/link";
import PasskeyList from "@/components/auth/PasskeyList";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/api/auth/logout"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Logout
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Welcome to your Dashboard
          </h2>
          <p className="text-gray-600 mb-4">
            You've successfully authenticated with a passkey. This is a secure,
            passwordless authentication method that uses public key
            cryptography.
          </p>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Your Passkeys
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              These are the passkeys you've registered for this account. Each
              passkey is securely stored on your device and never shared with
              the server.
            </p>
            <PasskeyList />
          </div>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Passkey Authentication System
        </h1>

        <p className="text-center mb-8 max-w-md">
          A modern authentication system using passkeys for secure, passwordless
          login. Built with Next.js, TypeScript, Tailwind CSS, and
          SimpleWebAuthn.
        </p>

        <div className="flex gap-4">
          <Link
            href="/register"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Login
          </Link>
        </div>

        <div className="mt-16 grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-3 lg:text-left gap-4">
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">Secure</h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Passkeys provide strong security without the vulnerabilities of
              passwords.
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">Simple</h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              No more remembering complex passwords. Just use your device's
              biometrics.
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">Fast</h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Quick authentication with no typing required. Just a tap or scan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

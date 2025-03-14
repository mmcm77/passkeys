import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="max-w-5xl w-full items-center justify-center flex flex-col">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold">Passkey Authentication System</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            A modern authentication system using passkeys for secure,
            passwordless login. Built with Next.js, TypeScript, Tailwind CSS,
            and SimpleWebAuthn.
          </p>
        </div>

        <div className="flex gap-4 mb-16">
          <Button asChild>
            <Link href="/register">Register</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

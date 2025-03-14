import Link from "next/link";
import PasskeyList from "@/components/auth/PasskeyList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <Button variant="outline" asChild>
            <Link href="/api/auth/logout">Logout</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Welcome to your Dashboard</h2>
            <CardDescription>
              You've successfully authenticated with a passkey. This is a
              secure, passwordless authentication method that uses public key
              cryptography.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Your Passkeys</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These are the passkeys you've registered for this account.
                  Each passkey is securely stored on your device and never
                  shared with the server.
                </p>
                <Separator className="my-4" />
                <PasskeyList />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthStatus from "@/components/auth/AuthStatus";
import WebAuthnInit from "@/components/auth/WebAuthnInit";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Passkey Authentication System",
  description:
    "A modern authentication system using passkeys for secure, passwordless login.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.className} dark`}>
      <head>
        {/* Early initialization of WebAuthn for Chrome */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Check if the browser supports WebAuthn
              if (window.PublicKeyCredential) {
                try {
                  // Pre-warm the WebAuthn API
                  window.PublicKeyCredential.isConditionalMediationAvailable?.();
                } catch (e) {
                  console.error("Error pre-warming WebAuthn:", e);
                }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Initialize WebAuthn as early as possible */}
        <WebAuthnInit />
        <div className="relative flex min-h-screen flex-col">
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
            <AuthStatus />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}

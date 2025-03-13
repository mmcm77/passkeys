import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthStatus from "@/components/auth/AuthStatus";
import WebAuthnInit from "@/components/auth/WebAuthnInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
      <body className="font-sans">
        {/* Initialize WebAuthn as early as possible */}
        <WebAuthnInit />
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <a href="/" className="text-xl font-bold text-indigo-600">
                Passkey Auth
              </a>
              <AuthStatus />
            </div>
          </header>
          <main className="flex-grow">{children}</main>
          <footer className="bg-white border-t border-gray-200 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Passkey Authentication System
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

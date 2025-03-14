import RegisterForm from "@/components/auth/RegisterForm";
import LoginForm from "@/components/auth/LoginForm";
import AuthContainer from "@/components/auth/AuthContainer";

export default function Home() {
  return (
    <main className="w-full">
      <div className="max-w-6xl mx-auto px-6 pt-8 md:px-24 md:pt-12">
        <div className="text-center space-y-4 mb-4">
          <h1 className="text-4xl font-bold">Passkey Authentication System</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            A modern authentication system using passkeys for secure,
            passwordless login. Built with Next.js, TypeScript, Tailwind CSS,
            and SimpleWebAuthn.
          </p>
        </div>
        {/* 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
          <RegisterForm />
          <LoginForm />
        </div> */}

        <div className="max-w-md mx-auto">
          <AuthContainer />
        </div>
      </div>
    </main>
  );
}

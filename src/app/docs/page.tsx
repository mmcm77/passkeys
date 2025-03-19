import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SDKDocsPage() {
  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "installation", title: "Installation" },
    { id: "merchant-id", title: "Obtaining a Merchant ID" },
    { id: "basic-integration", title: "Basic Integration" },
    { id: "mounting-options", title: "Mounting Options" },
    { id: "checkout-flow", title: "Checkout Flow Integration" },
    { id: "nextjs-integration", title: "Next.js Integration" },
    { id: "complete-html-example", title: "Complete HTML Example" },
  ];

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="md:w-64 p-6 border-r h-screen sticky top-0 overflow-y-auto hidden md:block">
        <h3 className="font-bold text-lg mb-4">Contents</h3>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.id} className="text-sm">
              <a
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-primary"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 max-w-3xl mx-auto md:ml-0">
        <h1 className="text-4xl font-bold mb-4">PayAuth SDK Documentation</h1>
        <p className="text-lg text-muted-foreground mb-8">
          A complete guide to integrating passwordless authentication into your
          checkout flow.
        </p>

        <section id="introduction" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Introduction</h2>
          <p className="mb-4">
            This SDK allows merchants to integrate passwordless authentication
            using passkeys into their checkout flow. It creates a secure iframe
            that communicates with the PayAuth service, letting customers
            authenticate without leaving your site.
          </p>
          <Separator className="my-6" />
        </section>

        <section id="installation" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Installation</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Add the script to your page:</li>
            <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2">
              <code>{`<script src="https://passkeys-one.vercel.app/sdk/payauth.min.js"></script>`}</code>
            </pre>
            <li>
              The SDK exposes a global variable: <code>window.PayAuth</code>
            </li>
          </ol>
          <Separator className="my-6" />
        </section>

        <section id="merchant-id" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Obtaining a Merchant ID</h2>
          <p className="mb-4">
            To use the PayAuth SDK, you need a merchant ID that identifies your
            application. Here's how to get one:
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">For Testing</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Use our demo merchant ID for testing and development:</li>
            <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2">
              <code>DEMO_MERCHANT_123</code>
            </pre>
            <li>
              This demo ID has limitations:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Limited to 100 authentication requests per day</li>
                <li>
                  Works only with test domains (localhost, *.vercel.app, etc.)
                </li>
                <li>No access to advanced features</li>
              </ul>
            </li>
          </ol>

          <h3 className="text-xl font-semibold mt-6 mb-2">For Production</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <a
                href="https://passkeys-one.vercel.app/register"
                className="text-blue-600 hover:underline"
              >
                Register for a merchant account
              </a>{" "}
              on our platform
            </li>
            <li>
              Complete the onboarding process, including:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Business information verification</li>
                <li>Domain verification for your checkout pages</li>
                <li>Security review</li>
              </ul>
            </li>
            <li>
              Once approved, you'll receive a unique merchant ID from your
              dashboard
            </li>
            <li>
              For high-volume scenarios, contact our support for custom plans
            </li>
          </ol>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-6">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300">
              Important Security Notes
            </h4>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>
                Never share your production merchant ID in client-side code that
                could be viewed in public repositories
              </li>
              <li>
                For added security, consider using environment variables for
                your merchant ID
              </li>
              <li>
                If your merchant ID is compromised, you can generate a new one
                from your dashboard
              </li>
            </ul>
          </div>
          <Separator className="my-6" />
        </section>

        <section id="basic-integration" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Basic Integration</h2>
          <p className="text-muted-foreground mb-4">
            Initialize the SDK with your merchant ID and options:
          </p>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`// Basic initialization
const passkey = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID", // Obtain this from PayAuth dashboard
  serviceUrl: "https://passkeys-one.vercel.app", // Production PayAuth service URL
  theme: "light", // 'light' or 'dark'
  buttonText: "Pay with Passkey", // Customize button text
  callbacks: {
    onSuccess: (result) => {
      console.log("Authentication successful!", result);
      // result contains:
      // - email: User's email address
      // - userId: Unique user identifier
      // - token: Authentication token for your backend

      // Send the token to your server to verify the payment
      verifyPaymentWithServer(result.token, result.email);
    },
    onError: (error) => {
      console.error("Authentication failed:", error);
      // Show error message to user
      showErrorToUser("Authentication failed. Please try again.");
    },
    onCancel: () => {
      console.log("Authentication cancelled by user");
      // Handle user cancellation (e.g., return to checkout page)
      showMessageToUser("Authentication cancelled");
    },
  },
});`}</code>
          </pre>
          <Separator className="my-6" />
        </section>

        <section id="mounting-options" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Mounting Options</h2>
          <p className="text-muted-foreground mb-4">
            The SDK provides multiple ways to integrate the authentication
            button:
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            Option 1: Auto-mount
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Recommended for simple integrations
          </p>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`const autoMountedPasskey = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
  serviceUrl: "https://passkeys-one.vercel.app",
  container: "#passkey-button-container", // CSS selector for button container
  // other options...
});`}</code>
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            Option 2: Manual mount
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Useful for SPAs or dynamic content
          </p>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`document.addEventListener("DOMContentLoaded", () => {
  // Mount the button to a container by CSS selector
  passkey.mount("#passkey-button-container");
  
  // OR mount using an element reference
  const container = document.getElementById("passkey-button-container");
  if (container) passkey.mount(container);
});`}</code>
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            Option 3: Custom button
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use your own button with the SDK's authenticate method
          </p>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`document.addEventListener("DOMContentLoaded", () => {
  const customButton = document.getElementById("custom-checkout-button");
  if (customButton) {
    customButton.addEventListener("click", () => {
      // Show loading state on your button
      customButton.textContent = "Authenticating...";
      customButton.disabled = true;
      
      passkey.authenticate()
        .then((result) => {
          // Authentication successful
          customButton.textContent = "Authenticated! Processing...";
          return processPayment(result.token);
        })
        .catch((error) => {
          // Authentication failed
          console.error("Authentication error:", error);
          customButton.textContent = "Try Again";
          customButton.disabled = false;
        });
    });
  }
});`}</code>
          </pre>
          <Separator className="my-6" />
        </section>

        <section id="checkout-flow" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Checkout Flow Integration</h2>
          <p className="text-muted-foreground mb-4">
            Complete example for e-commerce checkout flows:
          </p>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`function integrateCheckoutFlow() {
  // 1. Initialize the SDK
  const checkoutAuth = PayAuth.init({
    merchantId: "YOUR_MERCHANT_ID",
    serviceUrl: "https://passkeys-one.vercel.app", 
    buttonText: "Quick Checkout with Passkey",
    buttonStyle: "default", // You can choose: 'default', 'minimal', or 'custom'
    theme: document.body.classList.contains("dark-mode") ? "dark" : "light",
    // Style customization
    styles: {
      button: {
        backgroundColor: "#0070f3", // Brand color
        textColor: "#ffffff",
        borderRadius: "8px",
        width: "100%",
        height: "48px"
      },
      iframe: {
        width: "450px",
        height: "550px",
        borderRadius: "12px",
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)"
      }
    },
    callbacks: {
      onSuccess: async (result) => {
        // 1. Show success message
        updateCheckoutUI("Verifying payment...");
        
        // 2. Verify with your server
        try {
          const orderResult = await fetch("/api/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authToken: result.token,
              email: result.email,
              orderId: document.getElementById("order-id")?.getAttribute("data-id"),
              amount: document.getElementById("order-total")?.getAttribute("data-amount")
            })
          }).then(r => r.json());
          
          // 3. Show success and redirect to confirmation
          updateCheckoutUI("Payment successful!");
          window.location.href = \`/order-confirmation?id=\${orderResult.orderId}\`;
        } catch (err) {
          // Handle server errors
          console.error("Payment processing error:", err);
          updateCheckoutUI("Payment verification failed. Please try again.");
        }
      },
      onError: (error) => {
        updateCheckoutUI(\`Authentication error: \${error.message}\`);
      },
      onCancel: () => {
        updateCheckoutUI("Payment cancelled. You can try again when ready.");
      },
      // Additional lifecycle callbacks
      onOpen: () => {
        console.log("Authentication modal opened");
      },
      onClose: () => {
        console.log("Authentication modal closed");
      }
    }
  });
  
  // Mount the button in the checkout form
  checkoutAuth.mount("#checkout-authentication-container");
  
  // Helper function to update UI
  function updateCheckoutUI(message) {
    const statusElement = document.getElementById("checkout-status");
    if (statusElement) statusElement.textContent = message;
  }
}`}</code>
          </pre>
          <Separator className="my-6" />
        </section>

        <section id="nextjs-integration" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Next.js Integration</h2>
          <p className="text-muted-foreground mb-4">
            For Next.js applications, the SDK must be loaded and initialized
            client-side.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            1. Create a client component for the PayAuth button
          </h3>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`// File: components/PayAuthButton.tsx
"use client"; // Important! Mark as client component

import { useEffect, useRef, useState } from "react";

// Define SDK types
interface AuthResult {
  userId: string;
  email: string;
  passkeyCount: number;
  token: string;
  expiresAt: number;
}

interface PayAuthSDK {
  mount: (element?: HTMLElement | string) => void;
  unmount: () => void;
  authenticate: () => Promise<AuthResult>;
  isAuthenticated: () => boolean;
  destroy: () => void;
}

// Add global type declaration
declare global {
  interface Window {
    PayAuth?: {
      init: (options: any) => PayAuthSDK;
    };
  }
}

// Component props
interface PayAuthButtonProps {
  merchantId: string;
  onSuccess?: (result: AuthResult) => void;
  onError?: (error: Error) => void;
  theme?: "light" | "dark";
  buttonText?: string;
}

export default function PayAuthButton({
  merchantId,
  onSuccess,
  onError,
  theme = "light",
  buttonText = "Pay with Passkey",
}: PayAuthButtonProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<PayAuthSDK | null>(null);

  // Load SDK script
  useEffect(() => {
    // Avoid duplicate loading
    if (document.querySelector('script[src*="payauth.min.js"]')) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://passkeys-one.vercel.app/sdk/payauth.min.js";
    script.async = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError("Failed to load PayAuth SDK");
    };
    
    document.body.appendChild(script);
    
    return () => {
      // Clean up SDK on unmount if we added the script
      if (sdkRef.current) {
        sdkRef.current.destroy();
      }
    };
  }, []);

  // Initialize SDK when loaded
  useEffect(() => {
    if (isLoaded && containerRef.current && window.PayAuth) {
      try {
        sdkRef.current = window.PayAuth.init({
          merchantId,
          serviceUrl: "https://passkeys-one.vercel.app",
          theme,
          buttonText,
          callbacks: {
            onSuccess: (result: AuthResult) => {
              if (onSuccess) onSuccess(result);
            },
            onError: (error: Error) => {
              if (onError) onError(error);
            }
          }
        });
        
        sdkRef.current.mount(containerRef.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    
    return () => {
      // Clean up when props change or component unmounts
      if (sdkRef.current) {
        sdkRef.current.unmount();
      }
    };
  }, [isLoaded, merchantId, theme, buttonText, onSuccess, onError]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div 
      ref={containerRef} 
      className="passkey-auth-container"
      aria-live="polite"
    >
      {!isLoaded && <div className="text-gray-500">Loading payment options...</div>}
    </div>
  );
}`}</code>
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            2. Use the component in a checkout page
          </h3>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`// File: app/checkout/page.tsx
import { Suspense } from "react";
import PayAuthButton from "@/components/PayAuthButton";

// Client component wrapper to handle payment processing
function CheckoutPayment() {
  "use client";
  
  const handlePaymentSuccess = async (result) => {
    try {
      // Call your API route to process the payment
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: result.token,
          email: result.email,
          orderId: '12345'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to success page
        window.location.href = \`/thank-you?orderId=\${data.orderId}\`;
      } else {
        // Handle error
        console.error("Payment processing failed:", data.error);
      }
    } catch (err) {
      console.error("Payment error:", err);
    }
  };
  
  return (
    <PayAuthButton 
      merchantId="YOUR_MERCHANT_ID"
      buttonText="Complete Purchase with Passkey"
      onSuccess={handlePaymentSuccess}
      onError={(error) => console.error("Authentication error:", error)}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      {/* Order summary - server component content */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        {/* Your order summary content */}
      </div>
      
      {/* Payment section with client component */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment</h2>
        <Suspense fallback={<div>Loading payment options...</div>}>
          <CheckoutPayment />
        </Suspense>
      </div>
    </div>
  );
}`}</code>
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            3. API route for payment processing
          </h3>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`// File: app/api/process-payment/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, orderId } = body;
    
    // 1. Verify the authentication token with PayAuth service
    const verifyResponse = await fetch('https://passkeys-one.vercel.app/api/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const verifyResult = await verifyResponse.json();
    
    if (!verifyResult.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // 2. Process the payment with your payment provider
    // const paymentResult = await yourPaymentProcessor.processPayment({
    //   amount: 99.99,
    //   customerId: verifyResult.userId,
    //   email: email,
    //   orderId: orderId
    // });
    
    // 3. Return the result
    return NextResponse.json({
      success: true,
      orderId: orderId,
      // Additional payment details
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}`}</code>
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            Next.js Implementation Notes
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Always use the "use client" directive for components that use the
              SDK
            </li>
            <li>
              Load the script dynamically in a useEffect hook to avoid SSR
              issues
            </li>
            <li>
              Use refs to maintain references to DOM elements and SDK instances
            </li>
            <li>
              Clean up properly when components unmount to prevent memory leaks
            </li>
            <li>
              Use Suspense boundaries around client components for proper
              loading states
            </li>
            <li>
              Consider using Next.js middleware for additional security checks
            </li>
          </ul>

          <h4 className="text-lg font-semibold mt-6 mb-2">
            TypeScript Integration:
          </h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create proper type definitions for the SDK</li>
            <li>Use proper type checking for callback parameters</li>
            <li>Consider creating a custom hook for SDK initialization</li>
          </ul>

          <h4 className="text-lg font-semibold mt-6 mb-2">
            Performance Optimization:
          </h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Load the SDK only when needed (lazy loading)</li>
            <li>Use React.memo to prevent unnecessary re-renders</li>
            <li>Consider using dynamic imports for checkout pages</li>
          </ul>
          <Separator className="my-6" />
        </section>

        <section id="complete-html-example" className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Complete HTML Example</h2>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto my-2 text-sm">
            <code>{`<!DOCTYPE html>
<html>
<head>
  <title>E-Commerce Checkout</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://passkeys-one.vercel.app/sdk/payauth.min.js"></script>
</head>
<body>
  <div class="checkout-container">
    <h1>Checkout</h1>
    
    <div class="order-summary">
      <h2>Order Summary</h2>
      <div id="order-id" data-id="ORD12345">Order #ORD12345</div>
      <div class="product-item">Premium Widget &times; 1</div>
      <div id="order-total" data-amount="99.99">Total: $99.99</div>
    </div>
    
    <div class="payment-section">
      <h2>Payment Method</h2>
      
      <!-- Traditional payment method selection -->
      <div class="payment-methods">
        <label>
          <input type="radio" name="payment-method" value="credit-card">
          Credit Card
        </label>
      </div>
      
      <!-- OR section -->
      <div class="or-separator">
        <span>OR</span>
      </div>
      
      <!-- PayAuth authentication button will be mounted here -->
      <div id="checkout-authentication-container"></div>
      
      <!-- Status messages -->
      <div id="checkout-status"></div>
    </div>
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Initialize PayAuth SDK
      const payAuth = window.PayAuth.init({
        merchantId: 'DEMO_MERCHANT_123',
        serviceUrl: 'https://passkeys-one.vercel.app',
        buttonText: 'Pay with Passkey',
        container: '#checkout-authentication-container',
        callbacks: {
          onSuccess: function(result) {
            document.getElementById('checkout-status').textContent = 
              'Payment authorized for: ' + result.email;
            
            // In a real implementation, you would verify the token with your server
            // and complete the payment process
          },
          onError: function(error) {
            document.getElementById('checkout-status').textContent = 
              'Error: ' + error.message;
          }
        }
      });
    });
  </script>
</body>
</html>`}</code>
          </pre>
        </section>

        <div className="mt-12 text-center">
          <Button size="lg" variant="default" asChild>
            <a href="/">Back to Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

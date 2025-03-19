import PasskeySDK, { AuthResult } from "./index";

/**
 * This is an example of how a merchant can integrate the Passkey SDK
 */

// Initialize the SDK with merchant ID and options
const passkey = PasskeySDK.init({
  merchantId: "YOUR_MERCHANT_ID",
  serviceUrl: "https://passkeys.yourdomain.com",
  theme: "light",
  buttonText: "Sign in with Passkey",
  buttonStyle: "default",
  callbacks: {
    onSuccess: (result: AuthResult) => {
      console.log("Authentication successful!", result);
      // Store user token in your application
      localStorage.setItem("auth_token", result.token);
      // Redirect to dashboard or update UI
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      console.error("Authentication failed:", error);
      // Show error message to user
      const errorElement = document.getElementById("error-message");
      if (errorElement) {
        errorElement.textContent = "Authentication failed. Please try again.";
      }
    },
    onCancel: () => {
      console.log("Authentication cancelled by user");
    },
  },
});

// Method 1: Auto-mount (if container was specified in options)
// passkey = new PasskeySDK({
//   merchantId: 'YOUR_MERCHANT_ID',
//   container: '#passkey-button-container'
// });

// Method 2: Mount the button manually
document.addEventListener("DOMContentLoaded", () => {
  // Mount the button to a container
  passkey.mount("#passkey-button-container");

  // Alternatively, you can mount to an element reference
  // const container = document.getElementById('passkey-button-container');
  // passkey.mount(container);

  // You can also attach the authenticate method to your own button
  document
    .getElementById("custom-auth-button")
    ?.addEventListener("click", () => {
      passkey
        .authenticate()
        .then((result: AuthResult) => {
          console.log("Custom button auth success:", result);
        })
        .catch((error: Error) => {
          console.error("Custom button auth error:", error);
        });
    });
});

// Cleanup when your application unmounts
function cleanup() {
  passkey.destroy();
}

// Example HTML structure
/*
<!DOCTYPE html>
<html>
<head>
  <title>Passkey Authentication Demo</title>
</head>
<body>
  <div>
    <h1>Welcome to Example Store</h1>
    <p>Sign in to your account:</p>
    
    <!-- SDK will insert the button here -->
    <div id="passkey-button-container"></div>
    
    <!-- Or use your own button -->
    <button id="custom-auth-button">Sign In with Custom Button</button>
    
    <!-- Error message container -->
    <p id="error-message" style="color: red;"></p>
  </div>
</body>
</html>
*/

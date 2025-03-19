# PayAuth SDK

The PayAuth SDK allows merchants to easily integrate passkey authentication into their websites.

## Installation

### Method 1: Script Tag (Recommended for Quick Start)

Add the SDK directly to your HTML:

```html
<script src="https://your-domain.com/sdk/payauth.min.js"></script>
```

### Method 2: NPM Package

Coming soon.

## Quick Start

```javascript
// Initialize the SDK
const auth = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
  container: "#passkey-button-container", // Optional: auto-mount the button
  onSuccess: (result) => {
    console.log("Authentication successful!", result);
    // Handle user authentication data: result.userId, result.email, etc.
  },
  onError: (error) => {
    console.error("Authentication failed:", error);
  },
  onCancel: () => {
    console.log("Authentication cancelled by user");
  },
});
```

## Basic Usage

### Auto-mounting (Easiest)

The button will be automatically created and inserted into the specified container:

```javascript
const auth = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
  container: "#passkey-button-container",
});
```

### Manual Mounting

Initialize first, then mount when needed:

```javascript
const auth = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
});

// Mount later when needed
auth.mount("#passkey-button-container");
```

### Using Your Own Button

Trigger authentication programmatically with your own UI:

```javascript
const auth = PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
});

document.getElementById("your-button").addEventListener("click", () => {
  auth
    .authenticate()
    .then((result) => {
      console.log("Authentication successful!", result);
    })
    .catch((error) => {
      console.error("Authentication failed:", error);
    });
});
```

## Configuration Options

| Option        | Type                              | Description                                      |
| ------------- | --------------------------------- | ------------------------------------------------ |
| `merchantId`  | String                            | **Required.** Your unique merchant identifier    |
| `container`   | String/Element                    | CSS selector or DOM element for button container |
| `theme`       | 'light' or 'dark'                 | UI theme to use (default: 'light')               |
| `buttonText`  | String                            | Custom text for the authentication button        |
| `buttonStyle` | 'default', 'minimal', or 'custom' | Predefined button styles                         |
| `onSuccess`   | Function                          | Callback when authentication succeeds            |
| `onError`     | Function                          | Callback when authentication fails               |
| `onCancel`    | Function                          | Callback when user cancels authentication        |

## Customizing the Button

```javascript
PayAuth.init({
  merchantId: "YOUR_MERCHANT_ID",
  container: "#passkey-button-container",
  buttonText: "Sign in securely",
  buttonStyle: "minimal", // 'default', 'minimal', or 'custom'
  theme: "dark",
  styles: {
    button: {
      backgroundColor: "#0070f3",
      textColor: "#ffffff",
      borderRadius: "8px",
      width: "100%",
      height: "48px",
    },
  },
});
```

## API Reference

### Methods

| Method              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `mount(element)`    | Mount the authentication button to a container |
| `unmount()`         | Remove the button from the DOM                 |
| `authenticate()`    | Start the authentication process               |
| `isAuthenticated()` | Check if a user is authenticated               |
| `destroy()`         | Clean up resources                             |

### Events

The SDK provides callbacks for key events:

- `onSuccess(result)`: Called when authentication succeeds
- `onError(error)`: Called when authentication fails
- `onCancel()`: Called when the user cancels authentication
- `onOpen()`: Called when the authentication modal opens
- `onClose()`: Called when the authentication modal closes

## Example

See the [example.html](./example.html) file for a complete working example.

## Browser Support

The PayAuth SDK supports all modern browsers that implement the WebAuthn standard:

- Chrome (version 67+)
- Firefox (version 60+)
- Safari (version 13+)
- Edge (version 79+)

## Troubleshooting

Common issues:

1. **Passkey not working**: Make sure your website is using HTTPS (required for WebAuthn)
2. **Button not appearing**: Check that the container element exists before initializing
3. **Cross-origin issues**: The SDK must be served from the same origin as your application

For additional help, contact our support team.

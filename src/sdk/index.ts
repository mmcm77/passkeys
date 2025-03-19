import {
  PasskeySDKOptions,
  AuthResult,
  MessageType,
  PasskeySDKInstance,
} from "./types";
import { MessageHandler } from "./messaging";
import { IframeManager } from "./iframe";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://passkeys-one.vercel.app";

export function initPasskeyAuth(
  options: PasskeySDKOptions
): PasskeySDKInstance {
  if (!options.merchantId) {
    throw new Error("Passkey SDK requires a merchantId");
  }

  // Set default options
  const sdkOptions: PasskeySDKOptions = {
    buttonText: "Sign in with Passkey",
    buttonStyle: "default",
    theme: "light",
    serviceUrl: APP_URL,
    ...options,
  };

  // Create iframe manager which also creates the message handler
  const iframeManager = new IframeManager(sdkOptions);

  // Track internal state
  let buttonElement: HTMLButtonElement | null = null;
  let mountElement: HTMLElement | null = null;
  let authenticated = false;

  // Set up callback handlers
  const originalCallbacks = sdkOptions.callbacks || {};
  sdkOptions.callbacks = {
    ...originalCallbacks,
    onSuccess: (result) => {
      authenticated = true;
      if (originalCallbacks.onSuccess) {
        originalCallbacks.onSuccess(result);
      }
    },
    onCancel: () => {
      if (originalCallbacks.onCancel) {
        originalCallbacks.onCancel();
      }
    },
    onError: (error) => {
      if (originalCallbacks.onError) {
        originalCallbacks.onError(error);
      }
    },
  };

  /**
   * Create and mount the authentication button to the specified element
   */
  const mount = (element?: HTMLElement | string): void => {
    // If no element provided, use the one from options or throw error
    if (!element && !sdkOptions.container) {
      throw new Error("No mount element or container option provided");
    }

    const targetElement = element || sdkOptions.container;

    // Find the container element
    let containerElement: HTMLElement | null = null;

    if (typeof targetElement === "string") {
      containerElement = document.querySelector(targetElement);
    } else if (targetElement instanceof HTMLElement) {
      containerElement = targetElement;
    }

    if (!containerElement) {
      console.warn(`Container element not found: ${targetElement}`);
      return;
    }

    mountElement = containerElement;

    // Create the button
    buttonElement = document.createElement("button");
    buttonElement.innerText = sdkOptions.buttonText || "Sign in with Passkey";

    // Apply button styles based on options
    applyButtonStyles(buttonElement, sdkOptions);

    buttonElement.addEventListener("click", authenticate);

    // Add to container
    mountElement.appendChild(buttonElement);
  };

  /**
   * Apply styles to the button based on options
   */
  const applyButtonStyles = (
    button: HTMLButtonElement,
    options: PasskeySDKOptions
  ): void => {
    // Default styles
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    button.style.fontSize = "14px";
    button.style.fontWeight = "500";
    button.style.padding = "0 16px";
    button.style.cursor = "pointer";
    button.style.border = "none";
    button.style.outline = "none";
    button.style.transition = "all 0.2s ease";
    button.style.textDecoration = "none";
    button.style.lineHeight = "1";

    // Base button styles
    let backgroundColor = "#3b82f6"; // Default blue
    let textColor = "#ffffff";
    let borderRadius = "8px";
    let width = "auto";
    let height = "40px";

    // Apply style customizations from options
    if (options.styles?.button) {
      backgroundColor =
        options.styles.button.backgroundColor || backgroundColor;
      textColor = options.styles.button.textColor || textColor;
      borderRadius = options.styles.button.borderRadius || borderRadius;
      width = options.styles.button.width || width;
      height = options.styles.button.height || height;
    }

    // Apply predefined style based on the buttonStyle option
    if (options.buttonStyle === "minimal") {
      backgroundColor = "transparent";
      textColor = "#000000";
      borderRadius = "4px";
    }

    // Apply theme variations
    if (options.theme === "dark") {
      if (options.buttonStyle === "minimal") {
        textColor = "#ffffff";
      } else if (options.buttonStyle === "default") {
        backgroundColor = "#1e40af"; // Darker blue
      }
    }

    // Apply final styles
    button.style.backgroundColor = backgroundColor;
    button.style.color = textColor;
    button.style.borderRadius = borderRadius;
    button.style.width = width;
    button.style.height = height;
  };

  /**
   * Remove the button from the DOM
   */
  const unmount = (): void => {
    if (buttonElement && mountElement) {
      buttonElement.removeEventListener("click", authenticate);
      mountElement.removeChild(buttonElement);
      buttonElement = null;
    }
  };

  /**
   * Start the authentication process
   */
  const authenticate = (): Promise<AuthResult> => {
    return new Promise((resolve, reject) => {
      // Store the original callbacks
      const origSuccessCallback = sdkOptions.callbacks?.onSuccess;
      const origErrorCallback = sdkOptions.callbacks?.onError;
      const origCancelCallback = sdkOptions.callbacks?.onCancel;

      // Set up temporary callbacks for this authentication attempt
      sdkOptions.callbacks = {
        ...sdkOptions.callbacks,
        onSuccess: (result) => {
          authenticated = true;
          if (origSuccessCallback) origSuccessCallback(result);
          resolve(result);
          // Restore original callbacks
          resetCallbacks();
        },
        onError: (error) => {
          if (origErrorCallback) origErrorCallback(error);
          reject(error);
          // Restore original callbacks
          resetCallbacks();
        },
        onCancel: () => {
          const error = new Error("Authentication cancelled by user");
          if (origCancelCallback) origCancelCallback();
          reject(error);
          // Restore original callbacks
          resetCallbacks();
        },
      };

      // Reset callbacks to original state
      const resetCallbacks = () => {
        sdkOptions.callbacks = {
          onSuccess: origSuccessCallback,
          onError: origErrorCallback,
          onCancel: origCancelCallback,
          onOpen: sdkOptions.callbacks?.onOpen,
          onClose: sdkOptions.callbacks?.onClose,
        };
      };

      // Open the iframe
      iframeManager.openIframe();
    });
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = (): boolean => {
    return authenticated;
  };

  /**
   * Clean up SDK resources
   */
  const destroy = (): void => {
    unmount();
    iframeManager.destroy();
  };

  // Initialize by mounting if container is specified
  if (sdkOptions.container) {
    mount(sdkOptions.container);
  }

  // Return the SDK instance
  return {
    mount,
    unmount,
    authenticate,
    isAuthenticated,
    destroy,
  };
}

// Export types
export type { PasskeySDKOptions, AuthResult, PasskeySDKInstance };
export { MessageType };

// Export as global function for <script> tag inclusion
if (typeof window !== "undefined") {
  (window as any).PayAuth = { init: initPasskeyAuth };
}

// Default export
export default { init: initPasskeyAuth };

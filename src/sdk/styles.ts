import { StyleOptions, PasskeySDKOptions } from "./types";

/**
 * Default styles for the SDK elements
 */
export const defaultStyles: StyleOptions = {
  button: {
    backgroundColor: "#3b82f6", // Blue
    textColor: "#ffffff",
    borderRadius: "8px",
    width: "auto",
    height: "40px",
  },
  iframe: {
    width: "400px",
    height: "500px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
  },
};

/**
 * Generates button styles based on user options and defaults
 */
export function generateButtonStyles(options?: PasskeySDKOptions): string {
  const buttonStyles = {
    ...defaultStyles.button,
    ...options?.styles?.button,
  };

  // Apply predefined style based on the buttonStyle option
  if (options?.buttonStyle === "minimal") {
    buttonStyles.backgroundColor = "transparent";
    buttonStyles.textColor = "#000000";
    buttonStyles.borderRadius = "4px";
  }

  // Apply theme variations
  if (options?.theme === "dark") {
    if (options?.buttonStyle === "minimal") {
      buttonStyles.textColor = "#ffffff";
    } else if (options?.buttonStyle === "default") {
      buttonStyles.backgroundColor = "#1e40af"; // Darker blue
    }
  }

  return `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    background-color: ${buttonStyles.backgroundColor};
    color: ${buttonStyles.textColor};
    border-radius: ${buttonStyles.borderRadius};
    width: ${buttonStyles.width};
    height: ${buttonStyles.height};
    padding: 0 16px;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.2s ease;
    text-decoration: none;
    line-height: 1;
  `;
}

/**
 * Generates overlay styles for the iframe container
 */
export function generateOverlayStyles(): string {
  return `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;
}

/**
 * Generates iframe styles based on user options and defaults
 */
export function generateIframeStyles(options?: StyleOptions): string {
  const iframeStyles = {
    ...defaultStyles.iframe,
    ...options?.iframe,
  };

  return `
    width: ${iframeStyles.width};
    height: ${iframeStyles.height};
    border: none;
    border-radius: ${iframeStyles.borderRadius};
    box-shadow: ${iframeStyles.boxShadow};
    background-color: white;
  `;
}

/**
 * Generates close button styles for the iframe overlay
 */
export function generateCloseButtonStyles(): string {
  return `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 30px;
    height: 30px;
    border-radius: 15px;
    background-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.2s ease;
  `;
}

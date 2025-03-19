import { MessageHandler } from "./messaging";
import { AuthResult, MessageType, PasskeySDKOptions } from "./types";

/**
 * Manages the authentication iframe
 */
export class IframeManager {
  private iframe: HTMLIFrameElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private messageHandler: MessageHandler;
  private options: PasskeySDKOptions;
  private iframeSrc: string;

  constructor(options: PasskeySDKOptions) {
    this.options = options;
    const serviceUrl = options.serviceUrl || "https://passkeys-one.vercel.app";

    // Create message handler first to get session ID
    this.messageHandler = new MessageHandler(serviceUrl);

    // Include merchantId, sessionId, and theme in iframe URL
    this.iframeSrc = `${serviceUrl}/auth-embed?merchantId=${encodeURIComponent(
      options.merchantId
    )}&sessionId=${this.messageHandler.getSessionId()}`;

    if (options.theme) {
      this.iframeSrc += `&theme=${options.theme}`;
    }

    // Setup message listeners
    this.setupMessageListeners();
  }

  /**
   * Set up listeners for iframe messages
   */
  private setupMessageListeners(): void {
    // Handle iframe ready message
    this.messageHandler.on(MessageType.AUTH_READY, () => {
      console.log("Authentication iframe is ready");
      // Send init message to the iframe
      this.messageHandler.sendMessage(MessageType.AUTH_INIT, {
        merchantId: this.options.merchantId,
        theme: this.options.theme,
      });
    });

    // Handle successful authentication
    this.messageHandler.on(MessageType.AUTH_RESPONSE, (payload: AuthResult) => {
      console.log("Authentication successful for:", payload.email);
      this.options.callbacks?.onSuccess?.(payload);
      this.closeIframe();
    });

    // Handle success message with the new message type
    this.messageHandler.on(MessageType.AUTH_SUCCESS, (payload: AuthResult) => {
      console.log("Authentication successful for:", payload.email);
      this.options.callbacks?.onSuccess?.(payload);
      this.closeIframe();
    });

    // Handle errors
    this.messageHandler.on(MessageType.ERROR, (error: Error) => {
      this.options.callbacks?.onError?.(error);
    });

    // Handle user cancellation
    this.messageHandler.on(MessageType.AUTH_CANCEL, () => {
      this.options.callbacks?.onCancel?.();
      this.closeIframe();
    });

    // Handle close requests from the iframe
    this.messageHandler.on(MessageType.CLOSE, () => {
      this.closeIframe();
    });
  }

  /**
   * Open the authentication iframe
   */
  public openIframe(): void {
    // Don't open if already open
    if (this.overlay) {
      return;
    }

    this.createOverlay();
    this.createIframe();

    // Make iframe visible with animation
    setTimeout(() => {
      if (this.overlay) this.overlay.style.opacity = "1";
      if (this.iframe)
        this.iframe.style.transform = "translate(-50%, -50%) translateY(0)";
    }, 10);

    // Notify callback
    this.options.callbacks?.onOpen?.();
  }

  /**
   * Create overlay element
   */
  private createOverlay(): void {
    this.overlay = document.createElement("div");
    this.overlay.style.position = "fixed";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.width = "100%";
    this.overlay.style.height = "100%";
    this.overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.overlay.style.zIndex = "999999";
    this.overlay.style.opacity = "0";
    this.overlay.style.transition = "opacity 0.3s ease";
    this.overlay.style.display = "flex";
    this.overlay.style.alignItems = "center";
    this.overlay.style.justifyContent = "center";

    // Close on background click
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        // Trigger cancel callback when user clicks outside
        this.options.callbacks?.onCancel?.();
        this.closeIframe();
      }
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * Create iframe element
   */
  private createIframe(): void {
    this.iframe = document.createElement("iframe");
    this.iframe.src = this.iframeSrc;
    this.iframe.style.position = "fixed";
    this.iframe.style.top = "50%";
    this.iframe.style.left = "50%";
    this.iframe.style.transform = "translate(-50%, -50%) translateY(20px)";
    this.iframe.style.width = this.options.styles?.iframe?.width || "400px";
    this.iframe.style.height = this.options.styles?.iframe?.height || "500px";
    this.iframe.style.maxWidth = "90%";
    this.iframe.style.maxHeight = "90%";
    this.iframe.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    this.iframe.style.borderRadius =
      this.options.styles?.iframe?.borderRadius || "12px";
    this.iframe.style.boxShadow =
      this.options.styles?.iframe?.boxShadow ||
      "0 10px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
    this.iframe.style.zIndex = "1000000";
    this.iframe.style.transition = "transform 0.3s ease";
    this.iframe.style.backgroundColor = "#0070f3";
    this.iframe.style.color = "#ffffff";

    // Allow the iframe to use WebAuthn
    this.iframe.setAttribute(
      "allow",
      "publickey-credentials-get *; publickey-credentials-create *"
    );

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.width = "30px";
    closeButton.style.height = "30px";
    closeButton.style.borderRadius = "50%";
    closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    closeButton.style.color = "rgba(0, 0, 0, 0.6)";
    closeButton.style.border = "none";
    closeButton.style.fontSize = "18px";
    closeButton.style.cursor = "pointer";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.style.outline = "none";
    closeButton.style.transition = "background-color 0.2s ease";
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    });
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    });
    closeButton.addEventListener("click", () => {
      // Trigger cancel callback when user clicks close button
      this.options.callbacks?.onCancel?.();
      this.closeIframe();
    });

    // Create a container for the iframe and close button
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.zIndex = "1000001";

    container.appendChild(this.iframe);
    container.appendChild(closeButton);

    if (this.overlay) {
      this.overlay.appendChild(container);
    }

    // Set iframe window in message handler
    this.messageHandler.setIframeWindow(this.iframe);
  }

  /**
   * Close the authentication iframe
   */
  public closeIframe(): void {
    if (this.overlay) {
      this.overlay.style.opacity = "0";
    }

    if (this.iframe) {
      this.iframe.style.transform = "translate(-50%, -50%) translateY(20px)";
    }

    // Remove elements after animation
    setTimeout(() => {
      this.removeElements();
    }, 300);
  }

  /**
   * Remove iframe and overlay elements from the DOM
   */
  private removeElements(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.iframe = null;
      this.messageHandler.setIframeWindow(null);

      // Notify callback
      this.options.callbacks?.onClose?.();
    }
  }

  /**
   * Check if the iframe is currently open
   */
  public isOpen(): boolean {
    return this.overlay !== null;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.removeElements();
    this.messageHandler.destroy();
  }
}

import { IframeMessage, MessageType } from "./types";

/**
 * Handles communication between the parent window and iframe
 */
export class MessageHandler {
  private targetOrigin: string;
  private iframeWindow: Window | null = null;
  private messageListeners: Map<string, Function[]> = new Map();
  private sessionId: string;
  private iframe: HTMLIFrameElement | null = null;

  constructor(serviceUrl: string) {
    // Extract origin from the serviceUrl
    try {
      const url = new URL(serviceUrl);
      this.targetOrigin = url.origin;
    } catch (error) {
      console.error("Invalid service URL:", error);
      this.targetOrigin = "*"; // Fallback, not recommended for production
    }

    // Generate a unique session ID
    this.sessionId = this.generateSessionId();

    // Listen for messages from the iframe
    window.addEventListener("message", this.handleMessage);
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    // Use crypto.randomUUID if available, otherwise fallback to Math.random
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Get the session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set the iframe window reference for sending messages
   */
  public setIframeWindow(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
    this.iframeWindow = iframe?.contentWindow || null;
  }

  /**
   * Send a message to the iframe
   */
  public sendMessage(type: MessageType, payload?: any): void {
    if (!this.iframeWindow) {
      console.error("Cannot send message: iframe window not set");
      return;
    }

    const message: IframeMessage = {
      type,
      payload,
      sessionId: this.sessionId,
    };

    this.iframeWindow.postMessage(message, this.targetOrigin);
  }

  /**
   * Subscribe to a specific message type
   */
  public on(messageType: MessageType, callback: Function): () => void {
    if (!this.messageListeners.has(messageType)) {
      this.messageListeners.set(messageType, []);
    }

    this.messageListeners.get(messageType)?.push(callback);

    // Return unsubscribe function
    return () => this.off(messageType, callback);
  }

  /**
   * Unsubscribe from a specific message type
   */
  public off(messageType: MessageType, callback: Function): void {
    const listeners = this.messageListeners.get(messageType);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Handle incoming messages from the iframe
   */
  private handleMessage = (event: MessageEvent<IframeMessage>): void => {
    // In production, you'd want to validate against a specific list of origins
    // For now, we're checking if we have a specific targetOrigin set
    if (this.targetOrigin !== "*") {
      if (event.origin !== this.targetOrigin) {
        console.warn(
          `Message origin ${event.origin} doesn't match expected origin ${this.targetOrigin}`
        );
        return;
      }
    } else {
      // If using "*" for development, log the origin for debugging
      console.log(`Received message from origin: ${event.origin}`);
    }

    const message = event.data;
    if (!message || typeof message !== "object") {
      console.warn("Received invalid message format");
      return;
    }

    if (!message.type || !Object.values(MessageType).includes(message.type)) {
      console.warn(`Received unknown message type: ${message.type}`);
      return;
    }

    // Verify session ID if present in message
    if (message.sessionId && message.sessionId !== this.sessionId) {
      console.warn("Session ID mismatch, ignoring message");
      return;
    }

    // Notify all listeners for this message type
    const listeners = this.messageListeners.get(message.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(message.payload);
        } catch (error) {
          console.error("Error in message listener:", error);
        }
      });
    }
  };

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    window.removeEventListener("message", this.handleMessage);
    this.messageListeners.clear();
  }
}

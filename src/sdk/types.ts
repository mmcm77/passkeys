/**
 * SDK Configuration options
 */
export interface PasskeySDKOptions {
  /** The merchant's unique identifier */
  merchantId: string;
  /** API token for merchant authorization */
  apiToken?: string;
  /** URL to your passkey service */
  serviceUrl?: string;
  /** Container CSS selector for button auto-mounting */
  container?: string;
  /** Theme mode for the SDK */
  theme?: "light" | "dark";
  /** Text to display on the authentication button */
  buttonText?: string;
  /** Button style preset */
  buttonStyle?: "default" | "minimal" | "custom";
  /** Custom styling options */
  styles?: StyleOptions;
  /** Callback functions */
  callbacks?: CallbackOptions;
}

/**
 * Styling options for SDK elements
 */
export interface StyleOptions {
  /** Styles for the authentication button */
  button?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    width?: string;
    height?: string;
  };
  /** Styles for the iframe */
  iframe?: {
    width?: string;
    height?: string;
    borderRadius?: string;
    boxShadow?: string;
  };
}

/**
 * Callback functions for SDK events
 */
export interface CallbackOptions {
  /** Called when authentication is successful */
  onSuccess?: (authResult: AuthResult) => void;
  /** Called when authentication fails */
  onError?: (error: Error) => void;
  /** Called when authentication is cancelled by user */
  onCancel?: () => void;
  /** Called when the iframe is opened */
  onOpen?: () => void;
  /** Called when the iframe is closed */
  onClose?: () => void;
}

/**
 * Authentication result returned after successful authentication
 */
export interface AuthResult {
  /** The authenticated user ID */
  userId: string;
  /** User email if available */
  email: string;
  /** Whether the user has a passkey */
  hasPasskey?: boolean;
  /** Number of passkeys the user has */
  passkeyCount: number;
  /** When the last passkey was added */
  lastPasskeyAddedAt?: number;
  /** Types of devices with passkeys */
  deviceTypes?: string[];
  /** Authentication token */
  token: string;
  /** When the token expires */
  expiresAt: number;
}

/**
 * Message types for postMessage communication
 */
export enum MessageType {
  INIT = "init",
  AUTH_INIT = "auth_init",
  AUTH_REQUEST = "auth_request",
  AUTH_RESPONSE = "auth_response",
  AUTH_SUCCESS = "auth_success",
  AUTH_CANCEL = "auth_cancel",
  AUTH_READY = "auth_ready",
  ERROR = "error",
  CLOSE = "close",
}

/**
 * Structure for messages passed between iframe and parent
 */
export interface IframeMessage {
  type: MessageType;
  merchantId?: string;
  sessionId?: string;
  payload?: any;
}

/**
 * Public SDK interface exposed to merchants
 */
export interface PasskeySDKInstance {
  mount: (element?: HTMLElement | string) => void;
  unmount: () => void;
  authenticate: () => Promise<AuthResult>;
  isAuthenticated: () => boolean;
  destroy: () => void;
}

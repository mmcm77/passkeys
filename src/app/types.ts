/**
 * Authenticated user information returned after successful authentication
 */
export type AuthenticatedUser = {
  userId: string;
  email: string;
  hasPasskey?: boolean;
  passkeyCount: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
};

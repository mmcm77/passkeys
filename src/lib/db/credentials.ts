import supabase from "../supabase";
import type { Credential } from "@/types/auth";

// Store a new credential
export async function storeCredential(
  credentialData: Omit<Credential, "id">
): Promise<Credential> {
  const newCredential: Credential = {
    id: crypto.randomUUID(),
    ...credentialData,
  };

  // Map to snake_case for the database
  const dbCredential = {
    id: newCredential.id,
    user_id: newCredential.userId,
    credential_id: newCredential.credentialId,
    credential_public_key: newCredential.credentialPublicKey,
    webauthn_user_id: newCredential.webauthnUserId,
    counter: newCredential.counter,
    device_type: newCredential.deviceType,
    backed_up: newCredential.backedUp,
    transports: newCredential.transports,
    device_info: newCredential.deviceInfo,
    created_at: newCredential.createdAt,
    last_used_at: newCredential.lastUsedAt,
    name: newCredential.name,
  };

  const { data, error } = await supabase
    .from("credentials")
    .insert(dbCredential)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store credential: ${error.message}`);
  }

  return newCredential;
}

// Get a credential by ID
export async function getCredentialById(
  credentialId: string
): Promise<Credential | null> {
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("id", credentialId)
    .single();

  if (error) {
    console.error("Error fetching credential by ID:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      userId: data.user_id,
      credentialId: data.credential_id,
      credentialPublicKey: data.credential_public_key,
      webauthnUserId: data.webauthn_user_id,
      counter: data.counter,
      deviceType: data.device_type,
      backedUp: data.backed_up,
      transports: data.transports,
      deviceInfo: data.device_info,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
      name: data.name,
    };
  }

  return null;
}

// Get a credential by credential ID
export async function getCredentialByCredentialId(
  credentialId: string
): Promise<Credential | null> {
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("credential_id", credentialId)
    .single();

  if (error) {
    console.error("Error fetching credential by credential ID:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      userId: data.user_id,
      credentialId: data.credential_id,
      credentialPublicKey: data.credential_public_key,
      webauthnUserId: data.webauthn_user_id,
      counter: data.counter,
      deviceType: data.device_type,
      backedUp: data.backed_up,
      transports: data.transports,
      deviceInfo: data.device_info,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
      name: data.name,
    };
  }

  return null;
}

// Get credentials by email
export async function getCredentialsByEmail(
  email: string
): Promise<Credential[]> {
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("webauthn_user_id", email);

  if (error) {
    console.error("Error fetching credentials by email:", error);
    return [];
  }

  // Map from snake_case to camelCase
  return data.map((item) => ({
    id: item.id,
    userId: item.user_id,
    credentialId: item.credential_id,
    credentialPublicKey: item.credential_public_key,
    webauthnUserId: item.webauthn_user_id,
    counter: item.counter,
    deviceType: item.device_type,
    backedUp: item.backed_up,
    transports: item.transports,
    deviceInfo: item.device_info,
    createdAt: item.created_at,
    lastUsedAt: item.last_used_at,
    name: item.name,
  }));
}

// Get all credentials for a user
export async function getCredentialsByUserId(
  userId: string
): Promise<Credential[]> {
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching credentials by user ID:", error);
    return [];
  }

  // Map from snake_case to camelCase
  return data.map((item) => ({
    id: item.id,
    userId: item.user_id,
    credentialId: item.credential_id,
    credentialPublicKey: item.credential_public_key,
    webauthnUserId: item.webauthn_user_id,
    counter: item.counter,
    deviceType: item.device_type,
    backedUp: item.backed_up,
    transports: item.transports,
    deviceInfo: item.device_info,
    createdAt: item.created_at,
    lastUsedAt: item.last_used_at,
    name: item.name,
  }));
}

// Update a credential
export async function updateCredential(
  credentialId: string,
  credentialData: Partial<
    Pick<
      Credential,
      | "webauthnUserId"
      | "counter"
      | "deviceType"
      | "backedUp"
      | "transports"
      | "deviceInfo"
      | "lastUsedAt"
      | "name"
    >
  >
): Promise<Credential | null> {
  // Map from camelCase to snake_case
  const dbCredentialData: Record<string, any> = {};

  if (credentialData.webauthnUserId !== undefined)
    dbCredentialData.webauthn_user_id = credentialData.webauthnUserId;
  if (credentialData.counter !== undefined)
    dbCredentialData.counter = credentialData.counter;
  if (credentialData.deviceType !== undefined)
    dbCredentialData.device_type = credentialData.deviceType;
  if (credentialData.backedUp !== undefined)
    dbCredentialData.backed_up = credentialData.backedUp;
  if (credentialData.transports !== undefined)
    dbCredentialData.transports = credentialData.transports;
  if (credentialData.deviceInfo !== undefined)
    dbCredentialData.device_info = credentialData.deviceInfo;
  if (credentialData.lastUsedAt !== undefined)
    dbCredentialData.last_used_at = credentialData.lastUsedAt;
  if (credentialData.name !== undefined)
    dbCredentialData.name = credentialData.name;

  const { data, error } = await supabase
    .from("credentials")
    .update(dbCredentialData)
    .eq("id", credentialId)
    .select()
    .single();

  if (error) {
    console.error("Error updating credential:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      userId: data.user_id,
      credentialId: data.credential_id,
      credentialPublicKey: data.credential_public_key,
      webauthnUserId: data.webauthn_user_id,
      counter: data.counter,
      deviceType: data.device_type,
      backedUp: data.backed_up,
      transports: data.transports,
      deviceInfo: data.device_info,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
      name: data.name,
    };
  }

  return null;
}

// Delete a credential
export async function deleteCredential(credentialId: string): Promise<void> {
  const { error } = await supabase
    .from("credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    console.error("Error deleting credential:", error);
  }
}

// Delete all credentials for a user
export async function deleteAllCredentialsForUser(
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("credentials")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting all credentials for user:", error);
    throw new Error(`Failed to delete credentials: ${error.message}`);
  }
}

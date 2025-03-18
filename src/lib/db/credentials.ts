import supabase from "../supabase";
import type { Credential, DeviceInfo } from "@/types/auth";
import type { Database } from "@/types/database";

type DbCredential = Database["public"]["Tables"]["credentials"]["Row"];
type DbCredentialInsert = Database["public"]["Tables"]["credentials"]["Insert"];
type DbCredentialUpdate = Database["public"]["Tables"]["credentials"]["Update"];

// Helper function to map database credential to app credential
function mapDbToCredential(data: DbCredential): Credential {
  return {
    id: data.id,
    userId: data.user_id,
    credentialId: data.credential_id,
    credentialPublicKey: data.credential_public_key,
    webauthnUserId: data.webauthn_user_id,
    counter: data.counter,
    deviceType: data.device_type as "singleDevice" | "multiDevice" | undefined,
    backedUp: data.backed_up,
    transports: data.transports,
    deviceInfo: data.device_info as DeviceInfo | undefined,
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
    name: data.name,
  };
}

// Store a new credential
export async function storeCredential(
  credentialData: Omit<Credential, "id">
): Promise<Credential> {
  const newCredential: Credential = {
    id: crypto.randomUUID(),
    ...credentialData,
  };

  // Generate a unique webauthn_user_id to avoid constraint violations
  const uniqueWebauthnId = `${
    credentialData.userId
  }_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Map to snake_case for the database
  const dbCredential: DbCredentialInsert = {
    id: newCredential.id,
    user_id: newCredential.userId,
    credential_id: newCredential.credentialId,
    credential_public_key: newCredential.credentialPublicKey,
    webauthn_user_id: uniqueWebauthnId,
    counter: newCredential.counter,
    device_type: newCredential.deviceType,
    backed_up: newCredential.backedUp,
    transports: newCredential.transports,
    device_info: newCredential.deviceInfo as Record<string, unknown>,
    created_at: newCredential.createdAt,
    last_used_at: newCredential.lastUsedAt,
    name: newCredential.name,
  };

  const { error } = await supabase
    .from("credentials")
    .insert(dbCredential)
    .select();

  if (error) {
    throw new Error(`Failed to store credential: ${error.message}`);
  }

  // Return the credential with the original webauthn_user_id from params
  return newCredential;
}

// Get a credential by ID
export async function getCredentialById(
  credentialId: string
): Promise<Credential | null> {
  const { data, error } = await supabase
    .from("credentials")
    .select()
    .eq("id", credentialId)
    .returns<DbCredential>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching credential by ID:", error);
    return null;
  }

  return mapDbToCredential(data);
}

// Get a credential by credential ID
export async function getCredentialByCredentialId(
  credentialId: string
): Promise<Credential | null> {
  const { data, error } = await supabase
    .from("credentials")
    .select()
    .eq("credential_id", credentialId)
    .returns<DbCredential>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching credential by credential ID:", error);
    return null;
  }

  return mapDbToCredential(data);
}

// Get credentials by email
export async function getCredentialsByEmail(
  email: string
): Promise<Credential[]> {
  const { data, error } = await supabase
    .from("credentials")
    .select()
    .eq("webauthn_user_id", email)
    .returns<DbCredential[]>();

  if (error || !data) {
    console.error("Error fetching credentials by email:", error);
    return [];
  }

  return data.map(mapDbToCredential);
}

// Get all credentials for a user
export async function getCredentialsByUserId(
  userId: string
): Promise<Credential[]> {
  const { data, error } = await supabase
    .from("credentials")
    .select()
    .eq("user_id", userId)
    .returns<DbCredential[]>();

  if (error || !data) {
    console.error("Error fetching credentials by user ID:", error);
    return [];
  }

  return data.map(mapDbToCredential);
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
  const dbCredentialData: DbCredentialUpdate = {
    ...(credentialData.webauthnUserId !== undefined && {
      webauthn_user_id: credentialData.webauthnUserId,
    }),
    ...(credentialData.counter !== undefined && {
      counter: credentialData.counter,
    }),
    ...(credentialData.deviceType !== undefined && {
      device_type: credentialData.deviceType,
    }),
    ...(credentialData.backedUp !== undefined && {
      backed_up: credentialData.backedUp,
    }),
    ...(credentialData.transports !== undefined && {
      transports: credentialData.transports,
    }),
    ...(credentialData.deviceInfo !== undefined && {
      device_info: credentialData.deviceInfo as Record<string, unknown>,
    }),
    ...(credentialData.lastUsedAt !== undefined && {
      last_used_at: credentialData.lastUsedAt,
    }),
    ...(credentialData.name !== undefined && {
      name: credentialData.name,
    }),
  };

  const { data, error } = await supabase
    .from("credentials")
    .update(dbCredentialData)
    .eq("id", credentialId)
    .select()
    .returns<DbCredential>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error updating credential:", error);
    return null;
  }

  return mapDbToCredential(data);
}

// Delete a credential
export async function deleteCredential(credentialId: string): Promise<void> {
  const { error } = await supabase
    .from("credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    throw new Error(`Failed to delete credential: ${error.message}`);
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
    throw new Error(`Failed to delete user credentials: ${error.message}`);
  }
}

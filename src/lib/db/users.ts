import supabase from "../supabase";
import { User } from "@/types/auth";

// Create a new user
export async function createUser(userData: {
  email: string;
  displayName?: string;
}): Promise<User> {
  const now = Date.now();

  // Create the user object with camelCase for TypeScript
  const newUser: User = {
    id: crypto.randomUUID(),
    email: userData.email,
    displayName: userData.displayName,
    createdAt: now,
    updatedAt: now,
  };

  // Map to snake_case for the database
  const dbUser = {
    id: newUser.id,
    email: newUser.email,
    display_name: newUser.displayName,
    created_at: newUser.createdAt,
    updated_at: newUser.updatedAt,
  };

  const { error } = await supabase.from("users").insert(dbUser);

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
}

// Get a user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  return null;
}

// Get a user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Use the SQL query approach with explicit format specifier
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }

    // Handle empty result
    if (!data || data.length === 0) {
      return null;
    }

    // Map from snake_case to camelCase (get first result)
    const userData = data[0];
    return {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
  } catch (error) {
    console.error("Exception fetching user by email:", error);
    return null;
  }
}

// Add function to get a user with their credential count
export async function getUserWithCredentials(email: string) {
  if (!email) return null;

  // First get the user
  const user = await getUserByEmail(email);
  if (!user) return null;

  // Then get their credentials
  const { data: credentials, error } = await supabase
    .from("credentials")
    .select("id, created_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching credentials:", error);
    return null;
  }

  return {
    ...user,
    passkeyCount: credentials?.length || 0,
    lastPasskeyAddedAt: credentials?.length
      ? Math.max(...credentials.map((c) => new Date(c.created_at).getTime()))
      : null,
  };
}

// Update a user
export async function updateUser(
  userId: string,
  userData: Partial<Omit<User, "id" | "createdAt">>
): Promise<User | null> {
  // Map from camelCase to snake_case
  const dbUserData: Record<string, unknown> = {};
  if (userData.displayName !== undefined)
    dbUserData.display_name = userData.displayName;
  if (userData.updatedAt !== undefined)
    dbUserData.updated_at = userData.updatedAt;

  // Always update the updated_at field
  dbUserData.updated_at = Date.now();

  const { data, error } = await supabase
    .from("users")
    .update(dbUserData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  return null;
}

import supabase from "../supabase";
import { User } from "@/types/auth";
import { Database } from "@/types/database";

type DbUser = Database["public"]["Tables"]["users"]["Row"];
type DbCredential = Database["public"]["Tables"]["credentials"]["Row"];

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
  const dbUser: Database["public"]["Tables"]["users"]["Insert"] = {
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
    .returns<DbUser[]>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching user by ID:", error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Get a user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1)
      .returns<DbUser[]>();

    if (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }

    // Handle empty result
    if (!data || data.length === 0) {
      return null;
    }

    // Map from snake_case to camelCase (get first result)
    const dbUser = data[0];
    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.display_name,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  } catch (error) {
    console.error("Exception fetching user by email:", error);
    return null;
  }
}

// Add function to get a user with their credential count
export async function getUserWithCredentials(email: string): Promise<{
  id: string;
  email: string;
  displayName?: string;
  createdAt: number;
  updatedAt: number;
  passkeyCount: number;
  lastPasskeyAddedAt: number | null;
} | null> {
  if (!email) return null;

  // First get the user
  const user = await getUserByEmail(email);
  if (!user) return null;

  // Then get their credentials
  const { data: credentials, error } = await supabase
    .from("credentials")
    .select("id, created_at")
    .eq("user_id", user.id)
    .returns<Pick<DbCredential, "id" | "created_at">[]>();

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
  const dbUserData: Database["public"]["Tables"]["users"]["Update"] = {
    display_name: userData.displayName,
    updated_at: Date.now(),
  };

  const { data, error } = await supabase
    .from("users")
    .update(dbUserData)
    .eq("id", userId)
    .select()
    .returns<DbUser[]>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error updating user:", error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

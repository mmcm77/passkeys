import { randomBytes } from "crypto";
import supabase from "../supabase";
import { Challenge } from "@/types/auth";

// Generate a unique challenge ID
function generateChallengeId(type: "registration" | "authentication"): string {
  const prefix = type === "registration" ? "reg" : "auth";
  const randomId = randomBytes(16).toString("hex");
  return `${prefix}_${Date.now()}_${randomId}`;
}

// Store a challenge in Supabase
export async function storeChallenge(
  type: "registration" | "authentication",
  challenge: string,
  data: Record<string, any>,
  expiresIn: number = 60000 // 1 minute by default
): Promise<string> {
  const challengeId = generateChallengeId(type);
  const expiresAt = new Date(Date.now() + expiresIn);

  // Create the challenge object with camelCase for TypeScript
  const challengeData: Challenge = {
    id: challengeId,
    challenge,
    type,
    data,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Map to snake_case for the database
  const dbChallengeData = {
    id: challengeData.id,
    challenge: challengeData.challenge,
    type: challengeData.type,
    data: challengeData.data,
    expires_at: challengeData.expiresAt,
    created_at: challengeData.createdAt,
  };

  const { error } = await supabase.from("challenges").insert(dbChallengeData);

  if (error) {
    throw new Error(`Failed to store challenge: ${error.message}`);
  }

  return challengeId;
}

// Get a challenge from Supabase
async function getChallengeFromDb(
  challengeId: string
): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error) {
    console.error("Error fetching challenge:", error);
    return null;
  }

  // Map from snake_case to camelCase
  if (data) {
    return {
      id: data.id,
      challenge: data.challenge,
      type: data.type,
      data: data.data,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  }

  return null;
}

// Remove a challenge from Supabase
export async function removeChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId);

  if (error) {
    console.error("Error removing challenge:", error);
  }
}

// Verify a challenge
export async function verifyChallenge(
  challengeId: string,
  expectedType?: "registration" | "authentication"
): Promise<{
  valid: boolean;
  error?: string;
  challenge?: string;
  data?: Record<string, any>;
}> {
  const challengeData = await getChallengeFromDb(challengeId);

  if (!challengeData) {
    return { valid: false, error: "Challenge not found" };
  }

  if (expectedType && challengeData.type !== expectedType) {
    return { valid: false, error: "Invalid challenge type" };
  }

  const expiresAt = new Date(challengeData.expiresAt);
  if (expiresAt < new Date()) {
    return { valid: false, error: "Challenge expired" };
  }

  return {
    valid: true,
    challenge: challengeData.challenge,
    data: challengeData.data,
  };
}

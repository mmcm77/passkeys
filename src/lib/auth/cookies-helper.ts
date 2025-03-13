import { cookies } from "next/headers";

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value;
}

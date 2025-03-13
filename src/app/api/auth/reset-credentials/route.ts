import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { deleteAllCredentialsForUser } from "@/lib/db/credentials";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all credentials for the user
    await deleteAllCredentialsForUser(user.id);

    return NextResponse.json({
      success: true,
      message: "All credentials have been reset for this user",
    });
  } catch (error) {
    console.error("Error resetting credentials:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

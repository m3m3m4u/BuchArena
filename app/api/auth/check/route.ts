import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";

/**
 * Leichtgewichtiger Session-Check.
 * Gibt 200 + User-Daten zurück wenn gültig, sonst 401.
 */
export async function GET() {
  const account = await getServerAccount();
  if (!account) {
    return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
  }
  return NextResponse.json({
    username: account.username,
    email: account.email,
    role: account.role,
  });
}

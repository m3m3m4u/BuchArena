import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccountFromToken } from "@/lib/server-auth";

export const runtime = "nodejs";


export async function POST() {
  try {
    const cookieStore = await cookies();
    const returnToken = cookieStore.get("impersonation_return_token")?.value;

    if (!returnToken) {
      return NextResponse.json({ message: "Keine aktive Imitation." }, { status: 400 });
    }

    const admin = await getAccountFromToken(returnToken);
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Ungültige Rückkehr." }, { status: 403 });
    }

    const res = NextResponse.json({
      message: `Du bist wieder als „${admin.username}" eingeloggt.`,
      user: { username: admin.username, email: admin.email, role: admin.role },
    });

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    // Original-Admin-Token wiederherstellen
    res.cookies.set("auth_token", returnToken, cookieOpts);

    // Imitations-Cookies löschen
    res.cookies.set("impersonation_return_token", "", { ...cookieOpts, maxAge: 0 });
    res.cookies.set("impersonating_as", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Rückkehr fehlgeschlagen." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Abgemeldet." });
  for (const name of ["auth_token", "logged_in_account", "impersonation_return_token", "impersonating_as"]) {
    response.cookies.set(name, "", {
      httpOnly: name === "auth_token" || name === "impersonation_return_token",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

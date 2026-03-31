/**
 * Server-seitige Auth-Prüfung.
 * Liest ein signiertes JWT aus dem `auth_token`-Cookie, verifiziert es,
 * und bestätigt den User + Rolle in der DB.
 *
 * Unter dem Namen `logged_in_account` wird weiterhin ein **unsignierter**
 * Cookie gesetzt, der ausschließlich für die **Client-seitige UI** genutzt
 * wird (z. B. Anzeige des Benutzernamens). Alle Server-seitigen Auth-
 * Entscheidungen basieren auf dem `auth_token`-JWT.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getUsersCollection, type UserRole } from "@/lib/mongodb";

export type ServerAccount = {
  username: string;
  email: string;
  role: UserRole;
};

/* ── JWT-Konfiguration ── */

const JWT_ISSUER = "bucharena";
const JWT_EXPIRY = "7d";

function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("KRITISCH: JWT_SECRET muss in Production als Umgebungsvariable gesetzt sein!");
    }
    console.warn("⚠ JWT_SECRET nicht gesetzt – verwende Fallback (nur für Entwicklung).");
    return new TextEncoder().encode("bucharena-dev-only-jwt-secret-DO-NOT-USE-IN-PRODUCTION");
  }
  return new TextEncoder().encode(raw);
}

interface AuthTokenPayload extends JWTPayload {
  sub: string;    // username
  email: string;
  role: UserRole;
}

/** Erzeugt ein signiertes JWT für den gegebenen Account. */
export async function createAuthToken(account: ServerAccount): Promise<string> {
  return new SignJWT({ email: account.email, role: account.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setSubject(account.username)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

/**
 * Liest den Account aus dem signierten JWT-Cookie (server-seitig).
 * Verifiziert die Signatur und prüft den User in der DB.
 * Gibt null zurück, wenn kein/ungültiger Token oder User nicht existiert.
 */
export const getServerAccount = cache(async (): Promise<ServerAccount | null> => {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: JWT_ISSUER });
    const p = payload as AuthTokenPayload;
    if (!p.sub) return null;

    // DB-Verifikation: User existiert und ist aktiv
    const users = await getUsersCollection();
    const dbUser = await users.findOne(
      { username: p.sub, status: { $ne: "deactivated" } },
      { projection: { username: 1, email: 1, role: 1 } },
    );
    if (!dbUser) return null;

    return {
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role as UserRole,
    };
  } catch {
    return null;
  }
});

/**
 * Prüft ob der aktuelle User ein SUPERADMIN ist.
 * getServerAccount() prüft bereits gegen die DB.
 */
export async function requireSuperAdmin(): Promise<ServerAccount | null> {
  const account = await getServerAccount();
  if (!account || account.role !== "SUPERADMIN") return null;
  return account;
}

/**
 * Prüft ob der aktuelle User mindestens ADMIN ist (ADMIN oder SUPERADMIN).
 */
export async function requireAdmin(): Promise<ServerAccount | null> {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) return null;
  return account;
}

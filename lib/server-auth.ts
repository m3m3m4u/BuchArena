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
  sessionVersion?: number;
  userId?: string;
};

/* ── JWT-Konfiguration ── */

const JWT_ISSUER = "bucharena";
const JWT_EXPIRY = "7d";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET ist nicht gesetzt oder zu kurz (mindestens 16 Zeichen). " +
        "Bitte eine starke, zufällige Umgebungsvariable konfigurieren.",
    );
  }
  return new TextEncoder().encode(secret);
}

interface AuthTokenPayload extends JWTPayload {
  sub: string;    // username
  email: string;
  role: UserRole;
  sessionVersion?: number;
  userId?: string;
}

/** Erzeugt ein signiertes JWT für den gegebenen Account. */
export async function createAuthToken(account: ServerAccount): Promise<string> {
  return new SignJWT({ email: account.email, role: account.role, sessionVersion: account.sessionVersion ?? 0, userId: account.userId })
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
export async function getAccountFromToken(token: string): Promise<ServerAccount | null> {
  let p: AuthTokenPayload;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: JWT_ISSUER, algorithms: ["HS256"] });
    p = payload as AuthTokenPayload;
    if (typeof p.sub !== "string" || !p.sub) return null;
  } catch {
    return null;
  }

  // Datenbankfehler weitergeben: ein vorübergehender Ausfall ist kein Logout.
  const users = await getUsersCollection();
  const user = await users.findOne(
    { username: p.sub },
    { projection: { username: 1, email: 1, role: 1, status: 1, sessionVersion: 1 } },
  );
  if (!user || user.status === "deactivated" || (p.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) return null;
  if (p.userId ? p.userId !== user._id.toString() : p.email !== user.email) return null;
  return { username: user.username, email: user.email, role: user.role, sessionVersion: user.sessionVersion ?? 0, userId: user._id.toString() };
}

export const getServerAccount = cache(async (): Promise<ServerAccount | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  return token ? getAccountFromToken(token) : null;
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

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

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getUsersCollection, type UserRole } from "@/lib/mongodb";

export type ServerAccount = {
  username: string;
  email: string;
  role: UserRole;
};

/* ── JWT-Konfiguration ── */

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? "bucharena-default-jwt-secret-change-me";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_ISSUER = "bucharena";
const JWT_EXPIRY = "7d";

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
    .sign(JWT_SECRET);
}

/**
 * Liest den Account aus dem signierten JWT-Cookie (server-seitig).
 * Verifiziert die Signatur und prüft den User in der DB.
 * Gibt null zurück, wenn kein/ungültiger Token oder User nicht existiert.
 */
export async function getServerAccount(): Promise<ServerAccount | null> {
  try {
    const cookieStore = await cookies();

    // Zuerst neues JWT prüfen
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
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
    }

    // Fallback: Legacy-Cookie (wird in Zukunft entfernt)
    const raw = cookieStore.get("logged_in_account")?.value;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as ServerAccount;
    if (!parsed?.username) return null;

    // Auch beim Legacy-Cookie: DB-Verifikation
    const users = await getUsersCollection();
    const dbUser = await users.findOne(
      { username: parsed.username, status: { $ne: "deactivated" } },
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
}

/**
 * Prüft ob der aktuelle User ein SUPERADMIN ist.
 * getServerAccount() prüft bereits gegen die DB.
 */
export async function requireSuperAdmin(): Promise<ServerAccount | null> {
  const account = await getServerAccount();
  if (!account || account.role !== "SUPERADMIN") return null;
  return account;
}

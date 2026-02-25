/**
 * Server-seitige Auth-Prüfung.
 * Liest den `logged_in_account`-Cookie aus dem Request und verifiziert
 * den User + Rolle in der DB.
 */

import { cookies } from "next/headers";
import { getUsersCollection, type UserRole } from "@/lib/mongodb";

export type ServerAccount = {
  username: string;
  email: string;
  role: UserRole;
};

/**
 * Liest den Account aus dem Cookie (server-seitig).
 * Gibt null zurück, wenn kein/ungültiger Cookie.
 */
export async function getServerAccount(): Promise<ServerAccount | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("logged_in_account")?.value;
    if (!raw) return null;

    const parsed = JSON.parse(decodeURIComponent(raw)) as ServerAccount;
    if (!parsed?.username) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Prüft ob der aktuelle User ein SUPERADMIN ist.
 * Verifiziert zusätzlich in der DB.
 */
export async function requireSuperAdmin(): Promise<ServerAccount | null> {
  const account = await getServerAccount();
  if (!account || account.role !== "SUPERADMIN") return null;

  // Verifiziere in DB
  try {
    const users = await getUsersCollection();
    const dbUser = await users.findOne(
      { username: account.username },
      { projection: { role: 1 } }
    );
    if (!dbUser || dbUser.role !== "SUPERADMIN") return null;
  } catch {
    return null;
  }

  return account;
}

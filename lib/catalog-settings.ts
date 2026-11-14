import { getDatabase, getUsersCollection, getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export type CatalogSettings = {
  hideUnclaimedBooks: boolean;
  hideUnclaimedAuthors: boolean;
};

export type CatalogStats = {
  totalBooks: number;
  unclaimedBooks: number;
  manualBooks: number;
  totalAuthors: number;
  unclaimedAuthors: number;
  manualAuthors: number;
};

const DEFAULT_SETTINGS: CatalogSettings = {
  hideUnclaimedBooks: false,
  hideUnclaimedAuthors: false,
};

/**
 * Liest die globalen Katalog-Einstellungen aus der Datenbank (settings.catalogSettings).
 */
export async function getCatalogSettings(): Promise<CatalogSettings> {
  try {
    const db = await getDatabase();
    const doc = await db.collection("settings").findOne({ key: "catalogSettings" });
    if (!doc || !doc.value) return DEFAULT_SETTINGS;
    return {
      hideUnclaimedBooks: Boolean(doc.value.hideUnclaimedBooks),
      hideUnclaimedAuthors: Boolean(doc.value.hideUnclaimedAuthors),
    };
  } catch (error) {
    console.error("Fehler beim Laden der Katalog-Einstellungen:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Aktualisiert die globalen Katalog-Einstellungen.
 */
export async function updateCatalogSettings(newSettings: Partial<CatalogSettings>): Promise<CatalogSettings> {
  const db = await getDatabase();
  const current = await getCatalogSettings();
  const updated: CatalogSettings = {
    hideUnclaimedBooks: typeof newSettings.hideUnclaimedBooks === "boolean" ? newSettings.hideUnclaimedBooks : current.hideUnclaimedBooks,
    hideUnclaimedAuthors: typeof newSettings.hideUnclaimedAuthors === "boolean" ? newSettings.hideUnclaimedAuthors : current.hideUnclaimedAuthors,
  };

  await db.collection("settings").updateOne(
    { key: "catalogSettings" },
    { $set: { key: "catalogSettings", value: updated, updatedAt: new Date() } },
    { upsert: true }
  );

  return updated;
}

/**
 * Liefert Statistiken über die Anzahl manueller vs. unbeanspruchter Bücher und Autoren.
 */
export async function getCatalogStats(): Promise<CatalogStats> {
  try {
    const books = await getBooksCollection();
    const users = await getUsersCollection();

    const [totalBooks, unclaimedBooks, totalAuthors, unclaimedAuthors] = await Promise.all([
      books.countDocuments({}),
      books.countDocuments({ isUnclaimed: true }),
      users.countDocuments({ "profile.name.value": { $exists: true, $ne: "" }, "profile.deaktiviert": { $ne: true } }),
      users.countDocuments({ isUnclaimed: true, "profile.name.value": { $exists: true, $ne: "" } }),
    ]);

    return {
      totalBooks,
      unclaimedBooks,
      manualBooks: Math.max(0, totalBooks - unclaimedBooks),
      totalAuthors,
      unclaimedAuthors,
      manualAuthors: Math.max(0, totalAuthors - unclaimedAuthors),
    };
  } catch (error) {
    console.error("Fehler beim Abrufen der Katalogstatistiken:", error);
    return {
      totalBooks: 0,
      unclaimedBooks: 0,
      manualBooks: 0,
      totalAuthors: 0,
      unclaimedAuthors: 0,
      manualAuthors: 0,
    };
  }
}

/**
 * Prüft, ob der aktuell anfragende Benutzer ein registrierter Benutzer mit Autorenprofil ist.
 * Ein Benutzer gilt als registrierter Autor, wenn er eingeloggt ist und in profile.name.value
 * einen Namen hinterlegt hat (und das Profil nicht deaktiviert ist).
 */
export async function isRegisteredAuthorUser(): Promise<boolean> {
  try {
    const account = await getServerAccount();
    if (!account) return false;

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { "profile.name.value": 1, "profile.deaktiviert": 1 } }
    );

    if (!user || user.profile?.deaktiviert) return false;
    const authorName = user.profile?.name?.value?.trim();
    return Boolean(authorName && authorName.length > 0);
  } catch {
    return false;
  }
}

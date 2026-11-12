import {
  getUsersCollection,
  getBooksCollection,
  getMessagesCollection,
  getMessageConversationsCollection,
  type UserDocument,
} from "@/lib/mongodb";

/**
 * Prüft ob der Nutzer mindestens ein Profil (Autor, Sprecher, Blogger, etc.) ausgefüllt hat.
 */
export function hasCompletedAnyProfile(user: Partial<UserDocument> | null | undefined): boolean {
  if (!user) return false;
  const checkName = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return false;
    const name = (obj as Record<string, unknown>).name as { value?: string } | undefined;
    return !!(name?.value?.trim());
  };
  return (
    checkName(user.profile) ||
    checkName(user.speakerProfile) ||
    checkName(user.bloggerProfile) ||
    checkName(user.testleserProfile) ||
    checkName(user.lektorenProfile) ||
    checkName(user.verlageProfile)
  );
}

/**
 * Erkennt typische Links und Kurzlinks in Nachrichten
 */
const URL_REGEX = /(https?:\/\/|www\.|\b[a-zA-Z0-9-]+\.(com|de|at|ch|org|net|io|me|ru|xyz|top|info|site|online|link|click|vip)\b|t\.me\/|wa\.me\/|bit\.ly\/|tinyurl\.com\/|discord\.gg\/)/i;

export function containsUrl(text: string): boolean {
  if (!text) return false;
  return URL_REGEX.test(text);
}

/**
 * Ein Nutzer gilt als vertrauenswürdig (Trusted), wenn:
 * - Admin oder SuperAdmin ist
 * - Mindestens 1 Buch hochgeladen hat
 * - Mindestens ein Profil ausgefüllt hat
 */
export async function isSenderTrusted(
  username: string,
  userDoc?: Partial<UserDocument> | null
): Promise<boolean> {
  let user = userDoc;
  if (!user) {
    const users = await getUsersCollection();
    user = (await users.findOne({ username })) ?? undefined;
  }
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPERADMIN") return true;

  if (hasCompletedAnyProfile(user)) return true;

  const books = await getBooksCollection();
  const bookCount = await books.countDocuments({ ownerUsername: username });
  if (bookCount > 0) return true;

  return false;
}

/**
 * Zählt wie viele unterschiedliche Empfänger der Absender in den letzten 24h
 * per Erstnachricht (oder generell) angeschrieben hat.
 */
export async function getColdOutreachCount24h(senderUsername: string): Promise<number> {
  const messagesCol = await getMessagesCollection();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const distinctRecipients = await messagesCol.distinct("recipientUsername", {
    senderUsername,
    createdAt: { $gte: since },
    broadcast: { $ne: true },
  });
  return distinctRecipients.length;
}

/**
 * Prüft ob zwischen zwei Nutzern bereits eine Konversation oder ein Nachrichtenaustausch existiert.
 */
export async function hasPriorConversation(user1: string, user2: string): Promise<boolean> {
  const [userA, userB] = [user1, user2].sort();
  const convCol = await getMessageConversationsCollection();
  const existing = await convCol.findOne(
    { userA, userB },
    { projection: { _id: 1, latestMessageId: 1 } }
  );
  if (existing) return true;

  // Fallback: Prüfen ob bereits eine Nachricht in der messages-Collection existiert
  const messages = await getMessagesCollection();
  const prior = await messages.findOne(
    {
      $or: [
        { senderUsername: user1, recipientUsername: user2 },
        { senderUsername: user2, recipientUsername: user1 },
      ],
    },
    { projection: { _id: 1 } }
  );
  return !!prior;
}

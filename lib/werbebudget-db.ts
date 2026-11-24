import { getDatabase } from "@/lib/mongodb";
import { getAdBudgetExpiry, isAdBudgetMonth, type AdBudgetRound } from "@/lib/werbebudget";

let retentionSetup: Promise<void> | undefined;

export async function getAdBudgetRounds() {
  const collection = (await getDatabase()).collection<AdBudgetRound>("social_media_werbebudget");
  retentionSetup ??= (async () => {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "werbebudget_retention" });
    // Include submissions created before the retention policy was added.
    const legacy = await collection.find({ expiresAt: { $exists: false } }, { projection: { _id: 1 } }).toArray();
    for (const round of legacy) {
      if (isAdBudgetMonth(round._id)) await collection.updateOne(
        { _id: round._id, expiresAt: { $exists: false } },
        { $set: { expiresAt: getAdBudgetExpiry(round._id) } },
      );
    }
  })().catch((error) => { retentionSetup = undefined; throw error; });
  await retentionSetup;
  return collection;
}

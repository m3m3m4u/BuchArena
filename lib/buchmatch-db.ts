import { getDatabase } from "@/lib/mongodb";
import type { BuchMatchOfferDoc, BuchMatchApplicationDoc } from "@/lib/buchmatch";

export async function getBuchMatchOffersCollection() {
  const db = await getDatabase();
  return db.collection<BuchMatchOfferDoc>("buchmatch_offers");
}

export async function getBuchMatchApplicationsCollection() {
  const db = await getDatabase();
  return db.collection<BuchMatchApplicationDoc>("buchmatch_applications");
}

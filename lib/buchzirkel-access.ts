import { ObjectId } from "mongodb";
import { getBuchzirkelBewerbungenCollection, getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";

type AccessZirkel = {
  _id?: ObjectId;
  veranstalterUsername: string;
  typ?: string;
  agbPflicht?: boolean;
};

/** Gemeinsame Zugangsprüfung für Manuskripte, Diskussionen und Gruppenchat. */
export async function canAccessBuchzirkel(zirkel: AccessZirkel, username: string): Promise<boolean> {
  if (zirkel.veranstalterUsername === username) return true;
  if (!zirkel._id) return false;

  const teilnahmen = await getBuchzirkelTeilnahmenCollection();
  const teilnahme = await teilnahmen.findOne({ buchzirkelId: zirkel._id, teilnehmerUsername: username });
  if (!teilnahme || teilnahme.abgebrochen) return false;
  if (zirkel.typ !== "betaleser" && !zirkel.agbPflicht) return true;

  const bewerbungen = await getBuchzirkelBewerbungenCollection();
  const bewerbung = await bewerbungen.findOne({ buchzirkelId: zirkel._id, bewerberUsername: username });
  return bewerbung?.agbAkzeptiert === true;
}

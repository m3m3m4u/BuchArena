import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

/** GET – Öffentliche Statistiken: Anzahl Bücher, Autoren, Blogger, Sprecher */
export async function GET() {
  try {
    const db = await getDatabase();
    const users = db.collection("users");

    const notDeactivated = { status: { $ne: "deactivated" } };
    const activeOnly = { $or: [{ status: { $exists: false } }, { status: "active" }] };

    const [bookCount, authorCount, bloggerCount, speakerCount, testleserCount, lektorenCount, verlageCount] = await Promise.all([
      db.collection("books").countDocuments({}),
      users.countDocuments({ ...notDeactivated, "profile.name.value": { $exists: true, $ne: "" } }),
      users.countDocuments({ ...notDeactivated, "bloggerProfile.name.value": { $exists: true, $ne: "" } }),
      users.countDocuments({ ...notDeactivated, "speakerProfile.name.value": { $exists: true, $ne: "" } }),
      users.countDocuments({ ...notDeactivated, "testleserProfile.name.value": { $exists: true, $ne: "" } }),
      users.countDocuments({ ...activeOnly, "lektorenProfile.name.value": { $exists: true, $ne: "" }, "lektorenProfile.deaktiviert": { $ne: true } }),
      users.countDocuments({ ...activeOnly, "verlageProfile.name.value": { $exists: true, $ne: "" }, "verlageProfile.deaktiviert": { $ne: true } }),
    ]);

    const res = NextResponse.json({ bookCount, authorCount, bloggerCount, speakerCount, testleserCount, lektorenCount, verlageCount });
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

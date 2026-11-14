import { NextResponse } from "next/server";
import { getDatabase, getUsersCollection, getBooksCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authorUsername = (body.authorUsername || "").trim();
    const requesterName = (body.requesterName || "").trim();
    const requesterEmail = (body.requesterEmail || "").trim();
    const note = (body.note || "").trim();

    if (!authorUsername || !requesterName || !requesterEmail) {
      return NextResponse.json(
        { message: "Bitte Name, E-Mail-Adresse und Autorenprofil angeben." },
        { status: 400 }
      );
    }

    // E-Mail-Format prüfen
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
      return NextResponse.json(
        { message: "Bitte eine gültige E-Mail-Adresse angeben." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const author = await users.findOne({ username: authorUsername });

    if (!author) {
      return NextResponse.json(
        { message: "Autorenprofil nicht gefunden." },
        { status: 404 }
      );
    }

    if (!author.isUnclaimed) {
      return NextResponse.json(
        { message: "Dieses Profil wurde bereits beansprucht." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const claimsCol = db.collection("author_claims");

    // Prüfen, ob bereits ein offener Antrag für dieses Profil und diese E-Mail vorliegt
    const existing = await claimsCol.findOne({
      authorUsername,
      requesterEmail,
      status: "pending",
    });

    if (existing) {
      return NextResponse.json(
        { message: "Ein Antrag für dieses Profil mit dieser E-Mail-Adresse wird bereits geprüft." },
        { status: 400 }
      );
    }

    await claimsCol.insertOne({
      authorUsername,
      authorDisplayName: author.displayName || author.profile?.name?.value || authorUsername,
      requesterName,
      requesterEmail,
      note,
      status: "pending",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Vielen Dank! Deine Anfrage zur Profilübernahme wurde eingereicht und wird zeitnah vom BuchArena-Team geprüft.",
    });
  } catch (error) {
    console.error("Fehler bei Profil-Beanspruchung:", error);
    return NextResponse.json(
      { message: "Serverfehler beim Absenden der Beanspruchung." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nicht autorisiert." }, { status: 403 });
    }

    const db = await getDatabase();
    const claims = await db
      .collection("author_claims")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      claims: claims.map((c) => ({
        id: c._id.toString(),
        authorUsername: c.authorUsername,
        authorDisplayName: c.authorDisplayName,
        requesterName: c.requesterName,
        requesterEmail: c.requesterEmail,
        note: c.note,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/authors/claim Fehler:", error);
    return NextResponse.json({ message: "Fehler beim Laden der Anfragen." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nicht autorisiert." }, { status: 403 });
    }

    const body = await request.json();
    const { claimId, action } = body;

    if (!claimId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Ungültige Parameter." }, { status: 400 });
    }

    const db = await getDatabase();
    const claimsCol = db.collection("author_claims");
    const claim = await claimsCol.findOne({ _id: new ObjectId(claimId) });

    if (!claim) {
      return NextResponse.json({ message: "Antrag nicht gefunden." }, { status: 404 });
    }

    if (action === "approve") {
      const usersCol = await getUsersCollection();
      const booksCol = await getBooksCollection();

      // Autor als beansprucht markieren
      await usersCol.updateOne(
        { username: claim.authorUsername },
        {
          $set: {
            isUnclaimed: false,
            claimedAt: new Date(),
            claimedByEmail: claim.requesterEmail,
          },
        }
      );

      // Bücher des Autors ebenfalls als beansprucht markieren
      await booksCol.updateMany(
        { ownerUsername: claim.authorUsername },
        {
          $set: {
            isUnclaimed: false,
          },
        }
      );

      await claimsCol.updateOne(
        { _id: new ObjectId(claimId) },
        { $set: { status: "approved", processedAt: new Date(), processedBy: admin.username } }
      );

      return NextResponse.json({ success: true, message: "Antrag genehmigt und Profil als beansprucht markiert." });
    } else {
      await claimsCol.updateOne(
        { _id: new ObjectId(claimId) },
        { $set: { status: "rejected", processedAt: new Date(), processedBy: admin.username } }
      );
      return NextResponse.json({ success: true, message: "Antrag abgelehnt." });
    }
  } catch (error) {
    console.error("PUT /api/authors/claim Fehler:", error);
    return NextResponse.json({ message: "Fehler beim Bearbeiten des Antrags." }, { status: 500 });
  }
}

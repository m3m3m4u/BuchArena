import { NextResponse } from "next/server";
import { type MatchPlatform } from "@/lib/buchmatch";
import {
  getBuchMatchOffersCollection,
  getBuchMatchApplicationsCollection,
} from "@/lib/buchmatch-db";
import { getServerAccount } from "@/lib/server-auth";
import { getBooksCollection, getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import { invalidateUnreadCountCacheMany } from "@/lib/messages-unread-cache";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "incoming"; // "incoming" | "outgoing" | "matches"
    const offerIdParam = searchParams.get("offerId");

    const offersCol = await getBuchMatchOffersCollection();
    const appsCol = await getBuchMatchApplicationsCollection();

    if (role === "incoming") {
      // Find all offers owned by this user
      const userOffers = await offersCol.find({ authorUsername: account.username }).toArray();
      const offerIds = userOffers.map((o) => o._id as ObjectId);

      if (offerIds.length === 0) {
        return NextResponse.json({ success: true, applications: [] });
      }

      const query: Record<string, unknown> = { offerId: { $in: offerIds } };
      if (offerIdParam) {
        try {
          query.offerId = new ObjectId(offerIdParam);
        } catch {
          /* ignore */
        }
      }

      const applications = await appsCol.find(query).sort({ createdAt: -1 }).toArray();

      // Attach offer title for reference
      const offerMap = new Map(userOffers.map((o) => [String(o._id), o]));

      return NextResponse.json({
        success: true,
        applications: applications.map((a) => {
          const offer = offerMap.get(String(a.offerId));
          return {
            id: String(a._id),
            offerId: String(a.offerId),
            offerBookTitle: offer?.bookTitle || "Buch",
            offerPlatform: offer?.offeredPlatform,
            offerFormat: offer?.offeredFormat,
            applicantUsername: a.applicantUsername,
            applicantBookId: a.applicantBookId,
            applicantBookTitle: a.applicantBookTitle,
            applicantBookCoverUrl: a.applicantBookCoverUrl,
            applicantPlatform: a.applicantPlatform,
            applicantFormat: a.applicantFormat,
            applicantChannelHandle: a.applicantChannelHandle,
            message: a.message,
            status: a.status,
            publishedUrlApplicant: a.publishedUrlApplicant,
            publishedUrlOwner: a.publishedUrlOwner,
            createdAt: a.createdAt,
            matchedAt: a.matchedAt,
          };
        }),
      });
    } else if (role === "outgoing") {
      const applications = await appsCol.find({ applicantUsername: account.username }).sort({ createdAt: -1 }).toArray();

      // Fetch offer details for each
      const offerIds = applications.map((a) => a.offerId);
      const offers = await offersCol.find({ _id: { $in: offerIds } }).toArray();
      const offerMap = new Map(offers.map((o) => [String(o._id), o]));

      return NextResponse.json({
        success: true,
        applications: applications.map((a) => {
          const offer = offerMap.get(String(a.offerId));
          return {
            id: String(a._id),
            offerId: String(a.offerId),
            offerAuthorUsername: offer?.authorUsername,
            offerBookTitle: offer?.bookTitle || "Buch",
            offerBookCoverUrl: offer?.bookCoverUrl,
            offerPlatform: offer?.offeredPlatform,
            offerFormat: offer?.offeredFormat,
            applicantUsername: a.applicantUsername,
            applicantBookId: a.applicantBookId,
            applicantBookTitle: a.applicantBookTitle,
            applicantBookCoverUrl: a.applicantBookCoverUrl,
            applicantPlatform: a.applicantPlatform,
            applicantFormat: a.applicantFormat,
            applicantChannelHandle: a.applicantChannelHandle,
            message: a.message,
            status: a.status,
            publishedUrlApplicant: a.publishedUrlApplicant,
            publishedUrlOwner: a.publishedUrlOwner,
            createdAt: a.createdAt,
            matchedAt: a.matchedAt,
          };
        }),
      });
    } else {
      // Matches (either applicant or offer owner where status is 'matched' or 'completed')
      // First get all user's offers
      const userOffers = await offersCol.find({ authorUsername: account.username }).toArray();
      const userOfferIds = userOffers.map((o) => o._id as ObjectId);

      const applications = await appsCol
        .find({
          status: { $in: ["matched", "completed"] },
          $or: [{ applicantUsername: account.username }, { offerId: { $in: userOfferIds } }],
        })
        .sort({ matchedAt: -1, createdAt: -1 })
        .toArray();

      const offerIds = applications.map((a) => a.offerId);
      const offers = await offersCol.find({ _id: { $in: offerIds } }).toArray();
      const offerMap = new Map(offers.map((o) => [String(o._id), o]));

      return NextResponse.json({
        success: true,
        matches: applications.map((a) => {
          const offer = offerMap.get(String(a.offerId));
          const isOwner = offer?.authorUsername === account.username;
          return {
            id: String(a._id),
            offerId: String(a.offerId),
            isOwner,
            partnerUsername: isOwner ? a.applicantUsername : offer?.authorUsername || "",
            myBookTitle: isOwner ? offer?.bookTitle || "" : a.applicantBookTitle,
            myBookCoverUrl: isOwner ? offer?.bookCoverUrl : a.applicantBookCoverUrl,
            partnerBookTitle: isOwner ? a.applicantBookTitle : offer?.bookTitle || "",
            partnerBookCoverUrl: isOwner ? a.applicantBookCoverUrl : offer?.bookCoverUrl,
            partnerPlatform: isOwner ? a.applicantPlatform : offer?.offeredPlatform,
            partnerFormat: isOwner ? a.applicantFormat : offer?.offeredFormat,
            partnerChannelHandle: isOwner ? a.applicantChannelHandle : offer?.offeredChannelHandle,
            myPlatform: isOwner ? offer?.offeredPlatform : a.applicantPlatform,
            myFormat: isOwner ? offer?.offeredFormat : a.applicantFormat,
            myChannelHandle: isOwner ? offer?.offeredChannelHandle : a.applicantChannelHandle,
            status: a.status,
            publishedUrlApplicant: a.publishedUrlApplicant,
            publishedUrlOwner: a.publishedUrlOwner,
            matchedAt: a.matchedAt,
            createdAt: a.createdAt,
          };
        }),
      });
    }
  } catch (error) {
    console.error("GET /api/social-media/buch-match/applications error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Laden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = await request.json();
    const {
      offerId,
      applicantBookId,
      applicantPlatform,
      applicantFormat,
      applicantChannelHandle,
      message,
    } = body;

    if (!offerId || !applicantBookId || !applicantPlatform || !applicantFormat) {
      return NextResponse.json(
        { success: false, message: "Bitte Inserat, eigenes Buch, Plattform und Format angeben." },
        { status: 400 }
      );
    }

    let offerObjectId: ObjectId;
    try {
      offerObjectId = new ObjectId(offerId);
    } catch {
      return NextResponse.json({ success: false, message: "Ungültige Inserat-ID." }, { status: 400 });
    }

    const offersCol = await getBuchMatchOffersCollection();
    const offer = await offersCol.findOne({ _id: offerObjectId, status: "active" });

    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Das Inserat ist nicht mehr aktiv." },
        { status: 404 }
      );
    }

    if (offer.authorUsername === account.username) {
      return NextResponse.json(
        { success: false, message: "Du kannst dich nicht auf dein eigenes Inserat bewerben." },
        { status: 400 }
      );
    }

    // Verify applicant book
    const booksCol = await getBooksCollection();
    let bookObjectId: ObjectId;
    try {
      bookObjectId = new ObjectId(applicantBookId);
    } catch {
      return NextResponse.json({ success: false, message: "Ungültige Buch-ID." }, { status: 400 });
    }

    const applicantBook = await booksCol.findOne({
      _id: bookObjectId,
      $or: [
        { ownerUsername: account.username },
        { coAuthors: { $elemMatch: { username: account.username, status: "confirmed" } } },
      ],
    });

    if (!applicantBook) {
      return NextResponse.json(
        { success: false, message: "Dein ausgewähltes Buch wurde nicht gefunden." },
        { status: 404 }
      );
    }

    const appsCol = await getBuchMatchApplicationsCollection();

    // Check if already applied
    const existing = await appsCol.findOne({
      offerId: offerObjectId,
      applicantUsername: account.username,
      status: { $in: ["pending", "matched"] },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Du hast dich bereits auf dieses Inserat beworben." },
        { status: 400 }
      );
    }

    const newApplication = {
      offerId: offerObjectId,
      applicantUsername: account.username,
      applicantBookId: String(applicantBook._id),
      applicantBookTitle: applicantBook.title,
      applicantBookCoverUrl: applicantBook.coverImageUrl,
      applicantPlatform: applicantPlatform as MatchPlatform,
      applicantFormat: String(applicantFormat).trim(),
      applicantChannelHandle: applicantChannelHandle ? String(applicantChannelHandle).trim() : undefined,
      message: message ? String(message).trim() : undefined,
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await appsCol.insertOne(newApplication);

    return NextResponse.json({
      success: true,
      message: "Bewerbung für das Buch-Match wurde erfolgreich gesendet!",
      applicationId: String(result.insertedId),
    });
  } catch (error) {
    console.error("POST /api/social-media/buch-match/applications error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Bewerben." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ success: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, action, publishedUrl } = body; // action: "match" | "decline" | "publish"

    if (!applicationId || !action) {
      return NextResponse.json({ success: false, message: "Application ID und Aktion fehlen." }, { status: 400 });
    }

    let appObjectId: ObjectId;
    try {
      appObjectId = new ObjectId(applicationId);
    } catch {
      return NextResponse.json({ success: false, message: "Ungültige Bewerbungs-ID." }, { status: 400 });
    }

    const appsCol = await getBuchMatchApplicationsCollection();
    const appDoc = await appsCol.findOne({ _id: appObjectId });

    if (!appDoc) {
      return NextResponse.json({ success: false, message: "Bewerbung nicht gefunden." }, { status: 404 });
    }

    const offersCol = await getBuchMatchOffersCollection();
    const offer = await offersCol.findOne({ _id: appDoc.offerId });

    if (!offer) {
      return NextResponse.json({ success: false, message: "Zugehöriges Inserat nicht gefunden." }, { status: 404 });
    }

    const isOfferOwner = offer.authorUsername === account.username;
    const isApplicant = appDoc.applicantUsername === account.username;

    if (action === "match") {
      if (!isOfferOwner) {
        return NextResponse.json({ success: false, message: "Nur der Inserent kann das Match bestätigen." }, { status: 403 });
      }

      const matchedAt = new Date();
      await appsCol.updateOne(
        { _id: appObjectId },
        { $set: { status: "matched", matchedAt, updatedAt: matchedAt } }
      );

      // Create a system message in BuchArena chat to connect the two authors
      try {
        const messagesCol = await getMessagesCollection();
        const conversationsCol = await getMessageConversationsCollection();
        const now = new Date();

        const msgSubject = `🎉 MATCH! Buch-Match für "${offer.bookTitle}" & "${appDoc.applicantBookTitle}"`;
        const msgBody = `Hallo ${appDoc.applicantUsername}!\n\n${account.username} hat deine Bewerbung für ein Buch-Match akzeptiert! 🎉\n\n- Buch von ${account.username}: "${offer.bookTitle}"\n- Buch von ${appDoc.applicantUsername}: "${appDoc.applicantBookTitle}"\n\nIhr könnt euch hier im Chat über Rezensionsexemplare, Veröffentlichungstermine und Verlinkungen austauschen. Viel Erfolg bei eurer gemeinsamen Buch-Vorstellung!`;

        const msgResult = await messagesCol.insertOne({
          senderUsername: account.username,
          recipientUsername: appDoc.applicantUsername,
          subject: msgSubject,
          body: msgBody,
          read: false,
          deletedBySender: false,
          deletedByRecipient: false,
          createdAt: now,
        });

        // Upsert conversation
        const [userA, userB] = [account.username, appDoc.applicantUsername].sort();
        await conversationsCol.updateOne(
          { userA, userB },
          {
            $set: {
              latestMessageId: msgResult.insertedId,
              latestSender: account.username,
              latestRecipient: appDoc.applicantUsername,
              latestSubject: msgSubject,
              latestBody: msgBody,
              latestCreatedAt: now,
              updatedAt: now,
            },
            $inc: { [userA === appDoc.applicantUsername ? "unreadForA" : "unreadForB"]: 1 },
          },
          { upsert: true }
        );

        invalidateUnreadCountCacheMany([appDoc.applicantUsername]);
      } catch (msgErr) {
        console.error("Fehler beim Senden der Match-Nachricht:", msgErr);
      }

      return NextResponse.json({
        success: true,
        message: `Match mit ${appDoc.applicantUsername} bestätigt! Ihr könnt euch jetzt direkt austauschen.`,
      });
    } else if (action === "decline") {
      if (!isOfferOwner) {
        return NextResponse.json({ success: false, message: "Nur der Inserent kann ablehnen." }, { status: 403 });
      }

      await appsCol.updateOne(
        { _id: appObjectId },
        { $set: { status: "declined", updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: "Bewerbung abgelehnt." });
    } else if (action === "publish") {
      if (!isOfferOwner && !isApplicant) {
        return NextResponse.json({ success: false, message: "Keine Berechtigung." }, { status: 403 });
      }

      if (!publishedUrl || typeof publishedUrl !== "string") {
        return NextResponse.json({ success: false, message: "Bitte eine gültige URL angeben." }, { status: 400 });
      }

      const updateField = isOfferOwner ? "publishedUrlOwner" : "publishedUrlApplicant";
      const now = new Date();

      const updateData: Record<string, unknown> = {
        [updateField]: publishedUrl.trim(),
        updatedAt: now,
      };

      // Check if both published URLs will now be present
      const otherUrl = isOfferOwner ? appDoc.publishedUrlApplicant : appDoc.publishedUrlOwner;
      if (otherUrl || publishedUrl.trim()) {
        if (otherUrl) {
          updateData.status = "completed";
        }
      }

      await appsCol.updateOne({ _id: appObjectId }, { $set: updateData });

      return NextResponse.json({
        success: true,
        message: "Link zur Veröffentlichung gespeichert!",
      });
    } else {
      return NextResponse.json({ success: false, message: "Unbekannte Aktion." }, { status: 400 });
    }
  } catch (error) {
    console.error("PATCH /api/social-media/buch-match/applications error:", error);
    return NextResponse.json({ success: false, message: "Fehler beim Aktualisieren." }, { status: 500 });
  }
}

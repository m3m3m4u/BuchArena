import { NextResponse } from "next/server";
import { getGewinnspieleCollection, getGewinnspielteilnahmenCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";
import { sendMail } from "@/lib/mail";

type Params = { params: Promise<{ id: string }> };

// POST /api/gewinnspiele/[id]/verlosen – Autor oder Admin führt die Ziehung durch
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getGewinnspieleCollection();
  const doc = await col.findOne({ _id: oid });
  if (!doc) return NextResponse.json({ message: "Gewinnspiel nicht gefunden." }, { status: 404 });

  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
  const isAutor = account.username === doc.autorUsername;
  if (!isAdmin && !isAutor) return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });

  if (doc.status !== "anmeldung" && doc.status !== "verlost") {
    return NextResponse.json({ message: "Dieses Gewinnspiel kann nicht mehr verlost werden." }, { status: 400 });
  }

  // Ziehung darf erst ab ziehungAm durchgeführt werden (nur bei erster Ziehung)
  if (doc.status === "anmeldung" && doc.ziehungAm && new Date() < new Date(doc.ziehungAm as string)) {
    const datum = new Date(doc.ziehungAm as string).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    return NextResponse.json(
      { message: `Die Ziehung kann erst ab ${datum} Uhr durchgeführt werden.` },
      { status: 400 }
    );
  }

  // Alle Teilnehmer laden
  const teilnahmeCol = await getGewinnspielteilnahmenCollection();
  const teilnehmer = await teilnahmeCol.find({ gewinnspielId: id }).toArray();

  if (teilnehmer.length === 0) {
    return NextResponse.json({ message: "Keine Teilnehmer vorhanden." }, { status: 400 });
  }

  // Zufälligen Gewinner ziehen (kryptografisch sicher mit crypto.getRandomValues)
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const idx = arr[0] % teilnehmer.length;
  const gewinner = teilnehmer[idx];

  const now = new Date();
  await col.updateOne(
    { _id: oid },
    {
      $set: {
        status: "verlost",
        gewinnerUsername: gewinner.username,
        gewinnerName: gewinner.displayName,
        gewinnerEmail: gewinner.email,
        gewinnerAdresse: gewinner.adresse
          ? [gewinner.adresse, gewinner.ort, gewinner.land].filter(Boolean).join(", ")
          : undefined,
        verlostAm: now,
        updatedAt: now,
      },
    }
  );

  // E-Mail an Gewinner
  try {
    const isEbook = doc.format === "ebook";
    const isPrint = doc.format === "print" || doc.format === "both";
    const versandInfo = isEbook
      ? `<p>Das E-Book wird dir vom Autor an diese E-Mail-Adresse zugeschickt.</p>`
      : isPrint
        ? `<p>Deine Versandadresse wurde dem Autor übermittelt. Er sendet dir das Buch per Post.</p>`
        : "";
    await sendMail(
      gewinner.email,
      `🎉 Du hast gewonnen! – ${doc.buchTitel}`,
      `<p>Herzlichen Glückwunsch, <strong>${gewinner.displayName}</strong>!</p>
       <p>Du hast das Gewinnspiel für das Buch <strong>${doc.buchTitel}</strong> von ${doc.autorName} gewonnen!</p>
       ${versandInfo}
       <p>Viel Spaß beim Lesen! 📚</p>
       <p>Dein BuchArena-Team</p>`
    );
  } catch (e) {
    console.error("Gewinner-Mail konnte nicht gesendet werden:", e);
  }

  // E-Mail an Autor mit Gewinner-Adresse
  try {
    const usersCol = await getUsersCollection();
    const autorUser = await usersCol.findOne({ username: doc.autorUsername }, { projection: { email: 1 } });
    if (autorUser?.email) {
      const isEbook = doc.format === "ebook";
      const kontaktHtml = isEbook
        ? `<p><strong>E-Mail-Adresse für E-Book-Versand:</strong> <a href="mailto:${gewinner.email}">${gewinner.email}</a></p>`
        : gewinner.adresse
          ? `<p><strong>Versandadresse:</strong><br>${gewinner.adresse}${gewinner.ort ? ", " + gewinner.ort : ""}${gewinner.land ? ", " + gewinner.land : ""}</p>`
          : `<p><strong>E-Mail:</strong> ${gewinner.email}</p>`;
      const anweisung = isEbook
        ? "Bitte sende das E-Book direkt an die oben genannte E-Mail-Adresse."
        : "Bitte sende das Buch per Post an die oben genannte Adresse.";
      await sendMail(
        autorUser.email,
        `Gewinnspiel-Ergebnis: ${doc.buchTitel}`,
        `<p>Hallo ${doc.autorName},</p>
         <p>die Ziehung für dein Gewinnspiel <strong>${doc.buchTitel}</strong> hat stattgefunden.</p>
         <p><strong>Gewinner:</strong> ${gewinner.displayName}</p>
         ${kontaktHtml}
         <p>${anweisung}</p>
         <p>Danke und viel Erfolg!<br>Dein BuchArena-Team</p>`
      );
    }
  } catch (e) {
    console.error("Autor-Mail konnte nicht gesendet werden:", e);
  }

  return NextResponse.json({
    ok: true,
    gewinnerName: gewinner.displayName,
    gewinnerUsername: gewinner.username,
  });
}

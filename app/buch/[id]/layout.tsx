import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { createDefaultProfile } from "@/lib/profile";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return { title: "Buch nicht gefunden" };
  }

  try {
    const books = await getBooksCollection();
    const book = await books.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return { title: "Buch nicht gefunden" };
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: book.ownerUsername },
      { projection: { profile: 1, status: 1, displayName: 1 } },
    );

    if (user?.status === "deactivated" || user?.profile?.deaktiviert) {
      return { title: "Buch nicht gefunden" };
    }

    const profile = user?.profile ?? createDefaultProfile();
    const authorName =
      (profile.name?.visibility === "public" ? profile.name.value : "") ||
      user?.displayName ||
      book.ownerUsername;

    const fullTitle = book.subtitle ? `${book.title} – ${book.subtitle}` : book.title;
    const pageTitle = `${fullTitle} von ${authorName}`;

    const cleanDesc = (book.description || "").replace(/\s+/g, " ").trim();
    const metaDescription = cleanDesc
      ? cleanDesc.length > 160
        ? cleanDesc.slice(0, 157) + "…"
        : cleanDesc
      : `Das Buch "${book.title}" von ${authorName} auf BuchArena entdecken. Leseprobe, Infos und Rezensionen.`;

    const canonicalUrl = `https://bucharena.org/buch/${id}`;

    return {
      title: pageTitle,
      description: metaDescription,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${book.title} – Buch von ${authorName}`,
        description: metaDescription,
        url: canonicalUrl,
        type: "book",
        images: book.coverImageUrl
          ? [{ url: book.coverImageUrl, alt: `Buchcover: ${book.title}` }]
          : [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${book.title} von ${authorName}`,
        description: metaDescription,
        images: book.coverImageUrl ? [book.coverImageUrl] : ["/logo.png"],
      },
    };
  } catch {
    return { title: "Buchdetails" };
  }
}

export default async function BookDetailLayout({ params, children }: Props) {
  const { id } = await params;
  let jsonLd: Record<string, any> | null = null;

  if (id && ObjectId.isValid(id)) {
    try {
      const books = await getBooksCollection();
      const book = await books.findOne({ _id: new ObjectId(id) });
      if (book) {
        const users = await getUsersCollection();
        const user = await users.findOne(
          { username: book.ownerUsername },
          { projection: { profile: 1, status: 1, displayName: 1 } },
        );

        if (user?.status !== "deactivated" && !user?.profile?.deaktiviert) {
          const profile = user?.profile ?? createDefaultProfile();
          const authorName =
            (profile.name?.visibility === "public" ? profile.name.value : "") ||
            user?.displayName ||
            book.ownerUsername;

          const confirmedCoAuthors = (book.coAuthors ?? []).filter((c) => c.status === "confirmed");
          const authorList: Array<{ "@type": string; name: string }> = [
            { "@type": "Person", name: authorName },
          ];

          if (confirmedCoAuthors.length > 0) {
            for (const ca of confirmedCoAuthors) {
              authorList.push({ "@type": "Person", name: ca.username });
            }
          }

          jsonLd = {
            "@context": "https://schema.org",
            "@type": "Book",
            name: book.title,
            ...(book.subtitle ? { alternativeHeadline: book.subtitle } : {}),
            author: authorList.length === 1 ? authorList[0] : authorList,
            ...(book.isbn ? { isbn: book.isbn } : {}),
            ...(book.publisher ? { publisher: { "@type": "Organization", name: book.publisher } } : {}),
            ...(book.publicationYear > 0 ? { datePublished: String(book.publicationYear) } : {}),
            ...(book.pageCount > 0 ? { numberOfPages: book.pageCount } : {}),
            ...(book.language ? { inLanguage: book.language } : {}),
            ...(book.description ? { description: book.description } : {}),
            ...(book.coverImageUrl ? { image: book.coverImageUrl } : {}),
            ...(book.genre ? { genre: book.genre } : {}),
            url: `https://bucharena.org/buch/${id}`,
          };
        }
      }
    } catch {
      // fallback
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
          }}
        />
      )}
      {children}
    </>
  );
}

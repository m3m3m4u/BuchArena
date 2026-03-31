import type { MetadataRoute } from "next";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://bucharena.org";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/buecher`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/autoren`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/blogger`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/sprecher`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/diskussionen`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/buchempfehlung`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/quiz`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/fuer-autoren`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/info`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/impressum`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/datenschutz`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const books = await getBooksCollection();
    const bookDocs = await books
      .find({}, { projection: { _id: 1, createdAt: 1 } })
      .limit(5000)
      .toArray();

    const bookPages: MetadataRoute.Sitemap = bookDocs.map((b) => ({
      url: `${baseUrl}/buch/${b._id!.toString()}`,
      lastModified: b.createdAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const users = await getUsersCollection();
    const authorDocs = await users
      .find(
        {
          status: { $ne: "deactivated" as const },
          $or: [
            { profile: { $exists: true } },
            { speakerProfile: { $exists: true } },
            { bloggerProfile: { $exists: true } },
          ],
        },
        { projection: { username: 1, profile: 1, speakerProfile: 1, bloggerProfile: 1 } },
      )
      .limit(5000)
      .toArray();

    const authorPages: MetadataRoute.Sitemap = authorDocs.flatMap((u) => {
      const pages: MetadataRoute.Sitemap = [];
      if (u.profile) pages.push({ url: `${baseUrl}/autor/${u.username}`, changeFrequency: "weekly", priority: 0.5 });
      if (u.speakerProfile) pages.push({ url: `${baseUrl}/sprecher/${u.username}`, changeFrequency: "weekly", priority: 0.5 });
      if (u.bloggerProfile) pages.push({ url: `${baseUrl}/blogger/${u.username}`, changeFrequency: "weekly", priority: 0.5 });
      return pages;
    });

    return [...staticPages, ...bookPages, ...authorPages];
  } catch {
    return staticPages;
  }
}

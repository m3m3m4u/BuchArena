import type { MetadataRoute } from "next";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { getBlogCollection } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://bucharena.org";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/buecher`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/autoren`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/kalender`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/blogger`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/sprecher`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/lektoren`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/testleser`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/verlage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/fuer-autoren`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/diskussionen`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/buchempfehlung`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/tauschboerse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/podcast`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/quiz`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/schnipsel`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/social-media`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
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

    let blogPages: MetadataRoute.Sitemap = [];
    try {
      const blogCol = await getBlogCollection();
      const blogDocs = await blogCol
        .find({ status: "approved" }, { projection: { _id: 1, createdAt: 1, updatedAt: 1 } })
        .limit(2000)
        .toArray();

      blogPages = blogDocs.map((p) => ({
        url: `${baseUrl}/blog/${p._id!.toString()}`,
        lastModified: p.updatedAt ?? p.createdAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      }));
    } catch {
      // blog collection fallback
    }

    const users = await getUsersCollection();
    const authorDocs = await users
      .find(
        {
          status: { $ne: "deactivated" as const },
          $or: [
            { profile: { $exists: true } },
            { speakerProfile: { $exists: true } },
            { bloggerProfile: { $exists: true } },
            { lektorenProfile: { $exists: true } },
            { testleserProfile: { $exists: true } },
            { verlageProfile: { $exists: true } },
          ],
        },
        {
          projection: {
            username: 1,
            profileSlug: 1,
            profile: 1,
            speakerProfile: 1,
            bloggerProfile: 1,
            lektorenProfile: 1,
            testleserProfile: 1,
            verlageProfile: 1,
          },
        },
      )
      .limit(5000)
      .toArray();

    const authorPages: MetadataRoute.Sitemap = authorDocs.flatMap((u) => {
      const slug = u.profileSlug || u.username;
      const pages: MetadataRoute.Sitemap = [];
      if (u.profile && !u.profile.deaktiviert) {
        pages.push({ url: `${baseUrl}/autor/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      if (u.speakerProfile && !u.speakerProfile.deaktiviert) {
        pages.push({ url: `${baseUrl}/sprecher/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      if (u.bloggerProfile && !u.bloggerProfile.deaktiviert) {
        pages.push({ url: `${baseUrl}/blogger/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      if (u.lektorenProfile && !u.lektorenProfile.deaktiviert) {
        pages.push({ url: `${baseUrl}/lektoren/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      if (u.testleserProfile && !u.testleserProfile.deaktiviert) {
        pages.push({ url: `${baseUrl}/testleser/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      if (u.verlageProfile && !u.verlageProfile.deaktiviert) {
        pages.push({ url: `${baseUrl}/verlage/${slug}`, changeFrequency: "weekly", priority: 0.5 });
      }
      return pages;
    });

    return [...staticPages, ...bookPages, ...blogPages, ...authorPages];
  } catch {
    return staticPages;
  }
}

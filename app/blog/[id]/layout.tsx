import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { getBlogCollection, extractExcerpt } from "@/lib/blog";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return { title: "Blogartikel nicht gefunden" };
  }

  try {
    const col = await getBlogCollection();
    const post = await col.findOne({ _id: new ObjectId(id), status: "approved" });
    if (!post) {
      return { title: "Blogartikel nicht gefunden" };
    }

    const title = `${post.title} – BuchArena Blog`;
    const description = post.excerpt || extractExcerpt(post.htmlContent, 160);
    const canonicalUrl = `https://bucharena.org/blog/${id}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: post.title,
        description,
        url: canonicalUrl,
        type: "article",
        publishedTime: post.createdAt.toISOString(),
        modifiedTime: post.updatedAt ? post.updatedAt.toISOString() : undefined,
        authors: [post.authorDisplayName || post.authorUsername],
        images: [{ url: "/logo.png", width: 512, height: 512, alt: "BuchArena Logo" }],
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: ["/logo.png"],
      },
    };
  } catch {
    return { title: "Blog – BuchArena" };
  }
}

export default async function BlogPostLayout({ params, children }: Props) {
  const { id } = await params;
  let jsonLd: Record<string, any> | null = null;

  if (id && ObjectId.isValid(id)) {
    try {
      const col = await getBlogCollection();
      const post = await col.findOne({ _id: new ObjectId(id), status: "approved" });
      if (post) {
        const canonicalUrl = `https://bucharena.org/blog/${id}`;
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt || extractExcerpt(post.htmlContent, 160),
          datePublished: post.createdAt.toISOString(),
          dateModified: post.updatedAt ? post.updatedAt.toISOString() : post.createdAt.toISOString(),
          author: {
            "@type": "Person",
            name: post.authorDisplayName || post.authorUsername,
          },
          publisher: {
            "@type": "Organization",
            name: "BuchArena",
            url: "https://bucharena.org",
            logo: {
              "@type": "ImageObject",
              url: "https://bucharena.org/logo.png",
            },
          },
          mainEntityOfPage: canonicalUrl,
          url: canonicalUrl,
        };
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

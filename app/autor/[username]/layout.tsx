import type { Metadata } from "next";
import { buildProfileJsonLd, buildProfileMetadata } from "@/lib/profile-seo";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return buildProfileMetadata(username, "autor");
}

export default async function AutorLayout({ params, children }: Props) {
  const { username } = await params;
  const jsonLd = await buildProfileJsonLd(username, "autor");

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

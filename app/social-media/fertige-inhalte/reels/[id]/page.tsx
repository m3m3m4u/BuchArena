import PromoContentBrowser from "../../promo-content-browser";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SocialMediaPromoContentVideoDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PromoContentBrowser
      mediaType="video"
      itemId={id}
      title="Fertiges Reel"
      description="Hier findest du das gewählte Reel mit Download und Caption-Vorschlägen direkt darunter."
    />
  );
}
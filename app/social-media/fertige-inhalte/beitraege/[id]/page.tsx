import PromoContentBrowser from "../../promo-content-browser";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SocialMediaPromoContentImageDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PromoContentBrowser
      mediaType="image"
      itemId={id}
      title="Fertiger Beitrag"
      description="Hier findest du das gewählte Bild mit Download und Caption-Vorschlägen direkt darunter."
    />
  );
}
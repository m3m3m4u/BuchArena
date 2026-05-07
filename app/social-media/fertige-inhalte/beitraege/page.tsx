import PromoContentBrowser from "../promo-content-browser";

export default function SocialMediaPromoContentImagesPage() {
  return (
    <PromoContentBrowser
      mediaType="image"
      title="Fertige Beiträge für Social Media"
      description="Wähle zuerst einen Titel aus. Auf der Detailseite öffnet sich dann das Bild in voller Breite mit den Caption-Vorschlägen daneben."
      notice={{
        paragraphs: [
          "Diese Inhalte wurden von uns erstellt und dürfen ohne Einschränkungen verwendet werden. Unsere Captions sind Vorschläge.",
          "Die Inhalte sowie die Captions dürfen ohne Einschränkung verändert werden.",
        ],
      }}
    />
  );
}
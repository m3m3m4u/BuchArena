# BuchArena

Next.js-App mit Startseite für Registrierung und Login (Benutzername, Passwort, E-Mail).
Persistenz läuft über MongoDB Atlas.
Zusätzlich gibt es ein Cookie-Banner, eine Impressum-Seite und eine Datenschutzerklärung.
Die Anmeldung/Registrierung liegt unter `/auth`, die Startseite `/` ist leer.
Im Footer werden Impressum, Datenschutz und der aktuell eingeloggte Account angezeigt.
Angemeldete Nutzer können unter `/profil` ihr Profil mit Sichtbarkeit je Feld pflegen.
Im Profil gibt es Bildeinstellungen in einem eigenen Overlay sowie Social-Buttons für Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest und Reddit.
Der SuperAdmin hat unter `/admin` eine User-Übersicht (Name, E-Mail, Profil-Button).
Unter `/meine-buecher` können angemeldete Nutzer Bücher anlegen (Titel, Erscheinungsjahr, Genre, Alter von/bis, Beschreibung, Kauf-Links, YouTube-Vorstellungsvideo).
Unter `/buecher` werden Autoren und Bücher angezeigt, inklusive Filter nach Genre und Alter.
Unter `/autoren` werden Autoren entdeckt, ebenfalls mit Filter nach Genre und Alter.

## SuperAdmin

- Benutzername: `Kopernikus`

Der SuperAdmin wird beim ersten Start automatisch in MongoDB angelegt.

## Umgebungsvariablen

In `.env.local`:

- `MONGODB_URI`
- `MONGODB_DB_NAME` (optional, Standard: `bucharena`)
- `WEBDAV_URL`
- `WEBDAV_USERNAME`
- `WEBDAV_PASSWORD`
- `WEBDAV_UPLOAD_DIR` (optional)
- `WEBDAV_PUBLIC_BASE_URL` (optional)
- `PIXABAY_API_KEY`
- `REVERSE_IMAGE_CHECK_URL` (optional, Webhook/API für TinEye-ähnlichen Copyfraud-Check)
- `REVERSE_IMAGE_CHECK_API_KEY` (optional)

## Pixabay-Lizenz-Safe im Beitrag-Tool

- Der Import aus `/social-media/beitrag-tool` übernimmt Pixabay-Bilder nicht mehr direkt, sondern legt zuerst einen Lizenz-Safe an.
- Gespeichert werden das Originalbild, der Pixabay-API-Response, die HTML-Detailseite, die HTML-Uploader-Seite und ein Manifest mit SHA-256-Hash.
- Uploader werden blockiert, wenn ihr Profil jünger als 90 Tage ist oder weniger als 20 veröffentlichte Medien erkannt werden.
- Admins können auffällige Pixabay-`user_id` global sperren.
- Ein Reverse-Image-Check kann optional über `REVERSE_IMAGE_CHECK_URL` angebunden werden. Wenn konfiguriert, läuft der Import fail-closed bei Fehlern oder Treffern auf kostenpflichtigen Stock-Plattformen.

## Start

```bash
npm run dev
```

## Build

```bash
npm run build
```

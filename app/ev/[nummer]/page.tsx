import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

type VideoEntry = { title: string; videoId: string };
type Videos = Record<string, VideoEntry>;

function loadVideos(): Videos {
  const filePath = path.join(process.cwd(), "public", "data", "erklaervideos.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as Videos;
}

type Props = { params: Promise<{ nummer: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nummer } = await params;
  const videos = loadVideos();
  const entry = videos[nummer];
  if (!entry) return { title: "Video nicht gefunden – BuchArena" };
  return { title: `${entry.title} – BuchArena` };
}

export default async function ErklaervideoPage({ params }: Props) {
  const { nummer } = await params;
  const videos = loadVideos();
  const entry = videos[nummer];
  if (!entry) notFound();

  const nr = Number(nummer);
  const prev = videos[String(nr - 1)] ? nr - 1 : null;
  const next = videos[String(nr + 1)] ? nr + 1 : null;

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="mb-4 text-xl font-bold text-arena-blue">{entry.title}</h1>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${entry.videoId}`}
            title={entry.title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex items-center justify-between mt-4">
          {prev !== null ? (
            <Link href={`/ev/${prev}`} className="btn">← Voriges Video</Link>
          ) : <span />}
          {next !== null ? (
            <Link href={`/ev/${next}`} className="btn">Nächstes Video →</Link>
          ) : <span />}
        </div>
      </section>
    </main>
  );
}

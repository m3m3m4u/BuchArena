"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Helper: WebDAV-URL → API-Proxy-URL mit beliebiger Breite          */
/* ------------------------------------------------------------------ */

const WEBDAV_HOST_RE = /your-storagebox\.de/i;

/**
 * Wandelt eine öffentliche WebDAV-URL in die interne
 * `/api/profile/image?path=…&w=…`-Proxy-Route um.
 * Gibt `null` zurück, wenn die URL keinen WebDAV-Ursprung hat.
 */
export function toProxyUrl(src: string, width: number): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, "http://localhost");
    const isWebdavHost = WEBDAV_HOST_RE.test(url.hostname);
    const isWebdavPath = url.pathname.startsWith("/bucharena-profile-images/");

    if (src.startsWith("/api/profile/image")) {
      const u = new URL(src, "http://localhost");
      u.searchParams.set("w", String(width));
      return u.pathname + "?" + u.searchParams.toString();
    }

    if (!isWebdavHost && !isWebdavPath) return null;

    // Der Pfad hinter dem Host ist der Remote-Pfad
    return `/api/profile/image?path=${encodeURIComponent(url.pathname)}&w=${width}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  ProgressiveImage – für <Image fill> (Buchcover etc.)              */
/* ------------------------------------------------------------------ */

type ProgressiveImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Breite der Blur-Vorschau in Pixeln (default 32) */
  thumbWidth?: number;
  /** Breite des Hauptbildes in Pixeln (default 600 oder `width`) */
  targetWidth?: number;
  priority?: boolean;
};

export function ProgressiveImage({
  src,
  alt,
  fill,
  sizes,
  width,
  height,
  className,
  style,
  thumbWidth = 32,
  targetWidth,
  priority = false,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const mainWidth = targetWidth || width || 600;
  const thumbUrl = toProxyUrl(src, thumbWidth);
  const mainUrl = toProxyUrl(src, mainWidth) || src;

  const handleLoad = useCallback(() => setLoaded(true), []);

  // reset on src change
  useEffect(() => setLoaded(false), [src]);

  return (
    <div className="progressive-image-wrap" style={{ position: "relative", overflow: "hidden", width: fill ? "100%" : width, height: fill ? "100%" : height }}>
      {/* Tiny blurred placeholder */}
      {thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          aria-hidden
          src={thumbUrl}
          alt=""
          className="progressive-image-thumb"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "blur(12px)",
            transform: "scale(1.1)",
            opacity: loaded ? 0 : 1,
            transition: "opacity .4s ease-out",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Full image */}
      <Image
        src={mainUrl}
        alt={alt}
        fill={fill}
        sizes={sizes}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : thumbUrl ? 0 : 1,
          transition: "opacity .4s ease-in",
        }}
        unoptimized
        onLoad={handleLoad}
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressiveImg – für einfache <img>-Tags (News-Bilder etc.)       */
/* ------------------------------------------------------------------ */

type ProgressiveImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  thumbWidth?: number;
  targetWidth?: number;
};

export function ProgressiveImg({
  src,
  alt,
  className,
  style,
  thumbWidth = 32,
  targetWidth = 600,
  ...rest
}: ProgressiveImgProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const thumbUrl = typeof src === "string" ? toProxyUrl(src, thumbWidth) : null;
  const mainUrl = typeof src === "string" ? (toProxyUrl(src, targetWidth) || src) : src;

  useEffect(() => setLoaded(false), [src]);

  useEffect(() => {
    // Bild ist evtl. schon aus dem Cache geladen
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!src) return null;

  // Kein Proxy möglich → normales lazy img
  if (!thumbUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} loading="lazy" {...rest} />;
  }

  return (
    <div className="progressive-image-wrap" style={{ position: "relative", overflow: "hidden" }}>
      {/* Tiny blurred placeholder */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={thumbUrl}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(12px)",
          transform: "scale(1.1)",
          opacity: loaded ? 0 : 1,
          transition: "opacity .4s ease-out",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={mainUrl}
        alt={alt}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: "opacity .4s ease-in",
        }}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressiveBgImage – für Profilbilder mit background-image        */
/* ------------------------------------------------------------------ */

type ProgressiveBgImageProps = {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  thumbWidth?: number;
  targetWidth?: number;
  children?: React.ReactNode;
};

export function ProgressiveBgImage({
  src,
  className,
  style,
  thumbWidth = 32,
  targetWidth = 300,
  children,
}: ProgressiveBgImageProps) {
  const [loaded, setLoaded] = useState(false);
  const thumbUrl = toProxyUrl(src, thumbWidth);
  const mainUrl = toProxyUrl(src, targetWidth) || src;

  useEffect(() => {
    setLoaded(false);
    const img = new window.Image();
    img.src = mainUrl;
    img.onload = () => setLoaded(true);
    // bei cached Images
    if (img.complete && img.naturalWidth > 0) setLoaded(true);
    return () => { img.onload = null; };
  }, [src, mainUrl]);

  return (
    <div
      className={className}
      style={{
        ...style,
        // Zeige entweder das Thumbnail oder das finale Bild
        backgroundImage: loaded ? `url(${mainUrl})` : `url(${thumbUrl || src})`,
        backgroundSize: loaded ? style?.backgroundSize : "cover",
        backgroundPosition: loaded ? style?.backgroundPosition : "center",
        backgroundRepeat: "no-repeat",
        ...(loaded
          ? {}
          : { filter: "blur(8px)", transform: "scale(1.05)" }),
        transition: "filter .4s ease-out, background-image .1s",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

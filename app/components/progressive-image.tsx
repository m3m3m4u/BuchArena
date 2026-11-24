"use client";

import { useCallback, useEffect, useState } from "react";
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

export function ProgressiveImage(props: ProgressiveImageProps) {
  const key = toProxyUrl(props.src, props.targetWidth || props.width || 600) || props.src;
  return <ProgressiveImageContent key={key} {...props} />;
}

function ProgressiveImageContent({
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
  const [failed, setFailed] = useState(false);
  const mainWidth = targetWidth || width || 600;
  const thumbUrl = toProxyUrl(src, thumbWidth);
  const mainUrl = toProxyUrl(src, mainWidth) || src;
  const isCover = /\bobject-cover\b/.test(className ?? "");

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    // Bei Ladefehler Thumb ausblenden, damit das Bild nicht dauerhaft unscharf bleibt
    setFailed(true);
    setLoaded(true);
  }, []);

  const checkCachedImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div
      className="progressive-image-wrap"
      style={
        fill
          ? { position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }
          : { position: "relative", overflow: "hidden", width, height }
      }
    >
      {/* Tiny blurred placeholder */}
      {thumbUrl && !failed && (
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
            objectFit: isCover ? "cover" : "contain",
            filter: "blur(12px)",
            transform: "scale(1.1)",
            opacity: loaded ? 0 : 1,
            transition: "opacity .4s ease-out",
            pointerEvents: "none",
            zIndex: 1,
            display: loaded ? "none" : undefined,
          }}
        />
      )}

      {/* Full image */}
      <Image
        ref={checkCachedImage}
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
        onError={handleError}
        priority={priority}
        loading={priority ? undefined : "eager"}
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

export function ProgressiveImg(props: ProgressiveImgProps) {
  const key = typeof props.src === "string" ? (toProxyUrl(props.src, props.targetWidth ?? 600) || props.src) : undefined;
  return <ProgressiveImgContent key={key} {...props} />;
}

function ProgressiveImgContent({
  src,
  alt,
  className,
  style,
  thumbWidth = 32,
  targetWidth = 600,
  loading,
  onLoad,
  onError,
  ...rest
}: ProgressiveImgProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const thumbUrl = typeof src === "string" ? toProxyUrl(src, thumbWidth) : null;
  const mainUrl = typeof src === "string" ? (toProxyUrl(src, targetWidth) || src) : src;

  const checkCachedImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  if (!src) return null;

  // Kein Proxy möglich → normales img
  if (!thumbUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} loading={loading} onLoad={onLoad} onError={onError} {...rest} />;
  }

  const hasFullWidth = /\bw-full\b/.test(className ?? "");
  const hasFullHeight = /\bh-full\b/.test(className ?? "");
  const hasShrink0 = /\b(?:flex-)?shrink-0\b/.test(className ?? "");
  const isContain = /\bobject-contain\b/.test(className ?? "");

  return (
    <div
      className="progressive-image-wrap"
      style={{
        position: "relative",
        overflow: "hidden",
        width: hasFullWidth ? "100%" : "fit-content",
        height: hasFullHeight ? "100%" : "auto",
        maxWidth: "100%",
        flexShrink: hasShrink0 ? 0 : undefined,
      }}
    >
      {/* Tiny blurred placeholder */}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          aria-hidden
          src={thumbUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: isContain ? "contain" : "cover",
            filter: "blur(12px)",
            transform: "scale(1.1)",
            opacity: loaded ? 0 : 1,
            transition: "opacity .4s ease-out",
            pointerEvents: "none",
            zIndex: 1,
            display: loaded ? "none" : undefined,
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={checkCachedImage}
        src={mainUrl}
        alt={alt}
        className={className}
        style={{
          display: "block",
          ...style,
          opacity: loaded ? 1 : 0,
          transition: "opacity .4s ease-in",
        }}
        loading={loading}
        onLoad={(event) => { setLoaded(true); onLoad?.(event); }}
        onError={(event) => {
          setFailed(true);
          setLoaded(true);
          onError?.(event);
        }}
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

export function ProgressiveBgImage(props: ProgressiveBgImageProps) {
  const key = toProxyUrl(props.src, props.targetWidth ?? 300) || props.src;
  return <ProgressiveBgImageContent key={key} {...props} />;
}

function ProgressiveBgImageContent({
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
    let cancelled = false;
    const img = new window.Image();
    const reveal = () => { if (!cancelled) setLoaded(true); };
    img.onload = reveal;
    img.onerror = reveal;
    img.src = mainUrl;
    // decode also resolves for images already present in the browser cache.
    if (img.complete) void img.decode().then(reveal, reveal);
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [mainUrl]);

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

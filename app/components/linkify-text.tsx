"use client";

import React from "react";

// [Linktext](url) – Markdown-style named links
const NAMED_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
// Plain URLs
const URL_REGEX = /(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[a-z]{2,}[^\s<>"']*)/gi;
// Combined: named links first, then plain URLs
const COMBINED_REGEX = new RegExp(
  `${NAMED_LINK_REGEX.source}|${URL_REGEX.source}`,
  "gi",
);

/**
 * Renders text with clickable links.
 * Supports [Linktext](https://…) for custom link text and plain URLs.
 */
export function LinkifyText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(COMBINED_REGEX.source, "gi");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const namedLabel = match[1]; // capture group 1: link text from [...]
    const namedUrl = match[2];   // capture group 2: url from (...)

    if (namedLabel && namedUrl) {
      // [Linktext](url)
      parts.push(
        <a
          key={match.index}
          href={namedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-arena-link hover:underline break-all"
        >
          {namedLabel}
        </a>,
      );
    } else {
      // Plain URL
      const url = match[0];
      const href = url.startsWith("http") ? url : `https://${url}`;
      parts.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-arena-link hover:underline break-all"
        >
          {url}
        </a>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

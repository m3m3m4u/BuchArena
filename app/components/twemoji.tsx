"use client";

import { useEffect } from "react";
import { parse } from "twemoji-parser";

/**
 * Globaler Twemoji-Provider: ersetzt automatisch ALLE Unicode-Emojis
 * im gesamten DOM durch Twemoji-SVG-Bilder (plattformübergreifend einheitlich).
 * Einmal in layout.tsx einbinden – fertig.
 */

function replaceEmojisInNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const entities = parse(text, { assetType: "svg" });
    if (entities.length === 0) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    for (const entity of entities) {
      if (entity.indices[0] > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, entity.indices[0]))
        );
      }

      const img = document.createElement("img");
      img.src = entity.url;
      img.alt = entity.text;
      img.draggable = false;
      img.className = "twemoji";
      img.setAttribute("aria-hidden", "true");
      frag.appendChild(img);

      lastIndex = entity.indices[1];
    }

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(frag, node);
    return;
  }

  // Keine Emojis in Script/Style/Textarea/Input/bereits verarbeiteten Nodes
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const tag = (node as Element).tagName;
  if (
    tag === "SCRIPT" ||
    tag === "STYLE" ||
    tag === "TEXTAREA" ||
    tag === "INPUT" ||
    tag === "IMG"
  )
    return;

  // Kinder rückwärts durchgehen (da replaceChild die Indizes verschiebt)
  const children = Array.from(node.childNodes);
  for (const child of children) {
    replaceEmojisInNode(child);
  }
}

function processRoot() {
  replaceEmojisInNode(document.body);
}

export default function TwemojiProvider() {
  useEffect(() => {
    // Initial alle Emojis ersetzen
    processRoot();

    // Bei DOM-Änderungen (SPA-Navigation, dynamischer Content) erneut ersetzen
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          replaceEmojisInNode(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

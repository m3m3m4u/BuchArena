import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitisiert HTML-Content für die Darstellung via dangerouslySetInnerHTML.
 * Erlaubt eine kontrollierte Liste an Tags/Attributen für User-/Admin-Content
 * (Blog-Posts, News, Diskussionen).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a", "abbr", "b", "blockquote", "br", "code", "div", "em", "h1", "h2",
      "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre",
      "s", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot",
      "th", "thead", "tr", "u", "ul",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    ADD_ATTR: ["target"],
  });
}

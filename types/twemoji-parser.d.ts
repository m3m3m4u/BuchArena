declare module "twemoji-parser" {
  interface TwemojiEntity {
    url: string;
    indices: [number, number];
    text: string;
    type: string;
  }
  interface ParseOptions {
    assetType?: "svg" | "png";
    buildUrl?: (codepoints: string, assetType: string) => string;
  }
  export function parse(text: string, options?: ParseOptions): TwemojiEntity[];
  export function toCodePoint(text: string): string;
}

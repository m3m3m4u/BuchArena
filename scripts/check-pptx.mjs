import JSZip from "jszip";
import fs from "fs";
import { DOMParser } from "@xmldom/xmldom";

const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
function nodeList(nl) {
  const r = [];
  for (let i = 0; i < nl.length; i++) r.push(nl.item(i));
  return r;
}

const zip = await JSZip.loadAsync(fs.readFileSync("public/Kurzvideo.pptx"));

for (const slideFile of ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/slides/slide3.xml"]) {
  console.log("=== " + slideFile + " ===");
  const xml = await zip.file(slideFile).async("string");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = nodeList(doc.getElementsByTagNameNS(A_NS, "p"));
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    const runs = nodeList(para.getElementsByTagNameNS(A_NS, "r"));
    if (runs.length === 0) continue;
    let fullText = "";
    for (const run of runs) {
      const ts = nodeList(run.getElementsByTagNameNS(A_NS, "t"));
      if (ts.length > 0) fullText += ts[0].textContent || "";
    }
    if (!fullText.trim()) continue;
    console.log("  Para " + pi + " (" + runs.length + " runs): " + JSON.stringify(fullText.trim()));
  }
  console.log("");
}

// check images
const imageFiles = Object.keys(zip.files).filter(f => f.startsWith("ppt/media/"));
console.log("=== Media files ===");
for (const f of imageFiles.sort()) {
  const entry = zip.file(f);
  const data = await entry.async("uint8array");
  console.log("  " + f + " (" + data.length + " bytes)");
}

const stat = fs.statSync("public/Kurzvideo.pptx");
console.log("\nFile modified: " + stat.mtime.toISOString());
console.log("File size: " + stat.size);

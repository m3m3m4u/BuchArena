import { readFileSync, writeFileSync } from "node:fs";

const path = "BUCHLISTE.md";
let markdown = readFileSync(path, "utf8");
const lines = markdown.split(/\r?\n/);
const rows = lines.filter((line) => /^\| B\d{3} \|/.test(line)).map((line) => {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return { cells };
});
const priorityOrder = { P1: 1, P2: 2, P3: 3 };
rows.sort((a, b) => priorityOrder[a.cells[1]] - priorityOrder[b.cells[1]] ||
  a.cells[4].localeCompare(b.cells[4], "de", { sensitivity: "base" }) ||
  a.cells[2].localeCompare(b.cells[2], "de", { sensitivity: "base" }));
rows.forEach((row, index) => { row.cells[0] = `B${String(index + 1).padStart(3, "0")}`; });
const rendered = rows.map(({ cells }) => `| ${cells.join(" | ")} |`);
const first = lines.findIndex((line) => /^\| B\d{3} \|/.test(line));
const last = lines.findLastIndex((line) => /^\| B\d{3} \|/.test(line));
if (first < 0 || last < 0) throw new Error("Keine Buchzeilen gefunden");
lines.splice(first, last - first + 1, ...rendered);
markdown = lines.join("\n").replace(/\*\*\d+ offene Buchvorschläge\*\*/, `**${rows.length} offene Buchvorschläge**`);
writeFileSync(path, markdown, "utf8");
console.log(JSON.stringify({ sorted: rows.length, first: rendered[0], last: rendered.at(-1) }, null, 2));

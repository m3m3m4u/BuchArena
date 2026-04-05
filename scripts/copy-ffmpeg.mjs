import { cpSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src  = resolve(root, "node_modules/@ffmpeg/core/dist/umd");
const dest = resolve(root, "public/ffmpeg");

mkdirSync(dest, { recursive: true });
cpSync(`${src}/ffmpeg-core.js`,   `${dest}/ffmpeg-core.js`);
cpSync(`${src}/ffmpeg-core.wasm`, `${dest}/ffmpeg-core.wasm`);
console.log("✓ FFmpeg core copied to public/ffmpeg/");

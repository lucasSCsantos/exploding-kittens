// Converts the card art under explodding/*.jpg into WebP siblings (ticket 17): WebP shrinks these
// ~25-35% over JPEG at the same quality, which matters on mobile networks. Re-run after adding or
// replacing any card art; this is idempotent and safe to run as part of `npm run build`.

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "explodding");

const files = (await readdir(dir)).filter((file) => file.endsWith(".jpg"));

await Promise.all(
  files.map(async (file) => {
    const src = path.join(dir, file);
    const dest = path.join(dir, file.replace(/\.jpg$/, ".webp"));
    await sharp(src).webp({ quality: 75 }).toFile(dest);
  }),
);

console.log(`optimize-card-images: converted ${files.length} card image(s) to WebP.`);

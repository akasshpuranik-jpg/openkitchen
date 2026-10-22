// Runs the Claude photo check on images in test-images/ so the prompt can be tuned
// without uploading. Prints Claude's raw JSON and the finding the app would save.
// Name files after their spot: fridge-1.jpg, stove.png, prep_counter-messy.jpg, wash_area.webp
// Run: npm run check:photos              (all images in test-images/)
//      npm run check:photos -- stove.jpg (just these files)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeJpeg } from "../lib/image.ts";
import { runPhotoCheck } from "../lib/photo-check.ts";
import { SPOTS } from "../lib/spots.ts";

const dir = join(import.meta.dirname, "..", "test-images");
const requested = process.argv.slice(2);
const files = requested.length
  ? requested
  : (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();

if (files.length === 0) {
  console.error("No images found. Put sample photos in test-images/, named after their spot (e.g. fridge-1.jpg).");
  process.exit(1);
}

for (const file of files) {
  const spot = SPOTS.find((s) => file.toLowerCase().startsWith(s.key));
  if (!spot) {
    console.warn(`skip ${file}: name must start with one of ${SPOTS.map((s) => s.key).join(", ")}`);
    continue;
  }

  const jpeg = await normalizeJpeg(await readFile(join(dir, file)));
  const started = Date.now();
  const { finding, raw } = await runPhotoCheck({ jpeg, spotLabel: spot.label, checklist: spot.checklist });

  console.log(`\n=== ${file}  (${spot.label}, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
  console.log("raw:    ", raw ?? "(no response — see error above)");
  console.log("status: ", finding.status, `  confidence ${finding.confidence}  spot_match ${finding.spot_match}`);
  console.log("note:   ", finding.note);
}

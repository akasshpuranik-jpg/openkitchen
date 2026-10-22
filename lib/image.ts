import sharp from "sharp";

export const MAX_EDGE_PX = 1600;

// Re-encode as JPEG within MAX_EDGE_PX. Applies EXIF orientation, then drops all
// metadata (time, GPS, device), so nothing from the phone reaches storage or Claude.
export function normalizeJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

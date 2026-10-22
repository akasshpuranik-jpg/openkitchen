// Client-side: shrink a camera photo to fit within maxEdge px and re-encode as JPEG.
// Drawing to a canvas also drops EXIF; the browser applies EXIF orientation when decoding.
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Could not compress photo");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Utility to transform Cloudinary URLs with optimization parameters
 * @param url The original Cloudinary URL
 * @param options Optimization options (width, quality, etc)
 * @returns The optimized URL
 */
export function getOptimizedUrl(
  url: string | undefined | null,
  options: { width?: number; height?: number; quality?: string; format?: string } = {}
): string {
  if (!url) return "";

  // If it's not a Cloudinary URL, return as is
  if (!url.includes("cloudinary.com")) return url;

  const {
    width,
    height,
    quality = "auto",
    format = "auto"
  } = options;

  // Cloudinary transformations are inserted after /upload/
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;

  const transformations = [
    `f_${format}`,
    `q_${quality}`,
    width ? `w_${width}` : "",
    height ? `h_${height}` : "",
    width || height ? "c_limit" : "" // Maintain aspect ratio
  ].filter(Boolean).join(",");

  return url.replace("/upload/", `/upload/${transformations}/`);
}

/**
 * Derives a still-frame JPG thumbnail URL from a Cloudinary-hosted video
 * URL. Cloudinary generates this automatically for any video resource —
 * requesting the exact same /video/upload/ delivery path with the file
 * extension swapped to .jpg returns a real, cacheable image (a frame
 * pulled from partway into the video), with no separate upload or backend
 * work required.
 *
 * Used so a listing that has a super-admin-uploaded video but no photos
 * still has a normal, real image URL to show in card grids/search
 * results/share previews — every existing consumer of `product.image` /
 * `service.image` keeps working completely unchanged, since this is
 * assigned to that same field at listing creation/edit time rather than
 * requiring every image-consumer in the app to special-case "no image,
 * but there's a video" itself.
 *
 * Returns "" if the URL isn't a Cloudinary video delivery URL at all,
 * so callers can safely fall back to their own default/placeholder.
 */
export function getVideoThumbnailUrl(videoUrl: string | undefined | null): string {
  if (!videoUrl) return "";
  if (!videoUrl.includes("cloudinary.com") || !videoUrl.includes("/video/upload/")) return "";

  const [pathPart, queryPart] = videoUrl.split("?");
  // Swap whatever video extension is present for .jpg. If for some reason
  // the URL has no recognizable extension at all, append .jpg instead of
  // silently returning the (unplayable-as-an-<img>) video URL unchanged.
  const withJpgExtension = /\.[a-zA-Z0-9]+$/.test(pathPart)
    ? pathPart.replace(/\.[a-zA-Z0-9]+$/, ".jpg")
    : `${pathPart}.jpg`;

  return queryPart ? `${withJpgExtension}?${queryPart}` : withJpgExtension;
}


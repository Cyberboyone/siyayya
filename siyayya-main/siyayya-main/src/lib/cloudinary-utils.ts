/**
 * Utility to transform Cloudinary URLs with optimization parameters
 * @param url The original Cloudinary URL
 * @param options Optimization options (width, quality, etc)
 * @returns The optimized URL
 */
export function getOptimizedUrl(
  url: string | undefined | null,
  options: { width?: number; height?: number; quality?: string; format?: string; blur?: number } = {}
): string {
  if (!url) return "";

  // If it's not a Cloudinary URL, return as is
  if (!url.includes("cloudinary.com")) return url;

  const {
    width,
    height,
    quality = "auto",
    format = "auto",
    blur
  } = options;

  // Cloudinary transformations are inserted after /upload/
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;

  const transformations = [
    `f_${format}`,
    `q_${quality}`,
    width ? `w_${width}` : "",
    height ? `h_${height}` : "",
    width || height ? "c_limit" : "", // Maintain aspect ratio
    blur ? `e_blur:${blur}` : ""
  ].filter(Boolean).join(",");

  return url.replace("/upload/", `/upload/${transformations}/`);
}

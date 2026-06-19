import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely extracts a numeric timestamp from various date representations.
 * Handles Firestore Timestamps, JS Dates, and ISO strings.
 */
export function getNumericDate(date: any): number {
  if (!date) return 0;
  if (typeof date.toMillis === 'function') return date.toMillis();
  if (typeof date.toDate === 'function') return date.toDate().getTime();
  if (date instanceof Date) return date.getTime();
  const parsed = new Date(date).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDate(date: any): string {
  if (!date) return "Just now";
  
  let d: Date;
  if (typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'string' || date instanceof Date) {
    d = new Date(date);
    if (isNaN(d.getTime())) return "Unknown date";
  } else {
    // Check if it's a plain timestamp object {seconds, nanoseconds}
    if (date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      return "Just now";
    }
  }

  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
/**
 * Formats a phone number for a WhatsApp link (wa.me)
 * Removes non-numeric characters and converts local Nigerian format (080...) 
 * to international format (23480...).
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters
  let clean = phone.replace(/[^0-9]/g, "");
  
  // Handle local format (e.g., 080... or 070...)
  if (clean.length === 11 && clean.startsWith("0")) {
    clean = "234" + clean.substring(1);
  }
  
  // Ensure international code is present (e.g. 80... -> 23480...)
  // But be careful not to prefix if it already looks international (e.g. 23480...)
  if (clean.length === 10 && (clean.startsWith("8") || clean.startsWith("7") || clean.startsWith("9"))) {
    clean = "234" + clean;
  }
  
  return clean;
}
/**
 * Extract YouTube Video ID from various URL formats.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Validates if the given string is a valid YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return extractYouTubeId(url) !== null;
}

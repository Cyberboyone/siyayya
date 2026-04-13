/**
 * 🔴 SIMPLE ADMIN CONFIGURATION
 * This is the ONLY place where admin access is defined for the entire application.
 * Add or remove emails from this array to manage admin privileges.
 */
export const ADMIN_EMAILS = [
  "muhammadmusab372@gmail.com",
];

/**
 * Checks if a given email is in the admin whitelist.
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

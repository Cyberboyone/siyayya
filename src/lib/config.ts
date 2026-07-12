/**
 * 🔴 SIMPLE ADMIN CONFIGURATION
 * This is the ONLY place where admin access is defined for the entire application.
 * Add or remove emails from this array to manage admin privileges.
 */
export const ADMIN_EMAILS =
  import.meta.env.VITE_ADMIN_EMAILS?.split(",") || [];

/**
 * Checks if a given email is in the admin whitelist.
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

/**
 * 👑 SUPER ADMIN
 * The one and only account allowed to grant or revoke admin access from
 * other accounts. Every other admin (even ones granted via the dashboard)
 * can manage users/listings/reports, but cannot promote or demote anyone —
 * that capability is intentionally locked to this single account so admin
 * access can never be escalated by a non-owner admin.
 */
export const SUPER_ADMIN_EMAIL = 'muhammadmusab372@gmail.com';

export const isSuperAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
};

/**
 * 💳 PAYSTACK CONFIGURATION
 * Replace with your actual public key from Paystack Dashboard.
 */
export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_your_actual_public_key_here";

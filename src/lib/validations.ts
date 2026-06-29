import { z } from 'zod';

  /**
   * Strip HTML tags and dangerous content from user-supplied text.
   * Used before writing to Firestore.
   */
  export function sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .slice(0, 2000);
  }


const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(/^[+()\d\s-]+$/, 'Please enter a valid phone number');

  const baseSchema = {
    title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
    price: z.number().min(0, 'Price must be 0 or more'),
    category: z.string().min(1, 'Please select a category'),
    contactPhone: phoneSchema,
    images: z.array(z.string()).optional().default([]),
    youtubeUrl: z.string().optional().or(z.literal('')),
  };

  export const ProductListingSchema = z.object({
    ...baseSchema,
    condition: z.string().min(1, 'Please select a condition'),
  });

  export const ServiceListingSchema = z.object({
    ...baseSchema,
  });

  export const RequestListingSchema = z.object({
    ...baseSchema,
    budget: z.number().min(0).optional(),
    name: z.string().optional().or(z.literal('')),
    email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  });
  
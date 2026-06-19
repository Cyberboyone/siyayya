import { z } from "zod";

// Helper for generic text sanitization (basic HTML escaping)
export const sanitizeText = (text: string) => {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Common reusable fields
const phoneSchema = z.string().min(10, "Phone number is too short").max(15, "Phone number is too long");
const urlSchema = z.string().url("Invalid URL format").optional().or(z.literal(""));

export const UserRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: phoneSchema,
});

export const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  businessName: z.string().max(100).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const ProductListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description is too long"),
  price: z.number().min(0, "Price cannot be negative"),
  category: z.string().min(1, "Category is required"),
  contactPhone: phoneSchema,
  condition: z.enum(["New", "Used"]).optional(),
  images: z.array(urlSchema).max(5, "Maximum 5 images allowed"),
  youtubeUrl: urlSchema,
});

export const ServiceListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description is too long"),
  price: z.number().min(0, "Price cannot be negative"),
  category: z.string().min(1, "Category is required"),
  contactPhone: phoneSchema,
  images: z.array(urlSchema).max(5, "Maximum 5 images allowed"),
  youtubeUrl: urlSchema,
});

export const RequestListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description is too long"),
  budget: z.number().min(0, "Budget cannot be negative"),
  category: z.string().min(1, "Category is required"),
  contactPhone: phoneSchema,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  name: z.string().min(2).max(100).optional(),
});

export const ChatMessageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});

export const ReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, "Comment cannot be empty").max(500, "Comment is too long"),
});

export const OrderSchema = z.object({
  buyerName: z.string().min(2, "Name must be at least 2 characters").max(100),
  buyerEmail: z.string().email("Invalid email format"),
  buyerPhone: phoneSchema,
  shippingAddress: z.string().min(10, "Please provide a complete address").max(300),
  deliveryInstructions: z.string().max(500).optional(),
});

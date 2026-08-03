export interface Product {
  id: string;
  _id?: string;
  title: string;
  slug?: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  condition: "New" | "Used";
  location: string;
  campusId: string;

  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;

  ownerAvatar: string;
  ownerPhoto?: string;
  ownerRating: number;
  ownerIsVerified?: boolean;
  properties?: Record<string, any>;
  // Legacy field: a YouTube video ID, settable by any user. Kept for
  // backward compatibility with existing listings — no longer settable
  // from the listing form (see videoUrl below), but still rendered on the
  // detail page if present.
  videoId?: string;
  // Direct-upload video (stored in Cloudinary, not YouTube) — restricted to
  // the super admin account only, both in the UI (NewListing/EditListing)
  // and server-side (api/listings/create.ts + firestore.rules). videoUrl is
  // the playable Cloudinary video URL; videoPublicId is the Cloudinary
  // public_id needed to delete the asset if the video is later removed.
  videoUrl?: string;
  videoPublicId?: string;
  createdAt: any; // Allow Firestore Timestamp or string
  isSold: boolean;
  isFeatured: boolean;
  status?: "approved" | "removed";
  views?: number;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType?: "product" | "service";
  reportedBy: string;        // uid
  reportedByName?: string;
  reason: string;
  createdAt: any;
}

export type NotificationType = 
  | "message" 
  | "order" 
  | "product_approval" 
  | "mention" 
  | "like" 
  | "follow" 
  | "announcement" 
  | "dailyDigest"
  | "forum_reply"
  | "listing_expiring"
  | "listing_expired"
  | "admin";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: any;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  metadata?: Record<string, any>;
}

export interface Service {
  id: string;
  _id?: string;
  title: string;
  slug?: string;
  description: string;
  price: number;
  priceLabel: string;
  image?: string;
  images?: string[];
  // EditListing.tsx writes this field to Firestore alongside `image` when a
  // service listing is edited (see updateData.mediaUrl there); it wasn't
  // declared here, so any read-side consumer typed as `Service` (e.g.
  // CommandMenu.tsx's image fallback) failed to compile against it.
  mediaUrl?: string;
  category: string;
  campusId: string;

  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string;
  ownerRating: number;

  ownerIsVerified?: boolean;
  properties?: Record<string, any>;
  // See Product's identical fields above for the full explanation: videoId
  // is the legacy YouTube-link field (any user, unchanged); videoUrl/
  // videoPublicId are the new direct-upload-to-Cloudinary fields, settable
  // by the super admin account only.
  videoId?: string;
  videoUrl?: string;
  videoPublicId?: string;
  createdAt: any;
}

export interface ProductRequest {
  id: string;
  _id?: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  campusId: string;
  ownerId: string;
  ownerName: string;
  ownerIsVerified?: boolean;
  contactPhone?: string;
  whatsapp?: string;
  isGuest?: boolean;
  guestEmail?: string;
  guestName?: string;
  createdAt: string | any;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  usernameLower?: string;
  businessName?: string;
  businessNameLower?: string;
  businessSlug?: string;
  email?: string;

  campusId?: string;
  phone?: string;
  whatsapp?: string;
  avatar?: string;
  photoUrl?: string;
  bio?: string;
  university?: string; // Legacy field
  level?: string;
  campusArea?: string;
  joinDate?: string;
  joinedAt?: string;
  rating: number;
  reputationScore?: number;
  reviewCount?: number;
  completedListings?: number;
  referralCode?: string;
  referralCount?: number;
  referralRewardCredits?: number;
  referredBy?: string;
  badges?: string[];
  profile_completed?: boolean;
  isVerified?: boolean;
  role?: "user" | "admin";
  account_type?: "buyer" | "seller" | "admin";
  googleId?: string;
  lastActive?: any;
  status?: "active" | "suspended" | "banned";
  isBanned?: boolean;
  fcmTokens?: string[];
  notificationPreferences?: {
    messages?: boolean;
    orderUpdates?: boolean;
    promotions?: boolean;
    dailyDigest?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Real categories for the Federal University of Kashere marketplace
export const categories = [
  { id: "electronics", label: "Electronics", icon: "📱" },
  { id: "phones", label: "Phones", icon: "📞" },
  { id: "laptops", label: "Laptops", icon: "💻" },
  { id: "books", label: "Books", icon: "📚" },
  { id: "fashion", label: "Fashion", icon: "👕" },
  { id: "hostel", label: "Hostel Items", icon: "🏠" },
  { id: "food", label: "Food", icon: "🍛" },
  { id: "services", label: "Services", icon: "🔧" },
  // Added: relevant additional categories for a Nigerian campus marketplace,
  // covering common items students actually buy/sell that didn't previously
  // have a home in the existing 8 categories (they were all being dumped
  // into "Electronics"/"Fashion" or left uncategorized entirely).
  { id: "furniture", label: "Furniture & Appliances", icon: "🛋️" },
  { id: "beauty", label: "Beauty & Personal Care", icon: "💄" },
  { id: "sports", label: "Sports & Fitness", icon: "🏀" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "stationery", label: "Stationery & School Supplies", icon: "✏️" },
  { id: "tickets", label: "Tickets & Events", icon: "🎟️" },
  { id: "vehicles", label: "Vehicles & Auto Parts", icon: "🚗" },
  { id: "pets", label: "Pets & Accessories", icon: "🐾" },
  // Added: "Smart Devices" — headphones/earbuds, smartwatches, fitness
  // bands, and other wearables/accessories were previously being lumped
  // into the general "Electronics" category with no dedicated attributes
  // (e.g. no way to specify connectivity or device type). Split out into
  // its own category since these are extremely common campus resale items.
  { id: "smart-devices", label: "Smart Devices", icon: "⌚" },
];

export const CATEGORY_ATTRIBUTES: Record<string, any[]> = {
  electronics: [
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. Samsung, LG" },
    { id: "model", label: "Model", type: "text" },
    { id: "warranty", label: "Warranty", type: "select", options: ["None", "6 Months", "1 Year", "2 Years+"] }
  ],
  phones: [
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. iPhone, Infinix" },
    { id: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB+"] },
    { id: "ram", label: "RAM", type: "select", options: ["2GB", "4GB", "6GB", "8GB", "12GB+"] },
    { id: "batteryHealth", label: "Battery Health", type: "text", unit: "%" }
  ],
  laptops: [
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. HP, Dell, Mac" },
    { id: "processor", label: "Processor", type: "text", placeholder: "e.g. Core i5, M2" },
    { id: "ram", label: "RAM", type: "select", options: ["4GB", "8GB", "16GB", "32GB+"] },
    { id: "storage", label: "Storage", type: "text", placeholder: "e.g. 256GB SSD" }
  ],
  fashion: [
    { id: "size", label: "Size", type: "select", options: ["S", "M", "L", "XL", "XXL", "Free Size"] },
    { id: "material", label: "Material", type: "text" },
    { id: "color", label: "Color", type: "text" }
  ],
  hostel: [
    { id: "duration", label: "Usage Duration", type: "text", placeholder: "e.g. 1 Year" },
    { id: "negotiable", label: "Negotiable", type: "select", options: ["Yes", "No"] }
  ],
  furniture: [
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. LG, Binatone" },
    { id: "material", label: "Material", type: "text", placeholder: "e.g. Wood, Metal, Plastic" },
    { id: "condition", label: "Working Condition", type: "select", options: ["Excellent", "Good", "Fair", "Needs Repair"] }
  ],
  beauty: [
    { id: "brand", label: "Brand", type: "text" },
    { id: "sealed", label: "Sealed/Unopened", type: "select", options: ["Yes", "No"] }
  ],
  sports: [
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. Nike, Adidas" },
    { id: "size", label: "Size", type: "text" }
  ],
  gaming: [
    { id: "platform", label: "Platform", type: "select", options: ["PS5", "PS4", "Xbox", "PC", "Nintendo Switch", "Other"] },
    { id: "accessoriesIncluded", label: "Accessories Included", type: "text", placeholder: "e.g. 2 controllers, charging dock" }
  ],
  stationery: [
    { id: "quantity", label: "Quantity", type: "text", placeholder: "e.g. Set of 5" }
  ],
  tickets: [
    { id: "eventDate", label: "Event Date", type: "text", placeholder: "e.g. 25th Dec 2026" },
    { id: "venue", label: "Venue", type: "text" }
  ],
  vehicles: [
    { id: "brand", label: "Brand/Make", type: "text", placeholder: "e.g. Honda, Toyota" },
    { id: "year", label: "Year", type: "text", placeholder: "e.g. 2015" },
    { id: "mileage", label: "Mileage", type: "text", unit: "km" }
  ],
  pets: [
    { id: "breed", label: "Breed", type: "text" },
    { id: "age", label: "Age", type: "text", placeholder: "e.g. 6 months" }
  ],
  "smart-devices": [
    { id: "deviceType", label: "Device Type", type: "select", options: ["Headphones/Earbuds", "Smartwatch", "Fitness Band", "Speaker", "Other"] },
    { id: "brand", label: "Brand", type: "text", placeholder: "e.g. Apple, Samsung, JBL" },
    { id: "connectivity", label: "Connectivity", type: "select", options: ["Bluetooth", "Wired", "Both"] },
    { id: "batteryHealth", label: "Battery Health", type: "text", unit: "%" }
  ]
};


export function formatPrice(price: number): string {
  return "₦" + price.toLocaleString();
}

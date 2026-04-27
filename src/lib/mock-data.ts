export interface Product {
  id: string;
  _id?: string;
  title: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  condition: "New" | "Used";
  location: string;
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerDepartment: string;
  ownerAvatar: string;
  ownerRating: number;
  ownerIsVerified?: boolean;
  properties?: Record<string, any>;
  videoId?: string;
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

export interface Service {
  id: string;
  _id?: string;
  title: string;
  description: string;
  price: number;
  priceLabel: string;
  image?: string;
  images?: string[];
  category: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string;
  ownerRating: number;
  ownerDepartment: string;
  ownerIsVerified?: boolean;
  properties?: Record<string, any>;
  videoId?: string;
  createdAt: any;
}

export interface ProductRequest {
  id: string;
  _id?: string;
  title: string;
  description: string;
  budget: number;
  category: string;
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
  businessName?: string;
  businessNameLower?: string;
  email?: string;
  department?: string;
  phone: string;
  whatsapp?: string;
  avatar?: string;
  photoUrl?: string;
  bio?: string;
  university?: string;
  faculty?: string;
  level?: string;
  campusArea?: string;
  joinDate?: string;
  joinedAt?: string;
  rating: number;
  reviewCount?: number;
  completedListings?: number;
  isPhoneVerified?: boolean;
  isVerified?: boolean;
  role?: "user" | "admin";
  status?: "active" | "banned";
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
  ]
};

export function formatPrice(price: number): string {
  return "₦" + price.toLocaleString();
}

# Firestore Schema

Siyayya relies on a NoSQL database structure designed for fast reads and real-time updates. Data is heavily denormalized to avoid complex joins on the client side.

## Collections Overview

### 1. `users`

Stores profile information, preferences, and business identity.

**Document ID**: Firebase Auth UID

```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  businessName?: string;    // Required for selling
  campusId?: string;        // Primary campus
  role: 'user' | 'admin';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### 2. `products`

Physical items listed for sale on the marketplace.

**Document ID**: Auto-generated string

```typescript
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'used_like_new' | 'used_good' | 'used_fair';
  category: string;
  images: string[];         // URLs to Cloudinary/Storage
  campusId: string;         // Location of item
  sellerId: string;         // Reference to users collection
  sellerName: string;       // Denormalized from user
  status: 'active' | 'sold' | 'draft';
  isFeatured?: boolean;     // Paid promotion flag
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. `conversations` & `messages`

Handles peer-to-peer messaging.

**Collection**: `conversations`
**Document ID**: Auto-generated

```typescript
interface Conversation {
  participantIds: string[]; // e.g., ["userA_uid", "userB_uid"]
  participants: {           // Denormalized map for easy UI rendering
    [uid: string]: {
      displayName: string;
      photoURL: string;
    }
  };
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  };
  unreadCounts: {
    [uid: string]: number;
  };
  updatedAt: Timestamp;
}
```

**Subcollection**: `conversations/{id}/messages`

```typescript
interface Message {
  senderId: string;
  text: string;
  type: 'text' | 'image';
  mediaUrl?: string;
  createdAt: Timestamp;
  status: 'sent' | 'delivered' | 'read';
}
```

### 4. `system_logs`

Used for audit trails, error tracking, and admin health checks.

**Document ID**: Auto-generated

```typescript
interface SystemLog {
  timestamp: string;      // ISO string
  level: 'info' | 'warn' | 'error' | 'critical';
  context: string;        // Module name e.g., 'auth', 'payment'
  message: string;
  details?: object;       // Additional context payload
}
```

## Security Rules Strategy

Firestore security rules (`firestore.rules`) enforce data integrity:

1. **Authentication Required**: Almost all read/write operations require a valid Auth token.
2. **Ownership Checks**: Users can only modify documents they own (e.g., `request.auth.uid == resource.data.sellerId`).
3. **Role-Based Access**: Admins bypass ownership checks for moderation purposes (verified via custom claims or checking an admin emails list).
4. **Data Validation**: Rules validate required fields and data types during create/update operations to prevent malformed data.

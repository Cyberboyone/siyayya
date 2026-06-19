# Firestore Indexes Documentation

In order to optimize query performance and enable complex filtering, Siyayya Marketplace requires specific composite indexes in Firebase Firestore.

## Recommended Composite Indexes

### 1. `products` Collection
- **Fields**: `createdAt` (Descending)
- **Purpose**: Required for fetching the newest products limited to 100 on the feed.

- **Fields**: `campusId` (Ascending), `createdAt` (Descending)
- **Purpose**: Required for filtering products by campus and sorting by newest.

- **Fields**: `ownerId` (Ascending), `createdAt` (Descending)
- **Purpose**: Required for fetching a user's listings on their profile/dashboard.

### 2. `services` Collection
- **Fields**: `createdAt` (Descending)
- **Purpose**: Required for fetching the latest services.

- **Fields**: `campusId` (Ascending), `createdAt` (Descending)
- **Purpose**: Required for filtering services by campus.

### 3. `requests` Collection
- **Fields**: `createdAt` (Descending)
- **Purpose**: Required for fetching the latest requests.

- **Fields**: `campusId` (Ascending), `createdAt` (Descending)
- **Purpose**: Required for filtering requests by campus.

## How to Deploy Indexes

You can deploy these indexes automatically if you have the Firebase CLI installed and your `firestore.indexes.json` configured:

```bash
firebase deploy --only firestore:indexes
```

Alternatively, Firebase will automatically generate a link in the console when a query fails due to a missing index. Clicking that link will open the Firebase Console and pre-fill the index creation form.

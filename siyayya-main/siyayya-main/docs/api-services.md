# API & Internal Services

Siyayya heavily utilizes frontend services to abstract Firebase logic away from UI components. These services live in `src/features/<feature_name>/services/`.

## 1. `chatService.ts`

Handles real-time messaging and conversation lifecycle.

### Methods

*   **`getOrCreateConversation(participants: Participant[], context?)`**
    *   **Purpose**: Checks if a 1-on-1 conversation exists between two users. If not, creates one.
    *   **Returns**: `conversationId` (string).
*   **`sendMessage(conversationId, senderId, text, type, mediaUrl?)`**
    *   **Purpose**: Adds a message to the subcollection, updates the conversation's `lastMessage` timestamp, and increments unread counts.
    *   **Error Handling**: Triggers the `spamDetectionService` rate limiter. Throws error if spam keywords are found.

## 2. `orderService.ts`

Manages the lifecycle of transactions, primarily utilized when interacting with external payment gateways like Paystack.

### Methods

*   **`createOrder(data: OrderData)`**
    *   **Purpose**: Generates a pending order document in Firestore before payment processing begins.
*   **`updateOrderStatus(orderId, status)`**
    *   **Purpose**: Moves an order from `pending` -> `paid` -> `fulfilled`. Usually triggered by the Paystack webhook verification.

## 3. `logger.ts`

Centralized structured logging service (`src/lib/logger.ts`).

### Usage

```typescript
import { logger } from '@/lib/logger';

// Standard info
logger.info('auth', 'User signed in', { uid: user.uid });

// Errors (will sync to Firestore in production)
logger.error('payment', 'Webhook signature mismatch', { ip: request.ip });
```

*   **Production vs Dev**: In development, logs output to the browser console. In production, `error` and `critical` logs are asynchronously pushed to the `system_logs` Firestore collection for the Admin dashboard to monitor.

## 4. Serverless API Endpoints (`/api/`)

Located in the root `api/` folder, these deploy as Vercel Edge Functions.

*   **`api/payments/webhook.ts`**: Receives POST requests from Paystack. Validates the `x-paystack-signature` header against our secret key to confirm payment success.
*   **`api/cloudinary/delete.ts`**: Securely issues deletion requests to the Cloudinary API when a user removes a listing or deletes an image, ensuring our storage bucket doesn't fill up with orphaned files.

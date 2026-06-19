import { Timestamp } from "firebase/firestore";

export type MessageType = 'text' | 'image' | 'listing' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';
export type ConversationType = 'individual' | 'group' | 'support';

export interface Participant {
  uid: string;
  displayName: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: Record<string, Participant>;
  participantIds: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
    type: MessageType;
  };
  unreadCounts: Record<string, number>;
  context?: {
    type: 'product' | 'service' | 'request';
    id: string;
    title: string;
    image?: string;
    price?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  typing?: Record<string, boolean>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: MessageType;
  status: MessageStatus;
  mediaUrl?: string;
  metadata?: any;
  createdAt: Timestamp;
}

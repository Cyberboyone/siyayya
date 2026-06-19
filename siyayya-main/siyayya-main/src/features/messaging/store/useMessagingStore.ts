import { create } from 'zustand';
import { Conversation } from '../types';

interface MessagingState {
  activeConversationId: string | null;
  conversations: Conversation[];
  totalUnreadCount: number;
  setActiveConversationId: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setTotalUnreadCount: (count: number) => void;
  updateUnreadCount: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  activeConversationId: null,
  conversations: [],
  totalUnreadCount: 0,
  
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  
  setConversations: (conversations) => {
    set({ conversations });
    // This will be called by the hook which already filters/knows context
  },
  
  setTotalUnreadCount: (count: number) => set({ totalUnreadCount: count }),
  
  updateUnreadCount: () => {
    // Optional local calculation helper if needed
  }
}));

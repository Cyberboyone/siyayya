import React from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useConversations } from "../hooks/useConversations";
import { useMessagingStore } from "../store/useMessagingStore";
import { ConversationItem } from "../components/ConversationItem";
import { Loader2, MessageSquare, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const InboxPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading } = useConversations(user?.id);
  const { conversations } = useMessagingStore();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      <Navbar />
      
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full bg-surface border-x border-black/5">
        <header className="p-6 border-b border-black/5">
          <h1 className="text-3xl font-black text-textPrimary tracking-tighter mb-4 italic uppercase">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10 rounded-xl bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-textMuted" />
              </div>
              <h2 className="text-xl font-black text-textPrimary mb-2 uppercase tracking-tighter">No messages yet</h2>
              <p className="text-textSecondary text-sm max-w-xs font-medium">
                Your conversations with sellers and buyers will appear here. Start a chat from any listing!
              </p>
              <button 
                onClick={() => navigate('/marketplace')}
                className="mt-8 px-8 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {conversations.map(conv => (
                <ConversationItem 
                  key={conv.id} 
                  conversation={conv} 
                  currentUserId={user?.id || ""} 
                  onClick={(id) => navigate(`/messages/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;

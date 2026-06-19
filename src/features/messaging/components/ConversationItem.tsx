import React from "react";
import { Conversation, Participant } from "../types";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onClick: (id: string) => void;
  isActive?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  currentUserId, 
  onClick,
  isActive 
}) => {
  // Find the other participant
  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId);
  const otherParticipant = otherParticipantId ? conversation.participants[otherParticipantId] : null;
  
  const lastMessage = conversation.lastMessage;
  const time = lastMessage?.createdAt?.toDate 
    ? format(lastMessage.createdAt.toDate(), "HH:mm") 
    : "";
    
  const unreadCount = conversation.unreadCounts?.[currentUserId] || 0;

  if (!otherParticipant) return null;

  return (
    <button 
      onClick={() => onClick(conversation.id)}
      className={`w-full flex items-center gap-4 p-4 transition-all hover:bg-muted/30 border-b border-black/5 ${isActive ? "bg-primary/5" : ""}`}
    >
      <div className="relative">
        <Avatar className="h-14 w-14 rounded-2xl border border-black/5">
          <AvatarImage src={otherParticipant.photoURL} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xl">
            {otherParticipant.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {otherParticipant.isOnline && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-surface" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-textPrimary truncate tracking-tight">{otherParticipant.displayName}</h3>
          <span className="text-[10px] font-bold text-textMuted tabular-nums">{time}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? "font-bold text-textPrimary" : "text-textSecondary"}`}>
            {lastMessage?.senderId === currentUserId ? "You: " : ""}{lastMessage?.text || "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] rounded-full bg-primary text-[10px] px-1 animate-in zoom-in">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

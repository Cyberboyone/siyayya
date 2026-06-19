import React from "react";
import { Message } from "../types";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  isGrouped?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, isGrouped }) => {
  const time = message.createdAt?.toDate ? format(message.createdAt.toDate(), "HH:mm") : "";

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isGrouped ? "mb-0.5" : "mb-2"} px-4`}>
      <div 
        className={`max-w-[85%] px-4 py-2.5 shadow-sm ${
          isMe 
            ? `bg-primary text-white ${isGrouped ? "rounded-2xl" : "rounded-2xl rounded-tr-none"}` 
            : `bg-surface border border-black/5 text-textPrimary ${isGrouped ? "rounded-2xl" : "rounded-2xl rounded-tl-none"}`
        }`}
      >
        {message.type === 'image' && message.mediaUrl && (
          <div className="relative mb-2 min-h-[150px] w-full rounded-lg bg-black/5 flex items-center justify-center overflow-hidden">
            <img 
              src={message.mediaUrl} 
              alt="Sent image" 
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover" 
            />
          </div>
        )}
        
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
        
        <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? "text-white/60" : "text-textMuted"}`}>
          <span className="text-[10px] font-medium tabular-nums">{time}</span>
          {isMe && (
            <span>
              {message.status === 'seen' ? (
                <CheckCheck className="h-3 w-3 text-white" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

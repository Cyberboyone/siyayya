import React, { useState, useRef, useEffect } from "react";
import { Send, Image, Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  onSendImage?: (file: File) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onSendImage,
  onTyping,
  isSending 
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    const message = text.trim();
    setText("");
    await onSendMessage(message);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onSendImage) {
        onSendImage(file);
      }
    };
    input.click();
  };

  return (
    <div className="p-4 bg-surface border-t border-black/5 safe-area-bottom">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-textSecondary" 
          onClick={handleImageClick}
          disabled={isSending}
        >
          <Image className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={text}
            disabled={isSending}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              
              if (onTyping) {
                onTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  onTyping(false);
                }, 3000);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="pr-10 resize-none rounded-2xl min-h-[44px] max-h-[120px] py-3 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 scrollbar-none disabled:opacity-50"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={isSending}
            className="absolute right-1 bottom-1 text-textSecondary"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        <Button 
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="h-11 w-11 rounded-full p-0 shrink-0 shadow-lg shadow-primary/20"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
};

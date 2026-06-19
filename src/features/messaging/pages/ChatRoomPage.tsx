import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { useConversations } from "../hooks/useConversations";
import { useMessagingStore } from "../store/useMessagingStore";
import { chatService } from "../services/chatService";
import { ChatHeader } from "../components/ChatHeader";
import { ChatInput } from "../components/ChatInput";
import { MessageBubble } from "../components/MessageBubble";
import { ChatContextCard } from "../components/ChatContextCard";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Conversation } from "../types";

const ChatRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Ensure conversations are loaded into the store
  const { isLoading: isLoadingConvs } = useConversations(user?.id);
  
  const { messages, isLoading: isLoadingMessages, hasMore, loadMore } = useMessages(id || null);
  const { conversations } = useMessagingStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localConversation, setLocalConversation] = useState<Conversation | null>(null);
  const [conversationError, setConversationError] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const conversation = conversations.find(c => c.id === id) || localConversation;

  const hasConversationInStore = conversations.some(c => c.id === id);

  useEffect(() => {
    if (!id || hasConversationInStore) return;
    
    // Fallback: directly subscribe to this specific conversation if not found in global store
    const unsub = onSnapshot(doc(db, "conversations", id), (docSnap) => {
      if (docSnap.exists()) {
        setLocalConversation({ id: docSnap.id, ...docSnap.data() } as Conversation);
        setConversationError(false);
      } else {
        setConversationError(true);
      }
    }, (error) => {
      console.error("Error fetching conversation", error);
      setConversationError(true);
    });
    
    return () => unsub();
  }, [id, hasConversationInStore]);

  const otherParticipantId = conversation?.participantIds.find(pid => pid !== user?.id);
  const otherParticipant = otherParticipantId ? conversation?.participants[otherParticipantId] : null;

  useEffect(() => {
    if (id && user?.id && messages.length > 0) {
      chatService.markAsSeen(id, user.id);
    }
  }, [id, user?.id, messages.length]); 

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight <= 150; // 150px threshold
    setShouldAutoScroll(isScrolledToBottom);
  };

  useEffect(() => {
    if (!isLoadingMessages) {
      const isMyMessage = messages.length > 0 && messages[messages.length - 1].senderId === user?.id;
      
      if (shouldAutoScroll || isMyMessage || prevMessagesLengthRef.current === 0) {
        // Use timeout to ensure DOM has updated before scrolling
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
      prevMessagesLengthRef.current = messages.length;
    }
  }, [isLoadingMessages, messages, shouldAutoScroll, user?.id]);

  const handleSendMessage = async (text: string) => {
    if (!id || !user?.id) return;
    try {
      await chatService.sendMessage(id, user.id, text);
      setShouldAutoScroll(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      chatService.setTypingStatus(id, user.id, false);
    }
  };

  const handleSendImage = async (file: File) => {
    if (!id || !user?.id) return;
    try {
      setIsUploading(true);
      const res = await uploadToCloudinary(file);
      await chatService.sendMessage(id, user.id, "Sent an image", "image", res.secure_url);
      setShouldAutoScroll(true);
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to send image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!id || !user?.id) return;
    chatService.setTypingStatus(id, user.id, isTyping);
  };

  const handleBack = () => {
    navigate("/messages");
  };

  const isLoading = isLoadingMessages || (isLoadingConvs && !conversation && !conversationError);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen md:min-h-0">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-textSecondary opacity-40">Loading messages...</p>
      </div>
    );
  }

  if (conversationError || (!otherParticipant && !isLoadingConvs && !conversation)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-10 text-center min-h-screen md:min-h-0">
        <h2 className="text-xl font-black text-textPrimary uppercase italic mb-2">Conversation Lost</h2>
        <p className="text-sm text-textSecondary font-medium mb-6">We couldn't find this chat or it was deleted.</p>
        <Button onClick={() => navigate('/messages')} variant="outline">Back to Inbox</Button>
      </div>
    );
  }

  if (conversation && !otherParticipant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-10 text-center min-h-screen md:min-h-0">
        <h2 className="text-xl font-black text-textPrimary uppercase italic mb-2">Chat Error</h2>
        <p className="text-sm text-textSecondary font-medium mb-6">Unable to load participant information.</p>
        <Button onClick={() => navigate('/messages')} variant="outline">Back to Inbox</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col md:relative md:inset-auto md:h-[calc(100vh-64px)] h-[100dvh] overflow-hidden">
      <ChatHeader participant={otherParticipant!} onBack={handleBack} />
      
      <div 
        className="flex-1 overflow-y-auto bg-[#F7F8FA] scrollbar-none" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto w-full py-4 flex flex-col min-h-full">
          {hasMore && (
            <button 
              onClick={loadMore}
              className="text-[10px] font-black uppercase tracking-widest text-primary mx-auto mb-4 hover:underline py-2"
            >
              Load older messages
            </button>
          )}

          <ChatContextCard context={conversation?.context} />

          <div className="flex-1 flex flex-col py-4 justify-end">
            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1];
              const isSameSender = prevMsg?.senderId === msg.senderId;
              const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
              const prevDate = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : new Date();
              
              const isSameDate = isSameDay(msgDate, prevDate);
              const showDateSeparator = i === 0 || !isSameDate;
              
              // Group if same sender, same date, and within 5 mins
              const timeDiff = Math.abs(msgDate.getTime() - prevDate.getTime());
              const isGrouped = !showDateSeparator && isSameSender && timeDiff < 5 * 60 * 1000;

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-6">
                      <span className="bg-black/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-textMuted">
                        {isSameDay(msgDate, new Date()) ? "Today" : format(msgDate, "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <MessageBubble 
                    message={msg} 
                    isMe={msg.senderId === user?.id} 
                    isGrouped={isGrouped}
                  />
                </React.Fragment>
              );
            })}
            {otherParticipantId && conversation?.typing?.[otherParticipantId] && (
              <div className="flex items-center gap-2 text-textMuted px-4 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-bold italic">{otherParticipant?.displayName || "User"} is typing...</span>
              </div>
            )}
            <div ref={endRef} className="h-1 w-full" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full bg-background border-t border-black/5 pb-safe">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onSendImage={handleSendImage}
          onTyping={handleTyping}
          isSending={isUploading}
        />
      </div>
    </div>
  );
};

export default ChatRoomPage;

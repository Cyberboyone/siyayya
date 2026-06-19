import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "../../auth/contexts/AuthContext";
import { MessageCircle, Send, User as UserIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
  isOwner?: boolean;
}

interface CommentSectionProps {
  listingId: string;
  ownerId: string;
  listingType: 'product' | 'service';
}

export function CommentSection({ listingId, ownerId, listingType }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("listingId", "==", listingId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isOwner: doc.data().userId === ownerId
      } as Comment));
      setComments(docs);
    });

    return () => unsubscribe();
  }, [listingId, ownerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please sign in to comment");
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "comments"), {
        listingId,
        listingType,
        userId: user?.id,
        userName: user?.name,
        userPhoto: user?.photoUrl || "",
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      
      // Update comment count on listing (optional but good for performance)
      const listingRef = doc(db, listingType === 'product' ? 'products' : 'services', listingId);
      await updateDoc(listingRef, {
        commentCount: increment(1)
      }).catch(() => {}); // Ignore if field doesn't exist yet

      setNewComment("");
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-12 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-black text-textPrimary tracking-tight italic uppercase">
          Questions & Comments ({comments.length})
        </h3>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-[1.5rem] bg-surface p-1 border border-black/5 shadow-xl">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or leave a comment..."
            className="border-0 bg-transparent h-14 pl-6 pr-16 text-sm font-medium focus-visible:ring-0"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isSubmitting || !newComment.trim()}
            className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-primary text-white shadow-lg active:scale-95 transition-transform"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-[2px] rounded-[1.5rem] flex items-center justify-center z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Sign in to join the conversation</p>
          </div>
        )}
      </form>

      {/* List */}
      <div className="space-y-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group">
              <div className="shrink-0">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} className="h-10 w-10 rounded-xl object-cover border border-black/5" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-primary font-black uppercase">
                    {comment.userName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-textPrimary uppercase tracking-tight">
                    {comment.userName}
                  </span>
                  {comment.isOwner && (
                    <span className="flex items-center gap-1 bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/10">
                      <ShieldCheck className="h-2 w-2" /> Seller
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-textMuted opacity-50">
                    {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                  </span>
                </div>
                <div className="rounded-2xl bg-surface p-4 border border-black/5 shadow-sm group-hover:shadow-md transition-shadow">
                  <p className="text-sm text-textSecondary font-medium leading-relaxed">{comment.text}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 rounded-[2rem] border-2 border-dashed border-black/5 bg-surface/50">
            <MessageCircle className="h-8 w-8 mx-auto text-textMuted opacity-20 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary opacity-40">No questions yet. Be the first to ask!</p>
          </div>
        )}
      </div>
    </div>
  );
}

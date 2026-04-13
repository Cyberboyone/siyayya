import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Send, Edit2, Trash2, X, Check } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, deleteDoc, doc as firestoreDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "@/lib/config";

interface Review {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface ReviewSectionProps {
  listingId: string;
  ownerId: string;
}

export function ReviewSection({ listingId, ownerId }: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "reviews"), 
          where("listingId", "==", listingId)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        // Simple client side sort since we might lack index for compound queries
        fetched.sort((a, b) => {
           const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
           const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
           return timeB - timeA;
        });
        setReviews(fetched);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (listingId) fetchReviews();
  }, [listingId]);

  const hasReviewed = reviews.some(r => r.userId === user?.id);

  const handleSubmit = async () => {
    if (!isAuthenticated) return navigate("/signin");
    if (rating === 0) return toast.error("Please select a rating.");
    if (!comment.trim()) return toast.error("Please provide a comment.");
    if (hasReviewed) return toast.error("You have already reviewed this listing.");
    if (user?.id === ownerId) return toast.error("You cannot review your own listing.");

    setIsSubmitting(true);
    try {
      const newReview = {
        listingId,
        ownerId,
        userId: user?.id,
        userName: user?.name,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "reviews"), newReview);
      
      // Update local state instantly
      const localReview = {
        ...newReview,
        id: docRef.id,
        createdAt: { toMillis: () => Date.now() } // Mock timestamp for instant UI update
      } as Review;
      
      setReviews(prev => [localReview, ...prev]);
      setIsReviewOpen(false);
      setRating(0);
      setComment("");
      toast.success("Review submitted successfully!");
    } catch (error) {
      console.error("Error posting review:", error);
      toast.error("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (reviewId: string) => {
    if (!auth.currentUser) return;
    setIsUpdating(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ rating: editRating, comment: editComment.trim() }),
      });

      if (!response.ok) throw new Error("Failed to update review");

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, rating: editRating, comment: editComment.trim() } : r));
      setEditingReviewId(null);
      toast.success("Review updated successfully!");
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("Failed to update review.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!auth.currentUser) return;
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Backend API not found. Please ensure you are running with 'npx vercel dev' to enable API features locally.");
        }
        throw new Error("Failed to delete review");
      }

      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success("Review deleted successfully.");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review.");
    }
  };


  return (
    <div className="mt-12 pt-8 border-t">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-textPrimary uppercase tracking-tighter italic">Ratings & Reviews</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-[10px] font-black text-textSecondary uppercase tracking-widest border border-black/5">
            {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
          </span>
        )}
      </div>

      {!hasReviewed && user?.id !== ownerId && (
        <div className="mb-8">
          {!isReviewOpen ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors gap-2"
              onClick={() => {
                 if (!isAuthenticated) return navigate("/signin");
                 setIsReviewOpen(true);
              }}
            >
              <Star className="h-4 w-4" /> Write a Review
            </Button>
          ) : (
            <div className="rounded-[1.5rem] border border-black/5 bg-surface p-6 animate-in fade-in slide-in-from-top-2 shadow-sm">
              <h3 className="font-black text-textPrimary mb-4 uppercase tracking-widest text-xs opacity-60">How was your experience?</h3>
              
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-warning text-warning"
                          : "text-textMuted/30"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share more context about your rating (required)..."
                className="w-full rounded-xl border border-black/5 bg-background p-4 text-sm font-bold text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[120px] mb-4 transition-all"
              />
              
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsReviewOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 shadow">
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting</>
                  ) : (
                    <><Send className="h-4 w-4" /> Submit Review</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="p-6 rounded-[2rem] border border-black/5 bg-surface hover:bg-muted/30 transition-all duration-300 shadow-sm relative group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                    {r.userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-textPrimary tracking-tight">{r.userName}</h4>
                    <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest mt-0.5">Verified User</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-textMuted/20"}`}
                      />
                    ))}
                  </div>
                  
                  {editingReviewId !== r.id && (user?.id === r.userId || isAdmin(user?.email)) && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user?.id === r.userId && (
                        <button 
                          onClick={() => {
                            setEditingReviewId(r.id);
                            setEditRating(r.rating);
                            setEditComment(r.comment);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-textSecondary transition-colors"
                          title="Edit Review"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(user?.id === r.userId || isAdmin(user?.email)) && (
                        <button 
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {editingReviewId === r.id ? (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setEditHoverRating(star)}
                        onMouseLeave={() => setEditHoverRating(0)}
                        onClick={() => setEditRating(star)}
                        className="p-0.5"
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            star <= (editHoverRating || editRating)
                              ? "fill-warning text-warning"
                              : "text-textMuted/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full rounded-xl border border-black/5 bg-background p-3 text-sm font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[100px] mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditingReviewId(null)}
                      disabled={isUpdating}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleEdit(r.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Check className="h-3.5 w-3.5 mr-1" /> Update</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-textSecondary font-medium leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-black/5 rounded-[2rem] bg-surface/50 shadow-inner">
          <Star className="h-12 w-12 text-textMuted/20 mx-auto mb-4" />
          <h3 className="font-black text-lg text-textPrimary mb-1 tracking-tight italic">No reviews yet</h3>
          <p className="text-xs text-textSecondary font-bold uppercase tracking-widest opacity-60">Be the first to share your experience.</p>
        </div>
      )}
    </div>
  );
}

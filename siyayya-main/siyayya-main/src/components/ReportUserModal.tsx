import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Participant } from "@/features/messaging/types";
import { useAuth } from "@/features/auth/contexts/AuthContext";

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ isOpen, onClose, participant }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error("Please select a reason.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        type: "user",
        reportedId: participant.uid,
        listingTitle: `User: ${participant.displayName}`, // For admin dashboard compatibility
        reportedName: participant.displayName,
        reporterId: user?.id || "anonymous",
        reason,
        description,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Report submitted successfully");
      onClose();
    } catch (error) {
      console.error("Report failed:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 bottom-4 md:bottom-auto md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] w-auto md:w-full md:max-w-sm"
          >
            <div className="rounded-3xl bg-white dark:bg-surface border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4 text-textMuted" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-textPrimary tracking-tight">Report User</h3>
                  <p className="text-xs text-textSecondary font-medium">{participant.displayName}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-textMuted block mb-2">Reason</label>
                   <select 
                     value={reason}
                     onChange={e => setReason(e.target.value)}
                     className="w-full bg-muted/30 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                     required
                   >
                     <option value="" disabled>Select a reason...</option>
                     <option value="spam">Spam / Scam</option>
                     <option value="harassment">Harassment / Abusive</option>
                     <option value="fake_account">Fake Account</option>
                     <option value="other">Other</option>
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-textMuted block mb-2">Additional Details</label>
                   <textarea 
                     value={description}
                     onChange={e => setDescription(e.target.value)}
                     placeholder="Please provide more context..."
                     className="w-full bg-muted/30 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                     required
                   />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Report"}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

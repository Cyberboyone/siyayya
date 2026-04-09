import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, formatPrice } from "@/lib/mock-data";
import { ArrowLeft, Info, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Request = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    if (user && !contactPhone) {
      setContactPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !category) {
      toast.error("Please fill in all required fields (Title, Description, Category).");
      return;
    }

    if (!isAuthenticated && (!guestName || (!contactPhone && !guestEmail))) {
      toast.error("Please provide your name and at least one contact method (Phone or Email).");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        title,
        description,
        category,
        budget: Number(budget) || 0,
        createdAt: serverTimestamp(),
        isGuest: !isAuthenticated,
        status: "active",
        // User data
        ownerId: isAuthenticated ? user?.id : null,
        ownerName: isAuthenticated ? (user?.businessName || user?.name) : guestName,
        ownerIsVerified: isAuthenticated ? (user?.isVerified || false) : false,
        // Contact
        contactPhone: contactPhone || null,
        whatsapp: contactPhone || null,
        guestName: !isAuthenticated ? guestName : null,
        guestEmail: !isAuthenticated ? guestEmail : null,
      };

      await addDoc(collection(db, "requests"), requestData);
      
      if (!isAuthenticated) {
        setShowSuccessModal(true);
      } else {
        toast.success("Your request has been posted!");
        navigate("/requests");
      }
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Failed to post request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24 md:pb-0 font-sans">
      <Navbar />
      <div className="container max-w-2xl py-8">
        <Link 
          to="/requests" 
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Requests
        </Link>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/5 border border-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black text-[#222222] tracking-tighter mb-3">Post a <span className="text-primary italic">Request</span></h1>
              <p className="text-muted-foreground font-medium text-balance">
                Can't find what you're looking for? Tell the community and let sellers come to you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isAuthenticated && (
                <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Info className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 mb-1">Guest Mode Active</h3>
                      <p className="text-sm text-blue-700/80 leading-relaxed">
                        You're posting as a guest. Want to track your requests and chat directly with sellers? 
                        <Link to="/signin" className="ml-1 font-black underline hover:text-blue-900 transition-colors">Sign in here.</Link>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Your Name *</label>
                      <Input 
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="rounded-2xl h-12 border-black/5 focus:border-primary/20 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Email (Optional)</label>
                       <Input 
                        type="email"
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="rounded-2xl h-12 border-black/5 focus:border-primary/20 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">What are you looking for? *</label>
                <Input 
                  placeholder="e.g. Clean MacBook Air M1, Hostel in Kashere, etc."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-2xl h-14 text-lg font-bold border-black/5 focus:border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Description *</label>
                <textarea 
                  rows={4}
                  placeholder="Details matter! Mention size, condition, color, or specific features you need..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-3xl border border-black/5 bg-white px-5 py-4 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Category *</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-black/5 bg-white h-12 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none"
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Budget (₦)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 50000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="rounded-2xl h-12 border-black/5 focus:border-primary/20 font-bold tabular-nums"
                  />
                  {budget && <p className="text-[10px] font-bold text-primary ml-1">Will show as {formatPrice(Number(budget))}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#222222]/50 ml-1">Phone / WhatsApp *</label>
                <Input 
                  placeholder="080XXXXXXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="rounded-2xl h-12 border-black/5 focus:border-primary/20 font-bold"
                />
                <p className="text-[10px] text-muted-foreground ml-1">Sellers will use this to reach you.</p>
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 mt-8 rounded-3xl btn-premium text-white font-black uppercase tracking-[0.2em] shadow-xl group transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">Listing Request...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    Post My Request <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="rounded-[2.5rem] max-w-sm p-8 border-none shadow-2xl">
          <AlertDialogHeader className="items-center text-center">
             <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-500" />
             </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Request Posted!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium pt-2">
              Your request is now visible to everyone. sellers can reach you via the info provided.
              <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-xs font-bold leading-relaxed">
                Smart Move: Sign up with {guestEmail || "your email"} to manage this request and unlock direct messaging!
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-8 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              className="w-full rounded-2xl bg-primary hover:bg-primary/90 h-14 font-black uppercase tracking-widest"
              onClick={() => navigate("/signin")}
            >
              Sign Up Now
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full rounded-2xl h-14 font-black uppercase tracking-widest border-black/5 hover:bg-black/5 transition-colors sm:mt-0"
              onClick={() => navigate("/requests")}
            >
              Back to Marketplace
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Request;

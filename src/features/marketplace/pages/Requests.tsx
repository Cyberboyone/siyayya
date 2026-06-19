import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Phone, MessageCircle, Plus, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductRequest, formatPrice } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { chatService } from "@/features/messaging/services/chatService";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";

const Requests = () => {
  useSEO({
    title: "Community Requests - What Students Need",
    description: "See what students are looking for on your campus. Help the community by providing requested items and services.",
  });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const snap = await getDocs(collection(db, "requests"));
        setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [search, requests]);

  const { user, isAuthenticated } = useAuth();

  const handleChat = async (req: ProductRequest) => {
    if (!isAuthenticated) return navigate("/signin");
    if (user?.id === req.ownerId) {
      toast.error("This is your own request!");
      return;
    }
    if (!req.ownerId) {
      toast.error("Guest request. Contact via WhatsApp/Phone: " + (req.contactPhone || "Not provided"));
      return;
    }

    try {
      const participants = [
        { uid: user!.id, displayName: user!.businessName || user!.name || "User", photoURL: user!.photoUrl || "" },
        { uid: req.ownerId, displayName: req.ownerName || "Requester", photoURL: "" }
      ];

      const conversationId = await chatService.getOrCreateConversation(participants, {
        type: 'request',
        id: req.id,
        title: req.title,
        price: req.budget
      });

      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start conversation.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-textPrimary tracking-tighter">Community Pulse</h1>
            <p className="text-sm font-bold text-textSecondary uppercase tracking-widest mt-1">What students are hunting for</p>
          </div>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search requests..." />
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filtered.map((req) => (
              <div key={req.id} className="rounded-2xl border border-black/5 bg-surface p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">REQUEST</span>
                       <span className="text-xs text-textSecondary">{formatDate(req.createdAt)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-textPrimary mb-2">{req.title}</h3>
                    <p className="text-sm text-textSecondary leading-relaxed mb-4">{req.description}</p>
                    <div className="flex items-center gap-4">
                       <div className="bg-muted px-4 py-2 rounded-xl border border-black/5">
                          <p className="text-[10px] font-bold text-textSecondary uppercase opacity-70">Budget</p>
                          <p className="text-lg font-black text-primary">{formatPrice(req.budget)}</p>
                       </div>
                       <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-textSecondary uppercase opacity-70">Posted By</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-textPrimary">{req.ownerName || "User"}</p>
                            {req.ownerIsVerified && <VerifiedBadge />}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                    <Button 
                      onClick={() => handleChat(req)}
                      className="w-full gap-2 rounded-xl h-11 bg-accent hover:bg-accent/90 text-white shadow-md text-sm font-semibold"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-muted-foreground/10 group animate-fade-up">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <h3 className="text-2xl font-black text-textPrimary mb-2 italic">No matches for <span className="text-primary italic">"{search}"</span></h3>
                <p className="text-sm text-textSecondary mt-1 max-w-xs mx-auto font-medium">
                  Be the first to ask for it! Posting a request notifies sellers who might have what you need.
                </p>
                <div className="mt-8 flex justify-center">
                  <Button 
                    onClick={() => navigate(`/request?title=${encodeURIComponent(search)}`)}
                    className="rounded-2xl h-14 px-8 btn-premium text-white font-black uppercase tracking-widest shadow-xl flex items-center gap-2 group"
                  >
                    <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                    Post Request
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;

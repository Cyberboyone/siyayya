import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, FileText, Phone, MessageCircle, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductRequest, formatPrice } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { formatDate, formatPhoneNumberForWhatsApp } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const Requests = () => {
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24 md:pb-0">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#222222] tracking-tighter">Community Pulse</h1>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">What students are hunting for</p>
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
              <div key={req.id} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">REQUEST</span>
                       <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{req.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{req.description}</p>
                    <div className="flex items-center gap-4">
                       <div className="bg-secondary/50 px-4 py-2 rounded-xl border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Budget</p>
                          <p className="text-lg font-black text-primary">{formatPrice(req.budget)}</p>
                       </div>
                       <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Posted By</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-foreground">{req.ownerName || "User"}</p>
                            {req.ownerIsVerified && <VerifiedBadge />}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 shrink-0">
                    {req.contactPhone && (
                      <a href={`tel:${req.contactPhone.replace(/[^0-9]/g, '')}`} className="flex-1 md:flex-none">
                        <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-primary/20 hover:bg-primary/5 text-sm font-semibold">
                          <Phone className="h-4 w-4" /> Call
                        </Button>
                      </a>
                    )}
                    {(req.whatsapp || req.contactPhone) && (
                      <a 
                        href={`https://wa.me/${formatPhoneNumberForWhatsApp(req.whatsapp || req.contactPhone)}?text=${encodeURIComponent(`Hi, I saw your request on Siyayya for: ${req.title}`)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none"
                      >
                        <Button className="w-full gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bb5c] text-white border-0 shadow-md h-11 text-sm font-semibold">
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-muted-foreground/10 group animate-fade-up">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">No matches for <span className="text-primary italic">"{search}"</span></h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto font-medium">
                  Be the first to ask for it! Posting a request notifies sellers who might have what you need.
                </p>
                <div className="mt-8 flex justify-center">
                  <Button 
                    onClick={() => navigate(`/dashboard/new?type=request&title=${encodeURIComponent(search)}`)}
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

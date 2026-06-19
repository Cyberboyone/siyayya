import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Youtube, Info, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { extractYouTubeId } from "@/lib/utils";
import { ProductListingSchema, ServiceListingSchema, RequestListingSchema, sanitizeText } from "@/lib/validations";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaRenderer } from "@/components/MediaRenderer";

type ListingType = "product" | "service" | "request";

export default function NewListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as ListingType) || "product";
  const initialTitle = searchParams.get("title") || "";
  
  const { user, isAuthenticated, isLoading } = useAuth();
  const [type, setType] = useState<ListingType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("New");
  const [images, setImages] = useState<string[]>([]);
  const [mediaData, setMediaData] = useState<{url: string, publicId: string, resourceType: string}[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const videoId = extractYouTubeId(youtubeUrl);

  // Guest state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [showGuestSuccessModal, setShowGuestSuccessModal] = useState(false);

  useEffect(() => {
    if (type === "request") {
      setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
      setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    }
  }, [type]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && type !== "request") {
        navigate("/signin");
      }
    }
    if (user && !contactPhone) {
      setContactPhone(user.phone || "");
      setWhatsapp(user.phone || "");
    }
  }, [isAuthenticated, isLoading, navigate, user, contactPhone, type]);

  if (isLoading) return null;

  const handleSubmit = async () => {
    if (user?.isBanned) {
       toast.error("You cannot post. Account banned.");
       return;
    }
    if (!title || !description || !category || !contactPhone) {
       toast.error("Please fill in all required fields (Title, Description, Category, Phone).");
       return;
    }
    if (type !== "request" && !price) {
       toast.error("Price is required for listings.");
       return;
    }
    if (price && parseFloat(price) < 0) {
       toast.error("Price cannot be negative.");
       return;
    }
    if (type === "product" && images.length === 0) {
       toast.error("Please upload at least one image for your product.");
       return;
    }
    if (images.length > 5) {
       toast.error("You can only upload up to 5 images.");
       return;
    }

    setIsSubmitting(true);
    try {
      if (!isAuthenticated && type === "request") {
        if (!guestEmail || !guestName) {
           toast.error("Name and Email are required for guest requests.");
           setIsSubmitting(false);
           return;
        }
        const answer = parseInt(captchaAnswer, 10);
        if (!captchaAnswer || isNaN(answer) || answer !== (captchaNum1 + captchaNum2)) {
           toast.error("Incorrect CAPTCHA answer. Please try again.");
           setIsSubmitting(false);
           return;
        }

        const res = await fetch('/api/requests/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            category,
            price: Number(price) || 0,
            contactPhone,
            whatsapp: whatsapp || contactPhone,
            email: guestEmail,
            name: guestName,
            expectedMathResult: captchaNum1 + captchaNum2,
            actualMathResult: captchaAnswer
          })
        });

        if (!res.ok) {
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || `Server error ${res.status}`);
          } catch {
            throw new Error(`Request failed (${res.status})`);
          }
        }
        
        setShowGuestSuccessModal(true);
      } else {
        const collectionName = type === "product" ? "products" : type === "service" ? "services" : "requests";
        
        // ZOD VALIDATION
        try {
          const baseData = {
            title, description, price: Number(price) || 0, category, contactPhone, images, youtubeUrl
          };
          if (type === "product") ProductListingSchema.parse({ ...baseData, condition });
          else if (type === "service") ServiceListingSchema.parse(baseData);
          else RequestListingSchema.parse({ ...baseData, budget: Number(price) || 0, name: guestName, email: guestEmail });
        } catch (zodError: any) {
          toast.error(zodError.errors?.[0]?.message || "Validation failed. Please check your inputs.");
          setIsSubmitting(false);
          return;
        }

        const baseSlug = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
        const uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newDocData: any = {
          title: sanitizeText(title),
          slug: uniqueSlug,
          description: sanitizeText(description),
          category,
          price: Number(price) || 0,
          contactPhone,
          whatsapp: whatsapp || contactPhone,
          properties,
          videoId: videoId || null,
          createdAt: serverTimestamp(),
          campusId: user?.campusId || "buk", // Ensure campusId is set from current user session
        };
        
        if (type === "product") {
          newDocData.ownerId = user?.id;
          newDocData.ownerName = user?.businessName || user?.name || "Unknown";
          newDocData.ownerIsVerified = user?.isVerified || false;
          newDocData.ownerPhone = contactPhone;
          newDocData.ownerRating = 5.0;
          newDocData.condition = condition;
          newDocData.images = images;
          newDocData.image = images.length > 0 ? images[0] : "";
          newDocData.mediaData = mediaData;
          newDocData.isSold = false;
          newDocData.isFeatured = false;
          newDocData.status = "approved";
          newDocData.views = 0;
        } else if (type === "service") {
          newDocData.ownerId = user?.id;
          newDocData.ownerName = user?.businessName || user?.name || "Unknown";
          newDocData.ownerIsVerified = user?.isVerified || false;
          newDocData.ownerPhone = contactPhone;
          newDocData.ownerRating = 5.0;
          newDocData.rating = 0;
          newDocData.reviews = 0;
          newDocData.images = images;
          newDocData.image = images.length > 0 ? images[0] : "";
          newDocData.mediaData = mediaData;
          newDocData.mediaUrl = images.length > 0 ? images[0] : "";
          newDocData.mediaType = "image";
          newDocData.priceLabel = "Starting from";
          newDocData.status = "approved";
          newDocData.views = 0;
        } else {
          newDocData.ownerId = user?.id;
          newDocData.ownerName = user?.businessName || user?.name || "Unknown";
          newDocData.ownerIsVerified = user?.isVerified || false;
          newDocData.budget = Number(price) || 0;
          newDocData.status = "open";
        }

        await addDoc(collection(db, collectionName), newDocData);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} published successfully!`);
        navigate("/dashboard?tab=listings");
      }
    } catch (error: any) {
       console.error("Error adding document: ", error);
       toast.error(error.message || "Failed to publish listing.");
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-32">
      <Navbar />
      
      {/* Header Area */}
      <div className="relative pt-16 pb-12 overflow-hidden border-b border-black/5 bg-surface">
        <div className="px-6 max-w-2xl mx-auto flex flex-col gap-4">
           <Link to="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-textPrimary tracking-tight italic uppercase leading-none pr-4">
            Submission <span className="text-gradient pr-4 inline-block">Studio</span>
          </h1>
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest opacity-60 italic">Launch your next campus offering with cinematic flair.</p>
        </div>
      </div>

      <div className="px-6 max-w-2xl mx-auto -mt-8 relative z-10">
        <div className="glass rounded-[3rem] p-10 shadow-2xl border-white/20 space-y-12">
          
          {/* Type Selector */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Select Medium</h3>
            <div className="flex p-2 gap-2 bg-black/5 rounded-[2rem] w-full">
              {(["product", "service", "request"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-[1.5rem] py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                    type === t ? "bg-white dark:bg-black text-primary shadow-xl scale-105" : "text-textMuted/60 hover:text-textPrimary"
                  }`}
                >
                  {t === "request" ? "Gig/Request" : `List ${t}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {/* Guest Notice */}
            {!isAuthenticated && type === "request" && (
              <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Info className="h-5 w-5" />
                   </div>
                   <h3 className="font-black text-sm uppercase tracking-tight text-primary">Guest Session Active</h3>
                </div>
                <p className="text-xs text-textSecondary font-medium leading-relaxed italic">
                  You are posting without an account. <Link to="/signup" className="text-primary font-black underline">Join Siyayya</Link> to manage your requests.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Full Name</label>
                    <Input 
                      className="bg-white dark:bg-black/5 rounded-2xl h-14 border-none shadow-inner px-6 text-sm font-medium" 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. John Student" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Campus Email</label>
                    <Input 
                      className="bg-white dark:bg-black/5 rounded-2xl h-14 border-none shadow-inner px-6 text-sm font-medium" 
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@university.edu" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Media Upload */}
            {(type === "product" || type === "service") && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Gallery & Visuals</h3>
                <div className="rounded-[2rem] border-2 border-dashed border-black/5 bg-black/[0.02] p-6">
                   <CloudinaryUpload 
                    onUpload={(data) => {
                      setImages(prev => [...prev, data.url]);
                      setMediaData(prev => [...prev, data]);
                    }}
                    multiple={type === "product"}
                    maxFiles={5}
                    currentCount={images.length}
                    label={type === "product" ? "Add Product Shots" : "Add Service Display"}
                    accept="image/*"
                  />
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-6">
               <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Headline / Title *</label>
                <Input
                  placeholder={type === "service" ? "What's your specialty?" : "What are you offering?"}
                  className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner px-8 text-base font-black italic tracking-tight"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">The Narrative / Description *</label>
                <textarea
                  rows={5}
                  placeholder="Tell the story of your offering..."
                  className="w-full rounded-[1.5rem] bg-black/5 dark:bg-white/5 border-none shadow-inner px-8 py-6 text-sm font-medium text-textPrimary placeholder:text-textMuted/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Commercial Value (₦) *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner px-8 text-xl font-black italic tabular-nums"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Category / Domain *</label>
                  <select 
                    className="h-16 w-full rounded-2xl bg-black/5 dark:bg-white/5 border-none shadow-inner px-8 text-[11px] font-black uppercase tracking-widest text-textPrimary outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="" disabled>Select Domain</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Attributes */}
            {category && CATEGORY_ATTRIBUTES[category] && (
              <div className="space-y-6 pt-6 border-t border-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Specification Sheet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CATEGORY_ATTRIBUTES[category].map((attr) => (
                    <div key={attr.id} className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">
                        {attr.label} {attr.unit && `(${attr.unit})`}
                      </label>
                      {attr.type === "select" ? (
                        <select
                          className="h-12 w-full rounded-xl bg-black/5 dark:bg-white/5 border-none shadow-inner px-6 text-[10px] font-black uppercase tracking-widest text-textPrimary outline-none"
                          value={properties[attr.id] || ""}
                          onChange={(e) => setProperties(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        >
                          <option value="">Select {attr.label}</option>
                          {attr.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={attr.type}
                          placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`}
                          className="bg-black/5 dark:bg-white/5 rounded-xl h-12 border-none shadow-inner px-6 text-xs font-bold"
                          value={properties[attr.id] || ""}
                          onChange={(e) => setProperties(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video & Extras */}
            {(type === "product" || type === "service") && (
              <div className="space-y-6 pt-6 border-t border-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Multimedia Extension</h3>
                <div className="space-y-4">
                   <div className="relative group">
                    <Youtube className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[#FF0000] z-10" />
                    <Input
                      type="text"
                      placeholder="YouTube Video Link..."
                      className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner pl-16 pr-8 text-xs font-bold"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                  </div>
                  {videoId && (
                    <div className="rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-2xl">
                      <MediaRenderer url={youtubeUrl} type="youtube" containerClassName="w-full" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="space-y-6 pt-6 border-t border-black/5">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Contact</h3>
               <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Phone Number *</label>
                   <Input 
                     type="tel" 
                     className="bg-black/5 dark:bg-white/5 rounded-2xl h-14 border-none shadow-inner px-6 text-sm font-black italic tracking-tighter" 
                     value={contactPhone}
                     onChange={(e) => setContactPhone(e.target.value)}
                     placeholder="080..." 
                   />
               </div>
            </div>

            {/* CAPTCHA */}
            {!isAuthenticated && type === "request" && (
              <div className="space-y-6 pt-6 border-t border-black/5">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Intelligence Verification</h3>
                 <div className="flex items-center gap-6">
                   <div className="h-16 px-8 rounded-2xl bg-black/5 flex items-center justify-center text-lg font-black italic text-primary">
                     {captchaNum1} + {captchaNum2} = ?
                   </div>
                   <Input 
                    type="number" 
                    className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner px-8 text-xl font-black italic w-32" 
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Result" 
                  />
                 </div>
              </div>
            )}

            <Button
              className="w-full h-20 rounded-[2rem] bg-[#111] hover:bg-black text-white shadow-2xl font-black uppercase tracking-[0.25em] text-xs transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Launching..." : "Publish to Feed"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showGuestSuccessModal} onOpenChange={setShowGuestSuccessModal}>
        <AlertDialogContent className="rounded-[3rem] p-10 glass border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.3)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black italic uppercase leading-none text-textPrimary">
              Launched <br /><span className="text-gradient pr-4 inline-block">Successfully</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-textSecondary uppercase tracking-widest leading-relaxed mt-6">
              Your gig is live. Create an account to track responses and upgrade your experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-10 space-y-3">
             <AlertDialogAction
              className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/signup");
              }}
            >
              Secure Account
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full h-14 rounded-2xl bg-black/5 text-textPrimary font-black uppercase tracking-widest text-[10px] border-none"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/requests");
              }}
            >
              Maybe Later
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

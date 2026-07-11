import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Youtube, Info, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { extractYouTubeId } from "@/lib/utils";
import { ProductListingSchema, ServiceListingSchema, RequestListingSchema } from "@/lib/validations";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaRenderer } from "@/components/MediaRenderer";

type ListingType = "product" | "service" | "request";

type ListingChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const getListingChecklist = ({
  type,
  title,
  description,
  price,
  category,
  images,
  contactPhone,
}: {
  type: ListingType;
  title: string;
  description: string;
  price: string;
  category: string;
  images: string[];
  contactPhone: string;
}): ListingChecklistItem[] => {
  const numericPrice = Number(price) || 0;
  return [
    { id: "title", label: "Strong title", done: title.trim().length >= 8 },
    { id: "description", label: "Clear description", done: description.trim().length >= 40 },
    { id: "category", label: "Category selected", done: !!category.trim() },
    { id: "price", label: type === "request" ? "Budget added" : "Price added", done: type === "request" ? numericPrice >= 0 : numericPrice > 0 },
    { id: "images", label: type === "product" ? "At least 1 photo" : "Photo added", done: type === "request" ? true : images.length >= 1 },
    { id: "contact", label: "Contact phone ready", done: contactPhone.trim().length >= 10 },
  ];
};

const getListingQualityScore = (items: ListingChecklistItem[]) => {
  const completed = items.filter((item) => item.done).length;
  return Math.round((completed / items.length) * 100);
};

export default function NewListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as ListingType) || "product";
  const initialTitle = searchParams.get("title") || "";
  // When an admin opens "Add Listing" from a managed user's dashboard,
  // Dashboard.tsx passes ?ownerId=<managedUserId> so the listing is created
  // under that user's account instead of the admin's own — without this,
  // every listing an admin posted while "managing" a user was silently
  // attributed to the admin's account instead of the user they were helping.
  const targetOwnerId = searchParams.get("ownerId") || "";
  const targetOwnerName = searchParams.get("ownerName") || "";
  
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const postingForOtherUser = isAdmin && !!targetOwnerId && targetOwnerId !== user?.id;
  const dashboardReturnPath = postingForOtherUser
    ? `/dashboard?tab=listings&userId=${encodeURIComponent(targetOwnerId)}&userName=${encodeURIComponent(targetOwnerName)}`
    : "/dashboard?tab=listings";
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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  useEffect(() => {
    if (type === "request") {
      setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
      setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    }
  }, [type]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && type !== "request") {
        navigate(`/signin?from=${encodeURIComponent("/dashboard/new")}`);
      }
    }
    if (user && !contactPhone) {
      setContactPhone(user.phone || "");
      setWhatsapp(user.phone || "");
    }
  }, [isAuthenticated, isLoading, navigate, user, contactPhone, type]);

  if (isLoading) return null;

  const checklist = getListingChecklist({
    type,
    title,
    description,
    price,
    category,
    images,
    contactPhone,
  });
  const qualityScore = getListingQualityScore(checklist);
  const completedChecklistCount = checklist.filter((item) => item.done).length;

  const handleSubmit = async () => {
    if (user?.isBanned) {
       toast.error("You cannot post. Account banned.");
       return;
    }
    if (isUploadingMedia) {
       toast.error("Please wait for your photo upload to finish.");
       return;
    }
    if (isAuthenticated && !user?.campusId) {
       toast.error("Please complete your campus profile before posting.");
       navigate(`/complete-signup?from=${encodeURIComponent("/dashboard/new")}`);
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
            captchaAnswer: parseInt(captchaAnswer, 10)
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
        const ownerId = auth.currentUser?.uid || user?.id;

        if (!ownerId || !auth.currentUser) {
          toast.error("Please sign in again before posting.");
          navigate(`/signin?from=${encodeURIComponent("/dashboard/new")}`);
          setIsSubmitting(false);
          return;
        }
        
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

        const token = await auth.currentUser.getIdToken(true);
        const response = await fetch('/api/listings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: token,
            type,
            title,
            description,
            price: Number(price) || 0,
            category,
            condition,
            images,
            mediaData,
            contactPhone,
            whatsapp: whatsapp || contactPhone,
            properties,
            videoId: videoId || null,
            youtubeUrl,
            campusId: user?.campusId,
            // Only meaningful when the caller is an admin managing another
            // user's dashboard — the server verifies admin status independently
            // before honoring this, so a non-admin can't spoof ownership.
            ...(isAdmin && targetOwnerId ? { ownerId: targetOwnerId } : {}),
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || `Failed to publish listing (${response.status})`);
        }

        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} published successfully!`);

        if (type === "product") {
          const shareUrl = `${window.location.origin}/product/${result.slug}?ref=share`;
          const shareText = `I just posted ${title} on Siyayya Campus Marketplace. Check it out: ${shareUrl}`;
          const openDashboard = () => navigate(dashboardReturnPath);

          toast.success("Listing is live — share it to WhatsApp to get buyers faster.", {
            action: {
              label: "Share",
              onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer"),
            },
            duration: 9000,
          });

          if (navigator.share) {
            try {
              await navigator.share({ title, text: `I just posted ${title} on Siyayya.`, url: shareUrl });
            } catch (error: any) {
              if (error?.name !== "AbortError") {
                console.info("Native share unavailable", error);
              }
            }
          }

          openDashboard();
        } else {
          navigate(dashboardReturnPath);
        }
      }
    } catch (error: any) {
       console.error("Error adding document: ", error);
       const code = error?.code || "";
       const message = code === "permission-denied"
         ? "This app version is still using old cached permissions. Please refresh or clear site data, then try again."
         : code === "unavailable"
           ? "Network error. Please check your connection and try again."
           : error?.message || "Failed to publish listing. Please try again.";
       toast.error(message);
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
           <Link to={postingForOtherUser ? dashboardReturnPath : (isAuthenticated ? "/dashboard" : "/marketplace")} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> {postingForOtherUser ? "Back to Managed Dashboard" : (isAuthenticated ? "Back to Dashboard" : "Back to Marketplace")}
          </Link>
          {postingForOtherUser && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Admin Posting Mode</p>
              <p className="text-xs font-semibold text-textPrimary mt-1">This listing will be created under {targetOwnerName || "this user"}'s account, not yours.</p>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black text-textPrimary tracking-tight italic uppercase leading-none pr-4">
            Create <span className="text-gradient pr-4 inline-block">Listing</span>
          </h1>
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest opacity-60 italic">Post a product, service, or request for students around your campus.</p>
        </div>
      </div>

      <div className="px-6 max-w-2xl mx-auto -mt-8 relative z-10">
        <div className="glass rounded-[3rem] p-10 shadow-2xl border-white/20 space-y-12">
          
          {/* Type Selector */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">What are you posting?</h3>
            <div className="flex p-2 gap-2 bg-black/5 rounded-[2rem] w-full">
              {(["product", "service", "request"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-[1.5rem] py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                    type === t ? "bg-white dark:bg-black text-primary shadow-xl scale-105" : "text-textMuted/60 hover:text-textPrimary"
                  }`}
                >
                  {t === "request" ? "Request" : `List ${t}`}
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
                  You are posting without an account. <Link to="/signin" className="text-primary font-black underline">Join Siyayya</Link> to manage your requests.
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Photos</h3>
                <div className="rounded-[2rem] border-2 border-dashed border-black/5 bg-black/[0.02] p-6">
                   <CloudinaryUpload 
                    onUpload={(data) => {
                      if (type === "product") {
                        setImages(prev => [...prev, data.url]);
                        setMediaData(prev => [...prev, data]);
                      } else {
                        setImages([data.url]);
                        setMediaData([data]);
                      }
                    }}
                    onRemove={async (index) => {
                      const removedMedia = mediaData[index];
                      setImages(prev => prev.filter((_, i) => i !== index));
                      setMediaData(prev => prev.filter((_, i) => i !== index));
                      // Clean up the Cloudinary asset if the user uploads a photo
                      // then removes it before ever submitting the listing —
                      // previously this left the file orphaned in storage forever.
                      if (removedMedia?.publicId && auth.currentUser) {
                        try {
                          const idToken = await auth.currentUser.getIdToken();
                          deleteFromCloudinary(removedMedia.publicId, removedMedia.resourceType || 'image', idToken).catch(() => {});
                        } catch {
                          // Best-effort — don't block the UI on cleanup failures
                        }
                      }
                    }}
                    onUploadingChange={setIsUploadingMedia}
                    multiple={type === "product"}
                    maxFiles={5}
                    currentCount={images.length}
                    label={type === "product" ? "Add Product Photos" : "Add Service Photo"}
                    accept="image/*"
                  />
                  <p className="mt-3 text-[11px] text-textMuted font-semibold px-2">Clear photos help buyers trust your listing.</p>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-6">
               <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Title *</label>
                <Input
                  placeholder={type === "service" ? "What service are you offering?" : "What are you selling?"}
                  className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner px-8 text-base font-black italic tracking-tight"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Description *</label>
                <textarea
                  rows={5}
                  placeholder="Describe the item, condition, pickup location, and any important details..."
                  className="w-full rounded-[1.5rem] bg-black/5 dark:bg-white/5 border-none shadow-inner px-8 py-6 text-sm font-medium text-textPrimary placeholder:text-textMuted/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Price (₦) *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="bg-black/5 dark:bg-white/5 rounded-2xl h-16 border-none shadow-inner px-8 text-xl font-black italic tabular-nums"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-textMuted ml-4">Category *</label>
                  <select 
                    className="h-16 w-full rounded-2xl bg-black/5 dark:bg-white/5 border-none shadow-inner px-8 text-[11px] font-black uppercase tracking-widest text-textPrimary outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="" disabled>Select Category</option>
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Details</h3>
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Optional Video</h3>
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
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Verification</h3>
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

            <div className="space-y-5 pt-6 border-t border-black/5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Listing Quality</h3>
                  <p className="mt-2 text-xs font-semibold text-textSecondary">
                    {qualityScore >= 80
                      ? "Strong listing — more likely to get attention faster."
                      : qualityScore >= 50
                        ? "Good start — complete the remaining items to improve trust."
                        : "Complete more details before posting for better results."}
                  </p>
                </div>
                <div className="h-20 w-20 rounded-full border-4 border-primary/10 bg-primary/5 flex items-center justify-center text-xl font-black text-primary shadow-inner">
                  {qualityScore}%
                </div>
              </div>

              <div className="h-3 w-full rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${qualityScore}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl px-4 py-3 text-xs font-bold border ${item.done ? "bg-primary/5 text-primary border-primary/20" : "bg-black/[0.03] text-textMuted border-black/5"}`}
                  >
                    <span className="mr-2">{item.done ? "✓" : "•"}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-textMuted font-semibold">
                Completed {completedChecklistCount} of {checklist.length} quality checks.
              </p>
            </div>

            <Button
              className="w-full h-20 rounded-[2rem] bg-[#111] hover:bg-black text-white shadow-2xl font-black uppercase tracking-[0.25em] text-xs transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploadingMedia}
            >
              {isUploadingMedia ? "Uploading photos..." : isSubmitting ? "Posting..." : "Post Listing"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showGuestSuccessModal} onOpenChange={setShowGuestSuccessModal}>
        <AlertDialogContent className="rounded-[3rem] p-10 glass border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.3)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black italic uppercase leading-none text-textPrimary">
              Posted <br /><span className="text-gradient pr-4 inline-block">Successfully</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-textSecondary uppercase tracking-widest leading-relaxed mt-6">
              Your request is live. Create an account to track responses and manage your posts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-10 space-y-3">
             <AlertDialogAction
              className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/signin");
              }}
            >
              Create Account
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full h-14 rounded-2xl bg-black/5 text-textPrimary font-black uppercase tracking-widest text-[10px] border-none"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/marketplace");
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

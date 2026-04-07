import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Camera, Upload, ArrowLeft, Phone, Image as ImageIcon, Youtube, Info } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { extractYouTubeId, isValidYouTubeUrl } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type ListingType = "product" | "service" | "request";

const NewListing = () => {
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
    // Generate new captcha numbers when component mounts or type changes to request
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
    if (!title || !description || !category || !contactPhone) {
       toast.error("Please fill in all required fields (Title, Description, Category, Phone).");
       return;
    }
    if (type !== "request" && !price) {
       toast.error("Price is required for listings.");
       return;
    }

    setIsSubmitting(true);
    try {
      if (!isAuthenticated && type === "request") {
        // Guest Request Submission
        if (!guestEmail || !guestName) {
           toast.error("Name and Email are required for guest requests.");
           setIsSubmitting(false);
           return;
        }
        if (!captchaAnswer || parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
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
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to submit request.");
        }
        
        // Show the Smart Upgrade modal instead of directly navigating
        setShowGuestSuccessModal(true);
      } else {
        // Authenticated users submission
        const collectionName = type === "product" ? "products" : type === "service" ? "services" : "requests";
        const newDocData: any = {
          title,
          description,
          category,
          price: Number(price) || 0,
          contactPhone,
          whatsapp: whatsapp || contactPhone,
          properties,
          videoId: videoId || null,
          createdAt: serverTimestamp(),
        };
        
        if (type === "product") {
          newDocData.ownerId = user?.id;
          newDocData.ownerName = user?.businessName || user?.name || "Unknown";
          newDocData.ownerIsVerified = user?.isVerified || false;
          newDocData.ownerPhone = contactPhone;
          newDocData.ownerRating = 5.0; // Initial rating
          newDocData.ownerDepartment = user?.department || "General";
          newDocData.condition = condition;
          newDocData.images = images;
          newDocData.image = images.length > 0 ? images[0] : "";
          newDocData.isSold = false;
          newDocData.isFeatured = false;
          newDocData.status = "approved";
          newDocData.views = 0;
        } else if (type === "service") {
          newDocData.ownerId = user?.id;
          newDocData.ownerName = user?.businessName || user?.name || "Unknown";
          newDocData.ownerIsVerified = user?.isVerified || false;
          newDocData.ownerPhone = contactPhone;
          newDocData.ownerRating = 5.0; // Initial rating
          newDocData.ownerDepartment = user?.department || "General";
          newDocData.rating = 0;
          newDocData.reviews = 0;
          newDocData.images = images;
          newDocData.image = images.length > 0 ? images[0] : "";
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container max-w-lg py-4">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-xl font-bold text-foreground mb-5">Create Listing</h1>

        {/* Type selector */}
        <div className="flex gap-2 mb-6">
          {(["product", "service", "request"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t === "request" ? "Request" : `List ${t}`}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {!isAuthenticated && type === "request" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-1">
                <Info className="h-4 w-4" /> Guest Request Mode
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                You are submitting this request without an account. <Link to="/signup" className="text-primary font-bold hover:underline">Create an account</Link> instead to track and manage your requests easily.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground ml-1">Your Name / Business Name *</label>
                  <Input 
                    type="text" 
                    className="mt-1 bg-card" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="E.g. Jane Doe" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground ml-1">Email <span className="opacity-70">(Required for notifications)</span> *</label>
                  <Input 
                    type="email" 
                    className="mt-1 bg-card" 
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com" 
                  />
                </div>
              </div>
            </div>
          )}

          {type === "product" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Product Images
              </label>
              <CloudinaryUpload 
                onUpload={(url) => setImages(prev => [...prev, url])}
                multiple={true}
                label="Upload Product Images"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {type === "request" ? "What are you looking for? *" : "Title *"}
            </label>
            <Input
              type="text"
              placeholder={type === "service" ? "e.g. Phone Repair" : type === "request" ? "e.g. Looking for a used laptop" : "e.g. HP Laptop 15-inch"}
              className="mt-1 bg-card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <textarea
              rows={4}
              placeholder="Describe your item, service or request in detail..."
              className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {type === "request" ? "Budget (₦) *" : "Price (₦) *"}
              </label>
              <Input
                type="number"
                placeholder="0"
                className="mt-1 bg-card tabular-nums"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category *</label>
              <select 
                className="mt-1 h-12 w-full rounded-xl border bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Category Properties */}
          {category && CATEGORY_ATTRIBUTES[category] && (
            <div className="space-y-4 pt-2 border-t border-border/50">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                <Info className="h-4 w-4 text-primary" />
                Additional Details for {categories.find(c => c.id === category)?.label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORY_ATTRIBUTES[category].map((attr) => (
                  <div key={attr.id}>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">
                      {attr.label} {attr.unit && `(${attr.unit})`}
                    </label>
                    {attr.type === "select" ? (
                      <select
                        className="h-10 w-full rounded-xl border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                        className="bg-card h-10"
                        value={properties[attr.id] || ""}
                        onChange={(e) => setProperties(prev => ({ ...prev, [attr.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* YouTube Video Support */}
          {(type === "product" || type === "service") && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Youtube className="h-4 w-4 text-[#FF0000]" />
                Product Video (YouTube URL)
              </label>
              <Input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-card"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              {youtubeUrl && !videoId && (
                <p className="text-[10px] text-destructive font-medium italic">Please enter a valid YouTube link</p>
              )}
              {videoId && (
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-primary/20 bg-muted group">
                  <img 
                    src={`https://img.youtube.com/vi/${videoId}/0.jpg`} 
                    alt="Video Thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl scale-110">
                        <Youtube className="h-6 w-6" />
                     </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white backdrop-blur-md">
                    Video ID: {videoId}
                  </div>
                </div>
              )}
            </div>
          )}


          {type === "product" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Condition</label>
                <div className="mt-1 flex gap-2">
                  {["New", "Used"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-ring ${
                         condition === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-accent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t space-y-4">
             <h3 className="font-semibold text-sm">Contact Information</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-medium text-muted-foreground ml-1">Phone Number *</label>
                 <Input 
                   type="tel" 
                   className="mt-1 bg-card" 
                   value={contactPhone}
                   onChange={(e) => setContactPhone(e.target.value)}
                   placeholder="080..." 
                 />
               </div>
               <div>
                 <label className="text-xs font-medium text-muted-foreground ml-1">WhatsApp Number (Optional)</label>
                 <Input 
                   type="tel" 
                   className="mt-1 bg-card" 
                   value={whatsapp}
                   onChange={(e) => setWhatsapp(e.target.value)}
                   placeholder="Same as phone if left blank" 
                 />
               </div>
             </div>
          </div>
          
          {!isAuthenticated && type === "request" && (
            <div className="pt-4 border-t space-y-4">
               <h3 className="font-semibold text-sm">Security Check</h3>
               <div>
                 <label className="text-xs font-medium text-muted-foreground ml-1">What is {captchaNum1} + {captchaNum2}? *</label>
                 <Input 
                   type="number" 
                   className="mt-1 bg-card w-full max-w-[150px]" 
                   value={captchaAnswer}
                   onChange={(e) => setCaptchaAnswer(e.target.value)}
                   placeholder="Answer" 
                 />
                 <p className="text-[10px] text-muted-foreground mt-1 ml-1">Help us prevent spam</p>
               </div>
            </div>
          )}

          <Button
            className="w-full h-12 mt-6 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform font-medium"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : type === "request" ? "Post Request" : "Publish Listing"}
          </Button>
        </div>
      </div>

      <AlertDialog open={showGuestSuccessModal} onOpenChange={setShowGuestSuccessModal}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-emerald-500">🎉</span> Request Submitted!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80 mt-2">
              Your request is now live in the marketplace.
              <br /><br />
              <span className="font-bold text-primary">Smart Upgrade:</span> Create an account now with your email <strong>{guestEmail}</strong> to easily track this request, edit it, and get direct messaging!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 mt-4 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              className="w-full rounded-xl bg-primary hover:bg-primary/90 h-11"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/signup");
              }}
            >
              Create Account to Track
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full rounded-xl h-11 sm:mt-0"
              onClick={() => {
                setShowGuestSuccessModal(false);
                navigate("/requests");
              }}
            >
              Maybe Later
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewListing;

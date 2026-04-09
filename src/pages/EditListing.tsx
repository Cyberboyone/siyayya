import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { ArrowLeft, Loader2, Youtube, Info } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { extractYouTubeId, isValidYouTubeUrl } from "@/lib/utils";

type ListingType = "products" | "services" | "requests";

const EditListing = () => {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: ListingType; id: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
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
  
  // Track original to prevent unauthorized edit
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/signin");
      return;
    }

    const fetchListing = async () => {
      if (!id || !type) return;
      try {
        const docRef = doc(db, type, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Ownership check
          const listOwner = data.ownerId;
          if (listOwner && user && listOwner !== user.id) {
             toast.error("You are not authorized to edit this listing.");
             navigate("/dashboard");
             return;
          }
          
          setOwnerId(listOwner);
          setTitle(data.title || "");
          setDescription(data.description || "");
          setPrice(data.price?.toString() || data.budget?.toString() || "");
          setCategory(data.category || "");
          setCondition(data.condition || "New");
          setImages(data.images || (data.image ? [data.image] : []));
          setMediaData(data.mediaData || []);
          setContactPhone(data.ownerPhone || data.ownerPhone || data.contactPhone || user?.phone || "");
          setWhatsapp(data.whatsapp || user?.phone || "");
          setProperties(data.properties || {});
          if (data.videoId) {
            setYoutubeUrl(`https://www.youtube.com/watch?v=${data.videoId}`);
          }
        } else {
          toast.error("Listing not found.");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
        toast.error("Error fetching listing details.");
      } finally {
        setIsFetching(false);
      }
    };

    if (isAuthenticated) {
      fetchListing();
    }
  }, [id, type, isAuthenticated, isLoading, navigate, user]);

  if (isLoading || isFetching) {
    return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
    );
  }

  const handleSubmit = async () => {
    if (!title || !description || !category || !contactPhone) {
       toast.error("Please fill in all required fields (Title, Description, Category, Phone).");
       return;
    }
    if (type !== "requests" && !price) {
       toast.error("Price is required for listings.");
       return;
    }

    setIsSubmitting(true);
    try {
       const updateData: any = {
         title,
         description,
         category,
         contactPhone,
         whatsapp,
         properties,
         videoId: videoId || null,
         updatedAt: serverTimestamp(),
       };
       
       if (type === "products") {
         updateData.price = Number(price) || 0;
         updateData.ownerName = user?.businessName || user?.name || "Unknown";
         updateData.ownerIsVerified = user?.isVerified || false;
         updateData.ownerPhone = contactPhone;
         updateData.condition = condition;
         updateData.images = images;
         if (images.length > 0) updateData.image = images[0];
         else updateData.image = "";
         updateData.mediaData = mediaData;
         updateData.mediaType = mediaData.length > 0 ? mediaData[mediaData.length - 1].resourceType : "image";
       } else if (type === "services") {
         updateData.price = Number(price) || 0;
         updateData.ownerName = user?.businessName || user?.name || "Unknown";
         updateData.ownerIsVerified = user?.isVerified || false;
         updateData.ownerPhone = contactPhone;
         updateData.images = images;
         if (images.length > 0) updateData.image = images[0];
         else updateData.image = "";
         updateData.mediaData = mediaData;
         updateData.mediaUrl = images.length > 0 ? images[0] : "";
         updateData.mediaType = mediaData.length > 0 ? mediaData[mediaData.length - 1].resourceType : "image";
       } else {
         updateData.budget = Number(price) || 0;
         updateData.ownerName = user?.businessName || user?.name || "Unknown";
         updateData.ownerIsVerified = user?.isVerified || false;
       }

       if (!id || !type) throw new Error("Missing ID or Type");
       await updateDoc(doc(db, type, id), updateData);
       
       toast.success("Listing updated successfully!");
       navigate("/dashboard?tab=listings");
    } catch (error: any) {
       console.error("Error updating document: ", error);
       toast.error("Failed to update listing.");
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
        <h1 className="text-xl font-bold text-foreground mb-5">Edit {type?.slice(0, -1)}</h1>

        <div className="space-y-4">
          {(type === "products" || type === "services") && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {type === "products" ? "Product Images" : "Service Media (Images/Video)"}
              </label>
              
              <CloudinaryUpload 
                onUpload={(data) => {
                  setImages(prev => [...prev, data.url]);
                  setMediaData(prev => [...prev, data]);
                }}
                multiple={type === "products"}
                label={type === "products" ? "Add More Images" : "Update Service Image/Video"}
                accept="image/*"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <Input
              type="text"
              placeholder="e.g. HP Laptop 15-inch"
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
                {type === "requests" ? "Budget (₦) *" : "Price (₦) *"}
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
          {(type === "products" || type === "services") && (
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


          {type === "products" && (
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

          <Button
            className="w-full h-12 mt-6 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform font-medium"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditListing;

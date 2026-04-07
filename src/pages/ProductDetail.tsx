import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Star, MessageCircle, Flag, Heart, Loader2, Phone, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { formatPrice, Product } from "@/lib/mock-data";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ReviewSection } from "@/components/ReviewSection";
import { formatDate, formatPhoneNumberForWhatsApp } from "@/lib/utils";
import { CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Youtube, Settings as SettingsIcon } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  console.log("ProductDetail rendered with ID:", id);
  const [product, setProduct] = useState<any | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addViewed } = useRecentlyViewed();
  const { isSaved, toggle } = useSavedItems();
  const { isAuthenticated, user: authUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        console.warn("ProductDetail: No ID provided in URL params.");
        setIsLoading(false);
        return;
      }
      console.log("Fetching product/service ID:", id);
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() } as any;
          setProduct(prodData);
          addViewed(id);
          
          try {
             const q = query(
               collection(db, "products"), 
               where("category", "==", prodData.category), 
               limit(5)
             );
             const snaps = await getDocs(q);
             const rel = snaps.docs
               .map(d => ({id: d.id, ...d.data()} as Product))
               .filter(p => p.id !== id)
               .slice(0, 4);
             setRelatedProducts(rel);
          } catch (e) {
             console.error("Error fetching related products", e);
          }
        } else {
          console.warn(`Product document not found for ID: ${id}`);
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, addViewed]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-24 text-center">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">📦</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Product Not Found</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This product may have been removed by the seller, or the link you followed is invalid.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/marketplace">
                <Button className="w-full sm:w-auto gap-2">
                  <ArrowLeft className="h-4 w-4" /> Browse Marketplace
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ownerPhone = product.ownerPhone || product.contactPhone || "";
  const whatsappNumber = product.whatsapp || ownerPhone;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      toast.success("Listing deleted successfully");
      navigate("/marketplace");
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing");
    }
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      toast.error("Please describe the issue before submitting.");
      return;
    }
    if (!isAuthenticated || !authUser) {
      navigate("/signin");
      return;
    }
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), {
        listingId: product.id,
        listingTitle: product.title,
        listingType: "product",
        reportedBy: authUser.id,
        reportedByName: authUser.businessName || authUser.name,
        reason: reportText.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Report submitted. Our team will review it.");
      setReportOpen(false);
      setReportText("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit report. Try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-3xl py-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Image Gallery */}
        <div className="space-y-3">
          <div className={`relative aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden bg-secondary shadow-sm ${product.isSold ? "opacity-60 grayscale-[50%]" : ""}`}>
            <img src={(product.images?.length ? product.images : [product.image])[currentImageIndex]} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy" />
            
            {(product.images?.length || 0) > 1 && (
              <>
                <button onClick={() => setCurrentImageIndex(prev => prev === 0 ? product.images!.length - 1 : prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full shadow hover:bg-background z-20 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setCurrentImageIndex(prev => prev === product.images!.length - 1 ? 0 : prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full shadow hover:bg-background z-20 transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />
            
            {product.isSold && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm z-20">
                <span className="rounded-full bg-foreground text-background px-6 py-3 text-sm font-bold tracking-widest uppercase shadow-xl transform -rotate-12">SOLD</span>
              </div>
            )}
            
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              {product.condition === "New" && (
                <span className="rounded-full bg-primary/90 backdrop-blur-md shadow-sm px-3.5 py-1.5 text-xs font-bold tracking-wide text-primary-foreground">
                  NEW
                </span>
              )}
              <span className="rounded-full bg-background/90 backdrop-blur-md shadow-sm px-3.5 py-1.5 text-xs font-semibold text-foreground capitalize">
                {product.category}
              </span>
            </div>
          </div>
          
          {(product.images?.length || 0) > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {product.images!.map((img, idx) => (
                <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="mt-6 md:mt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-3xl md:text-4xl font-black text-primary tracking-tight tabular-nums">{formatPrice(product.price)}</p>
                {product.condition === "Used" && (
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">Used Item</span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{product.title}</h1>
            </div>
            
            <button
              onClick={() => toggle(product.id)}
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-card shadow-sm transition-all hover:bg-red-50 hover:border-red-100"
            >
              <Heart className={`h-6 w-6 transition-transform group-hover:scale-110 ${isSaved(product.id) ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-red-400"}`} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 shrink-0"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active Listing</span>
            <span className="text-muted-foreground/30">•</span>
            <span>Posted {formatDate(product.createdAt)}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 border-t border-border/50 pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Item Description</h2>
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 text-pretty leading-relaxed">
            <p>{product.description}</p>
          </div>
        </div>

        {/* Specifications / Properties */}
        {product.properties && Object.keys(product.properties).length > 0 && (
          <div className="mt-8 border-t border-border/50 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Specifications
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              {CATEGORY_ATTRIBUTES[product.category]?.map(attr => {
                const val = product.properties?.[attr.id];
                if (!val) return null;
                return (
                  <div key={attr.id} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{attr.label}</p>
                    <p className="text-sm font-bold text-foreground">{val} {attr.unit}</p>
                  </div>
                );
              })}
              {/* Fallback for properties not in CATEGORY_ATTRIBUTES */}
              {Object.entries(product.properties).map(([key, val]) => {
                if (CATEGORY_ATTRIBUTES[product.category]?.find(a => a.id === key)) return null;
                return (
                  <div key={key} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-bold text-foreground">{String(val)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* YouTube Video */}
        {product.videoId && (
          <div className="mt-8 border-t border-border/50 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Youtube className="h-5 w-5 text-[#FF0000]" />
              Video Demonstration
            </h2>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${product.videoId}?rel=0`}
                title={`${product.title} video`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0"
                loading="lazy"
              ></iframe>
            </div>
          </div>
        )}


        {/* Seller Info */}
        <div className="mt-8 border-t border-border/50 pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">About the Seller</h2>
          <Link to={`/user/${product.ownerId}`} className="flex items-center gap-4 group block rounded-xl p-4 border bg-card/50 hover:bg-card hover:shadow-sm transition-all">
            <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
              {(product.ownerName || "Siyayya Member").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">{product.ownerName || "Siyayya Member"}</p>
                {product.ownerIsVerified && <VerifiedBadge />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.ownerDepartment || "Verified Community Member"}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-sm bg-secondary px-2.5 py-1 rounded-md">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                <span className="font-medium">{product.ownerRating || "5.0"}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="mt-8 grid grid-cols-2 gap-3 pb-8 border-b border-border/50">
          <Button
            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform gap-2 text-sm font-semibold shadow-md w-full"
            onClick={() => {
              if (ownerPhone) window.open(`tel:${ownerPhone.replace(/[^0-9]/g, '')}`, '_self');
              else toast.error("Phone number not available.");
            }}
          >
            <Phone className="h-5 w-5" />
            Call
          </Button>
          
          {ownerPhone && (
            <Button
              className="h-12 bg-[#25D366] text-white hover:bg-[#20bb5c] active:scale-95 transition-transform gap-2 text-sm font-semibold shadow-md border-0 w-full"
              onClick={() => {
                const waNumber = formatPhoneNumberForWhatsApp(whatsappNumber || ownerPhone);
                const message = encodeURIComponent(`Hi, I’m interested in your listing on Siyayya: ${product.title}`);
                window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
              }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              WhatsApp
            </Button>
          )}

          <Button
            variant="outline"
            className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => {
              if (!isAuthenticated) return navigate("/signin");
              setReportOpen(!reportOpen);
            }}
          >
            <Flag className="h-4 w-4" />
          </Button>

          {authUser && (authUser.id === product.ownerId || authUser.id === product.ownerId) && (
            <Button
              variant="destructive"
              className="h-12 col-span-2 sm:col-span-1"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Listing
            </Button>
          )}
        </div>


        {reportOpen && (
          <div className="mt-2 mb-8 rounded-xl border border-destructive/20 bg-destructive/5 p-5 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-base flex items-center gap-2 font-semibold text-destructive mb-1">
              <Flag className="h-4 w-4" />
              Report Listing
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Help us keep the marketplace safe. What's wrong with this listing?</p>
            <textarea
              className="w-full rounded-lg border border-destructive/20 bg-background p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-shadow resize-none"
              rows={3}
              placeholder="e.g. Inappropriate content, spam, fake item..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />
            <div className="mt-4 flex gap-3 justify-end items-center">
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setReportOpen(false); setReportText(""); }}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" className="shadow" onClick={handleSubmitReport} disabled={isSubmittingReport}>
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        )}

        <ReviewSection listingId={product.id} ownerId={product.ownerId} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Similar Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;

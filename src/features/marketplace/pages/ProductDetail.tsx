import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Star, Flag, Heart, Loader2, Phone, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { formatPrice, Product } from "@/lib/mock-data";
import { ProductCard } from "../components/ProductCard";
import { Button } from "@/components/ui/button";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useSavedItems } from "@/hooks/use-saved-items";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ReviewSection } from "@/components/ReviewSection";
import { formatDate } from "@/lib/utils";
import { CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Youtube, Settings as SettingsIcon } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useSEO } from "@/hooks/useSEO";
import { getProductSchema, getBreadcrumbSchema } from "@/components/SEOStructuredData";
import { MediaRenderer } from "@/components/MediaRenderer";
import { useAuth } from "../../auth/contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
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
import { SafetyTips } from "@/components/SafetyTips";
import { PurchaseModal } from "@/components/PurchaseModal";
import { ShieldCheck, Clock, CheckCircle, ShoppingCart } from "lucide-react";
import { AuthModal } from "../../auth/components/AuthModal";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
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
  const { addToCart, items } = useCart();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }
      try {
        let prodData: any = null;
        
        // 1. Try ID lookup first (for backward compatibility)
        try {
          const docRef = doc(db, "products", slug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            prodData = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          // Ignore lookup error if it wasn't a valid ID format
        }

        // 2. Try slug query lookup if not found by ID
        if (!prodData) {
          const q = query(
            collection(db, "products"),
            where("slug", "==", slug),
            limit(1)
          );
          const snaps = await getDocs(q);
          if (!snaps.empty) {
            const docSnap = snaps.docs[0];
            prodData = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (prodData) {
          setProduct(prodData);
          addViewed(prodData.id);
          try {
            const viewKey = `siyayya_viewed_product_${prodData.id}`;
            if (!sessionStorage.getItem(viewKey)) {
              sessionStorage.setItem(viewKey, '1');
              fetch('/api/listings/track-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: prodData.id, collection: 'products', action: 'view' }),
              }).catch(() => {});
            }
          } catch {}
          
          try {
             const q = query(
               collection(db, "products"), 
               where("category", "==", prodData.category), 
               limit(5)
             );
             const snaps = await getDocs(q);
             const rel = snaps.docs
               .map(d => ({id: d.id, ...d.data()} as Product))
               .filter(p => p.id !== prodData.id)
               .slice(0, 4);
             setRelatedProducts(rel);
          } catch (e) {
             console.error("Error fetching related products", e);
          }
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [slug, addViewed]);

  const breadcrumbs = useMemo(() => {
    if (!product) return [];
    return [
      { name: "Home", item: "/" },
      { name: "Marketplace", item: "/marketplace" },
      { name: product.category, item: `/marketplace/${product.category}` },
      { name: product.title, item: `/product/${product.slug || product.id}` }
    ];
  }, [product]);

  const productSchema = useMemo(() => {
    if (!product) return null;
    return getProductSchema({
      title: product.title,
      image: product.images?.[0] || product.image || "",
      description: product.description || "",
      price: product.price || 0,
      condition: product.condition || "Used",
      location: product.location || "Nigeria",
      ownerName: product.ownerName || "Seller",
      createdAt: product.createdAt?.toDate ? product.createdAt.toDate().toISOString() : new Date().toISOString()
    });
  }, [product]);

  useSEO({
    title: product ? `${product.title} for Sale in ${product.location || 'Nigeria'} | Siyayya` : "Product Detail",
    description: product ? `${String(product.description || "").slice(0, 150)}... Buy and sell in Siyayya.` : "View details of this product.",
    ogType: "product",
    ogImage: product?.images?.[0] || product?.image || "https://siyayya.com/og-product.png",
    twitterCard: "summary",
    canonical: window.location.href,
    structuredData: productSchema ? [productSchema, getBreadcrumbSchema(breadcrumbs)] : undefined
  });

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
            <h2 className="text-xl font-black text-textPrimary mb-2 uppercase tracking-tighter italic">Product Not Found</h2>
            <p className="text-sm text-textSecondary mb-6 leading-relaxed font-medium">
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (!auth.currentUser) {
        throw new Error("Please sign in again before deleting.");
      }

      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          listingId: product.id,
          collection: 'products',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to delete listing');
      }

      toast.success(result?.message || "Listing deleted successfully");
      navigate("/marketplace");
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      toast.error(error?.message || "Failed to delete listing");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
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

  const handleContactWhatsApp = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (authUser?.id === product.ownerId) {
      toast.error("This is your own listing!");
      return;
    }
    const phone = product.ownerPhone || product.contactPhone || "";
    if (phone) {
      fetch('/api/listings/track-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: product.id, collection: 'products' }),
      }).catch(() => {});
      const cleaned = phone.replace(/\D/g, "");
      const intl = cleaned.startsWith("234") ? cleaned : cleaned.startsWith("0") ? "234" + cleaned.slice(1) : "234" + cleaned;
      const msg = encodeURIComponent(`Hi! I saw your listing on Siyayya: *${product.title}* (₦${product.price?.toLocaleString()}). Is it still available?`);
      window.open(`https://wa.me/${intl}?text=${msg}`, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Seller contact not listed. Visit their profile for more info.");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-3xl py-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="space-y-3">
          <div className={`relative ${product.isSold ? "opacity-60 grayscale-[50%]" : ""}`}>
            <MediaRenderer 
              url={(product.images?.length ? product.images : [product.image])[currentImageIndex]} 
              alt={product.title}
              containerClassName="rounded-2xl shadow-sm"
              className="transition-transform duration-700"
              objectFit="contain"
            />
            
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

            {product.isSold && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm z-20">
                <span className="rounded-full bg-foreground text-background px-6 py-3 text-sm font-bold tracking-widest uppercase shadow-xl transform -rotate-12">SOLD</span>
              </div>
            )}
            
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              {product.condition === "New" && (
                <span className="rounded-full bg-primary/95 backdrop-blur-md shadow-lg px-4 py-1.5 text-[10px] font-black tracking-widest text-white border border-white/20 uppercase">
                  New
                </span>
              )}
              <span className="rounded-full bg-surface/90 backdrop-blur-md shadow-lg px-4 py-1.5 text-[10px] font-black tracking-widest text-textPrimary border border-black/5 uppercase">
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
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/5 bg-surface shadow-sm transition-all hover:bg-error/5 hover:border-error/20"
            >
              <Heart className={`h-6 w-6 transition-transform group-hover:scale-110 ${isSaved(product.id) ? "fill-error text-error" : "text-textMuted group-hover:text-error/60"}`} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-textSecondary/60">
            <span className="flex items-center gap-1.5 shrink-0"><span className="w-2 h-2 rounded-full bg-success animate-pulse"></span> Active Listing</span>
            <span className="opacity-30">•</span>
            <span>Posted {formatDate(product.createdAt)}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Item Description</h2>
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 text-pretty leading-relaxed">
            <p>{product.description}</p>
          </div>
        </div>

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
                    <p className="text-[9px] uppercase tracking-widest text-textMuted font-black">{attr.label}</p>
                    <p className="text-sm font-black text-textPrimary tracking-tight">{val} {attr.unit}</p>
                  </div>
                );
              })}
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

        {product.videoId && (
          <div className="mt-8 border-t border-border/50 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Youtube className="h-5 w-5 text-[#FF0000]" />
              Video Demonstration
            </h2>
            <MediaRenderer 
              url={`https://www.youtube.com/watch?v=${product.videoId}`} 
              type="youtube"
              alt={`${product.title} video`}
              containerClassName="rounded-2xl shadow-2xl border border-border/50"
            />
          </div>
        )}

        <SafetyTips />

        <div className="mt-8 border-t border-black/5 pt-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">About the Seller</h2>
          <div className="flex items-center gap-4 group block rounded-[1.5rem] p-5 border border-black/5 bg-surface hover:bg-muted/30 hover:shadow-lg transition-all duration-300">
            <Link to={`/user/${product.ownerId}`} className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
              {(product.ownerName || "Siyayya Member").charAt(0)}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/user/${product.ownerId}`} className="flex items-center gap-1 group">
                <p className="text-base font-black text-textPrimary group-hover:text-primary transition-colors truncate tracking-tight">{product.ownerName || "Siyayya Member"}</p>
                {product.ownerIsVerified && <VerifiedBadge />}
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <p className="text-[9px] text-textSecondary font-bold uppercase tracking-widest truncate opacity-60 flex items-center gap-1">
                   <Clock className="h-3 w-3" /> Replies in ~2h
                </p>
                <p className="text-[9px] text-success font-bold uppercase tracking-widest truncate flex items-center gap-1">
                   <CheckCircle className="h-3 w-3" /> 12 Successful Sales
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-xs bg-warning/10 text-warning px-3 py-1.5 rounded-xl border border-warning/10 font-black">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-black tabular-nums">{product.ownerRating || "5.0"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 pb-12 border-b border-black/5">
          <Button
            className="h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white active:scale-95 transition-all gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-green-500/20 w-full"
            onClick={handleContactWhatsApp}
          >
            <Phone className="h-5 w-5" />
            WhatsApp Seller
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <Button
              className="h-14 btn-premium text-white active:scale-95 transition-all gap-2 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 w-full"
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true);
                  return;
                }
                setPurchaseOpen(true);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Buy Now
            </Button>

            <Button
              variant="outline"
              className="h-14 border-primary/20 text-primary hover:bg-primary/10 active:scale-95 transition-all gap-2 text-[10px] font-black uppercase tracking-widest rounded-2xl w-full"
              onClick={() => {
                addToCart(product);
                toast.success(`Added to cart!`, { description: product.title });
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              {items.find(i => i.id === product.id) ? 'Add More' : 'Add to Cart'}
            </Button>
          </div>

          <Button
            variant="outline"
            className="h-14 border-error/20 text-error hover:bg-error/10 hover:text-error transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-inner shadow-error/5"
            onClick={() => {
              if (!isAuthenticated) return navigate("/signin");
              setReportOpen(!reportOpen);
            }}
          >
            <Flag className="h-4 w-4 mr-2" /> Report
          </Button>

          {authUser && (authUser.id === product.ownerId) && (
            <Button
              variant="destructive"
              className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-error/20"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Item
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
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent className="rounded-[2.5rem] border-black/5 bg-surface p-10 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black text-textPrimary italic tracking-tighter">Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="text-textSecondary font-medium text-base mt-2">
            This will permanently delete "{product.title}" and all its images from our servers. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
          <AlertDialogCancel className="rounded-2xl h-12 font-bold px-6 bg-muted hover:bg-gray-200 text-textPrimary border-black/5 uppercase text-[10px] tracking-widest">Cancel Action</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="rounded-2xl h-12 bg-error text-white hover:bg-red-700 font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-error/20"
          >
            {isDeleting ? "Deleting..." : "Confirm Deletion"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <PurchaseModal 
      isOpen={purchaseOpen} 
      onClose={() => setPurchaseOpen(false)}
      product={{
        title: product.title,
        price: product.price,
        image: product.images?.[0] || product.image,
        ownerName: product.ownerName
      }}
    />
    <AuthModal 
      isOpen={authModalOpen} 
      onClose={() => {
        setAuthModalOpen(false);
      }} 
    />
    </>
  );
};

export default ProductDetail;

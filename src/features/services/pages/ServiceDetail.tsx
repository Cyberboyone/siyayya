import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Flag, Phone, Loader2, Trash2, Settings as SettingsIcon, Image as ImageIcon, Youtube } from "lucide-react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { formatPrice, Service, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { ServiceCard } from "../components/ServiceCard";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useAuth } from "../../auth/contexts/AuthContext";
import { toast } from "sonner";
import { ReviewSection } from "@/components/ReviewSection";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useSEO } from "@/hooks/useSEO";
import SchemaMarkup from "@/components/SchemaMarkup";
import { MediaRenderer } from "@/components/MediaRenderer";
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
import { Clock, CheckCircle } from "lucide-react";

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<any | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const { user: authUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Dynamic SEO
  useSEO({
    title: service ? `${service.title} - Siyayya Services` : "Service Detail",
    description: service ? `${service.description.slice(0, 160)}...` : "Book this service on Siyayya campus marketplace.",
    ogImage: service?.images?.[0] || service?.image,
    ogType: "article",
    canonical: window.location.href,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "services", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const servData = { id: docSnap.id, ...docSnap.data() } as any;
          setService(servData);
          
          try {
             const q = query(
               collection(db, "services"), 
               where("category", "==", servData.category), 
               limit(4)
             );
             const snaps = await getDocs(q);
             const rel = snaps.docs
               .map(d => ({id: d.id, ...d.data()} as Service))
               .filter(s => s.id !== id)
               .slice(0, 3);
             setRelatedServices(rel);
          } catch (e) {
             console.error("Error fetching related services", e);
          }
        } else {
          setService(null);
        }
      } catch (error) {
        console.error("Error fetching service:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchService();
  }, [id]);

  useSEO({
    title: service ? service.title : "Service Details",
    description: service ? service.description : "",
    ogType: "profile",
    ogImage: service?.image || undefined,
    canonical: window.location.href,
  });

  const serviceSchema = service ? {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.description,
    "image": service.image,
    "provider": {
      "@type": "Person",
      "name": service.ownerName
    },
    "brand": {
      "@type": "Brand",
      "name": "Siyayya"
    }
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-24 text-center">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">🔧</span>
            </div>
            <h2 className="text-xl font-black text-textPrimary mb-2 uppercase tracking-tighter italic">Service Not Found</h2>
            <p className="text-sm text-textSecondary mb-6 leading-relaxed font-medium">
              This service may have been removed by the provider, or the link you followed is invalid.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/services">
                <Button className="w-full sm:w-auto gap-2">
                  <ArrowLeft className="h-4 w-4" /> Browse Services
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

  const ownerPhone = service.ownerPhone || service.contactPhone || "";

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
          listingId: service.id,
          collection: 'services',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to delete service');
      }

      toast.success(result?.message || "Service deleted successfully");
      navigate("/marketplace?category=services");
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error(error?.message || "Failed to delete service");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleContactWhatsApp = () => {
    if (!isAuthenticated) return navigate("/signin");
    if (authUser?.id === service.ownerId) {
      toast.error("This is your own service!");
      return;
    }
    const phone = service.ownerPhone || service.contactPhone || "";
    if (phone) {
      const cleaned = phone.replace(/\D/g, "");
      const intl = cleaned.startsWith("234") ? cleaned : cleaned.startsWith("0") ? "234" + cleaned.slice(1) : "234" + cleaned;
      const msg = encodeURIComponent(`Hi! I found your service on Siyayya: *${service.title}* (${service.priceLabel || "Starting from"} ₦${service.price?.toLocaleString()}). I'd like to book. Are you available?`);
      window.open(`https://wa.me/${intl}?text=${msg}`, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Contact details not available. Visit the seller's profile for more info.");
    }
  };

  return (
    <>
      {serviceSchema && <SchemaMarkup data={serviceSchema} />}
      <div className="min-h-screen bg-background pb-28 md:pb-0">
        <Navbar />
        <div className="container max-w-3xl py-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {service.image ? (
            <MediaRenderer 
              url={service.image} 
              alt={service.title}
              containerClassName="rounded-2xl shadow-sm mb-6"
              objectFit="contain"
            />
          ) : (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted/40 backdrop-blur-sm shadow-sm mb-6 flex items-center justify-center border-2 border-dashed border-border/50">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">No service image provided</p>
              </div>
            </div>
          )}

          <div className="mt-2 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary opacity-40 mb-1">{service.priceLabel || "Starting from"}</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black text-primary tabular-nums tracking-tighter">{formatPrice(service.price)}</p>
              <span className="text-[10px] font-black text-textPrimary bg-muted border border-black/5 px-3 py-1 rounded-full uppercase tracking-widest">{service.category}</span>
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-black text-textPrimary tracking-tight italic uppercase">{service.title}</h1>
          </div>

          <div className="mt-8 border-t border-black/5 pt-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-4">Service Description</h2>
            <p className="text-sm text-textSecondary font-medium text-pretty leading-relaxed whitespace-pre-wrap italic border-l-2 border-primary/20 pl-4 py-1">{service.description}</p>
          </div>

          {service.properties && Object.keys(service.properties).length > 0 && (
            <div className="mt-8 border-t border-border/50 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Service Specs
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                {CATEGORY_ATTRIBUTES[service.category]?.map(attr => {
                  const val = service.properties?.[attr.id];
                  if (!val) return null;
                  return (
                    <div key={attr.id} className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-textMuted font-black">{attr.label}</p>
                      <p className="text-sm font-black text-textPrimary tracking-tight">{val} {attr.unit}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {service.videoId && (
            <div className="mt-8 border-t border-border/50 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-[#FF0000]" />
                Service Showcase
              </h2>
              <MediaRenderer 
                url={`https://www.youtube.com/watch?v=${service.videoId}`} 
                type="youtube"
                alt={`${service.title} video`}
                containerClassName="rounded-2xl shadow-2xl border border-border/50"
              />
            </div>
          )}

          <SafetyTips />

          <div className="mt-8 border-t border-black/5 pt-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">Service Provider</h2>
            <div className="flex items-center gap-4 group block rounded-[1.5rem] p-5 border border-black/5 bg-surface hover:bg-muted/30 hover:shadow-lg transition-all duration-300">
              <Link to={`/user/${service.ownerId}`} className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                {(service.ownerName || "User").charAt(0)}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/user/${service.ownerId}`} className="flex items-center gap-1">
                  <p className="text-base font-black text-textPrimary group-hover:text-primary transition-colors truncate tracking-tight">{service.ownerName || "User"}</p>
                  {service.ownerIsVerified && <VerifiedBadge />}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-[9px] text-textSecondary font-bold uppercase tracking-widest truncate opacity-60 flex items-center gap-1">
                     <Clock className="h-3 w-3" /> Usually replies in 1h
                  </p>
                  <p className="text-[9px] text-success font-bold uppercase tracking-widest truncate flex items-center gap-1">
                     <CheckCircle className="h-3 w-3" /> 45 Successful Projects
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs bg-warning/10 text-warning px-3 py-1.5 rounded-xl border border-warning/10 font-black">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="font-black tabular-nums">{service.ownerRating || "5.0"}</span>
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
              WhatsApp Provider
            </Button>

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

            {authUser && (authUser.id === service.ownerId) && (
              <Button
                variant="destructive"
                className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-error/20 w-full"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Service
              </Button>
            )}
          </div>

          <ReviewSection listingId={service.id} ownerId={service.ownerId} />

          {relatedServices.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-foreground mb-6">Similar Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {relatedServices.map((s, i) => (
                  <ServiceCard key={s.id} service={s} index={i} />
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
              This will permanently delete "{service.title}" and any associated media. This action cannot be undone.
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
    </>
  );
};

export default ServiceDetail;

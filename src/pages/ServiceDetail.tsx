import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, Flag, Phone, Loader2, Trash2, Settings as SettingsIcon, Image as ImageIcon, Youtube } from "lucide-react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { formatPrice, Service, CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { ReviewSection } from "@/components/ReviewSection";
import { formatPhoneNumberForWhatsApp } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useSEO } from "@/hooks/useSEO";
import SchemaMarkup from "@/components/SchemaMarkup";
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

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<any | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const { isAuthenticated, user: authUser } = useAuth();
  const navigate = useNavigate();

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

  const serviceDescription = service?.description?.slice(0, 160) + (service?.description?.length > 160 ? "..." : "");

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
  const whatsappNumber = service.whatsapp || ownerPhone;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (service.mediaData && Array.isArray(service.mediaData)) {
        await Promise.all(
          service.mediaData.map((m: any) => deleteFromCloudinary(m.publicId, m.resourceType || 'image'))
        );
      } else if (service.public_id) {
        await deleteFromCloudinary(service.public_id, service.resource_type || 'image');
      }

      await deleteDoc(doc(db, "services", service.id));
      toast.success("Service deleted successfully");
      navigate("/marketplace?category=services");
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
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
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary shadow-sm mb-6">
              <img src={service.image} alt={service.title} className="h-full w-full object-contain p-4" />
            </div>
          ) : (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted/40 backdrop-blur-sm shadow-sm mb-6 flex items-center justify-center border-2 border-dashed border-border/50">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">No service image provided</p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mt-2 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary opacity-40 mb-1">{service.priceLabel || "Starting from"}</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black text-primary tabular-nums tracking-tighter">{formatPrice(service.price)}</p>
              <span className="text-[10px] font-black text-textPrimary bg-muted border border-black/5 px-3 py-1 rounded-full uppercase tracking-widest">{service.category}</span>
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-black text-textPrimary tracking-tight italic uppercase">{service.title}</h1>
          </div>

          {/* Description */}
          <div className="mt-8 border-t border-black/5 pt-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-4">Service Description</h2>
            <p className="text-sm text-textSecondary font-medium text-pretty leading-relaxed whitespace-pre-wrap italic border-l-2 border-primary/20 pl-4 py-1">{service.description}</p>
          </div>

          {/* Specifications */}
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

          {/* Video Showcase */}
          {service.videoId && (
            <div className="mt-8 border-t border-border/50 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-[#FF0000]" />
                Service Showcase
              </h2>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${service.videoId}?rel=0`}
                  title={`${service.title} video`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          )}

          {/* Provider */}
          <div className="mt-8 border-t border-black/5 pt-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">Service Provider</h2>
            <Link to={`/user/${service.ownerId}`} className="flex items-center gap-4 group block rounded-[1.5rem] p-5 border border-black/5 bg-surface hover:bg-muted/30 hover:shadow-lg transition-all duration-300">
              <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                {(service.ownerName || "User").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-base font-black text-textPrimary group-hover:text-primary transition-colors truncate tracking-tight">{service.ownerName || "User"}</p>
                  {service.ownerIsVerified && <VerifiedBadge />}
                </div>
                <p className="text-[10px] text-textSecondary font-bold uppercase tracking-widest mt-0.5 truncate opacity-60">{service.ownerDepartment || "Verified Professional"}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs bg-warning/10 text-warning px-3 py-1.5 rounded-xl border border-warning/10 font-black">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="font-black tabular-nums">{service.ownerRating || "5.0"}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Actions */}
          <div className="mt-10 grid grid-cols-2 gap-4 pb-12 border-b border-black/5">
            <Button
              className="h-14 bg-primary hover:bg-primaryDark text-white active:scale-95 transition-all gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 w-full"
              onClick={() => {
                if (ownerPhone) window.open(`tel:${ownerPhone.replace(/[^0-9]/g, '')}`, '_self');
                else toast.error("Phone number not available.");
              }}
            >
              <Phone className="h-5 w-5" />
              Voice Call
            </Button>
            
            {ownerPhone && (
              <Button
                className="h-14 bg-[#25D366] text-white hover:bg-[#1fb355] active:scale-95 transition-all gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-success/20 border-0 w-full"
                onClick={() => {
                  const waNumber = formatPhoneNumberForWhatsApp(whatsappNumber || ownerPhone);
                  const message = encodeURIComponent(`Hi, I’m interested in your service on Siyayya: ${service.title}`);
                  window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
                }}
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </Button>
            )}

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
                className="h-14 col-span-2 sm:col-span-1 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-error/20"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Service
              </Button>
            )}
          </div>

          {reportOpen && (
            <div className="mt-4 rounded-xl border bg-card p-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-sm font-medium text-foreground mb-3">Report this service</p>
              <textarea
                className="w-full rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Tell us why you're reporting this service..."
              />
              <Button size="sm" variant="destructive" className="mt-3">
                Submit Report
              </Button>
            </div>
          )}

          <ReviewSection listingId={service.id} ownerId={service.ownerId} />

          {/* Related Services */}
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

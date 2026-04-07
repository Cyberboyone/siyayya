import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, Flag, Phone, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { formatPrice, Service } from "@/lib/mock-data";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ReviewSection } from "@/components/ReviewSection";
import { formatDate, formatPhoneNumberForWhatsApp } from "@/lib/utils";
import { CATEGORY_ATTRIBUTES } from "@/lib/mock-data";
import { Youtube, Settings as SettingsIcon, Image as ImageIcon } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  console.log("ServiceDetail rendered with ID:", id);
  const [service, setService] = useState<any | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const { isAuthenticated, user: authUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;
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
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Service not found.</p>
          <Link to="/services" className="text-primary text-sm mt-2 inline-block hover:underline">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const ownerPhone = service.ownerPhone || service.contactPhone || "";
  const whatsappNumber = service.whatsapp || ownerPhone;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await deleteDoc(doc(db, "services", service.id));
      toast.success("Service deleted successfully");
      navigate("/marketplace?category=services");
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-3xl py-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {service.image ? (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary shadow-sm mb-6">
            <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
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
        <div className="mt-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{service.priceLabel || "Starting from"}</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{formatPrice(service.price)}</p>
              <h1 className="mt-2 text-xl font-semibold text-foreground">{service.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>Posted: {formatDate(service.createdAt)}</span>
            <span className="capitalize">{service.category}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 border-t pt-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Service Description</h2>
          <p className="text-sm text-muted-foreground text-pretty leading-relaxed whitespace-pre-wrap">{service.description}</p>
        </div>

        {/* Specifications / Properties */}
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
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{attr.label}</p>
                    <p className="text-sm font-bold text-foreground">{val} {attr.unit}</p>
                  </div>
                );
              })}
              {/* Fallback for properties not in CATEGORY_ATTRIBUTES */}
              {Object.entries(service.properties).map(([key, val]) => {
                if (CATEGORY_ATTRIBUTES[service.category]?.find(a => a.id === key)) return null;
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
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0"
                loading="lazy"
              ></iframe>
            </div>
          </div>
        )}


        {/* Provider */}
        <div className="mt-6 border-t pt-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Service Provider</h2>
          <Link to={`/user/${service.ownerId}`} className="flex items-center gap-3 group hover:bg-secondary/40 p-2 -mx-2 rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg group-hover:bg-primary/20 transition-colors">
              {(service.ownerName || "User").charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground">{service.ownerName || "User"}</p>
                {service.ownerIsVerified && <VerifiedBadge />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.ownerDepartment || "Kashere Student"}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{service.ownerRating || "5.0"}</span>
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
                const message = encodeURIComponent(`Hi, I’m interested in your service on Siyayya: ${service.title}`);
                window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
              }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              WhatsApp
            </Button>
          )}

          <Button
            variant="outline"
            className="col-span-1 h-12 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => {
              if (!isAuthenticated) return navigate("/signin");
              setReportOpen(!reportOpen);
            }}
          >
            <Flag className="h-4 w-4" />
          </Button>

          {authUser && (authUser.id === service.ownerId || authUser.id === service.ownerId) && (
            <Button
              variant="destructive"
              className="h-12 col-span-2 sm:col-span-1"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
  );
};

export default ServiceDetail;

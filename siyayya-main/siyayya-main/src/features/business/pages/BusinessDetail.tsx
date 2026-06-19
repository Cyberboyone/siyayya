import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { getBreadcrumbSchema, getLocalBusinessSchema } from "@/components/SEOStructuredData";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Loader2, Star, ShoppingBag, Wrench, Phone, MessageSquare, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BusinessDetail() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");

  // 1. Fetch Merchant Details
  useEffect(() => {
    const fetchMerchantAndListings = async () => {
      if (!businessSlug) return;
      setIsLoading(true);

      try {
        let merchantData: any = null;

        // Try direct ID lookup first (for backward compatibility)
        try {
          const docRef = doc(db, "users", businessSlug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            merchantData = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          // Ignore
        }

        // Try querying by businessSlug if not matched by ID
        if (!merchantData) {
          const q = query(
            collection(db, "users"),
            where("businessSlug", "==", businessSlug),
            limit(1)
          );
          const snaps = await getDocs(q);
          if (!snaps.empty) {
            const docSnap = snaps.docs[0];
            merchantData = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (merchantData) {
          setMerchant(merchantData);

          // Fetch products
          const productsQuery = query(
            collection(db, "products"),
            where("ownerId", "==", merchantData.id),
            where("isSold", "==", false),
            limit(20)
          );
          const productsSnap = await getDocs(productsQuery);
          setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch services
          const servicesQuery = query(
            collection(db, "services"),
            where("ownerId", "==", merchantData.id),
            limit(20)
          );
          const servicesSnap = await getDocs(servicesQuery);
          setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setMerchant(null);
        }
      } catch (error) {
        console.error("Error loading merchant:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantAndListings();
  }, [businessSlug]);

  // Breadcrumbs schema
  const breadcrumbs = useMemo(() => {
    if (!merchant) return [];
    return [
      { name: "Home", item: "/" },
      { name: "Merchants", item: "/marketplace" },
      { name: merchant.businessName || merchant.name, item: `/business/${merchant.businessSlug || merchant.id}` }
    ];
  }, [merchant]);

  // LocalBusiness schema
  const localBusinessSchema = useMemo(() => {
    if (!merchant) return null;
    return getLocalBusinessSchema({
      name: merchant.businessName || merchant.name,
      description: merchant.businessDescription || `Student business offering items and services at ${merchant.campusName || 'Nigeria'}.`,
      image: merchant.photoUrl || "",
      phone: merchant.phoneNumber || merchant.contactPhone || "",
      address: merchant.location || merchant.campusName || "Nigeria",
      priceRange: "$$"
    });
  }, [merchant]);

  // SEO Config
  useSEO({
    title: merchant ? `${merchant.businessName || merchant.name} at ${merchant.campusName || 'Campus'} | Siyayya` : "Merchant Store",
    description: merchant ? `${merchant.businessDescription || 'Check out student products and services.'} Contact verified student business on Siyayya.` : "View student merchant profile and listings.",
    ogType: "profile",
    ogImage: merchant?.photoUrl || undefined,
    canonical: window.location.href,
    structuredData: localBusinessSchema ? [localBusinessSchema, getBreadcrumbSchema(breadcrumbs)] : undefined
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center px-6 py-20">
          <ShoppingBag className="h-16 w-16 text-primary/40 mb-4 stroke-[1.5px]" />
          <h2 className="text-2xl font-black text-textPrimary uppercase tracking-tighter italic">Merchant Not Found</h2>
          <p className="text-textSecondary text-sm mt-2 leading-relaxed">
            The student business you are looking for does not exist or may have been deactivated.
          </p>
          <Button onClick={() => navigate("/marketplace")} className="mt-6 rounded-2xl h-12">
            Browse Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const phone = merchant.phoneNumber || merchant.contactPhone || "";

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-24">
      <Navbar />

      {/* Cinematic Banner */}
      <div className="relative pt-28 pb-16 overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="px-6 max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-white dark:border-black">
              {merchant.photoUrl ? (
                <img src={merchant.photoUrl} alt="" className="h-full w-full object-cover rounded-[2rem]" />
              ) : (
                (merchant.businessName || merchant.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl md:text-5xl font-black text-textPrimary uppercase tracking-tight italic leading-none">
                  {merchant.businessName || merchant.name}
                </h1>
                {merchant.isVerified && <VerifiedBadge />}
              </div>

              <p className="text-xs text-textSecondary font-semibold max-w-xl">
                {merchant.businessDescription || "Student merchant offering premium products and services on campus."}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-textSecondary font-bold pt-1">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {merchant.campusName || "Nigeria"}</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> {merchant.rating || "5.0"} Rating</span>
              </div>
            </div>


          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto mt-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-black/5 pb-4">
          <button 
            onClick={() => setActiveTab("products")}
            className={`text-xs font-black uppercase tracking-widest pb-2 transition-colors relative ${
              activeTab === "products" ? "text-primary" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            Products ({products.length})
            {activeTab === "products" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab("services")}
            className={`text-xs font-black uppercase tracking-widest pb-2 transition-colors relative ${
              activeTab === "services" ? "text-primary" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            Services ({services.length})
            {activeTab === "services" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>

        {/* Content listings */}
        <div className="mt-8">
          {activeTab === "products" ? (
            products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-surface border border-black/5 rounded-[2rem]">
                <ShoppingBag className="h-10 w-10 text-textSecondary/35 mx-auto mb-3" />
                <p className="text-xs text-textSecondary font-bold">No active products for sale currently.</p>
              </div>
            )
          ) : (
            services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="bg-surface border border-black/5 rounded-[2.5rem] p-6 space-y-4 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-textPrimary text-base tracking-tight leading-tight uppercase italic">{s.title}</h3>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-xl">{s.category}</span>
                    </div>
                    <p className="text-xs text-textSecondary font-medium leading-relaxed">{s.description}</p>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-black text-sm text-primary">{s.price ? `₦${s.price.toLocaleString()}` : "Contact for price"}</span>
                      <Button onClick={() => navigate(`/service/${s.slug || s.id}`)} size="sm" className="rounded-xl text-[9px] font-black uppercase tracking-widest h-9 px-4">
                        Details <ExternalLink className="h-3 w-3 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-surface border border-black/5 rounded-[2rem]">
                <Wrench className="h-10 w-10 text-textSecondary/35 mx-auto mb-3" />
                <p className="text-xs text-textSecondary font-bold">No active services offered currently.</p>
              </div>
            )
          )}
        </div>

        {/* Safety Guidelines Widget */}
        <div className="mt-16 bg-surface border border-black/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6">
          <ShieldCheck className="h-14 w-14 text-success stroke-[1.5px]" />
          <div className="flex-1 space-y-1.5 text-center md:text-left">
            <h3 className="text-sm font-black text-textPrimary uppercase tracking-wider">Secure Campus Commerce Guidelines</h3>
            <p className="text-xs text-textSecondary font-medium leading-relaxed max-w-3xl">
              Meet in open public areas on campus such as lecture theaters, hostels, or security posts when completing transactions. Verify the condition of products or delivery of services before paying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

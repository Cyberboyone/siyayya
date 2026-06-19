import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { getBreadcrumbSchema, getFAQSchema } from "@/components/SEOStructuredData";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Loader2, ShoppingBag, MessageSquare, Building2, MapPin, GraduationCap, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CAMPUSES } from "@/lib/campus";

export default function CampusDetail() {
  const { campusSlug } = useParams<{ campusSlug: string }>();
  const navigate = useNavigate();
  const [campus, setCampus] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Resolve Campus details
  useEffect(() => {
    const resolveCampus = async () => {
      setIsLoading(true);
      if (!campusSlug) return;

      // Match in static list first
      const matched = CAMPUSES.find(
        (u) => u.slug.toLowerCase() === campusSlug.toLowerCase() || u.id.toLowerCase() === campusSlug.toLowerCase()
      );
      
      if (matched) {
        setCampus(matched);
        
        // Fetch campus-scoped items
        try {
          const productsQuery = query(
            collection(db, "products"),
            where("campusId", "==", matched.id),
            where("isSold", "==", false),
            limit(8)
          );
          const productsSnap = await getDocs(productsQuery);
          setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          const businessesQuery = query(
            collection(db, "users"),
            where("campusId", "==", matched.id),
            limit(4)
          );
          const businessesSnap = await getDocs(businessesQuery);
          setBusinesses(businessesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.businessName));

        } catch (error) {
          console.error("Error loading campus listings:", error);
        }
      } else {
        setCampus(null);
      }
      setIsLoading(false);
    };

    resolveCampus();
  }, [campusSlug]);

  // Breadcrumbs schema
  const breadcrumbs = useMemo(() => {
    if (!campus) return [];
    return [
      { name: "Home", item: "/" },
      { name: "Campuses", item: "/marketplace" },
      { name: campus.name, item: `/campus/${campus.slug}` }
    ];
  }, [campus]);

  // FAQs about the campus
  const campusFAQs = useMemo(() => {
    if (!campus) return [];
    return [
      {
        question: `How does Siyayya campus marketplace work for students of ${campus.name}?`,
        answer: `Siyayya allows students at ${campus.name} to buy and sell laptops, phones, textbooks, hostel items, and services securely inside the campus. You can search verified student listings and contact sellers directly.`
      },
      {
        question: `Can I find off-campus hostel accommodation in ${campus.name} on Siyayya?`,
        answer: `Yes, you can browse off-campus hostel apartments and hostel shared accommodation listed by students of ${campus.name} on Siyayya.`
      }
    ];
  }, [campus]);

  // SEO config
  useSEO({
    title: campus ? `${campus.name} Marketplace | Siyayya` : "Campus Hub",
    description: campus ? `Buy and sell laptops, textbooks, hostels, and discover student businesses at ${campus.name} (${campus.state} State).` : "Find campus marketplaces and student communities.",
    ogType: "website",
    canonical: window.location.href,
    structuredData: campus ? [getFAQSchema(campusFAQs), getBreadcrumbSchema(breadcrumbs)] : undefined
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

  if (!campus) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center px-6 py-20">
          <GraduationCap className="h-16 w-16 text-primary/40 mb-4 stroke-[1.5px]" />
          <h2 className="text-2xl font-black text-textPrimary uppercase tracking-tighter italic">Campus Not Found</h2>
          <p className="text-textSecondary text-sm mt-2 leading-relaxed">
            We couldn't find a campus matching the slug "{campusSlug}". Please select from our list of active Nigerian universities.
          </p>
          <Button onClick={() => navigate("/")} className="mt-6 rounded-2xl h-12">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Related campuses in the same state/nearby
  const relatedCampuses = CAMPUSES.filter(
    u => u.state === campus.state && u.id !== campus.id
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-24">
      <Navbar />

      {/* Cinematic Hero Area */}
      <div className="relative pt-24 md:pt-16 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="px-6 max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-2 text-[10px] font-black text-textPrimary uppercase tracking-[0.2em] w-fit shadow-sm border border-black/5">
              <GraduationCap className="h-3.5 w-3.5" />
              {campus.type} University Hub
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-textPrimary tracking-tight uppercase leading-none italic max-w-4xl">
              {campus.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-textSecondary font-bold mt-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{campus.state} State, Nigeria</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Marketplace Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h2 className="text-lg font-black text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Featured Listings
              </h2>
              <Link to={`/marketplace?campus=${campus.id}`} className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-0.5">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-black/5 rounded-3xl p-10 text-center">
                <ShoppingBag className="h-12 w-12 text-textSecondary/20 mx-auto mb-3" />
                <p className="text-xs text-textSecondary font-bold">No active marketplace listings at the moment.</p>
                <Button onClick={() => navigate("/dashboard/new")} className="mt-4 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 h-10">
                  Post a Listing
                </Button>
              </div>
            )}
          </div>

          {/* Frequently Asked Questions */}
          <div className="space-y-6 bg-surface border border-black/5 rounded-[2rem] p-6 sm:p-8">
            <h2 className="text-base font-black text-textPrimary uppercase tracking-wider flex items-center gap-2 border-b border-black/5 pb-3">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {campusFAQs.map((faq, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h3 className="text-sm font-black text-textPrimary tracking-tight">{faq.question}</h3>
                  <p className="text-xs text-textSecondary font-medium leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Linking Widgets */}
        <div className="space-y-8">
          {/* Quick Hostel Links */}
          <div className="bg-surface border border-black/5 rounded-[2rem] p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-textPrimary border-b border-black/5 pb-3 flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-primary" />
              Accommodation Search
            </h3>
            <p className="text-xs text-textSecondary font-medium leading-relaxed">
              Find safe hostels, bed spaces, and flatmates off-campus in the {campus.name} area.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button onClick={() => navigate(`/hostels/${campus.id}/female`)} className="w-full justify-start rounded-xl h-11 bg-[#FF69B4]/10 hover:bg-[#FF69B4]/20 border-0 text-[#FF69B4] text-[10px] font-black uppercase tracking-widest">
                🙋‍♀️ Female Hostels
              </Button>
              <Button onClick={() => navigate(`/hostels/${campus.id}/male`)} className="w-full justify-start rounded-xl h-11 bg-primary/10 hover:bg-primary/20 border-0 text-primary text-[10px] font-black uppercase tracking-widest">
                🙋‍♂️ Male Hostels
              </Button>
            </div>
          </div>

          {/* Top Student Businesses */}
          <div className="bg-surface border border-black/5 rounded-[2rem] p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-textPrimary border-b border-black/5 pb-3">
              Student Merchants
            </h3>
            {businesses.length > 0 ? (
              <div className="space-y-3">
                {businesses.map((biz) => (
                  <Link key={biz.id} to={`/business/${biz.businessSlug || biz.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                      {biz.businessName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-textPrimary truncate">{biz.businessName}</p>
                      <p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Verified Seller</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-textMuted italic">No student merchants registered in this campus yet.</p>
            )}
          </div>

          {/* Related Campuses */}
          {relatedCampuses.length > 0 && (
            <div className="bg-surface border border-black/5 rounded-[2rem] p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-textPrimary border-b border-black/5 pb-3">
                Nearby Hubs ({campus.state})
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {relatedCampuses.map((rel) => (
                  <Link key={rel.id} to={`/campus/${rel.slug}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 transition-colors text-xs font-bold text-textSecondary hover:text-primary">
                    <span className="truncate">{rel.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-textMuted" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

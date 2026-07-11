import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { getBreadcrumbSchema, getFAQSchema } from "@/components/SEOStructuredData";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { Loader2, Building2, MapPin, SearchX, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CAMPUSES } from "@/lib/campus";

export default function HostelDetail() {
  const { campus, hostelType } = useParams<{ campus: string; hostelType?: string }>();
  const navigate = useNavigate();
  const [university, setUniversity] = useState<any | null>(null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Resolve university
  useEffect(() => {
    const fetchHostels = async () => {
      setIsLoading(true);
      if (!campus) return;

      const matched = CAMPUSES.find(
        u => u.id.toLowerCase() === campus.toLowerCase()
      );

      if (matched) {
        setUniversity(matched);

        try {
          const q = query(
            collection(db, "products"),
            where("campusId", "==", matched.id),
            where("category", "==", "hostel"),
            where("isSold", "==", false),
            limit(40)
          );
          const snap = await getDocs(q);
          let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Apply client-side filtering for Male/Female if requested
          if (hostelType) {
            const filterType = hostelType.toLowerCase();
            docs = docs.filter(item => {
              const title = item.title?.toLowerCase() || "";
              const desc = item.description?.toLowerCase() || "";
              const genderTag = item.properties?.gender?.toLowerCase() || "";
              
              if (filterType === "female") {
                return title.includes("female") || title.includes("girl") || desc.includes("female") || genderTag === "female";
              } else if (filterType === "male") {
                return title.includes("male") || title.includes("boy") || desc.includes("male") || genderTag === "male";
              }
              return true;
            });
          }
          setHostels(docs);
        } catch (error) {
          console.error("Error fetching hostels:", error);
        }
      } else {
        setUniversity(null);
      }
      setIsLoading(false);
    };

    fetchHostels();
  }, [campus, hostelType]);

  // Breadcrumbs schema
  const breadcrumbs = useMemo(() => {
    if (!university) return [];
    const items = [
      { name: "Home", item: "/" },
      { name: "Hostels", item: "/marketplace" },
      { name: university.name, item: `/hostels/${university.id}` }
    ];
    if (hostelType) {
      items.push({ name: `${hostelType} Hostels`, item: `/hostels/${university.id}/${hostelType}` });
    }
    return items;
  }, [university, hostelType]);

  // FAQs about Hostels
  const faqList = useMemo(() => {
    if (!university) return [];
    return [
      {
        question: `What types of hostel accommodation are available for students at ${university.name}?`,
        answer: `Students can find single self-contained apartments, shared rooms, bed spaces, and off-campus student hostel blocks listed by fellow students and agents.`
      },
      {
        question: `How can I secure a hostel space at ${university.name} safely?`,
        answer: `We recommend inspect the hostel physically, verify the landlord or primary tenant is a registered student of ${university.name}, and avoid paying money in advance without a written agreement.`
      }
    ];
  }, [university]);

  // SEO Config
  useSEO({
    title: university ? `${hostelType ? hostelType.toUpperCase() + ' ' : ''}Hostels at ${university.name} | Siyayya` : "Hostels Hub",
    description: university ? `Browse safe, verified off-campus student hostels, bed spaces, and flatmate sharing deals for ${university.name} students (${university.state} State).` : "Find off-campus student hostels.",
    ogType: "website",
    canonical: window.location.href,
    structuredData: university ? [getFAQSchema(faqList), getBreadcrumbSchema(breadcrumbs)] : undefined
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

  if (!university) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center px-6 py-20">
          <Building2 className="h-16 w-16 text-primary/40 mb-4 stroke-[1.5px]" />
          <h2 className="text-2xl font-black text-textPrimary uppercase tracking-tighter italic">University Not Found</h2>
          <p className="text-textSecondary text-sm mt-2 leading-relaxed">
            We couldn't resolve the university to load hostel accommodations for.
          </p>
          <Button onClick={() => navigate("/marketplace")} className="mt-6 rounded-2xl h-12">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-24">
      <Navbar />

      {/* Cinematic Header */}
      <div className="relative pt-28 pb-16 overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="px-6 max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-2 text-[10px] font-black text-textPrimary uppercase tracking-[0.2em] w-fit border border-black/5">
              <Building2 className="h-3.5 w-3.5" />
              Student Accommodation Directory
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-textPrimary tracking-tight uppercase leading-none italic max-w-4xl">
              {hostelType ? `${hostelType} Hostels` : "Off-Campus Hostels"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-textSecondary font-bold mt-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{university.name} • {university.state} State</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto mt-8">
        {/* Female/Male Quick Filter Tabs */}
        <div className="flex gap-4 border-b border-black/5 pb-4">
          <Link 
            to={`/hostels/${university.id}`}
            className={`text-xs font-black uppercase tracking-widest pb-2 transition-colors relative ${
              !hostelType ? "text-primary" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            All Accommodations
            {!hostelType && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </Link>
          <Link 
            to={`/hostels/${university.id}/female`}
            className={`text-xs font-black uppercase tracking-widest pb-2 transition-colors relative ${
              hostelType === "female" ? "text-primary" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            Female Hostels
            {hostelType === "female" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </Link>
          <Link 
            to={`/hostels/${university.id}/male`}
            className={`text-xs font-black uppercase tracking-widest pb-2 transition-colors relative ${
              hostelType === "male" ? "text-primary" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            Male Hostels
            {hostelType === "male" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </Link>
        </div>

        {/* Listings Grid */}
        <div className="mt-8">
          {hostels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {hostels.map((hostel, i) => (
                <ProductCard key={hostel.id} product={hostel} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-surface border border-black/5 rounded-[2.5rem] max-w-xl mx-auto">
              <SearchX className="h-12 w-12 text-textSecondary/35 mx-auto mb-3" />
              <p className="text-xs text-textSecondary font-bold">No hostels matching your criteria found.</p>
              <Button onClick={() => navigate("/dashboard/new")} className="mt-4 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 h-11">
                Post Hostel Space
              </Button>
            </div>
          )}
        </div>

        {/* FAQs */}
        {faqList.length > 0 && (
          <div className="mt-16 bg-surface border border-black/5 rounded-[2.5rem] p-8 max-w-4xl">
            <h3 className="text-sm font-black text-textPrimary uppercase tracking-wider mb-6 flex items-center gap-2">
              🙋‍♀️ Student Accommodation FAQ
            </h3>
            <div className="space-y-6">
              {faqList.map((faq, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="text-xs font-black text-textPrimary tracking-tight">{faq.question}</h4>
                  <p className="text-xs text-textSecondary font-medium leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

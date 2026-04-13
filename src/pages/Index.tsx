import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Sparkles, Clock, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { ServiceCard } from "@/components/ServiceCard";
import { FloatingActions } from "@/components/FloatingActions";
import { categories, Product, Service, ProductRequest, formatPrice } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useSavedItems } from "@/hooks/use-saved-items";
import { getNumericDate } from "@/lib/utils";
import { useProducts, useServices, useRequests } from "@/hooks/use-queries";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useSEO } from "@/hooks/useSEO";

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const { viewedIds } = useRecentlyViewed();
  const { isSaved, toggle } = useSavedItems();
  
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();
  const { data: requests = [] } = useRequests();

  useSEO({
    title: "Siyayya - Buy & Sell Easily in Nigeria",
    description: "Federal University of Kashere's Premium Campus Marketplace. Buy and sell items, books, and hostel essentials easily within the FUK community.",
    canonical: "https://siyayya.com/",
  });

  const featured = useMemo(() => {
    return [...products]
      .filter((p) => p.isFeatured && !p.isSold)
      .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt))
      .slice(0, 8);
  }, [products]);

  const recent = useMemo(() => {
    return [...products]
      .filter((p) => !p.isSold)
      .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt))
      .slice(0, 6);
  }, [products]);

  const servicesPreview = useMemo(() => {
    return [...services]
      .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt))
      .slice(0, 6);
  }, [services]);

  const requestsPreview = useMemo(() => {
    return [...requests]
      .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt))
      .slice(0, 3);
  }, [requests]);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (viewedIds.length === 0) {
         setRecentlyViewed([]);
         return;
      }
      try {
        const viewedPromises = viewedIds.slice(0, 4).map(async (id) => {
          try {
            const productDoc = await getDoc(doc(db, "products", id));
            return productDoc.exists() ? { id: productDoc.id, ...productDoc.data() } as Product : null;
          } catch (e) { return null; }
        });
        const viewedResults = await Promise.all(viewedPromises);
        setRecentlyViewed(viewedResults.filter(Boolean) as Product[]);
      } catch (error) {
        console.error("General error fetching home data:", error);
      }
    };
    fetchRecentlyViewed();
  }, [viewedIds]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <FloatingActions />

      {/* Hero area */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-20 border-b border-black/5 bg-surface">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-[#1F6FEB]/20 bg-[#1F6FEB]/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#1F6FEB] mb-8 animate-fade-up">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#1F6FEB] mr-2 neon-glow" />
            Premium Campus Marketplace
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-textPrimary text-balance leading-[0.95] animate-fade-up stagger-1">
            Trade with <span className="text-primary">Style.</span> <br />
            Trade in <span className="text-success">Kashere.</span>
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-textSecondary max-w-xl font-medium text-pretty animate-fade-up stagger-2">
            The most vibrant, secure, and modern marketplace for Federal University of Kashere students.
          </p>
          
          <div className="mt-10 w-full max-w-2xl animate-fade-up stagger-3">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              placeholder="Looking for a laptop, room, or service?" 
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container -mt-10 relative z-20">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${cat.id}`}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-surface py-6 px-4 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border border-black/5 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-3xl shadow-inner group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                {cat.icon}
              </div>
              <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest group-hover:text-primary transition-colors">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>


      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="container pt-16 animate-fade-up stagger-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/10 shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-textPrimary tracking-tighter">Your recent history</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyViewed.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} isSaved={isSaved(product.id)} onToggleSave={toggle} />
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="container pt-16 animate-fade-up stagger-2">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-warning/10 text-warning border border-warning/10 shadow-sm">
               <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-textPrimary tracking-tighter">Premium Selection</h2>
          </div>
          <Link to="/marketplace" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:gap-3 transition-all hover:bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
            Explore All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} isSaved={isSaved(product.id)} onToggleSave={toggle} />
          ))}
        </div>
      </section>

      {/* Recently Added */}
      <section className="container pt-16 pb-4 animate-fade-up stagger-3">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/10 shadow-sm">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-textPrimary tracking-tighter">New Arrivals</h2>
          </div>
          <Link to="/marketplace" className="text-xs font-black uppercase tracking-widest text-textSecondary flex items-center gap-2 hover:text-primary transition-colors">
            View Newest <ArrowRight className="h-4 w-4 text-primary" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recent.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} isSaved={isSaved(product.id)} onToggleSave={toggle} />
          ))}
        </div>
      </section>

      {/* Services Preview */}
      <section className="container pt-16 pb-8 animate-fade-up">
        <div className="flex items-center justify-between mb-8 border-b border-black/5 pb-4">
          <h2 className="text-2xl font-black text-textPrimary tracking-tighter">Campus Experts</h2>
          <Link to="/services" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:underline">
            See all services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {servicesPreview.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      </section>

      {/* Requests Preview container redesign */}
      {requestsPreview.length > 0 && (
        <section className="container pt-8 pb-20 animate-fade-up">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-white via-[#F7F8FA] to-white p-8 md:p-12 border border-white/80 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-[#1F6FEB]/10 opacity-50 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
               <FileText className="h-32 w-32" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black text-textPrimary tracking-tight leading-none italic">Community Pulse</h2>
                <p className="text-sm font-bold text-textSecondary">What students are hunting for</p>
              </div>
              <Link to="/requests" className="btn-premium px-6 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-200">
                View All Requests
              </Link>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {requestsPreview.map((req, i) => (
                <Link key={req.id} to="/requests" className="group rounded-[2rem] bg-surface p-6 border border-black/5 hover:border-primary/20 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full" style={{ animationDelay: `${i * 100}ms` }}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-[9px] font-black text-primary/70 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> {req.category}
                      </div>
                      <p className="text-base font-black text-textPrimary tabular-nums tracking-tight">{formatPrice(req.budget)}</p>
                   </div>
                   <h3 className="font-black text-textPrimary text-sm leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">{req.title}</h3>
                   <p className="text-xs text-textSecondary line-clamp-2 leading-relaxed font-medium mb-4">{req.description}</p>
                   
                   <div className="mt-auto border-t border-black/5 pt-4 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-black">{req.ownerName?.charAt(0) || "U"}</div>
                      <span className="text-[10px] font-bold text-muted-foreground/60 truncate">{req.ownerName || "User"}</span>
                      {(req as any).ownerIsVerified && <VerifiedBadge />}
                   </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEO Content Section */}
      <section className="container pt-12 pb-20 border-t border-black/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-textPrimary tracking-tighter mb-6 italic">The Best Online Marketplace for Federal University of Kashere (FUK)</h2>
          <div className="prose prose-sm md:prose-base text-textSecondary font-medium leading-relaxed space-y-4">
            <p>
              Welcome to <strong>Siyayya.com</strong>, the most vibrant and modern <strong>online marketplace in Nigeria</strong> specifically designed for the Federal University of Kashere community. Whether you are looking to <strong>buy and sell in Nigeria</strong> or searching for specialized campus services, our platform provides a secure and stylish environment for all your trading needs.
            </p>
            <p>
              Our mission is to empower student entrepreneurs and service providers in Kashere. From high-quality electronics and fashion to academic materials and professional campus services, Siyayya connects buyers and sellers within the campus ecosystem, making it the go-to <strong>campus marketplace</strong> in Gombe State.
            </p>
            <p>
              Why choose Siyayya? We prioritize the safety of our users with verified badges for trusted sellers and a dedicated review system. Explore our <Link to="/marketplace" className="text-primary font-bold hover:underline">Marketplace</Link> today to find amazing deals on laptops, smartphones, hostel essentials, and more. If you're a skilled student, don't forget to list your <Link to="/services" className="text-primary font-bold hover:underline">Services</Link> to reach potential clients across the university.
            </p>
            <p>
              Join the hundreds of FUK students who already trade with style. Siyayya is not just a marketplace; it's a community built on trust, excellence, and the spirit of entrepreneurship at the Federal University of Kashere.
            </p>
          </div>
        </div>
      </section>

    </div>

  );
};

export default Index;

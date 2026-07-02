import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { SlidersHorizontal, X, Loader2, SearchX, Plus, FileText, Flame, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { CategoryPills } from "@/components/CategoryPills";
import { ProductCard } from "../components/ProductCard";
import { ServiceCard } from "@/features/services/components/ServiceCard";
import { fuzzyMatch } from "@/lib/search-utils";
import { useSavedItems } from "@/hooks/use-saved-items";
import { Button } from "@/components/ui/button";
import { useProducts, useServices } from "@/hooks/use-queries";
import { getNumericDate } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";
import { categories } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCardSkeleton } from "../components/ProductCardSkeleton";
import { ServiceCardSkeleton } from "@/features/services/components/ServiceCardSkeleton";
import { useSearchIndex } from "@/hooks/use-search-index";
import { getWebsiteSchema, getBreadcrumbSchema } from "@/components/SEOStructuredData";

const Marketplace = () => {
  const navigate = useNavigate();
  const { category: routeCategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const category = routeCategory || "all";
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const initialSort = (searchParams.get("sort") as "newest" | "price-low" | "price-high" | "trending") || "newest";
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high" | "trending">(initialSort);
  const freshFilter = searchParams.get("fresh") === "today";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [condition, setCondition] = useState<"all" | "New" | "Used">("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState(0);
  
  const { isSaved, toggle } = useSavedItems();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const isLoading = isLoadingProducts || isLoadingServices;

  const { searchIndex } = useSearchIndex(products, services);

  const searchResults = useMemo(() => {
    if (!search) return null;
    return new Set(searchIndex(search) || []);
  }, [search, searchIndex]);

  const currentCategoryLabel = useMemo(() => {
    if (category === "all") return "";
    if (category === "services") return "Services";
    return categories.find(c => c.id === category)?.label || "";
  }, [category]);

  const breadcrumbs = useMemo(() => {
    const items = [
      { name: "Home", item: "/" },
      { name: "Marketplace", item: "/marketplace" }
    ];
    if (category !== "all") {
      items.push({ name: currentCategoryLabel || category, item: `/marketplace/${category}` });
    }
    return items;
  }, [category, currentCategoryLabel]);

  useSEO({
    title: currentCategoryLabel ? `${currentCategoryLabel} for Sale in Nigeria` : "Browse Products & Services",
    description: currentCategoryLabel 
      ? `Find the best deals on ${currentCategoryLabel} on your campus. Browse verified listings on Siyayya.` 
      : "Explore our wide range of products and campus services at your university.",
    structuredData: [
      getWebsiteSchema(),
      getBreadcrumbSchema(breadcrumbs)
    ]
  });

  const hasActiveFilters = condition !== "all" || priceMin || priceMax || minRating > 0;

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (freshFilter) params.fresh = "today";
    if (sort !== "newest") params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [search, sort, freshFilter, setSearchParams]);

  const handleSelectCategory = (newCat: string) => {
    const searchPart = search ? `?search=${encodeURIComponent(search)}` : "";
    if (newCat === "all") {
      navigate(`/marketplace${searchPart}`);
    } else {
      navigate(`/marketplace/${newCat}${searchPart}`);
    }
  };

  const filteredProducts = useMemo(() => {
    let items = [...products].filter(p => !p.isSold);
    if (category === "services") return [];
    if (category !== "all") items = items.filter((p) => p.category === category);
    if (condition !== "all") items = items.filter((p) => p.condition === condition);
    if (priceMin) items = items.filter((p) => p.price >= Number(priceMin));
    if (priceMax) items = items.filter((p) => p.price <= Number(priceMax));
    if (minRating > 0) items = items.filter((p) => (p.ownerRating || 5) >= minRating);
    if (freshFilter) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      items = items.filter((p) => getNumericDate((p as any).boostedAt || p.createdAt) >= oneDayAgo);
    }
    
    if (searchResults) {
      items = items.filter((p) => searchResults.has(p.id));
    }

    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    else if (sort === "trending") items.sort((a, b) => ((b.views || 0) + ((b as any).isFeatured ? 100 : 0)) - ((a.views || 0) + ((a as any).isFeatured ? 100 : 0)));
    else items.sort((a, b) => getNumericDate((b as any).boostedAt || b.createdAt) - getNumericDate((a as any).boostedAt || a.createdAt));
    return items;
  }, [products, category, condition, priceMin, priceMax, minRating, searchResults, sort, freshFilter]);

  const filteredServices = useMemo(() => {
    let items = [...services];
    if (category !== "all" && category !== "services" && !search) return [];
    
    if (searchResults) {
      items = items.filter((s) => searchResults.has(s.id));
    }

    if (minRating > 0) items = items.filter((s) => (s.ownerRating || 5) >= minRating);
    if (freshFilter) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      items = items.filter((s) => getNumericDate((s as any).boostedAt || s.createdAt) >= oneDayAgo);
    }
    items.sort((a, b) => getNumericDate((b as any).boostedAt || b.createdAt) - getNumericDate((a as any).boostedAt || a.createdAt));
    return items;
  }, [services, category, searchResults, minRating, search, freshFilter]);

  const combinedResults = useMemo(() => {
    if (!search && category === "all" && !freshFilter && sort !== "trending") return [];
    return [
      ...filteredProducts.map(p => ({ ...p, type: 'product' })),
      ...filteredServices.map(s => ({ ...s, type: 'service' }))
    ].sort((a, b) => getNumericDate((b as any).boostedAt || b.createdAt) - getNumericDate((a as any).boostedAt || a.createdAt));
  }, [filteredProducts, filteredServices, search, category, freshFilter, sort]);

  const clearFilters = () => {
    setCondition("all");
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
    setSearch("");
    navigate("/marketplace");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-32 md:pb-0">
      <Navbar />
      
      {/* Cinematic Header Area */}
      <div className="relative pt-6 md:pt-8 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="px-6 max-w-7xl mx-auto relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-2 text-[10px] font-black text-textPrimary uppercase tracking-[0.2em] w-fit shadow-sm border border-black/5">
              Campus Marketplace
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-textPrimary tracking-tight italic uppercase leading-[0.9] pr-4">
              Explore <br />
              <span className="text-primary">Offerings</span>
            </h1>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 w-full lg:max-w-xl">
               <SearchBar 
                value={search} 
                onChange={setSearch} 
                className="bg-white dark:bg-surface shadow-sm border border-black/5 rounded-[2rem] overflow-hidden"
                placeholder="What are you looking for today?" 
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
               <Button
                variant={hasActiveFilters ? "default" : "outline"}
                className={`h-16 px-8 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest gap-3 transition-all duration-300 ${
                  hasActiveFilters ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white dark:bg-surface border-black/5 shadow-sm"
                }`}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal className="h-4 w-4" /> 
                Filters {hasActiveFilters && "•"}
              </Button>
               <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-16 rounded-[1.5rem] px-8 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-surface text-textPrimary border border-black/5 shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-low">Sort: Price Low</option>
                <option value="price-high">Sort: Price High</option>
                <option value="trending">Sort: Trending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto">
        <div className="mt-4">
          <CategoryPills selected={category} onSelect={handleSelectCategory} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/marketplace?fresh=today")}
            className={`h-14 rounded-2xl px-5 flex items-center justify-between border text-left transition-all ${freshFilter ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-surface border-black/5 hover:border-primary/30"}`}
          >
            <span className="flex items-center gap-3 text-xs font-black uppercase tracking-widest"><Flame className="h-4 w-4" /> Fresh Today</span>
            <span className="text-[10px] font-bold opacity-70">new & boosted</span>
          </button>
          <button
            onClick={() => { setSort("trending"); navigate("/marketplace?sort=trending"); }}
            className={`h-14 rounded-2xl px-5 flex items-center justify-between border text-left transition-all ${sort === "trending" ? "bg-black text-white border-black shadow-lg" : "bg-surface border-black/5 hover:border-primary/30"}`}
          >
            <span className="flex items-center gap-3 text-xs font-black uppercase tracking-widest"><Star className="h-4 w-4" /> Trending</span>
            <span className="text-[10px] font-bold opacity-70">popular deals</span>
          </button>
        </div>
        
        {isLoading ? (
          <div className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-textSecondary bg-surface px-3 py-1.5 rounded-full shadow-sm border border-black/5">
                {(search || category !== "all") 
                  ? `${combinedResults.length} Results`
                  : `${products.length + services.length} Items Available`
                }
              </span>
              
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                className="hidden md:flex h-8 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal className="h-3 w-3" /> 
                Filters {hasActiveFilters && "•"}
              </Button>
              
              {hasActiveFilters && (
                <button 
                   onClick={clearFilters} 
                   className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
              
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="hidden md:block ml-auto text-[10px] font-black uppercase tracking-widest bg-surface text-textPrimary rounded-xl px-4 py-2 border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all duration-200"
              >
                <option value="newest">Newest first</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="trending">Trending</option>
              </select>
            </div>

            {filtersOpen && (
              <div className="mt-4 mb-8 rounded-3xl border border-black/5 bg-surface p-6 translate-y-0 animate-fade-up shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                      className="mt-2 h-11 w-full rounded-xl border border-black/5 bg-background px-4 text-sm font-bold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">Any Condition</option>
                      <option value="New">Brand New</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Min Price (₦)</label>
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      className="mt-2 h-11 w-full rounded-xl border border-black/5 bg-background px-4 text-sm font-bold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Max Price (₦)</label>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      className="mt-2 h-11 w-full rounded-xl border border-black/5 bg-background px-4 text-sm font-bold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Seller Rating</label>
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      className="mt-2 h-11 w-full rounded-xl border border-black/5 bg-background px-4 text-sm font-bold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={4}>4+ Stars</option>
                      <option value={3}>3+ Stars</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(search || freshFilter || sort === "trending" || category !== "all") && combinedResults.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 sm:mt-24 text-center max-w-md mx-auto px-6 py-12 rounded-[2.5rem] border border-black/5 bg-surface shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-40 h-40 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors duration-700" />
                
                <div className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-muted shadow-inner mb-8 border border-black/5">
                   <SearchX className="h-10 w-10 text-primary/30" />
                </div>
                
                <h2 className="text-3xl font-black text-textPrimary tracking-tighter leading-tight mb-2 italic">No results for <span className="text-primary italic">"{search}"</span></h2>
                <p className="text-sm text-textSecondary mb-10 font-medium px-4">
                  We couldn't find any matches. Would you like to add it to the marketplace or request it from others?
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                  <Button 
                    onClick={() => navigate(`/dashboard/new?type=product&title=${encodeURIComponent(search)}`)} 
                    className="flex-1 rounded-2xl h-14 btn-premium text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 group"
                  >
                    <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                    Add Listing
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => navigate(`/request?title=${encodeURIComponent(search)}`)} 
                    className="flex-1 rounded-2xl h-14 bg-muted hover:bg-gray-200 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2 text-textPrimary"
                  >
                    <FileText className="h-5 w-5" />
                    Request Item
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="mt-8 pb-20">
                <AnimatePresence mode="popLayout">
                {(search || freshFilter || sort === "trending" || (category !== "all" && category !== "services")) ? (
                  <motion.div 
                    key="combined"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3"
                  >
                    {combinedResults.map((item: any, i) => (
                      item.type === 'product' ? (
                        <ProductCard
                          key={item.id}
                          product={item}
                          index={i}
                          isSaved={isSaved(item.id)}
                          onToggleSave={toggle}
                        />
                      ) : (
                        <ServiceCard key={item.id} service={item} index={i} />
                      )
                    ))}
                  </motion.div>
                ) : (
                  <div className="space-y-12">
                    {filteredProducts.length > 0 && (
                      <motion.div 
                        key="products"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3"
                      >
                        {filteredProducts.map((product, i) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            index={i}
                            isSaved={isSaved(product.id)}
                            onToggleSave={toggle}
                          />
                        ))}
                      </motion.div>
                    )}

                    {filteredServices.length > 0 && (
                      <motion.div 
                        key="services"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="flex items-center gap-4 mb-8">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 whitespace-nowrap">Professional Services</span>
                           <div className="h-px w-full bg-gradient-to-r from-primary/10 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredServices.map((service, i) => (
                            <ServiceCard key={service.id} service={service} index={i} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;

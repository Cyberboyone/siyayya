import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, X, Loader2, SearchX, Plus, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { CategoryPills } from "@/components/CategoryPills";
import { ProductCard } from "@/components/ProductCard";
import { ServiceCard } from "@/components/ServiceCard";
import { fuzzyMatch } from "@/lib/search-utils";
import { useSavedItems } from "@/hooks/use-saved-items";
import { Button } from "@/components/ui/button";
import { useProducts, useServices } from "@/hooks/use-queries";
import { getNumericDate } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";
import { categories } from "@/lib/mock-data";

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";
  
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [condition, setCondition] = useState<"all" | "New" | "Used">("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState(0);
  
  const { isSaved, toggle } = useSavedItems();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const isLoading = isLoadingProducts || isLoadingServices;

  const currentCategoryLabel = useMemo(() => {
    if (category === "all") return "";
    if (category === "services") return "Services";
    return categories.find(c => c.id === category)?.label || "";
  }, [category]);

  useSEO({
    title: currentCategoryLabel ? `${currentCategoryLabel} for Sale in Nigeria` : "Browse Products & Services",
    description: currentCategoryLabel 
      ? `Find the best deals on ${currentCategoryLabel} in Kashere. Browse verified listings on Siyayya.` 
      : "Explore our wide range of products and campus services at Federal University of Kashere.",
  });

  const hasActiveFilters = condition !== "all" || priceMin || priceMax || minRating > 0;

  // Sync state FROM URL params (Live Search)
  useEffect(() => {
    const querySearch = searchParams.get("search") || "";
    const queryCategory = searchParams.get("category") || "all";
    setSearch(querySearch);
    setCategory(queryCategory);
  }, [searchParams]);

  // Sync state TO URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (category !== "all") params.category = category;
    if (search) params.search = search;
    setSearchParams(params, { replace: true });
  }, [category, search, setSearchParams]);

  const filteredProducts = useMemo(() => {
    let items = [...products].filter(p => !p.isSold);
    
    if (category === "services") return [];

    if (category !== "all") {
      items = items.filter((p) => p.category === category);
    }
    
    if (condition !== "all") items = items.filter((p) => p.condition === condition);
    if (priceMin) items = items.filter((p) => p.price >= Number(priceMin));
    if (priceMax) items = items.filter((p) => p.price <= Number(priceMax));
    if (minRating > 0) items = items.filter((p) => (p.ownerRating || 5) >= minRating);
    
    if (search) {
      items = items.filter(
        (p) => fuzzyMatch(search, p.title) || fuzzyMatch(search, p.description)
      );
    }
    
    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt));
    
    return items;
  }, [products, category, condition, priceMin, priceMax, minRating, search, sort]);

  const filteredServices = useMemo(() => {
    let items = [...services];
    
    if (category !== "all" && category !== "services" && !search) return [];

    if (search) {
      items = items.filter(
        (s) => fuzzyMatch(search, s.title) || fuzzyMatch(search, s.description)
      );
    }
    
    if (minRating > 0) items = items.filter((s) => (s.ownerRating || 5) >= minRating);
    
    items.sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt));
    return items;
  }, [services, category, search, minRating]);

  const combinedResults = useMemo(() => {
    if (!search && (category === "all")) return [];
    
    return [
      ...filteredProducts.map(p => ({ ...p, type: 'product' })),
      ...filteredServices.map(s => ({ ...s, type: 'service' }))
    ].sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt));
  }, [filteredProducts, filteredServices, search, category]);

  const clearFilters = () => {
    setCondition("all");
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
    setSearch("");
    setCategory("all");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-6">
        <h1 className="text-3xl font-black text-textPrimary mb-6 tracking-tighter animate-fade-up">Marketplace</h1>
        <SearchBar 
          value={search} 
          onChange={setSearch} 
          placeholder="What are you looking for today?" 
        />
        
        <div className="mt-4">
          <CategoryPills selected={category} onSelect={setCategory} />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl"
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
                className="ml-auto text-[10px] font-black uppercase tracking-widest bg-surface text-textPrimary rounded-xl px-4 py-2 border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all duration-200"
              >
                <option value="newest">Newest first</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
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

            {(search || category !== "all") && combinedResults.length === 0 ? (
              <div className="mt-16 sm:mt-24 text-center animate-fade-up max-w-md mx-auto px-6 py-12 rounded-[2.5rem] border border-black/5 bg-surface shadow-2xl relative overflow-hidden group">
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
              </div>
            ) : (
              <div className="mt-8 pb-20">
                {(search || (category !== "all" && category !== "services")) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-fade-up">
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
                  </div>
                ) : (
                  <div className="space-y-12">
                    {filteredProducts.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-fade-up">
                        {filteredProducts.map((product, i) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            index={i}
                            isSaved={isSaved(product.id)}
                            onToggleSave={toggle}
                          />
                        ))}
                      </div>
                    )}

                    {filteredServices.length > 0 && (
                      <div className="animate-fade-up">
                        <div className="flex items-center gap-4 mb-8">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 whitespace-nowrap">Professional Services</span>
                           <div className="h-px w-full bg-gradient-to-r from-primary/10 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredServices.map((service, i) => (
                            <ServiceCard key={service.id} service={service} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { SlidersHorizontal, X, Loader2, SearchX, Plus, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { CategoryPills } from "@/components/CategoryPills";
import { ProductCard } from "@/components/ProductCard";
import { ServiceCard } from "@/components/ServiceCard";
import { Product, Service } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { fuzzyMatch } from "@/lib/search-utils";
import { useSavedItems } from "@/hooks/use-saved-items";
import { Button } from "@/components/ui/button";
import { useProducts, useServices } from "@/hooks/use-queries";
import { getNumericDate } from "@/lib/utils";

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

  const hasActiveFilters = condition !== "all" || priceMin || priceMax || minRating > 0;

  // Sync state with URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (category !== "all") params.category = category;
    if (search) params.search = search;
    setSearchParams(params);
  }, [category, search, setSearchParams]);

  const filteredProducts = useMemo(() => {
    let items = [...products].filter(p => !p.isSold);
    
    // Filter by Category
    if (category !== "all" && category !== "services") {
      items = items.filter((p) => p.category === category);
    }
    
    // Additional Filters
    if (condition !== "all") items = items.filter((p) => p.condition === condition);
    if (priceMin) items = items.filter((p) => p.price >= Number(priceMin));
    if (priceMax) items = items.filter((p) => p.price <= Number(priceMax));
    if (minRating > 0) items = items.filter((p) => (p.ownerRating || 5) >= minRating);
    
    // Search
    if (search) {
      items = items.filter(
        (p) => fuzzyMatch(search, p.title) || fuzzyMatch(search, p.description)
      );
    }
    
    // Sorting
    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt));
    
    return items;
  }, [products, category, condition, priceMin, priceMax, minRating, search, sort]);

  const filteredServices = useMemo(() => {
    let items = [...services];
    
    // Filter by Category
    if (category !== "all") {
      if (category !== "services") {
        items = items.filter(s => s.category === category);
      }
    } else if (!search) {
      // In "all" view, only show services if searching, or hide them to avoid clutter
      return []; 
    }

    // Search
    if (search) {
      items = items.filter(
        (s) => fuzzyMatch(search, s.title) || fuzzyMatch(search, s.description)
      );
    }
    
    if (minRating > 0) items = items.filter((s) => (s.ownerRating || 5) >= minRating);
    
    items.sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt));
    return items;
  }, [services, category, search, minRating]);

  const clearFilters = () => {
    setCondition("all");
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
    setSearch("");
    setCategory("all");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24 md:pb-0">
      <Navbar />
      <div className="container py-6">
        <h1 className="text-3xl font-black text-[#222222] mb-6 tracking-tighter animate-fade-up">Marketplace</h1>
        <SearchBar value={search} onChange={setSearch} />
        
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
              <span className="text-xs font-bold text-muted-foreground bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5">
                {filteredProducts.length + filteredServices.length} Results
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
                className="ml-auto text-[10px] font-black uppercase tracking-widest bg-white text-[#222222] rounded-xl px-4 py-2 border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="newest">Newest first</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* Filters Panel */}
            {filtersOpen && (
              <div className="mt-4 mb-8 rounded-3xl border border-white/40 bg-white/60 backdrop-blur-md p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2 shadow-xl">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">Any Condition</option>
                    <option value="New">Brand New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min Price (₦)</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max Price (₦)</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seller Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4}>4+ Stars</option>
                    <option value={3}>3+ Stars</option>
                  </select>
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && filteredServices.length === 0 ? (
              <div className="mt-16 sm:mt-24 text-center animate-fade-up max-w-md mx-auto px-6 py-12 rounded-[2.5rem] border border-black/5 bg-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-40 h-40 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors duration-700" />
                
                <div className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 shadow-inner mb-8 border border-black/5">
                   <SearchX className="h-10 w-10 text-primary/30" />
                </div>
                
                <h3 className="text-3xl font-black text-[#222222] tracking-tighter leading-tight mb-2">No results for <span className="text-primary italic">"{search}"</span></h3>
                <p className="text-sm text-muted-foreground mb-10 font-medium px-4">
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
                    variant="outline"
                    onClick={() => navigate(`/dashboard/new?type=request&title=${encodeURIComponent(search)}`)} 
                    className="flex-1 rounded-2xl h-14 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    Request Item
                  </Button>
                </div>
                
                <button 
                   onClick={clearFilters}
                   className="mt-8 text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>

                <div className="mt-12 pt-10 border-t border-black/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6 italic">Try browsing these instead</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Phones", "Electronics", "Fashion", "Food", "Books"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategory(cat.toLowerCase());
                          setSearch(""); // Reset search to clear the empty state
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-50 border border-black/5 text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12 mt-8 pb-20">
                {filteredProducts.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredServices.map((service, i) => (
                        <ServiceCard key={service.id} service={service} index={i} />
                      ))}
                    </div>
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

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { getSuggestions } from "@/lib/search-utils";
import { categories } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useProducts, useServices } from "@/hooks/use-queries";
import { Product, Service } from "@/lib/mock-data";
import { fuzzyMatch } from "@/lib/search-utils";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";


interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

const categoryLabels = categories.map((c) => c.label);

export function SearchBar({ value, onChange, onSubmit, placeholder = "Search marketplace...", showSuggestions = true }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const isLoading = isLoadingProducts || isLoadingServices;

  const results = useMemo(() => {
    if (!value.trim() || value.length < 2) return [];
    
    const filteredProducts = products.filter(p => fuzzyMatch(value, p.title) || fuzzyMatch(value, p.description));
    const filteredServices = services.filter(s => fuzzyMatch(value, s.title) || fuzzyMatch(value, s.description));
    
    return [
      ...filteredProducts.map(p => ({ ...p, type: 'product' as const })),
      ...filteredServices.map(s => ({ ...s, type: 'service' as const }))
    ].slice(0, 6);
  }, [value, products, services]);

  const showDropdown = focused && (value.trim().length >= 2);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Helper to highlight matching text
  const HighlightMatch = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return (
      <span className="truncate">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="font-bold text-primary">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={ref}>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit?.(value);
            setFocused(false);
          }
        }}
        placeholder={placeholder}
        className="h-14 w-full rounded-full border-2 border-input bg-card pl-12 pr-12 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {value && (
          <button
            onClick={() => {
              onChange("");
              setFocused(false);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      
      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[400px] overflow-y-auto">
            {results.length > 0 ? (
              results.map((item, i) => (
                <Link
                  key={item.id}
                  to={`/${item.type}/${item.id || item._id}`}
                  onClick={() => {
                    console.log(`Navigating from search: /${item.type}/${item.id || item._id}`);
                    setFocused(false);
                  }}
                >
                  <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={item.image || (item.images && item.images[0]) || '/placeholder.png'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                      <HighlightMatch text={item.title} highlight={value} />
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-1.5 py-0.5 rounded">
                        {item.type}
                      </span>
                      <span className="text-xs font-bold text-secondary italic">
                        ₦{item.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Search className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
              ))
            ) : !isLoading ? (
              <div className="px-5 py-10 text-center flex flex-col items-center">
                 <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                   <Search className="h-5 w-5 text-muted-foreground/50" />
                 </div>
                 <p className="text-sm font-bold text-foreground">No results found for "{value}"</p>
                 <p className="text-xs text-muted-foreground mt-1 font-medium">Try searching for something else</p>
              </div>
            ) : (
                <div className="px-5 py-10 text-center flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-xs font-bold text-muted-foreground">Searching marketplace...</p>
                </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

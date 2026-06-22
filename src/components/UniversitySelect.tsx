import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Building2, X } from "lucide-react";
import { CAMPUSES, Campus } from "@/lib/campus";

export interface UniversitySelectProps {
  value: string;
  onChange: (campusId: string) => void;
  className?: string;
  placeholder?: string;
}

export const UniversitySelect: React.FC<UniversitySelectProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "Select University",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedCampus = useMemo(
    () => CAMPUSES.find((c) => c.id === value),
    [value]
  );

  const filteredCampuses = useMemo(() => {
    if (!debouncedQuery) return CAMPUSES;
    const query = debouncedQuery.toLowerCase();
    return CAMPUSES.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.shortName.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      (c.state?.toLowerCase() ?? "").includes(query)
    );
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (campus: Campus) => {
    onChange(campus.id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between h-14 rounded-2xl bg-secondary/20 border-2 border-white/10 px-4 font-bold focus:border-primary/50 transition-all outline-none"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className={`truncate ${!selectedCampus ? "text-muted-foreground font-normal" : "text-foreground"}`}>
            {selectedCampus ? `${selectedCampus.name} (${selectedCampus.shortName})` : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-white/10 bg-secondary/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, abbreviation, city, state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-2 scrollbar-none">
            {filteredCampuses.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No universities found matching "{searchQuery}"
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredCampuses.map((campus) => (
                  <button
                    key={campus.id}
                    type="button"
                    onClick={() => handleSelect(campus)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-left ${
                      selectedCampus?.id === campus.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/20 text-foreground"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${
                      selectedCampus?.id === campus.id ? "bg-primary/20" : "bg-secondary/30"
                    }`}>
                      <span className="text-[10px] font-black uppercase">
                        {campus.shortName.slice(0, 3)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{campus.name}</div>
                      <div className="text-xs text-muted-foreground truncate opacity-80">
                        {campus.shortName} • {campus.location}{campus.state ? `, ${campus.state}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

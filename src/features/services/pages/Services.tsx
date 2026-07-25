import { Navbar } from "@/components/Navbar";
import { ServiceCard } from "../components/ServiceCard";
import { SearchBar } from "@/components/SearchBar";
import { useState, useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useServices } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";

const Services = () => {
  const [search, setSearch] = useState("");
  // Switched from this page's own one-off `getDocs` call to the shared
  // `useServices()` react-query hook (already used by Home/Marketplace/
  // MarketCampus) for two concrete reasons found during a UI/UX review:
  // 1. The old fetch had no error state at all — a failed/slow Firestore
  //    call (offline, permission issue, network hiccup) left `isLoading`
  //    stuck `true` forever with only a bare spinner and no way out short
  //    of a manual page reload.
  // 2. react-query gives this page the same automatic retry-with-backoff,
  //    caching, and shared cache-key behavior every other listing page
  //    already relies on, instead of a separate/duplicated fetch path.
  const { data: services = [], isLoading, isError, refetch, isFetching } = useServices();

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [search, services]);

  useSEO({
    title: "Campus Services & Experts",
    description: "Connect with skilled campus experts at your university. Find graphic designers, tutors, repairs, and more.",
  });

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Navbar />
      <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-textPrimary tracking-tighter">Community Pulse</h1>
            <p className="text-sm font-bold text-textSecondary uppercase tracking-widest mt-1">What students are hunting for</p>
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search services..." />
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-16 px-4 flex flex-col items-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
            <p className="text-lg font-bold text-textPrimary">Couldn't load services</p>
            <p className="text-sm text-textSecondary mt-1 max-w-xs">
              Check your connection and try again.
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-5 rounded-2xl font-black uppercase tracking-widest text-[10px] px-8"
            >
              {isFetching ? "Retrying..." : "Try Again"}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filtered.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-textSecondary">
                <p className="text-lg font-bold">No services found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Services;


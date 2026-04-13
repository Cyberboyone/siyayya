import { Navbar } from "@/components/Navbar";
import { ServiceCard } from "@/components/ServiceCard";
import { SearchBar } from "@/components/SearchBar";
import { Service } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const Services = () => {
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snap = await getDocs(collection(db, "services"));
        setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [search, services]);

  useSEO({
    title: "Campus Services & Experts",
    description: "Connect with skilled campus experts at Federal University of Kashere. Find graphic designers, tutors, repairs, and more.",
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="container py-8">
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
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

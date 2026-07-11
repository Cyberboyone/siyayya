import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getNorthernCampuses } from "@/lib/campus";
import { useSEO } from "@/hooks/useSEO";

const Campuses = () => {
  const allCampuses = getNorthernCampuses();

  useSEO({
    title: "All Campus Marketplaces | Siyayya",
    description: "Browse Siyayya campus marketplaces across Northern Nigerian universities. Find your campus and start buying or selling with verified students.",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl font-black uppercase text-textPrimary tracking-tight mb-2">
          Northern Campuses
        </h1>
        <p className="text-textSecondary mb-8">
          Explore marketplaces across all our supported universities in Northern Nigeria.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allCampuses.map((campus) => (
            <Link
              key={campus.id}
              to={`/market/${campus.id}`}
              className="group p-4 bg-surface border border-black/5 dark:border-white/10 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-sm font-black text-primary">{campus.shortName.slice(0, 3)}</span>
              </div>
              <h2 className="text-lg font-bold text-textPrimary group-hover:text-primary transition-colors">
                {campus.name}
              </h2>
              <p className="text-sm text-textMuted mt-1 mb-4 flex-grow">
                {campus.location}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-textSecondary bg-muted/30 px-2 py-1 rounded">
                  {campus.shortName}
                </span>
                <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Visit Market &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Campuses;

import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft, Share2, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { GuestAuthPrompt } from "@/features/auth/components/GuestAuthPrompt";
import { FeedSection } from "@/features/marketplace/components/FeedSection";
import { getCampusBySlug, getNorthernCampuses, NORTHERN_CAMPUS_IDS } from "@/lib/campus";
import { useProducts } from "@/hooks/use-queries";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { getNumericDate } from "@/lib/utils";
import { motion } from "framer-motion";

const MarketCampus = () => {
  const { campusSlug } = useParams<{ campusSlug: string }>();
  const campus = campusSlug ? getCampusBySlug(campusSlug) : undefined;
  const { isAuthenticated } = useAuth();
  const { savedIds, toggle: toggleSave } = useSavedItems();
  const { data: allProducts = [], isLoading } = useProducts();
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);

  const campusProducts = useMemo(
    () =>
      allProducts
        .filter((p) => !p.isSold && p.campusId === campus?.id)
        .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt)),
    [allProducts, campus?.id]
  );

  const { sentinelRef, visibleCount, hasMore } = useInfiniteScroll({
    totalItems: campusProducts.length,
    batchSize: 20,
  });

  const visibleProducts = campusProducts.slice(0, visibleCount);

  // Related campuses (same region, excluding current)
  const relatedCampuses = useMemo(
    () =>
      getNorthernCampuses()
        .filter((c) => c.id !== campus?.id)
        .slice(0, 6),
    [campus?.id]
  );

  // SEO
  useSEO({
    title: campus
      ? `Buy & Sell at ${campus.shortName} | Siyayya Campus Marketplace`
      : "Campus Marketplace | Siyayya",
    description: campus
      ? `Browse ${campusProducts.length}+ products from students at ${campus.name}, ${campus.location}. Find electronics, fashion, books & more.`
      : "Browse products from northern Nigerian university students.",
  });

  if (!campus) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <h1 className="text-2xl font-black text-textPrimary mb-2">Campus Not Found</h1>
          <p className="text-sm text-textMuted mb-6">The university you're looking for isn't available yet.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleSave = (id: string) => {
    if (!isAuthenticated) {
      setGuestPromptOpen(true);
      return;
    }
    toggleSave(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Campus Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-black/5 dark:border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-textMuted">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span>/</span>
                <span className="text-textPrimary font-bold">{campus.shortName}</span>
              </div>

              {/* Title */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-3">
                  <MapPin className="h-3 w-3" />
                  {campus.location}
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-textPrimary tracking-tighter">
                  {campus.shortName}
                  <span className="text-primary">.</span>
                </h1>
                <p className="text-sm text-textMuted mt-1 max-w-md">
                  {campus.name} — Browse {campusProducts.length} products from campus students
                </p>
              </div>
            </div>

            {/* Share */}
            <button
              onClick={() => {
                navigator.share?.({
                  title: `${campus.shortName} Marketplace – Siyayya`,
                  url: window.location.href,
                }).catch(() => {});
              }}
              className="h-10 w-10 rounded-xl bg-surface border border-black/5 dark:border-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 pt-5 pb-2">
        <SearchBar />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 space-y-10 pb-20">
        {/* Products */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-surface border border-black/5 animate-pulse">
                <div className="aspect-[4/5] sm:aspect-square bg-muted/50" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted/50 rounded-full w-3/4" />
                  <div className="h-4 bg-muted/50 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <FeedSection
              icon="🛍️"
              title={`All Products at ${campus.shortName}`}
              subtitle={`${campusProducts.length} items`}
              className="pt-4"
            >
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={savedIds.includes(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
              {visibleProducts.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-sm font-bold text-textPrimary mb-1">No products yet at {campus.shortName}</p>
                  <p className="text-xs text-textMuted">Be the first to list something for sale!</p>
                </div>
              )}
            </FeedSection>

            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
              </div>
            )}
          </>
        )}

        {/* Related Campuses */}
        {relatedCampuses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-4">
              🎓 Explore Other Campuses
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {relatedCampuses.map((c) => (
                <Link
                  key={c.id}
                  to={`/market/${c.id}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface border border-black/5 dark:border-white/10 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="text-sm font-black text-primary">{c.shortName.slice(0, 3)}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-textPrimary group-hover:text-primary transition-colors">{c.shortName}</p>
                    <p className="text-[10px] text-textMuted">{c.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Action Removed */}
      <GuestAuthPrompt
        isOpen={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        action="save"
      />
    </div>
  );
};

export default MarketCampus;

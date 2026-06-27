import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, TrendingUp, Sparkles, Clock, Tag, ChevronRight, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { ServiceCard } from "@/features/services/components/ServiceCard";
import { CampusSwitcher } from "@/features/marketplace/components/CampusSwitcher";
import { FeedSection } from "@/features/marketplace/components/FeedSection";
import { GuestAuthPrompt } from "@/features/auth/components/GuestAuthPrompt";
import { categories } from "@/lib/mock-data";
import { getCampusById } from "@/lib/campus";
import { useDiscoveryFeed, FeedMode } from "@/hooks/useDiscoveryFeed";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useServices } from "@/hooks/use-queries";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { motion } from "framer-motion";
import { getOptimizedUrl } from "@/lib/cloudinary-utils";

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [feedMode, setFeedMode] = useState<FeedMode>("nearby");
  const [selectedCampusId, setSelectedCampusId] = useState<string | undefined>();
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [guestPromptAction, setGuestPromptAction] = useState<"chat" | "save" | "post">("save");

  const {
    nearestCampus,
    nearbyCampuses,
    trendingNow,
    recommendedForYou,
    nearYourCampus,
    recentlyAdded,
    popularThisWeek,
    hiddenGems,
    discoveryFeed,
    campusProducts,
    isLocationLoading,
    isProductsLoading,
    locationSource,
    isOutOfRegion,
  } = useDiscoveryFeed(feedMode, selectedCampusId);

  const { data: services = [] } = useServices();
  const { savedIds, toggle: toggleSave, isSaved: checkIsSaved } = useSavedItems();

  // Infinite scroll for main discovery feed
  const { sentinelRef, visibleCount, hasMore } = useInfiniteScroll({
    totalItems: discoveryFeed.length,
    batchSize: 20,
  });

  const visibleProducts = discoveryFeed.slice(0, visibleCount);

  const selectedCampus = selectedCampusId ? getCampusById(selectedCampusId) : null;

  // SEO
  useSEO({
    title: `Siyayya.com : Your Campus Marketplace`,
    description: `Buy, sell, and discover products near ${nearestCampus?.name || "your campus"}. Electronics, fashion, books & more across Nigerian university campuses.`,
  });

  const handleToggleSave = (id: string) => {
    if (!isAuthenticated) {
      setGuestPromptAction("save");
      setGuestPromptOpen(true);
      return;
    }
    toggleSave(id);
  };

  const isLoading = isLocationLoading || isProductsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Location Indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                {isLocationLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-textMuted" />
                    <span className="text-xs text-textMuted">Detecting location...</span>
                  </div>
                ) : isOutOfRegion ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary truncate">
                    📍 Northern Marketplace
                  </p>
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 truncate">
                    📍 Near {nearestCampus?.shortName}
                  </p>
                )}
              </div>
            </div>

            {/* Campus Switcher */}
            <div className="ml-auto flex-shrink-0">
              <CampusSwitcher
                currentMode={feedMode}
                nearestCampusName={nearestCampus?.shortName}
                selectedCampusName={selectedCampus?.shortName}
                onModeChange={setFeedMode}
                onCampusSelect={(id) => {
                  setSelectedCampusId(id);
                  setFeedMode("campus");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 pt-12 md:pt-20 pb-16 md:pb-24 overflow-visible">
        {/* Abstract Background Mesh Gradients */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-60">
          <div className="absolute top-0 left-[20%] w-[400px] h-[400px] bg-primary/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob" />
          <div className="absolute top-[20%] right-[20%] w-[500px] h-[500px] bg-accent/30 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-pink-500/20 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000" />
        </div>
        
        {/* Floating Background Shapes */}
        <div className="absolute top-10 left-[5%] w-32 h-32 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-2xl -z-10 animate-float pointer-events-none hidden md:block" />
        <div className="absolute top-40 right-[8%] w-40 h-40 bg-gradient-to-tr from-accent/30 to-pink-500/20 rounded-full blur-3xl -z-10 animate-float-delayed pointer-events-none hidden md:block" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          
          {/* Identity Badges (Top) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 shadow-sm text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
              <span className="text-base leading-none">🛒</span> Marketplace
            </span>
            <span className="px-4 py-2 rounded-full bg-accent/10 dark:bg-accent/20 border border-accent/20 shadow-sm text-xs font-black uppercase tracking-widest hidden sm:flex items-center gap-2 text-accent">
              <span className="text-base leading-none">🎓</span> Community
            </span>
          </motion.div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl"
          >
            <h1 className="hero-title-display text-[clamp(3.1rem,9vw,6.8rem)] font-extrabold tracking-[-0.058em] uppercase leading-[0.88] text-slate-950 dark:text-white">
              <span className="hero-title-line block">Buy, Sell</span>
              <span className="hero-title-line block">&amp; Connect</span>
              <span className="hero-title-accent mt-3 inline-block pb-4 pr-3">
                on Campus
              </span>
            </h1>
            <p className="text-base md:text-xl text-slate-700 dark:text-slate-200 mt-7 max-w-2xl mx-auto font-semibold leading-relaxed">
              The premium student marketplace in Northern Nigeria. Buy, sell, and discover the best campus deals — fast, safe, and 100% student-driven.
            </p>
          </motion.div>

          {/* Integrated Search Bar (Moved up) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl mx-auto px-4 mt-12 relative z-20"
          >
            <SearchBar className="h-16 md:h-20 bg-white/80 dark:bg-surface/80 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none border-2 border-white/60 dark:border-white/10 rounded-[2.5rem] overflow-hidden focus-within:ring-4 focus-within:ring-primary/30 transition-all duration-500" />
            <div className="mt-6 flex justify-center">
               <Link to="/marketplace" className="text-sm font-bold text-textSecondary hover:text-primary transition-colors flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-primary/5">
                 Or explore all categories <ChevronRight className="w-4 h-4" />
               </Link>
            </div>
          </motion.div>

          {/* Stats Section (Sleek Pills) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-12 px-4 mb-4"
          >
            {[
              { label: "Campuses", value: "12+", icon: "🏫" },
              { label: "Listings", value: "1k+", icon: "🛍️" },
              { label: "Students", value: "5k+", icon: "🎓" }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-3 sm:py-4 rounded-[2.5rem] bg-white/60 dark:bg-surface/60 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:-translate-y-1 hover:bg-white dark:hover:bg-surface hover:shadow-primary/20 transition-all duration-300 cursor-default group">
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{stat.icon}</span>
                <div className="flex flex-col text-left">
                  <span className="text-base sm:text-xl font-black text-textPrimary leading-none">{stat.value}</span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-textSecondary mt-1">{stat.label}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: "trending", label: "Trending", icon: "🔥", link: "/marketplace?sort=trending" },
            { id: "latest", label: "Latest", icon: "🕐", link: "/marketplace?sort=newest" },
            { id: "nearby", label: "Nearby", icon: "📍", link: "/marketplace" },
            { id: "fashion", label: "Fashion", icon: "👕", link: "/marketplace/fashion" },
            { id: "electronics", label: "Electronics", icon: "📱", link: "/marketplace/electronics" },
            { id: "books", label: "Books", icon: "📚", link: "/marketplace/books" },
            { id: "services", label: "Services", icon: "🔧", link: "/services" },
            { id: "sports", label: "Sports", icon: "⚽", link: "/marketplace/sports" },
            { id: "accommodation", label: "Accommodation", icon: "🏠", link: "/hostels/nearest" },
          ].map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-black/5 dark:border-white/10 text-xs font-bold text-textPrimary hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 whitespace-nowrap flex-shrink-0"
            >
              <span>{cat.icon}</span>
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
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
        </div>
      )}

      {/* Feed Sections */}
      {!isLoading && (
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-20">


          {/* 🎯 Recommended For You */}
          {recommendedForYou.length > 0 && feedMode === "nearby" && (
            <FeedSection
              icon="🎯"
              title="Recommended For You"
              subtitle="Top Picks"
              viewAllLink="/marketplace"
            >
              {recommendedForYou.slice(0, 4).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={checkIsSaved(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </FeedSection>
          )}

          {/* 🕐 Recently Added */}
          {recentlyAdded.length > 0 && feedMode === "nearby" && (
            <FeedSection
              icon="🕐"
              title="Recently Added"
              subtitle="Just In"
              viewAllLink="/marketplace?sort=newest"
            >
              {recentlyAdded.slice(0, 4).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={checkIsSaved(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </FeedSection>
          )}

          {/* Explore Nearby Campuses (pills) */}
          {feedMode === "nearby" && nearbyCampuses.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-textMuted">
                  {isOutOfRegion ? "🎓 Explore Northern Campuses" : "🎓 Explore More Campuses"}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2">
                {nearbyCampuses.slice(isOutOfRegion ? 0 : 1).map((campus) => (
                  <Link
                    key={campus.id}
                    to={`/market/${campus.id}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-black/5 dark:border-white/10 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 flex-shrink-0 group"
                  >
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-[9px] font-black text-primary">{campus.shortName.slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-textPrimary group-hover:text-primary transition-colors">{campus.shortName}</p>
                      <p className="text-[9px] text-textMuted">{campus.distanceKm.toFixed(0)}km away</p>
                    </div>
                  </Link>
                ))}
                
                <Link
                  to="/campuses"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-xl bg-surface border border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 flex-shrink-0 group"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary group-hover:text-primary/80 transition-colors">See All</span>
                </Link>
              </div>
            </motion.div>
          )}

          {/* 🏫 Near Your Campus */}
          {nearestCampus && nearYourCampus.length > 0 && feedMode === "nearby" && (
            <FeedSection
              icon="🏫"
              title={`Near ${nearestCampus.shortName}`}
              subtitle={nearestCampus.name}
              viewAllLink={`/market/${nearestCampus.id}`}
            >
              {nearYourCampus.slice(0, 8).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={checkIsSaved(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </FeedSection>
          )}





          {/* Main Product Feed (Campus or Nationwide mode, or all products grid) */}
          {(feedMode === "campus" || feedMode === "nationwide") && (
            <FeedSection
              icon={feedMode === "campus" ? "🏫" : "🌍"}
              title={
                feedMode === "campus" && selectedCampus
                  ? `${selectedCampus.shortName} Marketplace`
                  : "All Northern Campuses"
              }
              subtitle={
                feedMode === "campus" && selectedCampus
                  ? selectedCampus.name
                  : "Nationwide"
              }
            >
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={checkIsSaved(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
              {visibleProducts.length === 0 && (
                <div className="col-span-full py-16 text-center bg-surface border border-black/5 dark:border-white/5 rounded-3xl">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-textPrimary">Nothing here yet!</p>
                  <p className="text-sm text-textMuted mt-2 mb-6 max-w-sm mx-auto">
                    {feedMode === "campus" 
                      ? `There are no active listings for ${selectedCampus?.shortName} at the moment.`
                      : "We couldn't find any products matching your current filters."}
                  </p>
                  
                  {/* Better empty state: show trending */}
                  {trendingNow.length > 0 && (
                    <div className="mt-8 text-left border-t border-black/5 pt-8">
                       <p className="text-sm font-bold text-textPrimary mb-4">Check out what's trending nearby instead:</p>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                         {trendingNow.slice(0, 4).map((product, i) => (
                           <ProductCard key={product.id} product={product} index={i} isSaved={checkIsSaved(product.id)} onToggleSave={handleToggleSave} />
                         ))}
                       </div>
                    </div>
                  )}

                  <Link to="/dashboard/new" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
                    <Sparkles className="h-4 w-4" /> Be the first to sell
                  </Link>
                </div>
              )}
            </FeedSection>
          )}

          {/* Infinite Scroll for all-products grid in nearby mode (Discovery Feed) */}
          {feedMode === "nearby" && discoveryFeed.length > 0 && (
            <FeedSection
              icon="🛍️"
              title="Explore Products"
              subtitle="Discover what's new"
              viewAllLink="/marketplace"
            >
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isSaved={checkIsSaved(product.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </FeedSection>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <FeedSection
              icon="⚡"
              title="Campus Experts"
              subtitle="Skill Hub"
              viewAllLink="/services"
            >
              {services.slice(0, 6).map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </FeedSection>
          )}
        </div>
      )}

      {/* Floating Action Removed */}
      <GuestAuthPrompt
        isOpen={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        action={guestPromptAction}
      />
    </div>
  );
};

export default Home;

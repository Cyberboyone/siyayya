import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, Service } from "@/lib/mock-data";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Plus, Edit, Trash2, Package, Wrench, Settings, Eye, Star, CheckCircle, Heart, Loader2, AlertTriangle, Flame, Share2, TrendingUp, MessageCircle, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { NotificationSettings } from "@/features/notifications/components/NotificationSettings";
import { useReferralProgram } from "@/hooks/useReferralProgram";
import { UniversitySelect } from "@/components/UniversitySelect";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Tab = "overview" | "listings" | "saved" | "reviews" | "settings";

interface Review {
  id: string;
  listingId: string;
  ownerId: string;
  ownerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(initialTab);
  const { savedIds, toggle } = useSavedItems();
  const { user, deleteAccount, updateProfile, isAdmin } = useAuth();
  const { referralCode, referralCount, rewardCredits, shareInvite, copyInvite } = useReferralProgram();
  const navigate = useNavigate();

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const managedUserId = searchParams.get("userId") || "";
  const isEmailAdmin = !!user?.email && user.email.toLowerCase() === 'muhammadmusab372@gmail.com';
  const managedUserName = searchParams.get("userName") || "";
  const viewingAsAdmin = !!(isAdmin || isEmailAdmin) && !!managedUserId && managedUserId !== user?.id;
  const dashboardOwnerId = viewingAsAdmin ? managedUserId : (user?.id || "");
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    bio: (user as any)?.bio || "",
    university: (user as any)?.university || "",
    campusId: (user as any)?.campusId || "",
    level: (user as any)?.level || "",
    campusArea: (user as any)?.campusArea || "",
    photoUrl: (user as any)?.photoUrl || "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    action: () => void;
  }>({
    open: false,
    title: "",
    desc: "",
    action: () => {},
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const qProducts = query(collection(db, "products"), where("ownerId", "==", dashboardOwnerId));
        const prodSnap = await getDocs(qProducts);
        setMyProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

        const qServices = query(collection(db, "services"), where("ownerId", "==", dashboardOwnerId));
        const servSnap = await getDocs(qServices);
        setMyServices(servSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

        const qReviews = query(collection(db, "reviews"), where("ownerId", "==", dashboardOwnerId));
        const reviewSnap = await getDocs(qReviews);
        const fetchedReviews = reviewSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        fetchedReviews.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
          return tB - tA;
        });
        setMyReviews(fetchedReviews);

        if (savedIds.length > 0) {
          const allProdSnap = await getDocs(collection(db, "products"));
          const allProds = allProdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          setSavedProducts(allProds.filter(p => savedIds.includes(p.id)));
        } else {
          setSavedProducts([]);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [dashboardOwnerId, user, savedIds]);
  
  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam && ["overview", "listings", "saved", "reviews", "settings"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        bio: (user as any).bio || "",
        university: (user as any).university || "",
        campusId: (user as any).campusId || "",
        level: (user as any).level || "",
        campusArea: (user as any).campusArea || "",
        photoUrl: (user as any).photoUrl || "",
      });
    }
  }, [user]);

  if (!user) return null;

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString("en-NG")}`;
  };

  const getListingHealthChecks = (listing: any, listingType: "product" | "service") => {
    const checks = [
      { label: "Title is strong", done: String(listing?.title || "").trim().length >= 8 },
      { label: "Description is detailed", done: String(listing?.description || "").trim().length >= 40 },
      { label: listingType === "product" ? "Has at least 1 photo" : "Has photo", done: Array.isArray(listing?.images) ? listing.images.length > 0 : !!listing?.image },
      { label: "Price is set", done: Number(listing?.price || listing?.budget || 0) > 0 || listingType === "service" || listingType === "product" ? Number(listing?.price || 0) > 0 : true },
      { label: "Contact phone ready", done: String(listing?.ownerPhone || listing?.contactPhone || "").trim().length >= 10 },
      { label: "Boosted recently", done: !!listing?.boostedAt },
    ];
    const score = Math.round((checks.filter((check) => check.done).length / checks.length) * 100);
    return { checks, score };
  };

  const handleDeleteListing = async (id: string, type: "products" | "services") => {
    setConfirmDialog({
      open: true,
      title: "Delete Listing",
      desc: "Are you sure you want to permanently delete this listing? This action cannot be undone and will remove all associated media.",
      action: async () => {
        try {
          if (!auth.currentUser) {
            toast.error("Please sign in again before deleting.");
            return;
          }

          const idToken = await auth.currentUser.getIdToken(true);
          const response = await fetch('/api/listings/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              listingId: id,
              collection: type,
            }),
          });

          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result?.message || 'Failed to delete listing');
          }

          if (type === "products") setMyProducts(prev => prev.filter(p => p.id !== id));
          if (type === "services") setMyServices(prev => prev.filter(s => s.id !== id));

          toast.success(result?.message || "Listing deleted successfully");
        } catch (error: any) {
          console.error("Error deleting listing:", error);
          toast.error(error?.message || "Failed to delete listing");
        }
      }
    });
  };

  const handleMarkSold = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Mark as Sold",
      desc: "Mark this product as sold? It will appear as unavailable to buyers. You can mark it as available again anytime.",
      action: async () => {
        try {
          await updateDoc(doc(db, "products", id), { isSold: true });
          setMyProducts(prev => prev.map(p => p.id === id ? { ...p, isSold: true } : p));
          toast.success("Product marked as sold");
        } catch (error) {
          console.error("Error updating listing:", error);
          toast.error("Failed to update product status");
        }
      }
    });
  };

  const handleMarkLive = async (id: string) => {
    try {
      await updateDoc(doc(db, "products", id), { isSold: false });
      setMyProducts(prev => prev.map(p => p.id === id ? { ...p, isSold: false } : p));
      toast.success("Product marked as live");
    } catch (error) {
      console.error("Error updating listing:", error);
      toast.error("Failed to mark product as live");
    }
  };

  const handleBoostListing = async (id: string, type: "products" | "services") => {
    try {
      await updateDoc(doc(db, type, id), {
        boostedAt: serverTimestamp(),
        boostCount: increment(1),
      });

      if (type === "products") {
        setMyProducts(prev => prev.map(p => p.id === id ? { ...p, boostedAt: new Date().toISOString() } as any : p));
      } else {
        setMyServices(prev => prev.map(s => s.id === id ? { ...s, boostedAt: new Date().toISOString() } as any : s));
      }

      toast.success("Listing boosted to Fresh Today");
    } catch (error) {
      console.error("Boost failed:", error);
      toast.error("Could not boost this listing");
    }
  };

  const handleShareListing = async (item: Product | Service, type: "product" | "service") => {
    const path = type === "product" ? `/product/${(item as any).slug || item.id}` : `/service/${(item as any).slug || item.id}`;
    const url = `${window.location.origin}${path}?ref=seller-share`;
    const text = `Check out ${item.title} on Siyayya Campus Marketplace: ${url}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: `Check out ${item.title} on Siyayya.`, url });
        return;
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "listings", label: "My Listings", icon: Package },
    { id: "saved", label: "Saved Items", icon: Heart },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleDeleteAccount = async () => {
    try {
      setIsUpdatingProfile(true);
      await deleteAccount();
      navigate("/signin");
    } catch (error: any) {
      console.error("Deletion error:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("For security reasons, please log out and log back in before deleting your account.");
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };


  const createManagedQuery = () => (
    viewingAsAdmin
      ? `?userId=${encodeURIComponent(managedUserId)}&userName=${encodeURIComponent(managedUserName)}`
      : ""
  );

  const goToManagedEdit = (listingType: "products" | "services", listingId: string) => {
    const managedQuery = viewingAsAdmin
      ? `?adminUserId=${encodeURIComponent(managedUserId)}&adminUserName=${encodeURIComponent(managedUserName)}`
      : "";
    navigate(`/dashboard/edit/${listingType}/${listingId}${managedQuery}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-32 md:pb-10">
      <Navbar />
      
      {/* Dashboard Header */}
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-black/5 bg-surface">
        <div className="px-6 max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center rounded-2xl bg-primary/10 px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] w-fit shadow-sm border border-primary/5">
              {viewingAsAdmin ? "Admin View" : "Dashboard"}
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-textPrimary tracking-tight italic uppercase leading-none pr-4">
              {viewingAsAdmin ? `${managedUserName || "User"} ` : "My "}<span className="text-gradient pr-4 inline-block">Dashboard</span>
            </h1>
            <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest opacity-60 italic max-w-md">{viewingAsAdmin ? "Admin can manage this user’s listings with the same controls available to the user." : "Manage your listings, orders, and campus presence from one high-fidelity interface."}</p>
          </div>
          <Link to={viewingAsAdmin ? `/dashboard/new?ownerId=${encodeURIComponent(managedUserId)}` : "/dashboard/new"}>
            <Button className="h-16 px-10 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-3">
              <Plus className="h-4 w-4" /> Add Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto -mt-8 relative z-10">
        {viewingAsAdmin && (
          <div className="mb-6 rounded-[2rem] border border-primary/20 bg-primary/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Admin user mode</p>
              <p className="text-sm font-semibold text-textPrimary mt-1">You are managing {managedUserName || managedUserId}'s dashboard and listings.</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="md:col-span-3">
            <div className="relative">
              <div className="glass rounded-[2.5rem] p-4 flex md:flex-col gap-2 overflow-x-auto scrollbar-none border-white/20 shadow-xl w-full max-w-[calc(100vw-3rem)] md:max-w-none">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); const next = new URLSearchParams(); next.set("tab", t.id); if (viewingAsAdmin) { next.set("userId", managedUserId); if (managedUserName) next.set("userName", managedUserName); } setSearchParams(next); }}
                    className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-500 shrink-0 ${
                      tab === t.id
                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105"
                        : "text-textMuted/60 hover:bg-black/5 hover:text-textPrimary"
                    }`}
                  >
                    <t.icon className={`h-4 w-4 ${tab === t.id ? "text-white" : ""}`} />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white/80 dark:from-black/80 to-transparent rounded-r-[2.5rem] pointer-events-none md:hidden" />
            </div>
          </div>

          <div className="md:col-span-9 min-h-[600px]">
            {isLoading ? (
              <div className="glass rounded-[3rem] h-full flex justify-center items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <div className="glass rounded-[3rem] p-10 border-white/20 shadow-2xl min-h-full">
                {tab === "overview" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <div className="flex flex-col md:flex-row items-center gap-8 p-10 rounded-[2.5rem] bg-white dark:bg-black/20 border border-black/5 shadow-inner">
                      <div className="h-32 w-32 shrink-0 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary text-4xl font-black border-4 border-white shadow-2xl overflow-hidden">
                        {profileData.photoUrl ? (
                          <img src={profileData.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user?.businessName || user?.name || "U").charAt(0)
                        )}
                      </div>
                      <div className="text-center md:text-left flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                          <h2 className="text-3xl font-black text-textPrimary italic uppercase tracking-tight">
                            {user?.businessName || user?.name || "Verified Member"}
                          </h2>
                          {user?.isVerified && <VerifiedBadge />}
                        </div>
                        <p className="text-xs font-bold text-textMuted uppercase tracking-[0.2em] mt-2 opacity-60 italic">{profileData.university || "Campus"}</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                          <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 rounded-xl border border-warning/10">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="text-sm font-black text-warning tabular-nums">{user.rating}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl border border-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="text-sm font-black text-primary uppercase tracking-widest">{myProducts.length + myServices.length} Listings</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-white to-emerald-500/10 dark:via-black/10 p-8 border border-primary/10 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Referral Program</p>
                          <h3 className="text-3xl font-black text-textPrimary italic uppercase leading-none">Invite friends. Earn boosts.</h3>
                          <p className="text-xs text-textSecondary font-semibold mt-3 max-w-xl">Share your Siyayya invite link. Every successful invite gives you referral credit you can use as a growth reward.</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/80 dark:bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-textPrimary">Code: {referralCode}</span>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">{rewardCredits} boost credits</span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          <Button onClick={shareInvite} className="h-12 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black uppercase tracking-widest text-[10px] gap-2">
                            <Share2 className="h-4 w-4" /> Share Invite
                          </Button>
                          <Button onClick={copyInvite} variant="outline" className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]">Copy Link</Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Inventory", count: myProducts.length, icon: Package, color: "text-primary" },
                        { label: "Expertise", count: myServices.length, icon: Wrench, color: "text-accent" },
                        { label: "Curated", count: savedIds.length, icon: Heart, color: "text-rose-500" },
                        { label: "Invites", count: referralCount, icon: Share2, color: "text-emerald-500" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-[2.5rem] bg-white dark:bg-black/10 p-8 text-center border border-black/5 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                          <div className={`h-12 w-12 rounded-2xl bg-black/5 flex items-center justify-center mx-auto mb-4 ${stat.color}`}>
                             <stat.icon className="h-6 w-6" />
                          </div>
                          <p className="text-4xl font-black text-textPrimary tabular-nums italic">{stat.count}</p>
                          <p className="text-[9px] font-black text-textMuted uppercase tracking-widest mt-2">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Seller Analytics Panel */}
                    {(myProducts.length > 0 || myServices.length > 0) && (() => {
                      const allListings = [
                        ...myProducts.map(p => ({ ...p as any, _type: 'product' })),
                        ...myServices.map(s => ({ ...s as any, _type: 'service' })),
                      ];
                      const totalViews = allListings.reduce((s, l) => s + Number((l as any).views || 0), 0);
                      const totalClicks = allListings.reduce((s, l) => s + Number((l as any).whatsappClicks || 0), 0);
                      const overallCTR = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
                      const topListing = [...allListings].sort((a, b) => Number((b as any).whatsappClicks || 0) - Number((a as any).whatsappClicks || 0))[0];
                      const lowConversion = allListings.filter(l => Number((l as any).views || 0) >= 5 && Number((l as any).whatsappClicks || 0) === 0);
                      return (
                        <div className="rounded-[2.5rem] bg-white dark:bg-black/10 border border-black/5 shadow-sm p-8 space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <BarChart2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Seller Insights</p>
                              <h3 className="text-sm font-black text-textPrimary uppercase tracking-wide">Your Listing Performance</h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-primary' },
                              { label: 'WhatsApp Clicks', value: totalClicks, icon: MessageCircle, color: 'text-[#25D366]' },
                              { label: 'Conversion Rate', value: `${overallCTR}%`, icon: TrendingUp, color: overallCTR >= 10 ? 'text-emerald-500' : 'text-amber-500' },
                            ].map(s => (
                              <div key={s.label} className="rounded-2xl bg-muted/20 p-4 text-center border border-black/5">
                                <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                                <p className={`text-2xl font-black tabular-nums italic ${s.color}`}>{s.value}</p>
                                <p className="text-[8px] font-black text-textMuted uppercase tracking-widest mt-1">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            {allListings.map(l => {
                              const views = Number((l as any).views || 0);
                              const clicks = Number((l as any).whatsappClicks || 0);
                              const ctr = views > 0 ? Math.round((clicks / views) * 100) : 0;
                              const isLowConv = views >= 5 && clicks === 0;
                              return (
                                <div key={(l as any).id} className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-4 ${isLowConv ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10' : 'border-black/5 bg-muted/10'}`}>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-black text-textPrimary text-sm truncate">{(l as any).title || 'Untitled'}</p>
                                    <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-0.5">
                                      {views} views • {clicks} clicks • {ctr}% CTR
                                      {isLowConv && <span className="text-amber-600 ml-2">⚠ Low conversion — try boosting</span>}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className={`text-lg font-black tabular-nums ${ctr >= 10 ? 'text-emerald-500' : ctr >= 5 ? 'text-primary' : 'text-textMuted'}`}>{ctr}%</p>
                                    <p className="text-[8px] text-textMuted uppercase">CTR</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {topListing && Number((topListing as any).whatsappClicks || 0) > 0 && (
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 px-4 py-3 flex items-center gap-3">
                              <span className="text-xl">🏆</span>
                              <div>
                                <p className="font-black text-emerald-700 text-sm">Best Performer: {(topListing as any).title}</p>
                                <p className="text-[9px] text-emerald-600 uppercase tracking-widest">{(topListing as any).whatsappClicks} WhatsApp clicks</p>
                              </div>
                            </div>
                          )}

                          {lowConversion.length > 0 && (
                            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 px-4 py-3 flex items-start gap-3">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-black text-amber-700 text-sm">{lowConversion.length} listing{lowConversion.length > 1 ? 's' : ''} need attention</p>
                                <p className="text-[9px] text-amber-600 uppercase tracking-widest">5+ views but zero WhatsApp clicks. Consider better photos, price or boosting.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {tab === "listings" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Stock & Inventory</h3>
                      {myProducts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {myProducts.map((p) => {
                            const health = getListingHealthChecks(p, "product");
                            return (
                              <div key={p.id} className={`rounded-[2rem] bg-white dark:bg-black/10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 border border-black/5 transition-all duration-500 hover:shadow-lg ${p.isSold ? "opacity-40 grayscale" : ""}`}>
                                <img src={p.image} className="h-20 w-20 rounded-2xl object-cover shadow-2xl shrink-0" />
                                <div className="flex-1 w-full min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-lg font-black text-textPrimary uppercase italic leading-none mb-2">{p.title}</h4>
                                      <p className="text-xl font-black text-primary italic tabular-nums">₦{p.price.toLocaleString()}</p>
                                    </div>
                                    {p.isSold && <Badge className="bg-black text-white rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest">SOLD</Badge>}
                                  </div>
                                  <div className="mt-4 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-textMuted">Listing Quality</p>
                                      <p className="text-sm font-black text-primary">{health.score}%</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {health.checks.map((check) => (
                                        <span key={check.label} className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${check.done ? "bg-primary/10 text-primary" : "bg-black/5 text-textMuted"}`}>
                                          {check.done ? "✓" : "•"} {check.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-4 w-full">
                                    <Button onClick={() => goToManagedEdit("products", p.id)} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-black/5 border-none shadow-sm">
                                      <Edit className="h-3.5 w-3.5" /> Edit
                                    </Button>
                                    <Button onClick={() => handleBoostListing(p.id, "products")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-orange-500/10 text-orange-500 border-none shadow-sm">
                                      <Flame className="h-3.5 w-3.5" /> Boost
                                    </Button>
                                    <Button onClick={() => handleShareListing(p, "product")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-600 border-none shadow-sm">
                                      <Share2 className="h-3.5 w-3.5" /> Share
                                    </Button>
                                    {!p.isSold && (
                                      <Button onClick={() => handleMarkSold(p.id)} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-primary/10 text-primary border-none shadow-sm">
                                        <CheckCircle className="h-3.5 w-3.5" /> Mark as Sold
                                      </Button>
                                    )}
                                    {p.isSold && (
                                      <Button onClick={() => handleMarkLive(p.id)} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-500 border-none shadow-sm">
                                        <CheckCircle className="h-3.5 w-3.5" /> Mark Available
                                      </Button>
                                    )}
                                    <Button onClick={() => handleDeleteListing(p.id, "products")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 text-destructive bg-destructive/5 border-none shadow-sm ml-auto">
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <EmptyState icon={Package} label="No Products" />}
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Services</h3>
                      {myServices.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {myServices.map((s) => {
                            const health = getListingHealthChecks(s, "service");
                            return (
                              <div key={s.id} className="rounded-[2rem] bg-white dark:bg-black/10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 border border-black/5 transition-all duration-500 hover:shadow-lg">
                                <img src={s.image || ""} className="h-20 w-20 rounded-2xl object-cover shadow-2xl shrink-0 bg-black/5" />
                                <div className="flex-1 w-full min-w-0">
                                  <h4 className="text-lg font-black text-textPrimary uppercase italic leading-none mb-2">{s.title}</h4>
                                  <p className="text-xl font-black text-primary italic tabular-nums">₦{s.price.toLocaleString()}</p>
                                  <div className="mt-4 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-textMuted">Listing Quality</p>
                                      <p className="text-sm font-black text-primary">{health.score}%</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {health.checks.map((check) => (
                                        <span key={check.label} className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${check.done ? "bg-primary/10 text-primary" : "bg-black/5 text-textMuted"}`}>
                                          {check.done ? "✓" : "•"} {check.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-4 w-full">
                                    <Button onClick={() => goToManagedEdit("services", s.id)} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-black/5 border-none shadow-sm">
                                      <Edit className="h-3.5 w-3.5" /> Edit
                                    </Button>
                                    <Button onClick={() => handleBoostListing(s.id, "services")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-orange-500/10 text-orange-500 border-none shadow-sm">
                                      <Flame className="h-3.5 w-3.5" /> Boost
                                    </Button>
                                    <Button onClick={() => handleShareListing(s, "service")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-600 border-none shadow-sm">
                                      <Share2 className="h-3.5 w-3.5" /> Share
                                    </Button>
                                    <Button onClick={() => handleDeleteListing(s.id, "services")} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 text-destructive bg-destructive/5 border-none shadow-sm ml-auto">
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <EmptyState icon={Wrench} label="No Services" />}
                    </div>
                  </div>
                )}


                {tab === "saved" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Curated Collection</h3>
                    {savedProducts.length > 0 ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedProducts.map((p, i) => (
                          <ProductCard key={p.id} product={p} index={i} isSaved={true} onToggleSave={toggle} />
                        ))}
                      </div>
                    ) : <EmptyState icon={Heart} label="Wishlist Empty" />}
                  </div>
                )}

                {tab === "reviews" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Campus Reputation</h3>
                     {myReviews.length > 0 ? (
                       <div className="grid grid-cols-1 gap-6">
                        {myReviews.map((r) => (
                          <div key={r.id} className="rounded-[2.5rem] bg-white dark:bg-black/10 p-10 border border-black/5 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-8">
                                <div className="flex gap-1">
                                   {Array.from({ length: 5 }).map((_, s) => (
                                      <Star key={s} className={`h-4 w-4 ${s < r.rating ? "fill-warning text-warning" : "text-black/5"}`} />
                                   ))}
                                </div>
                             </div>
                             <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                                   {r.ownerName.charAt(0)}
                                </div>
                                <div>
                                   <p className="text-sm font-black text-textPrimary uppercase tracking-widest">{r.ownerName}</p>
                                   <p className="text-[10px] font-bold text-textMuted uppercase opacity-50">Verified Student</p>
                                </div>
                             </div>
                             <p className="text-base text-textSecondary font-medium leading-relaxed italic">"{r.comment}"</p>
                          </div>
                        ))}
                       </div>
                     ) : <EmptyState icon={Star} label="No Reviews" />}
                  </div>
                )}

                {tab === "settings" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">System Preferences</h3>
                    <div className="grid gap-12 max-w-2xl">
                       <div className="space-y-8">
                          <h4 className="text-[11px] font-black text-textPrimary uppercase tracking-widest border-b border-black/5 pb-4 italic">Core Identity</h4>
                          <div className="grid gap-6">
                             {[
                                { label: "Name", key: "name" },
                                { label: "Bio", key: "bio", area: true },
                             ].map(field => (
                                <div key={field.key} className="space-y-2">
                                   <label className="text-[9px] font-black text-textMuted uppercase tracking-widest ml-4">{field.label}</label>
                                   {field.area ? (
                                      <textarea 
                                        rows={4} 
                                        className="w-full rounded-[1.5rem] bg-black/5 dark:bg-white/5 border-none px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                        value={profileData[field.key as keyof typeof profileData]}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      />
                                   ) : (
                                      <Input 
                                        className="h-14 rounded-2xl bg-black/5 dark:bg-white/5 border-none px-6 text-sm font-black italic tracking-tight" 
                                        value={profileData[field.key as keyof typeof profileData]}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      />
                                   )}
                                </div>
                             ))}
                             
                             <div className="space-y-2">
                                 <label className="text-[9px] font-black text-textMuted uppercase tracking-widest ml-4">Campus</label>
                                 <UniversitySelect
                                    value={profileData.campusId}
                                    onChange={(val) => setProfileData(prev => ({ ...prev, campusId: val }))}
                                 />
                              </div>
                          </div>
                       </div>

                       <div className="space-y-8">
                          <h4 className="text-[11px] font-black text-textPrimary uppercase tracking-widest border-b border-black/5 pb-4 italic">Contact & Network</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-textMuted uppercase tracking-widest ml-4">Phone</label>
                                 <Input 
                                    className="h-14 rounded-2xl bg-black/5 dark:bg-white/5 border-none px-6 text-sm font-black italic tracking-tighter" 
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                                  />
                              </div>
                           </div>
                       </div>

                       <div className="space-y-8">
                          <h4 className="text-[11px] font-black text-textPrimary uppercase tracking-widest border-b border-black/5 pb-4 italic">Notifications</h4>
                          <NotificationSettings />
                       </div>

                       <Button 
                        onClick={async () => {
                          setIsUpdatingProfile(true);
                          try {
                            await updateProfile({ ...profileData });
                            toast.success("Identity updated");
                          } catch { toast.error("Update failed"); }
                          finally { setIsUpdatingProfile(false); }
                        }}
                        disabled={isUpdatingProfile}
                        className="h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                       >
                         {isUpdatingProfile ? "Saving..." : "Save Profile"}
                       </Button>

                       <div className="pt-12 border-t border-error/10">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" className="w-full h-14 rounded-2xl bg-error/10 text-error border-none hover:bg-error/20 font-black uppercase tracking-widest text-[10px]">
                                 Delete Account
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[3rem] p-10 glass border-white/20 shadow-2xl">
                               <AlertDialogHeader>
                                  <AlertDialogTitle className="text-3xl font-black italic uppercase leading-none text-textPrimary">Delete <br /><span className="text-error">Account</span></AlertDialogTitle>
                                  <AlertDialogDescription className="text-xs font-bold text-textMuted uppercase tracking-widest mt-6">This will purge all your data. This action is irreversible.</AlertDialogDescription>
                               </AlertDialogHeader>
                               <div className="mt-10 flex gap-4">
                                  <AlertDialogAction onClick={handleDeleteAccount} className="flex-1 h-14 rounded-2xl bg-error text-white font-black uppercase tracking-widest text-[10px]">Delete</AlertDialogAction>
                                  <AlertDialogCancel className="flex-1 h-14 rounded-2xl bg-black/5 text-textPrimary font-black uppercase tracking-widest text-[10px] border-none">Cancel</AlertDialogCancel>
                               </div>
                            </AlertDialogContent>
                          </AlertDialog>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="rounded-[3rem] p-10 glass border-white/20 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black italic uppercase leading-none text-textPrimary">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-textMuted uppercase tracking-widest mt-6">{confirmDialog.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-10 flex gap-4">
            <AlertDialogAction 
              onClick={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
              className="flex-1 h-14 rounded-2xl bg-error text-white font-black uppercase tracking-widest text-[10px]"
            >
              Confirm
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl bg-black/5 text-textPrimary font-black uppercase tracking-widest text-[10px] border-none">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EmptyState = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <div className="flex flex-col items-center justify-center py-20 bg-black/5 rounded-[3rem] border-2 border-dashed border-black/5">
    <div className="h-20 w-20 rounded-[2.5rem] bg-white dark:bg-black/20 flex items-center justify-center mb-6 shadow-inner">
       <Icon className="h-8 w-8 text-textMuted/20" />
    </div>
    <h4 className="text-xl font-black text-textMuted uppercase italic tracking-tighter opacity-20">{label}</h4>
  </div>
);

export default Dashboard;

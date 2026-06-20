import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, Service } from "@/lib/mock-data";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { Plus, Edit, Trash2, Package, Wrench, Settings, Eye, Star, CheckCircle, Heart, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { NotificationSettings } from "@/features/notifications/components/NotificationSettings";
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
  const [tab, setTab] = useState<Tab>("overview");
  const { savedIds, toggle } = useSavedItems();
  const { user, deleteAccount, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [myProducts, setMyProducts] = useState<Product[]>([]);
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
        const qProducts = query(collection(db, "products"), where("ownerId", "==", user.id));
        const prodSnap = await getDocs(qProducts);
        setMyProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

        const qServices = query(collection(db, "services"), where("ownerId", "==", user.id));
        const servSnap = await getDocs(qServices);
        setMyServices(servSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

        const qReviews = query(collection(db, "reviews"), where("ownerId", "==", user.id));
        const reviewSnap = await getDocs(qReviews);
        const fetchedReviews = reviewSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        fetchedReviews.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
          return tB - tA;
        });
        setMyReviews(fetchedReviews);

        const allProdSnap = await getDocs(collection(db, "products"));
        const allProds = allProdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setSavedProducts(allProds.filter(p => savedIds.includes(p.id)));
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user, savedIds]);
  
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

  const handleDeleteListing = async (id: string, type: "products" | "services") => {
    setConfirmDialog({
      open: true,
      title: "Delete Listing",
      desc: "Are you sure you want to permanently delete this listing? This action cannot be undone and will remove all associated media.",
      action: async () => {
        try {
          const docRef = doc(db, type, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.mediaData && Array.isArray(data.mediaData)) {
              await Promise.all(
                data.mediaData.map((m: any) => deleteFromCloudinary(m.publicId, m.resourceType || 'image'))
              );
            } else if (data.public_id) {
              await deleteFromCloudinary(data.public_id, data.resource_type || 'image');
            }
          }

          await deleteDoc(docRef);
          
          if (type === "products") setMyProducts(prev => prev.filter(p => p.id !== id));
          if (type === "services") setMyServices(prev => prev.filter(s => s.id !== id));
          
          toast.success("Listing deleted successfully");
        } catch (error) {
          console.error("Error deleting listing:", error);
          toast.error("Failed to delete listing");
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
      navigate("/signup");
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] pb-32 md:pb-10">
      <Navbar />
      
      {/* Dashboard Header */}
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-black/5 bg-surface">
        <div className="px-6 max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center rounded-2xl bg-primary/10 px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] w-fit shadow-sm border border-primary/5">
              Dashboard
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-textPrimary tracking-tight italic uppercase leading-none pr-4">
              My <span className="text-gradient pr-4 inline-block">Dashboard</span>
            </h1>
            <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest opacity-60 italic max-w-md">Manage your listings, orders, and campus presence from one high-fidelity interface.</p>
          </div>
          <Link to="/dashboard/new">
            <Button className="h-16 px-10 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-3">
              <Plus className="h-4 w-4" /> Add Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="md:col-span-3">
            <div className="relative">
              <div className="glass rounded-[2.5rem] p-4 flex md:flex-col gap-2 overflow-x-auto scrollbar-none border-white/20 shadow-xl w-full max-w-[calc(100vw-3rem)] md:max-w-none">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
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

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Inventory", count: myProducts.length, icon: Package, color: "text-primary" },
                        { label: "Expertise", count: myServices.length, icon: Wrench, color: "text-accent" },
                        { label: "Curated", count: savedIds.length, icon: Heart, color: "text-rose-500" },
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
                  </div>
                )}

                {tab === "listings" && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40">Stock & Inventory</h3>
                      {myProducts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {myProducts.map((p) => (
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
                                <div className="flex flex-wrap gap-2 mt-4 w-full">
                                  <Button onClick={() => navigate(`/dashboard/edit/products/${p.id}`)} variant="outline" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-black/5 border-none shadow-sm">
                                    <Edit className="h-3.5 w-3.5" /> Edit
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
                          ))}
                        </div>
                      ) : <EmptyState icon={Package} label="No Products" />}
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

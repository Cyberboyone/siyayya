import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, Service, ProductRequest } from "@/lib/mock-data";
import { useSavedItems } from "@/hooks/use-saved-items";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { Plus, Edit, Trash2, Package, Wrench, FileText, Settings, Eye, Star, CheckCircle, Heart, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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

type Tab = "overview" | "listings" | "requests" | "saved" | "reviews" | "settings";

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
  const { savedIds, isSaved, toggle } = useSavedItems();
  const { user, isAuthenticated, updateProfile, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [myRequests, setMyRequests] = useState<ProductRequest[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    department: user?.department || "",
    phone: user?.phone || "",
    email: user?.email || "",
    bio: (user as any)?.bio || "",
    whatsapp: (user as any)?.whatsapp || "",
    university: (user as any)?.university || "",
    faculty: (user as any)?.faculty || "",
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
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }

    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // Fetch My Products
        const qProducts = query(collection(db, "products"), where("ownerId", "==", user.id));
        const prodSnap = await getDocs(qProducts);
        setMyProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

        // Fetch My Services
        const qServices = query(collection(db, "services"), where("ownerId", "==", user.id));
        const servSnap = await getDocs(qServices);
        setMyServices(servSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

        // Fetch My Requests (mock array fallback temporarily if collection empty)
        const qRequests = query(collection(db, "requests"), where("ownerId", "==", user.id));
        const reqSnap = await getDocs(qRequests);
        setMyRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));

        // Fetch Reviews Received
        const qReviews = query(collection(db, "reviews"), where("ownerId", "==", user.id));
        const reviewSnap = await getDocs(qReviews);
        const fetchedReviews = reviewSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        fetchedReviews.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
          return tB - tA;
        });
        setMyReviews(fetchedReviews);

        // Fetch Saved Items (need multiple documents by ID, so fetch all products and filter locally for now to minimize reads)
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
  }, [isAuthenticated, navigate, user, savedIds]);
  
  // Keep profile form in sync if user loads after mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        department: user.department || "",
        phone: user.phone || "",
        email: user.email || "",
        bio: (user as any).bio || "",
        whatsapp: (user as any).whatsapp || "",
        university: (user as any).university || "",
        faculty: (user as any).faculty || "",
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

  const handleDeleteListing = async (id: string, type: "products" | "services" | "requests") => {
    setConfirmDialog({
      open: true,
      title: "Delete Listing",
      desc: "Are you sure you want to permanently delete this listing? This action cannot be undone and will remove all associated media.",
      action: async () => {
        try {
          // 1. Get the listing data to find media assets
          const docRef = doc(db, type, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // 2. Delete from Cloudinary
            if (data.mediaData && Array.isArray(data.mediaData)) {
              await Promise.all(
                data.mediaData.map((m: any) => deleteFromCloudinary(m.publicId, m.resourceType || 'image'))
              );
            } else if (data.public_id) {
              await deleteFromCloudinary(data.public_id, data.resource_type || 'image');
            }
          }

          // 3. Delete from Firestore
          await deleteDoc(docRef);
          
          if (type === "products") setMyProducts(prev => prev.filter(p => p.id !== id));
          if (type === "services") setMyServices(prev => prev.filter(s => s.id !== id));
          if (type === "requests") setMyRequests(prev => prev.filter(r => r.id !== id));
          
          toast.success("Listing deleted successfully");
        } catch (error) {
          console.error("Error deleting listing:", error);
          toast.error("Failed to delete listing");
        }
      }
    });
  };

  const handleMarkSold = async (id: string) => {
    try {
      await updateDoc(doc(db, "products", id), { isSold: true });
      setMyProducts(prev => prev.map(p => p.id === id ? { ...p, isSold: true } : p));
      toast.success("Product marked as sold");
    } catch (error) {
      console.error("Error updating listing:", error);
      toast.error("Failed to update product status");
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "listings", label: "My Listings", icon: Package },
    { id: "requests", label: "My Requests", icon: FileText },
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="container py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-textPrimary tracking-tighter capitalize">{user?.businessName || user?.name}'s Dashboard</h1>
            <p className="text-sm font-bold text-textSecondary uppercase tracking-widest mt-1">Manage your campus trade profile</p>
          </div>
          <Link to="/dashboard/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/95 shadow-md gap-2 h-11 px-6 rounded-xl">
              <Plus className="h-5 w-5" /> New Listing
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-3 space-y-1 block overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal pb-2 md:pb-0 scrollbar-none border-b md:border-b-0 md:border-r border-border pr-0 md:pr-4">
            <div className="flex md:flex-col gap-2 min-w-max md:min-w-0 px-1 md:px-0">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                    tab === t.id
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-textSecondary hover:bg-muted hover:text-textPrimary"
                  }`}
                >
                  <t.icon className={`h-5 w-5 ${tab === t.id ? "text-white" : "text-textSecondary"}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-9 min-h-[500px]">
            {isLoading ? (
              <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {tab === "overview" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="rounded-[2rem] border border-black/5 bg-surface p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm relative overflow-hidden">
                  <div className="h-20 w-20 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-black border-4 border-background shadow-sm z-10 overflow-hidden">
                    {(user as any)?.photoUrl ? (
                      <img src={(user as any).photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (user?.businessName || user.name).charAt(0)
                    )}
                  </div>
                  <div className="text-center sm:text-left z-10">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <h2 className="text-2xl font-black text-textPrimary">{user?.businessName || user.name}</h2>
                      {user.isVerified && <VerifiedBadge />}
                    </div>
                    <p className="text-sm font-bold text-textSecondary mt-0.5">{user.department}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 bg-background/50 w-fit sm:mx-0 mx-auto px-3 py-1 rounded-full border border-black/5">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="text-sm font-bold text-textPrimary">{user.rating}</span>
                      <span className="text-xs text-textSecondary">({user.reviewCount || 0} reviews)</span>
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Products", count: myProducts.length, icon: Package },
                  { label: "Services", count: myServices.length, icon: Wrench },
                  { label: "Requests", count: myRequests.length, icon: FileText },
                  { label: "Saved", count: savedIds.length, icon: Heart },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[1.5rem] border border-black/5 bg-surface p-4 text-center shadow-sm">
                    <stat.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-black text-textPrimary tabular-nums">{stat.count}</p>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
              </div>
            )}

            {tab === "listings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              {/* Products Section */}
              <div>
                <h3 className="font-black text-lg text-textPrimary mb-3 flex items-center gap-2 tracking-tighter">
                  <Package className="h-5 w-5 text-primary" /> Products ({myProducts.length})
                </h3>
                {myProducts.length > 0 ? (
                  <div className="space-y-3">
                    {myProducts.map((p) => (
                      <div key={p.id} className={`rounded-[1.5rem] border border-black/5 bg-surface p-3 flex gap-3 shadow-sm ${p.isSold ? "opacity-50" : ""}`}>
                        <img src={p.image} alt={p.title} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-textPrimary truncate">{p.title}</h3>
                              <p className="text-sm font-black text-primary tabular-nums">{formatPrice(p.price)}</p>
                            </div>
                            {p.isSold && (
                              <span className="text-[9px] font-black bg-muted text-textSecondary px-2 py-0.5 rounded-full shrink-0 uppercase tracking-widest">SOLD</span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Link to={`/dashboard/edit/products/${p.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Edit className="h-3 w-3" /> Edit
                              </Button>
                            </Link>
                            {!p.isSold && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs gap-1"
                                onClick={() => handleMarkSold(p.id)}
                              >
                                <CheckCircle className="h-3 w-3" /> Mark Sold
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteListing(p.id, "products")}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You have no products listed.</p>
                )}
              </div>

              {/* Services Section */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" /> Services ({myServices.length})
                </h3>
                {myServices.length > 0 ? (
                  <div className="space-y-3">
                    {myServices.map((s) => (
                      <div key={s.id} className="rounded-[1.5rem] border border-black/5 bg-surface p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-black text-textPrimary">{s.title}</h3>
                            <p className="text-sm text-primary font-black tabular-nums mt-0.5">{s.priceLabel} {formatPrice(s.price)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Link to={`/dashboard/edit/services/${s.id}`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl border-black/5 bg-muted transition-all duration-200 hover:bg-gray-200">
                                <Edit className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs gap-1.5 text-error hover:text-error rounded-xl border-black/5 bg-muted transition-all duration-200 hover:bg-gray-100"
                              onClick={() => handleDeleteListing(s.id, "services")}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-textSecondary mt-2 line-clamp-2 font-medium">{s.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You have no services listed.</p>
                )}
              </div>
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">My Requests</h3>
                <Button variant="outline" size="sm" className="hidden sm:flex h-8 text-xs">View All</Button>
              </div>
              {myRequests.map((r) => (
                <div key={r.id} className="rounded-[1.5rem] border border-black/5 bg-surface p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-base text-textPrimary tracking-tight">{r.title}</h3>
                      <p className="text-sm text-primary font-black tabular-nums mt-1">Budget: {formatPrice(r.budget)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/dashboard/edit/requests/${r.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl border-black/5 bg-muted transition-all duration-200 hover:bg-gray-200">
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs gap-1.5 text-error hover:text-error bg-muted hover:bg-gray-100 rounded-xl transition-all duration-200"
                        onClick={() => handleDeleteListing(r.id, "requests")}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-textSecondary mt-3 leading-relaxed font-medium">{r.description}</p>
                </div>
              ))}
              {myRequests.length === 0 && (
                 <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                    <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="font-medium text-base">No active requests</p>
                    <p className="text-sm mt-1">Looking for something specific? Create a request.</p>
                 </div>
              )}
            </div>
          )}

          {tab === "saved" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Saved Items ({savedProducts.length})</h3>
              </div>
              {savedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} isSaved={true} onToggleSave={toggle} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-textSecondary border-2 border-dashed border-black/5 rounded-[2rem] bg-surface/50">
                  <Heart className="h-10 w-10 mx-auto mb-3 text-textSecondary/30" />
                  <p className="font-black text-base text-textPrimary uppercase tracking-widest">No saved items yet</p>
                  <p className="text-sm mt-1 max-w-xs mx-auto font-medium">Tap the heart icon on any product to save it to your wishlist.</p>
                </div>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> Reviews Received ({myReviews.length})
              </h3>
              {myReviews.length > 0 ? (
                <div className="space-y-3">
                  {myReviews.map((r) => (
                    <div key={r.id} className="rounded-[1.5rem] border border-black/5 bg-surface p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                            {r.ownerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-sm text-textPrimary tracking-tight">{r.ownerName}</p>
                            <p className="text-xs font-bold text-textSecondary uppercase tracking-widest">Verified User</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-warning text-warning" : "text-black/10"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-textSecondary leading-relaxed font-medium">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-card/50">
                  <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-semibold text-base text-foreground">No reviews received yet</p>
                  <p className="text-sm mt-1 text-muted-foreground max-w-xs mx-auto">When buyers review your listings, their feedback will appear here.</p>
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="rounded-[2rem] border border-black/5 bg-surface p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-textPrimary tracking-tight">Profile Settings</h2>
                  <p className="text-sm font-bold text-textSecondary mt-1">Update your profile information visible to others.</p>
                </div>
                {user && (
                  <Link to={`/user/${user.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs">
                      View Profile
                    </Button>
                  </Link>
                )}
              </div>

              <div className="grid gap-5">
                {/* Basic Info */}
                <div className="border-b border-black/5 pb-1">
                  <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-4">Basic Information</h3>
                  <div className="grid gap-4">
                    <div className="space-y-1.5 mb-2">
                       <label className="text-xs font-black uppercase tracking-widest text-textPrimary ml-1">Profile Photo</label>
                       <div className="flex items-start gap-4">
                         <div className="h-20 w-20 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold overflow-hidden border">
                           {profileData.photoUrl ? (
                             <img src={profileData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                           ) : (
                             profileData.name.charAt(0)
                           )}
                         </div>
                         <div className="flex-1 max-w-sm">
                           <p className="text-xs text-muted-foreground mt-2">
                             Profile photo uploads are currently disabled to optimize performance.
                           </p>
                         </div>
                       </div>
                    </div>
                    {[
                      { label: "Full Name", key: "name", placeholder: "Your full name" },
                      { label: "Bio", key: "bio", placeholder: "Tell others about yourself..." },
                      { label: "Phone Number", key: "phone", placeholder: "+234..." },
                      { label: "WhatsApp Number", key: "whatsapp", placeholder: "+234... (if different)" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-textPrimary ml-1">{field.label}</label>
                        {field.key === "bio" ? (
                          <textarea
                            rows={3}
                            placeholder={field.placeholder}
                            value={profileData[field.key as keyof typeof profileData]}
                            onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        ) : (
                          <Input
                            type="text"
                            placeholder={field.placeholder}
                            value={profileData[field.key as keyof typeof profileData]}
                            onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="bg-background/50"
                          />
                        )}
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-textPrimary ml-1">Email Address <span className="text-[10px] text-textSecondary font-bold">(read-only)</span></label>
                      <Input type="email" value={profileData.email} disabled className="bg-muted opacity-70 cursor-not-allowed border-black/5 text-textPrimary font-bold" />
                    </div>
                  </div>
                </div>

                {/* Campus Info */}
                <div className="border-b border-black/5 pb-1">
                  <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-4">Campus Information</h3>
                  <div className="grid gap-4">
                    {[
                      { label: "University Name", key: "university", placeholder: "Federal University of Kashere" },
                      { label: "Faculty / Department", key: "faculty", placeholder: "e.g. Computer Science" },
                      { label: "Level", key: "level", placeholder: "e.g. 200L, 300L" },
                      { label: "Campus Area / Hostel", key: "campusArea", placeholder: "e.g. Block A, Male Hostel" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-textPrimary ml-1">{field.label}</label>
                        <Input
                          type="text"
                          placeholder={field.placeholder}
                          value={profileData[field.key as keyof typeof profileData]}
                          onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="bg-background/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    className="bg-primary text-white hover:bg-primaryDark shadow-md w-full sm:w-auto h-11 px-8 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                    onClick={async () => {
                      setIsUpdatingProfile(true);
                      try {
                        await updateProfile({
                          name: profileData.name,
                          department: profileData.faculty || profileData.department,
                          phone: profileData.phone,
                          ...(profileData as any),
                        });
                        toast.success("Profile updated successfully");
                      } catch (error) {
                        toast.error("Failed to update profile");
                      } finally {
                        setIsUpdatingProfile(false);
                      }
                    }}
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Profile"}
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 mt-4 border-t border-destructive/10">
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="text-base font-black uppercase tracking-wider">Danger Zone</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Deleting your account is permanent. All your products, services, and requests will be removed from Siyayya forever.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          disabled={isUpdatingProfile}
                          className="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-destructive/20"
                        >
                          {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete My Account Permanently"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] border-white/40 glass-card p-10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black text-foreground italic tracking-tighter">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground font-medium text-base mt-2">
                            This action <span className="text-destructive font-black underline">cannot be undone</span>. 
                            This will permanently delete your account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                          <AlertDialogCancel className="rounded-2xl h-12 font-bold hover:bg-secondary">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteAccount}
                            className="rounded-2xl h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-xs shadow-xl shadow-destructive/20"
                          >
                            Yes, Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
        )}
        </div>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="rounded-3xl border-white/40 glass-card p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-foreground italic tracking-tighter">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium text-base mt-2">
              {confirmDialog.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl h-12 font-bold hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
              className="rounded-2xl h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-xs shadow-xl shadow-destructive/20"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
};

export default Dashboard;

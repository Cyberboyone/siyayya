import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, Calendar, Phone,
  Package, Wrench, Loader2, Edit,
  Mail, MessageSquare, Heart, Users, ShieldAlert, Award
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { ServiceCard } from "@/features/services/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Product, Service } from "@/lib/mock-data";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { 
  doc, getDoc, collection, query, where, getDocs, 
  limit, updateDoc, serverTimestamp, setDoc, deleteDoc
} from "firebase/firestore";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { getBreadcrumbSchema } from "@/components/SEOStructuredData";
import { toast } from "sonner";

type ProfileTab = "products" | "services" | "reviews" | "network";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

function timeAgo(dateStr: any): string {
  if (!dateStr) return "";
  const date = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${Math.max(1, days)} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

function formatJoinDate(dateStr: any): string {
  if (!dateStr) return "a while";
  try {
    const date = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch {
    return "a while";
  }
}

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>("products");
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);

  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Follow/Bio editing states
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  const isOwnProfile = currentUser?.id === userInfo?.id || (currentUser?.usernameLower && username && currentUser.usernameLower === username.toLowerCase());

  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;
      setIsLoading(true);
      try {
        let userDocData: any = null;

        // 1. ID lookup
        try {
          const docRef = doc(db, "users", username);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            userDocData = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          // Ignore
        }

        // 2. Query usernameLower
        if (!userDocData) {
          const q = query(
            collection(db, "users"),
            where("usernameLower", "==", username.toLowerCase()),
            limit(1)
          );
          const snaps = await getDocs(q);
          if (!snaps.empty) {
            const docSnap = snaps.docs[0];
            userDocData = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (userDocData) {
          const id = userDocData.id;
          setEditedBio(userDocData.bio || "");

          // Check if current user is following this profile
          if (currentUser?.id && id !== currentUser.id) {
            const followSnap = await getDoc(doc(db, "user_follows", `${currentUser.id}_${id}`));
            setIsFollowing(followSnap.exists());
          }

          // Parallel query loading
          const [prodsSnap, servsSnap, reviewsSnap, followersSnap, followingSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), where("ownerId", "==", id))),
            getDocs(query(collection(db, "services"), where("ownerId", "==", id))),
            getDocs(query(collection(db, "reviews"), where("ownerId", "==", id))),
            getDocs(query(collection(db, "user_follows"), where("followingId", "==", id))),
            getDocs(query(collection(db, "user_follows"), where("followerId", "==", id))),
          ]);

          const prods = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
          const servs = servsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
          const revs = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));

          setUserProducts(prods.filter(p => !p.isSold));
          setUserServices(servs);
          setUserReviews(revs);
          setUserInfo(userDocData);

          // Get details of follower/following networks
          const tempFollowers = followersSnap.docs.map(d => d.data().followerId);
          const tempFollowing = followingSnap.docs.map(d => d.data().followingId);

          if (tempFollowers.length > 0) {
            const fSnap = await getDocs(query(collection(db, "users"), where("__name__", "in", tempFollowers.slice(0, 30))));
            setFollowersList(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } else {
            setFollowersList([]);
          }

          if (tempFollowing.length > 0) {
            const fgSnap = await getDocs(query(collection(db, "users"), where("__name__", "in", tempFollowing.slice(0, 30))));
            setFollowingList(fgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } else {
            setFollowingList([]);
          }
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error fetching user data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [username, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser?.id || !userInfo) {
      toast.error("Please log in to follow users!");
      return;
    }
    const next = !isFollowing;
    setIsFollowing(next);

    try {
      const followRef = doc(db, "user_follows", `${currentUser.id}_${userInfo.id}`);
      if (next) {
        await setDoc(followRef, { followerId: currentUser.id, followingId: userInfo.id, createdAt: serverTimestamp() });
      } else {
        await deleteDoc(followRef);
      }
      toast.success(next ? `Started following ${userInfo.name}` : `Unfollowed ${userInfo.name}`);
      
      // Update local follower count stat optimistically
      setUserInfo(prev => ({
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 0) + (next ? 1 : -1))
      }));
    } catch {
      setIsFollowing(!next);
      toast.error("Failed to update follow status.");
    }
  };

  const handleSaveBio = async () => {
    if (!userInfo) return;
    setIsSavingBio(true);
    try {
      await updateDoc(doc(db, "users", userInfo.id), {
        bio: editedBio
      });
      setUserInfo(prev => ({ ...prev, bio: editedBio }));
      setIsEditingBio(false);
      toast.success("Profile bio updated!");
    } catch {
      toast.error("Failed to update bio.");
    } finally {
      setIsSavingBio(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    if (!userInfo) return [];
    return [
      { name: "Home", item: "/" },
      { name: "Sellers", item: "/marketplace" },
      { name: userInfo.name || "Member", item: `/user/${userInfo.username || userInfo.id}` }
    ];
  }, [userInfo]);

  useSEO({
    title: userInfo ? `${userInfo.name} (@${userInfo.username || 'member'}) Profile | Siyayya` : "User Profile",
    description: userInfo ? `View listings, trust score, reputation, and reviews for ${userInfo.name} on Siyayya.` : "View student profile.",
    ogType: "profile",
    ogImage: userInfo?.photoUrl || undefined,
    canonical: window.location.href,
    structuredData: getBreadcrumbSchema(breadcrumbs)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 text-center">
          <h2 className="text-xl font-black text-textPrimary mb-2 uppercase tracking-tighter italic">User Not Found</h2>
          <p className="text-textSecondary mb-6 font-medium">This profile doesn't exist or has been removed.</p>
          <Link to="/marketplace" className="text-primary text-sm font-black uppercase tracking-widest hover:underline">← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const avgRating = userReviews.length > 0
    ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1)
    : (userInfo.rating || 0).toFixed(1);

  const totalListings = userProducts.length + userServices.length;



  // Compile reputation badges lists
  const reputationBadges = [];
  if (userInfo.isVerified) reputationBadges.push({ label: "Verified Peer", desc: "Authentic student status", emoji: "🎓" });
  if (userInfo.isAdmin) reputationBadges.push({ label: "Campus Ambassador", desc: "Campus moderator & guide", emoji: "🛡️" });

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-4">
      <Navbar />

      <div className="bg-gradient-to-br from-primary/5 via-surface to-muted/30 border-b border-black/5">
        <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-6 md:py-10">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-textSecondary opacity-40 hover:opacity-100 mb-6 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative shrink-0">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-[2rem] p-1 bg-gradient-to-br from-primary to-emerald-400 shadow-2xl shadow-primary/20">
                {userInfo.photoUrl ? (
                  <img
                    src={userInfo.photoUrl}
                    alt={userInfo.name}
                    className="h-full w-full rounded-[1.8rem] object-cover border-4 border-background"
                  />
                ) : (
                  <div className="h-full w-full rounded-[1.8rem] bg-surface flex items-center justify-center text-primary text-4xl font-black border-4 border-background">
                    {(userInfo.businessName || userInfo.name)?.charAt(0) || "?"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
                <h1 className="text-3xl md:text-5xl font-black text-textPrimary tracking-tight italic uppercase pr-4">{userInfo.businessName || userInfo.name}</h1>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {userInfo.isVerified && <VerifiedBadge iconClassName="h-8 w-8" />}
                  {userInfo.isAdmin && (
                    <span className="bg-accent/10 text-accent text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-accent/10 flex items-center gap-0.5">
                      <Award className="h-3 w-3" /> Ambassador
                    </span>
                  )}
                  <span className="bg-success/10 text-success text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-success/10">Active Student</span>
                </div>
              </div>

              {/* Bio & Edit Bio inline Form */}
              {isEditingBio ? (
                <div className="mb-4 max-w-2xl space-y-2">
                  <Textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    placeholder="Tell other students about yourself..."
                    className="text-xs font-semibold p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/5 resize-none min-h-[80px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingBio(false)} className="rounded-xl text-[9px] h-9">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveBio} disabled={isSavingBio} className="rounded-xl text-[9px] h-9">
                      {isSavingBio ? "Saving..." : "Save Bio"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative group max-w-2xl mb-6">
                  <p className="text-sm md:text-base text-textSecondary font-medium leading-relaxed italic opacity-80 mx-auto md:mx-0">
                    {userInfo.bio || "No bio description written yet."}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="absolute -right-6 top-1/2 -translate-y-1/2 p-1.5 bg-black/5 rounded-full hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      title="Edit Bio"
                    >
                      <Edit className="h-3.5 w-3.5 text-textSecondary" />
                    </button>
                  )}
                </div>
              )}

              {/* Reputation badges summary inline */}
              {reputationBadges.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  {reputationBadges.map((badge) => (
                    <div 
                      key={badge.label} 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/5 text-primary text-[8px] font-black uppercase tracking-wider border border-primary/10"
                      title={badge.desc}
                    >
                      <span>{badge.emoji}</span>
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">

                <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-xl border border-black/5 shadow-sm">
                  🏫 <span className="text-textPrimary">{userInfo.university || "Your University"}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-xl border border-black/5 shadow-sm">
                  <Calendar className="h-3.5 w-3.5" /> <span className="text-textPrimary">Joined {formatJoinDate(userInfo.joinedAt || userInfo.joinDate || "")}</span>
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col gap-3">
              {isOwnProfile ? (
                <Button
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                  onClick={() => navigate("/dashboard?tab=settings")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit My Profile
                </Button>
              ) : (
                <div className="grid grid-cols-2 md:flex md:flex-col gap-3">
                  <Button
                    onClick={handleToggleFollow}
                    className={`h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                      isFollowing 
                        ? "bg-accent/10 border border-accent/20 text-accent shadow-accent/5" 
                        : "bg-accent text-white shadow-accent/20"
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>

                  <Button 
                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20"
                    onClick={() => {
                      const phone = userInfo?.phone || userInfo?.ownerPhone || userInfo?.contactPhone || '';
                      if (phone) {
                        const cleaned = phone.replace(/\D/g, '');
                        const intl = cleaned.startsWith('234') ? cleaned : cleaned.startsWith('0') ? '234' + cleaned.slice(1) : '234' + cleaned;
                        const msg = encodeURIComponent(`Hi ${userInfo?.businessName || userInfo?.name || 'there'}! I saw your profile on Siyayya and I'd like to connect.`);
                        window.open(`https://wa.me/${intl}?text=${msg}`, '_blank', 'noopener,noreferrer');
                      } else {
                        toast.info('This seller has not added a WhatsApp contact number.');
                      }
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { label: "Trust Score", value: `${(Number(avgRating) * 20).toFixed(0)}%`, icon: "🛡️" },
              { label: "Followers", value: userInfo.followersCount || followersList.length, icon: "👥" },
              { label: "Active Listings", value: totalListings, icon: "🛍️" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/40 bg-surface/80 backdrop-blur-2xl p-6 shadow-2xl shadow-black/5 flex flex-col justify-center text-center group hover:bg-surface transition-all">
                <div className="text-2xl md:text-3xl font-black text-textPrimary tabular-nums leading-none mb-2">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-textSecondary opacity-40 group-hover:text-primary transition-colors">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mt-8 px-4 max-w-7xl mx-auto">
        <div className="flex gap-2 border-b border-black/5 mb-8 overflow-x-auto scrollbar-none py-1">
          {[
            { id: "products", label: "Products", count: userProducts.length, icon: Package },
            { id: "services", label: "Services", count: userServices.length, icon: Wrench },
            { id: "reviews", label: "Reviews", count: userReviews.length, icon: Star },
            { id: "network", label: "Network", count: followersList.length + followingList.length, icon: Users },
          ].map((t) => {
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as ProfileTab)}
                className={`flex items-center gap-2.5 px-5 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px shrink-0 ${
                  activeTab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-textMuted hover:text-textPrimary"
                }`}
              >
                <IconComp className="h-4 w-4" />
                {t.label}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  activeTab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-textMuted"
                }`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>



        {activeTab === "products" && (
          userProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
              {userProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="📦" title="No products yet" message="This user hasn't listed any products." />
          )
        )}

        {activeTab === "services" && (
          userServices.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
              {userServices.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="🔧" title="No services yet" message="This user hasn't listed any services." />
          )
        )}

        {/* Network followers / following lists */}
        {activeTab === "network" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 max-w-4xl">
            {/* Followers */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-textPrimary mb-4 border-b border-black/5 pb-2">
                Followers ({followersList.length})
              </h3>
              {followersList.length > 0 ? (
                <div className="space-y-3">
                  {followersList.map((fol) => (
                    <div 
                      key={fol.id} 
                      onClick={() => navigate(`/user/${fol.username || fol.id}`)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-black/5 hover:border-primary/20 hover:shadow transition-all cursor-pointer"
                    >
                      {fol.photoUrl ? (
                        <img src={fol.photoUrl} className="h-8 w-8 rounded-lg object-cover" alt={fol.name} />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                          {fol.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-textPrimary uppercase tracking-tight leading-none">{fol.name}</p>
                        <span className="text-[8px] font-bold text-textMuted opacity-60 mt-1 block">@{fol.username || "student"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-textMuted italic font-bold uppercase tracking-widest py-4">No followers yet</p>
              )}
            </div>

            {/* Following */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-textPrimary mb-4 border-b border-black/5 pb-2">
                Following ({followingList.length})
              </h3>
              {followingList.length > 0 ? (
                <div className="space-y-3">
                  {followingList.map((fol) => (
                    <div 
                      key={fol.id} 
                      onClick={() => navigate(`/user/${fol.username || fol.id}`)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-black/5 hover:border-primary/20 hover:shadow transition-all cursor-pointer"
                    >
                      {fol.photoUrl ? (
                        <img src={fol.photoUrl} className="h-8 w-8 rounded-lg object-cover" alt={fol.name} />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                          {fol.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-textPrimary uppercase tracking-tight leading-none">{fol.name}</p>
                        <span className="text-[8px] font-bold text-textMuted opacity-60 mt-1 block">@{fol.username || "student"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-textMuted italic font-bold uppercase tracking-widest py-4">Not following anyone yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          userReviews.length > 0 ? (
            <div className="space-y-6 pb-8">
              <div className="rounded-[2.5rem] border border-black/5 bg-surface p-8 md:p-12 flex flex-col sm:flex-row items-center gap-12 shadow-xl shadow-black/5">
                <div className="text-center">
                  <div className="text-6xl font-black text-textPrimary tabular-nums tracking-tighter italic">{avgRating}</div>
                  <div className="flex gap-0.5 justify-center mt-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-6 w-6 ${s <= Math.round(Number(avgRating)) ? "fill-warning text-warning shadow-warning/20" : "text-textMuted/20"}`} />
                    ))}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-textSecondary opacity-40 mt-3">{userReviews.length} Verified Review{userReviews.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex-1 space-y-3 w-full max-w-sm">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = userReviews.filter(r => r.rating === star).length;
                    const pct = userReviews.length ? Math.round((count / userReviews.length) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-4 text-right text-textMuted">{star}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-warning rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-textMuted opacity-60">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {userReviews.map(r => (
                <div key={r.id} className="rounded-[2rem] border border-black/5 bg-surface p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shrink-0">
                        {r.userName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-black text-sm text-textPrimary tracking-tight">{r.userName}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-warning text-warning" : "text-textMuted/20"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-40">{timeAgo(r.createdAt?.toDate?.() || r.createdAt)}</span>
                  </div>
                  {r.comment && (
                    <p className="mt-4 text-sm text-textSecondary font-medium leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="⭐" title="No reviews yet" message="This user hasn't received any reviews yet." />
          )
        )}
      </div>
    </div>
  );
};

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-black/5 rounded-[2.5rem] bg-surface/50 mb-8 shadow-inner">
      <div className="text-5xl mb-4 grayscale opacity-20">{icon}</div>
      <p className="font-black text-lg text-textPrimary uppercase tracking-tighter italic">{title}</p>
      <p className="text-xs text-textSecondary font-bold uppercase tracking-widest opacity-40 mt-1">{message}</p>
    </div>
  );
}

export default UserProfile;

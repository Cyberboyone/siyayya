import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, Calendar, Phone,
  Package, Wrench, Loader2, CheckCircle, BadgeCheck, Edit,
  ShieldCheck, Mail
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { formatPrice, Product, Service } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

type ProfileTab = "products" | "services" | "reviews";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${Math.max(1, days)} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

function formatJoinDate(dateStr: string): string {
  if (!dateStr) return "a while";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch {
    return "a while";
  }
}

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("products");
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      try {
        const [userDoc, prodsSnap, servsSnap, reviewsSnap] = await Promise.all([
          getDoc(doc(db, "users", id)),
          getDocs(query(collection(db, "products"), where("ownerId", "==", id))),
          getDocs(query(collection(db, "services"), where("ownerId", "==", id))),
          getDocs(query(collection(db, "reviews"), where("ownerId", "==", id))),
        ]);

        const prods = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        const servs = servsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
        const revs = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));

        setUserProducts(prods.filter(p => !p.isSold));
        setUserServices(servs);
        setUserReviews(revs);

        if (userDoc.exists()) {
          setUserInfo({ id: userDoc.id, ...userDoc.data() });
        } else if (prods.length > 0) {
          setUserInfo({ name: prods[0].ownerName, department: prods[0].ownerDepartment, rating: prods[0].ownerRating });
        } else if (servs.length > 0) {
          setUserInfo({ name: servs[0].ownerName, department: servs[0].ownerDepartment, rating: servs[0].ownerRating });
        }
      } catch (error) {
        console.error("Error fetching user data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [id]);

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
          <h2 className="text-xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">This profile doesn't exist or has been removed.</p>
          <Link to="/marketplace" className="text-primary text-sm hover:underline">← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const avgRating = userReviews.length > 0
    ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1)
    : (userInfo.rating || 0).toFixed(1);

  const totalListings = userProducts.length + userServices.length;

  const whatsappUrl = userInfo.whatsapp || userInfo.phone
    ? `https://wa.me/${(userInfo.whatsapp || userInfo.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I’m interested in your listing on Siyayya`)}`
    : null;

  const tabs: { id: ProfileTab; label: string; count: number; icon: React.ElementType }[] = [
    { id: "products", label: "Products", count: userProducts.length, icon: Package },
    { id: "services", label: "Services", count: userServices.length, icon: Wrench },
    { id: "reviews", label: "Reviews", count: userReviews.length, icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <Navbar />

      {/* Cover/Hero area */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/20 border-b border-border/40">
        <div className="container py-8">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              {userInfo.photoUrl ? (
                <img
                  src={userInfo.photoUrl}
                  alt={userInfo.name}
                  className="h-24 w-24 rounded-2xl object-cover border-4 border-background shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white text-4xl font-black border-4 border-background shadow-lg">
                  {(userInfo.businessName || userInfo.name)?.charAt(0) || "?"}
                </div>
              )}
              {userInfo.isPhoneVerified && (
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow">
                  <BadgeCheck className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Name and info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{userInfo.businessName || userInfo.name}</h1>
                {userInfo.isVerified && <VerifiedBadge iconClassName="h-6 w-6" />}
              </div>

              {userInfo.bio && (
                <p className="text-sm text-muted-foreground mb-2 max-w-xl leading-relaxed">{userInfo.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {(userInfo.department || userInfo.faculty) && (
                  <span className="flex items-center gap-1">
                    📚 {userInfo.faculty || userInfo.department}
                  </span>
                )}
                {userInfo.campusArea && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {userInfo.campusArea}
                  </span>
                )}
                {(userInfo.university) && (
                  <span className="flex items-center gap-1">
                    🏫 {userInfo.university}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Member since {formatJoinDate(userInfo.joinedAt || userInfo.joinDate || "")}
                </span>
              </div>
            </div>

            {/* Edit button (own profile) or Contact buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => navigate("/dashboard?tab=settings")}
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  {userInfo.phone && (
                    <a href={`tel:${userInfo.phone}`}>
                      <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" title="Call">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bb5c] text-white border-0 shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>
                    </a>
                  )}
                  {userInfo.email && (
                    <a href={`mailto:${userInfo.email}`}>
                      <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" title="Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Trust Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Rating", value: avgRating, icon: "⭐" },
              { label: "Reviews", value: userReviews.length, icon: "💬" },
              { label: "Listings", value: totalListings, icon: "🛍️" },
              { label: "Completed", value: userInfo.completedListings || 0, icon: "✅" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur p-4 text-center shadow-sm">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-black text-foreground tabular-nums">{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mt-6">
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === t.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          userProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
              {userProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="📦" title="No products yet" message="This user hasn't listed any products." />
          )
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          userServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {userServices.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="🔧" title="No services yet" message="This user hasn't listed any services." />
          )
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          userReviews.length > 0 ? (
            <div className="space-y-4 pb-8">
              {/* Average rating summary */}
              <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-black text-foreground tabular-nums">{avgRating}</div>
                  <div className="flex gap-0.5 justify-center mt-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-5 w-5 ${s <= Math.round(Number(avgRating)) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{userReviews.length} review{userReviews.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = userReviews.filter(r => r.rating === star).length;
                    const pct = userReviews.length ? Math.round((count / userReviews.length) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right font-medium text-muted-foreground">{star}</span>
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {userReviews.map(r => (
                <div key={r.id} className="rounded-xl border border-border/50 bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shrink-0">
                        {r.userName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{r.userName}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt?.toDate?.() || r.createdAt)}</span>
                  </div>
                  {r.comment && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
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
    <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-card/50 mb-8">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-base text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

export default UserProfile;

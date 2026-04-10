import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch, serverTimestamp,
  addDoc
} from "firebase/firestore";
import { Report, Product, Service, User, categories, formatPrice, ProductRequest } from "@/lib/mock-data";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, Users, Package, Flag, Shield, Loader2,
  Trash2, Ban, CheckCircle, Search, ChevronRight,
  TrendingUp, AlertTriangle, Eye, Star, BadgeCheck,
  UserX, ExternalLink, X, BarChart2, Activity,
  RefreshCw, Menu, Settings as SettingsIcon
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminTab = "overview" | "users" | "listings" | "requests" | "reports" | "settings";

interface AdminUser extends User {
  listingCount?: number;
}

// ─────────────────────────────────────────────────────────────
// Mini bar chart (pure CSS — no extra dependency)
// ─────────────────────────────────────────────────────────────
function MiniBarChart({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-3 opacity-60">{label}</p>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-lg bg-primary/80 transition-all duration-500 hover:bg-primary"
              style={{ height: `${(d.count / max) * 72}px`, minHeight: d.count > 0 ? "4px" : "2px" }}
              title={`${d.count} on ${d.day}`}
            />
            <span className="text-[9px] text-textSecondary font-black uppercase tracking-tighter opacity-50">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, sub
}: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-surface p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center shrink-0 shadow-lg shadow-${color.split("-")[1]}/20`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-textPrimary tabular-nums">{value}</p>
        <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mt-0.5 opacity-60">{label}</p>
        {sub && <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const Admin = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]); // Added for requests
  const [isLoading, setIsLoading] = useState(true);

  // Search/Filter
  const [userSearch, setUserSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [listingCategoryFilter, setListingCategoryFilter] = useState("all");
  const [listingStatusFilter, setListingStatusFilter] = useState("all");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    action: () => void;
  }>({ open: false, title: "", desc: "", action: () => {} });

  const openConfirm = (title: string, desc: string, action: () => void) =>
    setConfirmDialog({ open: true, title, desc, action });
  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false }));

  // ── Fetch all admin data ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersSnap, productsSnap, servicesSnap, reportsSnap, requestsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "requests")),
      ]);

      const rawUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminUser));
      const rawProducts = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      const rawServices = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
      const rawReports = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
      const rawRequests = requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      // Enrich users with listing count
      const enriched = rawUsers.map((u) => ({
        ...u,
        listingCount: rawProducts.filter((p) => p.ownerId === u.id).length +
          rawServices.filter((s) => s.ownerId === u.id).length,
      }));

      setUsers(enriched);
      setProducts(rawProducts);
      setServices(rawServices);
      setReports(rawReports);
      setRequestsList(rawRequests);
    } catch (e) {
      console.error("Admin fetch error:", e);
      toast.error("Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Maintenance ──────────────────────────────────────────
  const handleWipeAllData = async () => {
    openConfirm(
      "🚨 CRITICAL ACTION",
      "This will PERMANENTLY DELETE all products, services, and requests. This action cannot be undone. Are you absolutely sure?",
      async () => {
        setIsLoading(true);
        try {
          const collections = ["products", "services", "requests", "reviews", "reports"];
          let totalDeleted = 0;

          for (const collName of collections) {
            const snap = await getDocs(collection(db, collName));
            console.log(`Wiping ${collName}: ${snap.size} documents`);
            const batch = writeBatch(db);
            
            snap.docs.forEach((d) => {
              batch.delete(d.ref);
              totalDeleted++;
            });
            
            await batch.commit();
          }

          toast.success(`Marketplace wiped successfully. Deleted ${totalDeleted} documents.`);
          fetchAll(); // Refresh stats
        } catch (e) {
          console.error("Wipe error:", e);
          toast.error("Failed to wipe marketplace data fully.");
        } finally {
          setIsLoading(false);
          closeConfirm();
        }
      }
    );
  };

  // ── Stats ─────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newUsersToday = users.filter((u) => {
    const joined = u.joinedAt ? new Date(u.joinedAt) : null;
    return joined && joined >= today;
  }).length;

  const newListingsToday = products.filter((p) => {
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt ? new Date(p.createdAt) : null;
    return ts && ts >= today;
  }).length;

  const activeListings = products.filter((p) => p.status !== "removed" && !p.isSold).length;
  const removedListings = products.filter((p) => p.status === "removed").length;

  // ── Chart data (last 7 days) ──────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const userChartData = last7Days.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = users.filter((u) => {
      const d = u.joinedAt ? new Date(u.joinedAt) : null;
      return d && d >= dayStart && d < dayEnd;
    }).length;
    return { day: dayStart.toLocaleDateString("en", { weekday: "short" }), count };
  });

  const listingChartData = last7Days.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = products.filter((p) => {
      const ts = p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt ? new Date(p.createdAt) : null;
      return ts && ts >= dayStart && ts < dayEnd;
    }).length;
    return { day: dayStart.toLocaleDateString("en", { weekday: "short" }), count };
  });

  // ── Category breakdown ────────────────────────────────────
  const categoryBreakdown = categories
    .map((c) => ({ ...c, count: products.filter((p) => p.category === c.id).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Top users by listing count ────────────────────────────
  const topUsers = [...users]
    .sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0))
    .slice(0, 5);

  // ── Suspicious users (10+ listings) ──────────────────────
  const suspiciousUsers = users.filter((u) => (u.listingCount || 0) >= 10);

  // ─── USER ACTIONS ─────────────────────────────────────────
  const handleDeleteUser = async (u: AdminUser) => {
    openConfirm(
      "Delete User Account",
      `Permanently delete "${u.businessName || u.name}" and all their listings? This cannot be undone.`,
      async () => {
        try {
          // 1. Get all user's listings to find their media
          const [pSnap, sSnap, rSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), where("ownerId", "==", u.id))),
            getDocs(query(collection(db, "services"), where("ownerId", "==", u.id))),
            getDocs(query(collection(db, "requests"), where("ownerId", "==", u.id))),
          ]);

          // 2. Prepare Cloudinary deletions
          const mediaToDelete: { publicId: string; type: string }[] = [];
          [...pSnap.docs, ...sSnap.docs].forEach(docSnap => {
            const data = docSnap.data();
            if (data.mediaData && Array.isArray(data.mediaData)) {
              data.mediaData.forEach((m: any) => {
                if (m.publicId) mediaToDelete.push({ publicId: m.publicId, type: m.resourceType || 'image' });
              });
            } else if (data.public_id) {
               mediaToDelete.push({ publicId: data.public_id, type: data.resource_type || 'image' });
            }
          });

          // 3. Execute Cloudinary deletions
          await Promise.all(mediaToDelete.map(m => deleteFromCloudinary(m.publicId, m.type)));

          // 4. Firestore Batch Deletion
          const batch = writeBatch(db);
          pSnap.forEach((d) => batch.delete(d.ref));
          sSnap.forEach((d) => batch.delete(d.ref));
          rSnap.forEach((d) => batch.delete(d.ref));
          batch.delete(doc(db, "users", u.id));
          
          await batch.commit();
          
          // 5. Update UI
          setUsers((prev) => prev.filter((x) => x.id !== u.id));
          setProducts((prev) => prev.filter((p) => p.ownerId !== u.id));
          setServices((prev) => prev.filter((s) => s.ownerId !== u.id));
          toast.success("User and all data deleted successfully.");
        } catch (e) {
          console.error(e);
          toast.error("Failed to delete user mapping data.");
        }
      }
    );
  };

  const handleToggleBan = async (u: AdminUser) => {
    const isBanned = u.status === "banned";
    openConfirm(
      isBanned ? "Unban User" : "Ban User",
      isBanned
        ? `Restore access for "${u.businessName || u.name}"?`
        : `Suspend "${u.businessName || u.name}"? They will not be able to log in.`,
      async () => {
        try {
          const newStatus = isBanned ? "active" : "banned";
          await updateDoc(doc(db, "users", u.id), { status: newStatus });
          setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: newStatus } : x));
          toast.success(isBanned ? "User unbanned." : "User banned.");
        } catch (e) {
          toast.error("Failed to update user status.");
        }
      }
    );
  };

  const handleToggleVerified = async (u: AdminUser) => {
    const newVal = !u.isVerified;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", u.id), { isVerified: newVal });

      const [pSnap, sSnap, rSnap] = await Promise.all([
        getDocs(query(collection(db, "products"), where("ownerId", "==", u.id))),
        getDocs(query(collection(db, "services"), where("ownerId", "==", u.id))),
        getDocs(query(collection(db, "requests"), where("ownerId", "==", u.id))),
      ]);
      
      pSnap.forEach((d) => batch.update(d.ref, { ownerIsVerified: newVal }));
      sSnap.forEach((d) => batch.update(d.ref, { ownerIsVerified: newVal }));
      rSnap.forEach((d) => batch.update(d.ref, { ownerIsVerified: newVal }));
      
      await batch.commit();

      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isVerified: newVal } : x));
      
      // Update local state for listings to immediately reflect the verification badge
      setProducts((prev) => prev.map((x) => x.ownerId === u.id ? { ...x, ownerIsVerified: newVal } : x));
      // In a more complete implementation, you'd also need to update local state for services and requests if they were loaded in the admin panel.

      toast.success(newVal ? "User marked as verified and listings updated." : "Verified badge removed from user and their listings.");
    } catch (e) {
      toast.error("Failed to update verification.");
    }
  };

  const handleRemoveListing = async (listing: any, isService: boolean = false) => {
    openConfirm(
      "Delete Listing",
      `Permanently delete "${listing.title}"? This will also remove associated media from Cloudinary.`,
      async () => {
        try {
          // 1. Delete associated media from Cloudinary
          if (listing.mediaData && Array.isArray(listing.mediaData)) {
            await Promise.all(
              listing.mediaData.map((m: any) => deleteFromCloudinary(m.publicId, m.resourceType || 'image'))
            );
          } else if (listing.public_id) {
            await deleteFromCloudinary(listing.public_id, listing.resource_type || 'image');
          }

          // 2. Delete from Firestore
          const coll = isService ? "services" : "products";
          await deleteDoc(doc(db, coll, listing.id));

          // 3. Update UI
          if (isService) {
             setServices(prev => prev.filter(s => s.id !== listing.id));
          } else {
             setProducts(prev => prev.filter(p => p.id !== listing.id));
          }
          
          toast.success("Listing deleted permanently.");
        } catch (e) {
          console.error(e);
          toast.error("Failed to delete listing.");
        }
      }
    );
  };

  const handleRestoreListing = async (p: Product) => {
    try {
      await updateDoc(doc(db, "products", p.id), { status: "approved" });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "approved" } : x));
      toast.success("Listing restored.");
    } catch (e) {
      toast.error("Failed to restore listing.");
    }
  };

  // ─── REPORT ACTIONS ───────────────────────────────────────
  const handleDismissReport = async (r: Report) => {
    try {
      await deleteDoc(doc(db, "reports", r.id));
      setReports((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Report dismissed.");
    } catch (e) {
      toast.error("Failed to dismiss report.");
    }
  };

  const handleRemoveReportedListing = async (r: Report) => {
    openConfirm(
      "Remove Reported Listing",
      `Remove "${r.listingTitle}" from the marketplace and dismiss this report?`,
      async () => {
        try {
          const coll = r.listingType === "service" ? "services" : "products";
          await updateDoc(doc(db, coll, r.listingId), { status: "removed" });
          await deleteDoc(doc(db, "reports", r.id));
          setProducts((prev) => prev.map((p) => p.id === r.listingId ? { ...p, status: "removed" } : p));
          setReports((prev) => prev.filter((x) => x.id !== r.id));
          toast.success("Listing removed and report dismissed.");
        } catch (e) {
          toast.error("Failed to remove listing.");
        }
      }
    );
  };

  // ─── Filtered data ─────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.businessName || u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const filteredListings = [
    ...products.map(p => ({ ...p, isService: false })),
    ...services.map(s => ({ ...s, isService: true }))
  ].filter((p) => {
    const q = listingSearch.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(q) || (p.ownerName || "").toLowerCase().includes(q);
    const matchesCategory = listingCategoryFilter === "all" || p.category === listingCategoryFilter || (p.isService && p.category === 'services');
    const matchesStatus = listingStatusFilter === "all"
      ? true
      : listingStatusFilter === "removed" ? (p as any).status === "removed"
      : (p as any).status !== "removed";
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // ─── Sidebar nav ──────────────────────────────────────────
  const navItems: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users, count: users.length },
    { id: "listings", label: "Listings", icon: Package, count: products.length },
    { id: "requests", label: "Requests", icon: Flag, count: requestsList.length },
    { id: "reports", label: "Reports", icon: Flag, count: reports.length },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-textPrimary flex">
      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-black/5 flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:relative lg:flex shadow-sm
      `}>
        {/* Logo */}
        <div className="flex flex-col gap-0 px-6 py-5 border-b border-black/5">
          <Logo textClassName="text-xl" />
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">Admin Panel</p>
          <button
            className="ml-auto lg:hidden text-textMuted hover:text-textPrimary transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${tab === item.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-textSecondary hover:bg-muted hover:text-textPrimary"
                }
              `}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  tab === item.id ? "bg-white/20 text-white" : "bg-muted text-textSecondary"
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Reports alert */}
        {reports.length > 0 && (
          <div className="mx-3 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-300">{reports.length} pending report{reports.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="px-4 py-4 border-t border-black/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
              {(currentUser?.businessName || currentUser?.name || "A").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-textPrimary truncate">{currentUser?.businessName || currentUser?.name}</p>
              <p className="text-[10px] text-primary font-bold">Admin</p>
            </div>
          </div>
          <Link to="/" className="mt-3 flex items-center gap-2 text-[10px] text-textMuted hover:text-textPrimary transition-colors font-black uppercase tracking-widest">
            <ExternalLink className="h-3 w-3" /> Back to Site
          </Link>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden text-textMuted hover:text-textPrimary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-textPrimary tracking-tight capitalize">{tab}</h1>
            <p className="text-xs text-textSecondary font-bold">Siyayya Admin Panel</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-textSecondary hover:text-textPrimary gap-2 bg-muted hover:bg-gray-200 transition-all duration-200"
              onClick={fetchAll}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            </div>
          ) : (
            <>
              {/* ══════════════════════════ OVERVIEW ══════════════════════════ */}
              {tab === "overview" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard label="Total Users" value={users.length} icon={Users} color="bg-blue-600" />
                    <StatCard label="Total Listings" value={products.length} icon={Package} color="bg-purple-600" />
                    <StatCard label="Active Listings" value={activeListings} icon={CheckCircle} color="bg-emerald-600" />
                    <StatCard label="Removed" value={removedListings} icon={Trash2} color="bg-red-600" />
                    <StatCard label="New Users Today" value={newUsersToday} icon={TrendingUp} color="bg-orange-500" />
                    <StatCard label="New Listings Today" value={newListingsToday} icon={Activity} color="bg-cyan-600" />
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-surface border border-black/5 p-6 shadow-sm">
                      <MiniBarChart data={userChartData} label="User Registrations — Last 7 Days" />
                    </div>
                    <div className="rounded-2xl bg-surface border border-black/5 p-6 shadow-sm">
                      <MiniBarChart data={listingChartData} label="Listings Created — Last 7 Days" />
                    </div>
                  </div>

                  {/* Bottom grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Users */}
                    <div className="rounded-2xl bg-surface border border-black/5 p-5 shadow-sm">
                      <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-4 opacity-60">Recent Users</h3>
                      <div className="space-y-3">
                        {users.slice(-5).reverse().map((u) => (
                          <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors duration-200">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                              {(u.businessName || u.name || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-textPrimary truncate tracking-tight">{u.businessName || u.name}</p>
                              <p className="text-[10px] text-textSecondary font-bold truncate opacity-60">{u.email}</p>
                            </div>
                            {u.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>
                        ))}
                        {users.length === 0 && <p className="text-xs text-textSecondary">No users yet.</p>}
                      </div>
                    </div>

                    {/* Top Performers */}
                    <div className="rounded-2xl bg-surface border border-black/5 p-5 shadow-sm">
                      <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-4 opacity-60">Top Sellers</h3>
                      <div className="space-y-3">
                        {topUsers.map((u, i) => (
                          <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors duration-200">
                            <span className="text-xs font-black text-textSecondary/30 w-4">#{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-textPrimary truncate tracking-tight">{u.businessName || u.name}</p>
                            </div>
                            <span className="text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{u.listingCount}</span>
                          </div>
                        ))}
                        {topUsers.length === 0 && <p className="text-xs text-textSecondary">No data yet.</p>}
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="rounded-2xl bg-surface border border-black/5 p-5 shadow-sm">
                      <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-4 opacity-60">Popular Categories</h3>
                      <div className="space-y-3">
                        {categoryBreakdown.map((c, i) => {
                          const maxC = categoryBreakdown[0]?.count || 1;
                          return (
                            <div key={c.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-textPrimary">{c.icon} {c.label}</span>
                                <span className="text-xs font-black text-primary">{c.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-700"
                                  style={{ width: `${(c.count / maxC) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {(reports.length > 0 || suspiciousUsers.length > 0) && (
                    <div className="rounded-2xl bg-[#161b2e] border border-red-500/20 p-5">
                      <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Alerts & Warnings
                      </h3>
                      <div className="space-y-2">
                        {reports.length > 0 && (
                          <div className="flex items-center justify-between bg-red-500/10 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Flag className="h-4 w-4 text-red-400" />
                              <span className="text-sm font-semibold text-white">{reports.length} unresolved reports</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={() => setTab("reports")}>Review</Button>
                          </div>
                        )}
                        {suspiciousUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between bg-orange-500/10 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-400" />
                              <span className="text-sm font-semibold text-white">{u.businessName || u.name} has {u.listingCount}+ listings</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-orange-400 text-xs" onClick={() => setTab("users")}>View</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════ USERS ══════════════════════════ */}
              {tab === "users" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
                      <Input
                        placeholder="Search by name or email..."
                        className="pl-9 bg-surface border-black/5 text-textPrimary placeholder:text-textMuted focus:border-primary/50 rounded-xl"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <p className="text-xs font-black text-textSecondary uppercase tracking-widest self-center shrink-0 opacity-60">{filteredUsers.length} users found</p>
                  </div>

                  <div className="rounded-[2rem] bg-surface border border-black/5 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-black/5 bg-muted/50">
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">User</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest hidden sm:table-cell">Email</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest hidden md:table-cell">Listings</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">Status</th>
                            <th className="text-right px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="border-b border-black/5 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                                    {(u.businessName || u.name || "?").charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-black text-textPrimary text-sm tracking-tight">{u.businessName || u.name}</p>
                                      {u.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                                      {u.role === "admin" && <span className="text-[9px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">Admin</span>}
                                    </div>
                                    <p className="text-[10px] text-textSecondary font-bold opacity-60 uppercase">{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "—"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-textSecondary text-xs font-bold hidden sm:table-cell">{u.email || "—"}</td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                <span className="text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{u.listingCount}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
                                  u.status === "banned"
                                    ? "bg-error/10 text-error"
                                    : "bg-success/10 text-success"
                                }`}>
                                  {u.status === "banned" ? "Banned" : "Active"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-8 text-[10px] gap-1.5 font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${u.isVerified ? "text-warning bg-warning/5 hover:bg-warning/10" : "text-primary bg-primary/5 hover:bg-primary/10"}`}
                                    onClick={() => handleToggleVerified(u)}
                                    title={u.isVerified ? "Remove verified badge" : "Mark as verified"}
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    <span className="hidden lg:inline">{u.isVerified ? "Unverify" : "Verify"}</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-7 text-[10px] gap-1 font-bold ${u.status === "banned" ? "text-emerald-400 hover:text-emerald-300" : "text-orange-400 hover:text-orange-300"}`}
                                    onClick={() => handleToggleBan(u)}
                                    title={u.status === "banned" ? "Unban user" : "Ban user"}
                                  >
                                    {u.status === "banned" ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                    <span className="hidden lg:inline">{u.status === "banned" ? "Unban" : "Ban"}</span>
                                  </Button>
                                  {u.id !== currentUser?.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-[10px] gap-1 font-bold text-red-400 hover:text-red-300"
                                      onClick={() => handleDeleteUser(u)}
                                      title="Delete account"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="hidden lg:inline">Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                        {filteredUsers.length === 0 && (
                          <div className="text-center py-20 text-textSecondary uppercase tracking-widest font-black opacity-30">No users found.</div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════ LISTINGS ══════════════════════════ */}
              {tab === "listings" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
                      <Input
                        placeholder="Search listings..."
                        className="pl-9 bg-surface border-black/5 text-textPrimary placeholder:text-textMuted focus:border-primary/50 rounded-xl"
                        value={listingSearch}
                        onChange={(e) => setListingSearch(e.target.value)}
                      />
                    </div>
                    <select
                      value={listingCategoryFilter}
                      onChange={(e) => setListingCategoryFilter(e.target.value)}
                      className="bg-surface border border-black/15 text-textPrimary text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2 focus:outline-none focus:border-primary/50 shadow-sm"
                    >
                      <option value="all">Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                    <select
                      value={listingStatusFilter}
                      onChange={(e) => setListingStatusFilter(e.target.value)}
                      className="bg-surface border border-black/15 text-textPrimary text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2 focus:outline-none focus:border-primary/50 shadow-sm"
                    >
                      <option value="all">Status</option>
                      <option value="approved">Active</option>
                      <option value="removed">Removed</option>
                    </select>
                    <p className="text-xs font-black text-textSecondary uppercase tracking-widest self-center shrink-0 opacity-60">{filteredListings.length} items</p>
                  </div>

                  <div className="rounded-[2rem] bg-surface border border-black/5 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-black/5 bg-muted/50">
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">Listing</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest hidden md:table-cell">Owner</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest hidden sm:table-cell">Category</th>
                            <th className="text-left px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">Status</th>
                            <th className="text-right px-4 py-4 text-[10px] font-black text-textSecondary uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListings.map((p) => (
                            <tr key={p.id} className={`border-b border-black/5 hover:bg-muted/30 transition-colors ${(p as any).status === "removed" ? "opacity-50" : ""}`}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {p.image ? (
                                    <img src={p.image} alt={p.title} className="h-10 w-10 rounded-xl object-cover shrink-0 border border-black/5" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                      <Package className="h-4 w-4 text-textMuted" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-black text-textPrimary truncate max-w-[180px] tracking-tight">{p.title}</p>
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">{formatPrice((p as any).price)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-white/50 text-xs hidden md:table-cell">{p.ownerName || "Unknown"}</td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className="text-[10px] capitalize text-white/50 bg-white/5 px-2 py-1 rounded-lg font-bold">{p.category}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                                  (p as any).status === "removed"
                                    ? "bg-red-500/20 text-red-400"
                                    : (p as any).isSold
                                    ? "bg-gray-500/20 text-gray-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}>
                                  {(p as any).status === "removed" ? "Removed" : (p as any).isSold ? "Sold" : "Active"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Link to={`/${(p as any).isService ? 'service' : 'product'}/${p.id}`} target="_blank">
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-blue-400 hover:text-blue-300">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="hidden lg:inline">View</span>
                                    </Button>
                                  </Link>
                                  {(p as any).status === "removed" ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300"
                                      onClick={() => handleRestoreListing(p as any)}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      <span className="hidden lg:inline">Restore</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-[10px] gap-1 text-red-400 hover:text-red-300"
                                      onClick={() => handleRemoveListing(p, (p as any).isService)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="hidden lg:inline">Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredListings.length === 0 && (
                        <p className="text-center text-white/30 py-10 text-sm">No listings found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════ REQUESTS ══════════════════════════ */}
              {tab === "requests" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {requestsList.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-2xl">
                      <Package className="h-10 w-10 mx-auto mb-3 text-white/10" />
                      <p className="text-white/30 font-semibold">No requests found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requestsList.map((req) => (
                        <div key={req.id} className="rounded-[1.5rem] bg-surface border border-black/5 p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-black text-textPrimary truncate text-lg tracking-tight">{req.title}</p>
                                {req.isGuest ? (
                                  <span className="bg-orange-500/10 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Guest</span>
                                ) : (
                                  <span className="bg-success/10 text-success text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">User</span>
                                )}
                              </div>
                              <p className="text-[10px] text-textSecondary font-bold uppercase tracking-widest opacity-60 mb-2">Category: {req.category} • Budget: {formatPrice(req.budget || 0)}</p>
                              
                              <div className="bg-muted border border-black/5 rounded-2xl px-4 py-3 mb-3">
                                <p className="text-sm text-textPrimary font-medium leading-relaxed">{req.description}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 text-xs">
                                <div className="space-y-1">
                                  <p className="text-textSecondary uppercase tracking-widest font-black text-[9px] opacity-40">Contact Info</p>
                                  <p className="text-textSecondary font-bold">Name: <span className="text-textPrimary">{req.ownerName || req.guestName || "Unknown"}</span></p>
                                  {(req.contactPhone || req.whatsapp) && (
                                    <p className="text-textSecondary font-bold">Phone: <span className="text-textPrimary">{req.contactPhone || req.whatsapp}</span></p>
                                  )}
                                  {req.guestEmail && (
                                    <p className="text-textSecondary font-bold">Email: <span className="text-textPrimary">{req.guestEmail}</span></p>
                                  )}
                                </div>
                                <div className="space-y-1 md:text-right">
                                  <p className="text-textSecondary uppercase tracking-widest font-black text-[9px] opacity-40">Posted On</p>
                                  <p className="text-textPrimary font-black">
                                    {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : new Date(req.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2 pt-3 border-t border-black/5 justify-end">
                            {(req.contactPhone || req.whatsapp) && (
                               <a href={`https://wa.me/${(req.whatsapp || req.contactPhone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                                 <Button size="sm" variant="ghost" className="text-success hover:text-white bg-success/5 hover:bg-success text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl border border-success/10 transition-all duration-200 h-9 px-4">
                                   Respond WhatsApp
                                 </Button>
                               </a>
                            )}
                            {req.guestEmail && (
                               <a href={`mailto:${req.guestEmail}`} target="_blank" rel="noreferrer">
                                 <Button size="sm" variant="ghost" className="text-primary hover:text-white bg-primary/5 hover:bg-primary text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl border border-primary/10 transition-all duration-200 h-9 px-4">
                                   Email Guest
                                 </Button>
                               </a>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs shrink-0"
                              onClick={async () => {
                                if(window.confirm("Delete this request?")) {
                                  try {
                                    await deleteDoc(doc(db, "requests", req.id));
                                    setRequestsList(prev => prev.filter(r => r.id !== req.id));
                                    toast.success("Request deleted");
                                  } catch (e) {
                                    toast.error("Failed to delete request");
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════ REPORTS ══════════════════════════ */}
              {tab === "reports" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {reports.length === 0 ? (
                    <div className="text-center py-20 border border-black/5 rounded-[2rem] bg-surface/50">
                      <Flag className="h-10 w-10 mx-auto mb-3 text-textSecondary opacity-10" />
                      <p className="text-textSecondary font-black uppercase tracking-widest opacity-40">No pending reports</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports.map((r) => (
                        <div key={r.id} className="rounded-[1.5rem] bg-surface border border-error/10 p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Flag className="h-4 w-4 text-error shrink-0" />
                                <p className="font-black text-textPrimary truncate tracking-tight">{r.listingTitle || "Unknown Listing"}</p>
                              </div>
                              <p className="text-[10px] text-textSecondary font-bold uppercase tracking-widest opacity-60 mb-3">
                                Reported by <span className="text-textPrimary">{r.reportedByName || r.reportedBy}</span>
                                {r.createdAt && (
                                  <> · {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}</>
                                )}
                              </p>
                              <div className="bg-error/5 border border-error/10 rounded-xl px-4 py-3">
                                <p className="text-sm text-textPrimary font-medium">{r.reason}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4 pt-4 border-t border-black/5 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-textSecondary hover:text-textPrimary bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4"
                              onClick={() => handleDismissReport(r)}
                            >
                              Dismiss Report
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl h-9 px-4"
                              onClick={() => handleRemoveReportedListing(r)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Listing
                            </Button>
                            {r.listingId && (
                              <Link to={`/${r.listingType === "service" ? "service" : "product"}/${r.listingId}`} target="_blank">
                                <Button size="sm" variant="ghost" className="text-primary hover:text-white bg-primary/5 hover:bg-primary text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl h-9 px-4 border border-primary/10">
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Confirm Dialog ── */}
      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirm}>
        <AlertDialogContent className="rounded-[2rem] border-black/5 bg-surface text-textPrimary px-8 py-10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-textPrimary tracking-tight italic">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-textSecondary font-medium text-base mt-2">
              {confirmDialog.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="bg-muted border-black/5 text-textPrimary hover:bg-gray-200 rounded-xl font-bold h-12 uppercase tracking-widest text-[10px]">Cancel Action</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error hover:bg-red-700 text-white rounded-xl font-black h-12 uppercase tracking-widest text-[10px] px-8"
              onClick={() => { confirmDialog.action(); closeConfirm(); }}
            >
              Confirm Execution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;

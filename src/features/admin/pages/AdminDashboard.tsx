import { useState, useEffect, useCallback, Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, writeBatch
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Package, Flag, Loader2,
  Trash2, Ban, CheckCircle, Search, RefreshCw, ExternalLink, Edit, X, ShoppingBag, ChevronDown, BarChart3, Gift, Download, Printer
} from "lucide-react";

import { ADMIN_EMAILS } from "@/lib/config";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const isEmailAdmin = !!currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
  const [activeTab, setActiveTab] = useState<"users" | "listings" | "reports" | "orders" | "analytics" | "referrals">("analytics");
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersSnap, productsSnap, servicesSnap, reportsSnap, ordersSnap, referralsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "referrals")),
      ]);

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const allListings = [
        ...productsSnap.docs.map(d => ({ id: d.id, type: 'product', ...d.data() })),
        ...servicesSnap.docs.map(d => ({ id: d.id, type: 'service', ...d.data() }))
      ].sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return (dateB as any) - (dateA as any);
      });

      setListings(allListings);
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReferrals(referralsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return (dateB as any) - (dateA as any);
      }));
      
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return (dateB as any) - (dateA as any);
      }));
      
      toast.success("Admin data refreshed");
    } catch (error: any) {
      console.error("Admin Fetch error:", error);
      toast.error(`Failed to load admin data`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkAdmin = () => {
    const isEmailAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
    if (!currentUser || (!isAdmin && !isEmailAdmin)) {
       toast.error("Unauthorized action restricted to admins");
       return false;
    }
    return true;
  };


  const openUserDashboard = (targetUser: any) => {
    if (!checkAdmin()) return;
    const userId = String(targetUser?.id || '');
    const userName = String(targetUser?.businessName || targetUser?.name || targetUser?.email || userId);
    navigate(`/dashboard?tab=listings&userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!checkAdmin()) return;
    if (!confirm("Are you sure? This will delete the user permanently.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success("User deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    if (!checkAdmin()) return;
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "users", userId), {
        isVerified: newStatus
      });
      
      const batch = writeBatch(db);
      const productsQuery = query(collection(db, "products"), where("ownerId", "==", userId));
      const servicesQuery = query(collection(db, "services"), where("ownerId", "==", userId));
      
      const [pSnap, sSnap] = await Promise.all([getDocs(productsQuery), getDocs(servicesQuery)]);
      pSnap.forEach(d => batch.update(d.ref, { ownerIsVerified: newStatus }));
      sSnap.forEach(d => batch.update(d.ref, { ownerIsVerified: newStatus }));
      await batch.commit();

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: newStatus } : u));
      toast.success(newStatus ? "User verified (listings updated)" : "User unverified");
    } catch (e) {
      console.error("Verification toggle error:", e);
      toast.error("Status update failed");
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    if (!checkAdmin()) return;
    try {
      await updateDoc(doc(db, "users", userId), {
        isBanned: !currentStatus
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
      toast.success(currentStatus ? "User unbanned" : "User banned");
    } catch (e) {
      toast.error("Ban status update failed");
    }
  };

  const handleUpdateStatus = async (id: string, type: string, newStatus: string) => {
    if (!checkAdmin()) return;
    try {
      const coll = type === 'service' ? 'services' : 'products';
      await updateDoc(doc(db, coll, id), { status: newStatus });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      toast.success(`Listing ${newStatus}`);
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleToggleFeature = async (id: string, type: string, currentStatus: boolean) => {
    if (!checkAdmin()) return;
    try {
      const coll = type === 'service' ? 'services' : 'products';
      const newStatus = !currentStatus;
      await updateDoc(doc(db, coll, id), {
        isFeatured: newStatus,
        boostedAt: newStatus ? new Date() : null,
      });
      setListings(prev => prev.map(l => l.id === id ? { ...l, isFeatured: newStatus, boostedAt: newStatus ? new Date() : null } : l));
      toast.success(currentStatus ? "Feature removed" : "Listing featured and boosted to Fresh Today!");
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleDeleteListing = async (id: string, type: string) => {
    if (!checkAdmin()) return;
    if (!confirm("Delete this listing?")) return;
    try {
      const coll = type === 'service' ? 'services' : 'products';
      await deleteDoc(doc(db, coll, id));
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success("Listing removed");
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!checkAdmin()) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order status updated to ${newStatus}`);
    } catch (e) {
      toast.error("Failed to update order status");
    }
  };

  const activeUsers7d = users.filter((u: any) => {
    const raw = u.lastActive || u.lastLoginAt || u.updatedAt || u.joinedAt;
    const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
    return date && Date.now() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const totalWhatsappClicks = listings.reduce((sum: number, listing: any) => sum + Number(listing.whatsappClicks || 0), 0);

  const getUserActivityBucket = (user: any) => {
    const raw = user.lastActive || user.lastLoginAt || user.updatedAt || user.joinedAt;
    const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) return 'inactive';
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'active';
    if (diffDays <= 30) return 'dormant';
    return 'inactive';
  };

  const activeUsers = users.filter((u: any) => getUserActivityBucket(u) === 'active');
  const dormantUsers = users.filter((u: any) => getUserActivityBucket(u) === 'dormant');
  const inactiveUsers = users.filter((u: any) => getUserActivityBucket(u) === 'inactive');

  const exportUsersReport = () => {
    const rows = users.map((u: any) => {
      const raw = u.lastActive || u.lastLoginAt || u.updatedAt || u.joinedAt;
      const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
      return {
        name: u.businessName || u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        campus: u.university || u.campusId || '',
        verified: u.isVerified ? 'Yes' : 'No',
        banned: u.isBanned ? 'Yes' : 'No',
        activity: getUserActivityBucket(u),
        lastActive: date ? date.toISOString() : '',
        referralCount: u.referralCount || 0,
      };
    });

    const headers = ['Name','Email','Phone','Campus','Verified','Banned','Activity','Last Active','Referral Count'];
    const csv = [
      headers.join(','),
      ...rows.map((row: any) => [row.name,row.email,row.phone,row.campus,row.verified,row.banned,row.activity,row.lastActive,row.referralCount]
        .map((value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `siyayya-users-report-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Users report downloaded.');
  };

  const printUsersReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!reportWindow) {
      toast.error('Unable to open print window. Please allow popups.');
      return;
    }

    const rows = users.map((u: any) => {
      const raw = u.lastActive || u.lastLoginAt || u.updatedAt || u.joinedAt;
      const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
      return `
        <tr>
          <td>${u.businessName || u.name || ''}</td>
          <td>${u.email || ''}</td>
          <td>${u.phone || ''}</td>
          <td>${u.university || u.campusId || ''}</td>
          <td>${u.isVerified ? 'Verified' : 'Not Verified'}</td>
          <td>${u.isBanned ? 'Banned' : 'Active'}</td>
          <td>${getUserActivityBucket(u)}</td>
          <td>${date ? date.toLocaleString() : ''}</td>
        </tr>
      `;
    }).join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>Siyayya Users Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin-bottom: 8px; }
            p { color: #555; }
            .stats { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
            .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px 16px; min-width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Siyayya Users Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <div class="stats">
            <div class="card"><strong>Total Users</strong><br/>${users.length}</div>
            <div class="card"><strong>Active</strong><br/>${activeUsers.length}</div>
            <div class="card"><strong>Dormant</strong><br/>${dormantUsers.length}</div>
            <div class="card"><strong>Inactive</strong><br/>${inactiveUsers.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Campus</th><th>Verification</th><th>Status</th><th>Activity</th><th>Last Active</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const topWhatsappListings = [...listings].sort((a: any, b: any) => Number(b.whatsappClicks || 0) - Number(a.whatsappClicks || 0)).slice(0, 5);

  const listingsWithoutContact = listings.filter((listing: any) => Number(listing.views || 0) >= 5 && Number(listing.whatsappClicks || 0) === 0);
  const topViewedListings = [...listings].sort((a: any, b: any) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);
  const topSellerIntent = users.map((user: any) => {
    const ownedListings = listings.filter((listing: any) => listing.ownerId === user.id);
    const totalViews = ownedListings.reduce((sum: number, listing: any) => sum + Number(listing.views || 0), 0);
    const totalClicks = ownedListings.reduce((sum: number, listing: any) => sum + Number(listing.whatsappClicks || 0), 0);
    return {
      id: user.id,
      name: user.businessName || user.name || user.email || 'Unknown User',
      listingCount: ownedListings.length,
      totalViews,
      totalClicks,
      conversionRate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0,
    };
  }).sort((a, b) => b.totalClicks - a.totalClicks).slice(0, 5);
  const zeroListingUsers = users.filter((user: any) => !listings.some((listing: any) => listing.ownerId === user.id));
  const noContactSellers = users.filter((user: any) => {
    const ownedListings = listings.filter((listing: any) => listing.ownerId === user.id);
    return ownedListings.length > 0 && ownedListings.reduce((sum: number, listing: any) => sum + Number(listing.whatsappClicks || 0), 0) === 0;
  });

  const freshListings24h = listings.filter((l: any) => {
    const raw = l.boostedAt || l.createdAt;
    const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
    return date && Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  const adminTabs = [
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "users" as const, label: `Users (${users.length})`, icon: Users },
    { id: "listings" as const, label: `Listings (${listings.length})`, icon: Package },
    { id: "reports" as const, label: `Reports (${reports.length})`, icon: Flag },
    { id: "orders" as const, label: `Orders (${orders.length})`, icon: ShoppingBag },
    { id: "referrals" as const, label: `Referrals (${referrals.length})`, icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-black/5 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-4">
          <Logo textClassName="text-lg sm:text-xl" />
          <span className="bg-primary/10 text-primary text-[9px] sm:text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Admin</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
           <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading} className="h-8 px-3">
             <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
             <span className="hidden sm:inline">Refresh</span>
           </Button>
           <Link to="/" className="text-xs font-bold text-textSecondary hover:text-primary flex items-center gap-1">
             <ExternalLink className="h-3 w-3" /> <span className="hidden sm:inline">Site</span>
           </Link>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden overflow-x-auto border-b border-black/5 bg-surface">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'hover:bg-muted text-textSecondary'}`}
            >
              <tab.icon className="h-3.5 w-3.5 flex-shrink-0" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 lg:w-64 bg-surface border-r border-black/5 p-4 flex-col gap-2 shrink-0">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === tab.id ? 'bg-primary text-white' : 'hover:bg-muted text-textSecondary'}`}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" /> {tab.label}
            </button>
          ))}
        </aside>

        <main className="flex-grow p-4 md:p-8 bg-muted/20 min-w-0">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-lg md:text-2xl font-black text-textPrimary capitalize">{activeTab} Management</h1>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
                <Input 
                   placeholder={`Search ${activeTab}...`} 
                   className="pl-9 bg-surface rounded-xl border-black/5"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-sm font-bold text-textSecondary">Loading admin data...</p>
              </div>
            ) : (
              <div className="bg-surface rounded-[2rem] border border-black/5 overflow-hidden shadow-sm">
                {activeTab === 'users' && (
                  <div className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Total Users', value: users.length, tone: 'text-textPrimary' },
                        { label: 'Active', value: activeUsers.length, tone: 'text-emerald-600' },
                        { label: 'Dormant', value: dormantUsers.length, tone: 'text-amber-600' },
                        { label: 'Inactive', value: inactiveUsers.length, tone: 'text-rose-600' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-black/5 bg-muted/20 p-3 sm:p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary">{stat.label}</p>
                          <p className={`mt-2 text-2xl sm:text-3xl font-black tabular-nums ${stat.tone}`}>{Number(stat.value).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                      <Button variant="outline" className="rounded-xl gap-2 text-xs" onClick={printUsersReport}>
                        <Printer className="h-4 w-4" /> Print Report
                      </Button>
                      <Button className="rounded-xl gap-2 text-xs" onClick={exportUsersReport}>
                        <Download className="h-4 w-4" /> Download CSV
                      </Button>
                    </div>

                    {/* Mobile cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {users.filter(u => u.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                        const bucket = getUserActivityBucket(u);
                        return (
                          <div key={u.id} className="rounded-2xl border border-black/5 bg-muted/10 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-black text-textPrimary truncate">{u.businessName || u.name || 'No name'}</p>
                                <p className="text-xs text-textSecondary truncate mt-0.5">{u.email}</p>
                              </div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase shrink-0 ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {u.isBanned ? 'Banned' : 'Active'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${u.isVerified ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                {u.isVerified ? 'Verified' : 'Unverified'}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${bucket === 'active' ? 'bg-emerald-100 text-emerald-600' : bucket === 'dormant' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                {bucket}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-black/5">
                              <Button variant="ghost" size="sm" className={`h-8 px-2 text-[10px] font-black ${u.isVerified ? 'text-gray-400' : 'text-green-600'}`} onClick={() => handleToggleVerify(u.id, u.isVerified ?? false)}>
                                <CheckCircle className={`h-3.5 w-3.5 mr-1 ${u.isVerified ? 'fill-green-600 text-white' : ''}`} />{u.isVerified ? 'Unverify' : 'Verify'}
                              </Button>
                              <Button variant="ghost" size="sm" className={`h-8 px-2 text-[10px] font-black ${u.isBanned ? 'text-blue-600' : 'text-error'}`} onClick={() => handleToggleBan(u.id, u.isBanned ?? false)}>
                                <Ban className="h-3.5 w-3.5 mr-1" />{u.isBanned ? 'Unban' : 'Ban'}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black text-primary" onClick={() => openUserDashboard(u)}>
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />Dashboard
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black text-error ml-auto" onClick={() => handleDeleteUser(u.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-[700px] w-full text-left border-collapse">
                        <thead className="bg-muted/30 border-b border-black/5">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Email</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Verification</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Activity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.filter(u => u.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                            <tr key={u.id} className="border-b border-black/5 hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 font-bold text-textPrimary">{u.businessName || u.name}</td>
                              <td className="px-6 py-4 text-textSecondary text-sm">{u.email}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${u.isVerified ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {u.isVerified ? 'Verified' : 'Not Verified'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {(() => { const bucket = getUserActivityBucket(u); return <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${bucket === 'active' ? 'bg-emerald-100 text-emerald-600' : bucket === 'dormant' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>{bucket}</span>; })()}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${u.isBanned ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                                  {u.isBanned ? 'Banned' : 'Active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" className={`${u.isVerified ? 'text-gray-400' : 'text-green-600'} hover:bg-muted`} onClick={() => handleToggleVerify(u.id, u.isVerified ?? false)}>
                                    <CheckCircle className={`h-4 w-4 ${u.isVerified ? 'fill-green-600 text-white' : ''}`} />
                                  </Button>
                                  <Button variant="ghost" size="sm" className={`${u.isBanned ? 'text-blue-600' : 'text-error'} hover:bg-muted`} onClick={() => handleToggleBan(u.id, u.isBanned ?? false)}>
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => openUserDashboard(u)}><ExternalLink className="h-4 w-4 mr-2" />Dashboard</Button>
                                  <Button variant="ghost" size="sm" className="text-error hover:bg-error/10" onClick={() => handleDeleteUser(u.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'listings' && (
                  <div className="p-4 sm:p-0">
                    {/* Mobile listing cards */}
                    <div className="flex flex-col gap-3 md:hidden p-2">
                      {listings.filter(l => l.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                        <div key={l.id} className="rounded-2xl border border-black/5 bg-muted/10 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-black/5">
                              {l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-textPrimary truncate text-sm">{l.title}</p>
                              <p className="text-[10px] text-textMuted font-black uppercase tabular-nums">₦{l.price?.toLocaleString()} • {l.ownerName || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${l.status === 'approved' ? 'bg-green-100 text-green-600' : l.status === 'removed' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                              {l.status || 'pending'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${l.type === 'service' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{l.type}</span>
                            {l.isFeatured && <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-primary text-white">Featured</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-black/5">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black text-primary" onClick={() => { const rt = l.type === 'product' ? 'products' : 'services'; navigate(`/dashboard/edit/${rt}/${l.id}`); }}>
                              <Edit className="h-3.5 w-3.5 mr-1" />Edit
                            </Button>
                            <Button variant="ghost" size="sm" className={`h-8 px-2 text-[10px] font-black ${l.status === 'approved' ? 'text-gray-300' : 'text-green-600'}`} onClick={() => handleUpdateStatus(l.id, l.type, 'approved')}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                            <Button variant="ghost" size="sm" className={`h-8 px-2 text-[10px] font-black ${l.isFeatured ? 'text-primary' : 'text-textMuted'}`} onClick={() => handleToggleFeature(l.id, l.type, !!l.isFeatured)}>
                              <Flag className="h-3.5 w-3.5 mr-1" />{l.isFeatured ? 'Unfeature' : 'Feature'}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black text-error ml-auto" onClick={() => handleDeleteListing(l.id, l.type)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-[700px] w-full text-left border-collapse">
                    <thead className="bg-muted/30 border-b border-black/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Listing</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Owner</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.filter(l => l.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                        <tr key={l.id} className="border-b border-black/5 hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-black/5">
                                 {l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}
                               </div>
                               <div>
                                 <p className="font-bold text-textPrimary text-sm line-clamp-1">{l.title}</p>
                                 <p className="text-[10px] text-textMuted font-black uppercase tabular-nums">₦{l.price?.toLocaleString()}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                               <span className={`text-[9px] w-fit font-black px-1.5 py-0.5 rounded uppercase ${l.status === 'approved' ? 'bg-green-100 text-green-600' : l.status === 'removed' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                 {l.status || 'pending'}
                               </span>
                               {l.isFeatured && <span className="text-[9px] w-fit font-black px-1.5 py-0.5 rounded uppercase bg-primary text-white">Featured</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${l.type === 'service' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              {l.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-textSecondary text-xs font-medium">{l.ownerName || 'Unknown'}</td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="text-primary hover:bg-primary/10" 
                                 onClick={() => {
                                   const routeType = l.type === 'product' ? 'products' : 'services';
                                   navigate(`/dashboard/edit/${routeType}/${l.id}`);
                                 }}
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.status === 'approved' ? 'text-gray-300' : 'text-green-600'} hover:bg-green-50`} 
                                 onClick={() => handleUpdateStatus(l.id, l.type, 'approved')}
                               >
                                 <CheckCircle className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.status === 'removed' ? 'text-gray-300' : 'text-error'} hover:bg-red-50`} 
                                 onClick={() => handleUpdateStatus(l.id, l.type, 'removed')}
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.isFeatured ? 'text-primary fill-primary' : 'text-textMuted'} hover:bg-muted`}
                                 onClick={() => handleToggleFeature(l.id, l.type, !!l.isFeatured)}
                               >
                                 <Flag className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="text-error hover:bg-error/10" 
                                 onClick={() => handleDeleteListing(l.id, l.type)}
                                >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                      {[
                        { label: 'Users', value: users.length, hint: 'registered accounts' },
                        { label: 'Active 7d', value: activeUsers7d, hint: 'recently active users' },
                        { label: 'Listings', value: listings.length, hint: 'products + services' },
                        { label: 'Fresh Today', value: freshListings24h, hint: 'new or boosted' },
                        { label: 'WhatsApp Clicks', value: totalWhatsappClicks, hint: 'buyer intent' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-black/5 bg-muted/20 p-3 sm:p-5 min-w-0">
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-textSecondary truncate">{stat.label}</p>
                          <p className="mt-2 sm:mt-3 text-xl sm:text-3xl font-black text-textPrimary tabular-nums">{Number(stat.value).toLocaleString()}</p>
                          <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-textSecondary font-medium truncate">{stat.hint}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="rounded-2xl border border-black/5 bg-muted/20 p-4 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-4">Top Contacted Listings</p>
                        <div className="space-y-3">
                          {topWhatsappListings.length > 0 ? topWhatsappListings.map((listing: any) => (
                            <div key={listing.id} className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3 flex items-center justify-between gap-3 sm:gap-4">
                              <div className="min-w-0">
                                <p className="font-bold text-textPrimary truncate text-sm sm:text-base">{listing.title || 'Untitled Listing'}</p>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary mt-1 truncate">{listing.ownerName || 'Unknown'} • {listing.type}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base sm:text-lg font-black text-primary tabular-nums">{Number(listing.whatsappClicks || 0).toLocaleString()}</p>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary">Clicks</p>
                              </div>
                            </div>
                          )) : <p className="text-sm text-textSecondary font-medium">No WhatsApp click data yet.</p>}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-muted/20 p-4 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-4">Top Viewed Listings</p>
                        <div className="space-y-3">
                          {topViewedListings.length > 0 ? topViewedListings.map((listing: any) => {
                            const views = Number(listing.views || 0);
                            const clicks = Number(listing.whatsappClicks || 0);
                            const ctr = views > 0 ? Math.round((clicks / views) * 100) : 0;
                            return (
                              <div key={listing.id} className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3 flex items-center justify-between gap-3 sm:gap-4">
                                <div className="min-w-0">
                                  <p className="font-bold text-textPrimary truncate text-sm sm:text-base">{listing.title || 'Untitled Listing'}</p>
                                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary mt-1 truncate">{views.toLocaleString()} views • {clicks.toLocaleString()} clicks • {ctr}% CTR</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-base sm:text-lg font-black text-primary tabular-nums">{views.toLocaleString()}</p>
                                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary">Views</p>
                                </div>
                              </div>
                            );
                          }) : <p className="text-sm text-textSecondary font-medium">No view data yet.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="rounded-2xl border border-black/5 bg-muted/20 p-4 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-4">Top Sellers by Buyer Intent</p>
                        <div className="space-y-3">
                          {topSellerIntent.length > 0 ? topSellerIntent.map((seller) => (
                            <div key={seller.id} className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3 flex items-center justify-between gap-3 sm:gap-4">
                              <div className="min-w-0">
                                <p className="font-bold text-textPrimary truncate text-sm sm:text-base">{seller.name}</p>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary mt-1 truncate">{seller.listingCount} listings • {seller.totalViews} views • {seller.conversionRate}% CTR</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base sm:text-lg font-black text-primary tabular-nums">{seller.totalClicks}</p>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-textSecondary">Clicks</p>
                              </div>
                            </div>
                          )) : <p className="text-sm text-textSecondary font-medium">No seller conversion data yet.</p>}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-muted/20 p-4 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-4">Growth Alerts</p>
                        <div className="space-y-3">
                          <div className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3">
                            <p className="font-bold text-textPrimary text-sm sm:text-base">Listings with traffic but no contact</p>
                            <p className="text-xs sm:text-sm text-textSecondary mt-1">{listingsWithoutContact.length} listings have 5+ views but zero WhatsApp clicks. These should be improved or boosted.</p>
                          </div>
                          <div className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3">
                            <p className="font-bold text-textPrimary text-sm sm:text-base">Users with no listings</p>
                            <p className="text-xs sm:text-sm text-textSecondary mt-1">{zeroListingUsers.length} users have accounts but have not posted anything yet.</p>
                          </div>
                          <div className="rounded-xl bg-surface border border-black/5 px-3 sm:px-4 py-3">
                            <p className="font-bold text-textPrimary text-sm sm:text-base">Sellers with zero contacts</p>
                            <p className="text-xs sm:text-sm text-textSecondary mt-1">{noContactSellers.length} sellers have listings but no WhatsApp clicks yet.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'reports' && reports.length === 0 && (
                  <div className="p-20 text-center text-textSecondary font-bold italic">No pending reports</div>
                )}
                {activeTab === 'reports' && reports.length > 0 && (
                   <div className="p-6 space-y-4">
                      {reports.map(r => (
                        <div key={r.id} className="p-4 bg-muted/20 rounded-2xl border border-black/5 flex items-start justify-between">
                          <div>
                            <p className="font-bold text-textPrimary">{r.listingTitle}</p>
                            <p className="text-xs text-error font-medium">{r.reason}</p>
                            <p className="text-[10px] text-textSecondary mt-1 italic">{r.description}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('listings')}>Review</Button>
                        </div>
                      ))}
                   </div>
                )}

                {activeTab === 'orders' && orders.length === 0 && (
                  <div className="p-20 text-center text-textSecondary font-bold italic">No orders yet</div>
                )}
                {activeTab === 'orders' && orders.length > 0 && (
                  <div>
                    {/* Mobile order cards */}
                    <div className="flex flex-col gap-3 md:hidden p-4">
                      {orders.filter(o =>
                        o.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.buyerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(o => {
                        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : null);
                        const items = o.items || o.products || [];
                        return (
                          <div key={o.id} className="rounded-2xl border border-black/5 bg-muted/10 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-black text-textPrimary text-sm">{o.buyerName || 'Unknown'}</p>
                                <p className="text-[10px] text-textSecondary truncate">{o.buyerEmail}</p>
                                <p className="text-[9px] font-mono text-textMuted mt-0.5">#{o.id.slice(0,8)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-primary tabular-nums">₦{o.totalAmount?.toLocaleString()}</p>
                                <p className="text-[9px] text-textSecondary">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${o.status === 'delivered' ? 'bg-green-100 text-green-600' : o.status === 'cancelled' ? 'bg-red-100 text-red-600' : o.status === 'processing' ? 'bg-yellow-100 text-yellow-600' : o.status === 'shipped' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {o.status || 'paid'}
                              </span>
                              <span className="text-[9px] text-textMuted">{orderDate ? orderDate.toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="pt-1 border-t border-black/5">
                              <select
                                className="w-full text-[10px] font-black uppercase bg-muted/50 border border-black/5 rounded-xl px-3 py-2 outline-none"
                                value={o.status || 'paid'}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                              >
                                <option value="paid">Paid</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop orders table */}
                  <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left border-collapse">
                    <thead className="bg-muted/30 border-b border-black/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest w-8"></th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Order ID</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Buyer</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Items</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => 
                        o.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.buyerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(o => {
                        const isExpanded = expandedOrderId === o.id;
                        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : null);
                        const items = o.items || o.products || [];
                        return (
                          <Fragment key={o.id}>
                            <tr className={`border-b border-black/5 hover:bg-muted/10 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/10' : ''}`} onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>
                              <td className="pl-6 py-4">
                                <ChevronDown className={`h-4 w-4 text-textMuted transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </td>
                              <td className="px-6 py-4 font-mono text-sm text-textPrimary">{o.id.slice(0,8)}</td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-textPrimary text-sm">{o.buyerName || 'Unknown'}</p>
                                <p className="text-[10px] text-textSecondary">{o.buyerEmail}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-textPrimary">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                              </td>
                              <td className="px-6 py-4 font-black text-primary">₦{o.totalAmount?.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${o.status === 'delivered' ? 'bg-green-100 text-green-600' : o.status === 'cancelled' ? 'bg-red-100 text-red-600' : o.status === 'processing' ? 'bg-yellow-100 text-yellow-600' : o.status === 'shipped' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {o.status || 'paid'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-textSecondary">
                                {orderDate ? orderDate.toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                 <div className="flex justify-end gap-1">
                                    <select 
                                      className="text-[10px] font-black uppercase bg-muted/50 border-none rounded px-2 py-1 outline-none cursor-pointer"
                                      value={o.status || 'paid'}
                                      onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                    >
                                      <option value="paid">Paid</option>
                                      <option value="processing">Processing</option>
                                      <option value="shipped">Shipped</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                 </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="px-0 py-0">
                                  <div className="bg-muted/5 border-b border-black/5 px-12 py-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                      {/* Buyer Details */}
                                      <div className="bg-surface rounded-2xl p-5 border border-black/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-3">Buyer Details</h4>
                                        <div className="space-y-2">
                                          <p className="text-sm font-bold text-textPrimary">{o.buyerName || 'Unknown'}</p>
                                          <p className="text-xs text-textSecondary">{o.buyerEmail || 'No email'}</p>
                                          {o.buyerPhone && <p className="text-xs text-textSecondary">📞 {o.buyerPhone}</p>}
                                          {o.buyerId && (
                                            <Link to={`/profile/${o.buyerId}`} className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1">
                                              View Profile <ExternalLink className="h-3 w-3" />
                                            </Link>
                                          )}
                                        </div>
                                      </div>

                                      {/* Delivery Info */}
                                      <div className="bg-surface rounded-2xl p-5 border border-black/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-3">Delivery Info</h4>
                                        <div className="space-y-2">
                                          {o.deliveryAddress ? (
                                            <p className="text-sm text-textPrimary">{o.deliveryAddress}</p>
                                          ) : o.address ? (
                                            <p className="text-sm text-textPrimary">{o.address}</p>
                                          ) : (
                                            <p className="text-xs text-textMuted italic">No delivery address provided</p>
                                          )}
                                          {o.deliveryMethod && <p className="text-xs text-textSecondary">Method: <span className="font-bold">{o.deliveryMethod}</span></p>}
                                          {o.campusId && <p className="text-xs text-textSecondary">Campus: <span className="font-bold">{o.campusId}</span></p>}
                                          {o.notes && <p className="text-xs text-textMuted italic mt-2">Notes: {o.notes}</p>}
                                        </div>
                                      </div>

                                      {/* Order Summary */}
                                      <div className="bg-surface rounded-2xl p-5 border border-black/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-3">Order Summary</h4>
                                        <div className="space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-textSecondary">Subtotal</span>
                                            <span className="font-bold text-textPrimary">₦{(o.subtotal || o.totalAmount)?.toLocaleString()}</span>
                                          </div>
                                          {o.deliveryFee != null && (
                                            <div className="flex justify-between text-sm">
                                              <span className="text-textSecondary">Delivery Fee</span>
                                              <span className="font-bold text-textPrimary">₦{o.deliveryFee?.toLocaleString()}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between text-sm border-t border-black/5 pt-2 mt-2">
                                            <span className="font-black text-textPrimary">Total</span>
                                            <span className="font-black text-primary">₦{o.totalAmount?.toLocaleString()}</span>
                                          </div>
                                          {o.paymentMethod && (
                                            <p className="text-[10px] text-textMuted uppercase tracking-widest mt-2">Payment: {o.paymentMethod}</p>
                                          )}
                                          {o.paymentReference && (
                                            <p className="text-[10px] text-textMuted font-mono mt-1">Ref: {o.paymentReference}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Order Items */}
                                    {items.length > 0 && (
                                      <div className="mt-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-3">Items ({items.length})</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-black/5 hover:border-primary/20 transition-colors">
                                              <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-black/5">
                                                {(item.image || item.imageUrl) && (
                                                  <img src={item.image || item.imageUrl} alt={item.title || item.name || ''} className="h-full w-full object-cover" />
                                                )}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-textPrimary truncate">{item.title || item.name || 'Untitled'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className="text-xs font-black text-primary">₦{(item.price)?.toLocaleString()}</span>
                                                  {item.quantity && item.quantity > 1 && (
                                                    <span className="text-[10px] text-textMuted font-bold">×{item.quantity}</span>
                                                  )}
                                                </div>
                                                {(item.sellerName || item.ownerName) && (
                                                  <p className="text-[10px] text-textSecondary mt-0.5">Seller: {item.sellerName || item.ownerName}</p>
                                                )}
                                              </div>
                                              {(item.productId || item.id) && (
                                                <Link to={`/products/${item.productId || item.id}`} className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                  <ExternalLink className="h-4 w-4" />
                                                </Link>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* No items fallback */}
                                    {items.length === 0 && (
                                      <div className="mt-6 bg-surface rounded-2xl p-5 border border-black/5">
                                        <p className="text-sm text-textMuted italic text-center">No item details available for this order</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  </div>
                )}

                {activeTab === 'referrals' && referrals.length === 0 && (
                  <div className="p-20 text-center text-textSecondary font-bold italic">No referrals yet</div>
                )}
                {activeTab === 'referrals' && referrals.length > 0 && (
                  <div>
                    {/* Mobile referral cards */}
                    <div className="flex flex-col gap-3 md:hidden p-4">
                      {referrals.filter(r =>
                        r.referredUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.referredUserEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(r => {
                        const date = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : null);
                        return (
                          <div key={r.id} className="rounded-2xl border border-black/5 bg-muted/10 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-black text-textPrimary text-sm">{r.referredUserName || 'Unknown'}</p>
                                <p className="text-[10px] text-textSecondary truncate">{r.referredUserEmail}</p>
                              </div>
                              <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary shrink-0">{r.referralCode}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-mono text-textMuted truncate max-w-[60%]">Ref: {r.referrerId}</p>
                              <p className="text-[9px] text-textSecondary">{date ? date.toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop referral table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-[760px] w-full text-left border-collapse">
                        <thead className="bg-muted/30 border-b border-black/5">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">New User</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Referrer ID</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Code</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.filter(r =>
                            r.referredUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.referredUserEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map(r => {
                            const date = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : null);
                            return (
                              <tr key={r.id} className="border-b border-black/5 hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-textPrimary text-sm">{r.referredUserName || 'Unknown'}</p>
                                  <p className="text-[10px] text-textSecondary">{r.referredUserEmail}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-textSecondary">{r.referrerId}</td>
                                <td className="px-6 py-4"><span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">{r.referralCode}</span></td>
                                <td className="px-6 py-4 text-xs text-textSecondary">{date ? date.toLocaleDateString() : 'N/A'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

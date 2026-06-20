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
  Trash2, Ban, CheckCircle, Search, RefreshCw, ExternalLink, Edit, X, ShoppingBag, ChevronDown, BarChart3
} from "lucide-react";

import { ADMIN_EMAILS } from "@/lib/config";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "listings" | "reports" | "orders" | "analytics">("analytics");
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersSnap, productsSnap, servicesSnap, reportsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "orders")),
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
      await updateDoc(doc(db, coll, id), { isFeatured: !currentStatus });
      setListings(prev => prev.map(l => l.id === id ? { ...l, isFeatured: !currentStatus } : l));
      toast.success(currentStatus ? "Feature removed" : "Listing featured!");
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

  const adminTabs = [
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "users" as const, label: `Users (${users.length})`, icon: Users },
    { id: "listings" as const, label: `Listings (${listings.length})`, icon: Package },
    { id: "reports" as const, label: `Reports (${reports.length})`, icon: Flag },
    { id: "orders" as const, label: `Orders (${orders.length})`, icon: ShoppingBag },
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
                  <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full text-left border-collapse">
                    <thead className="bg-muted/30 border-b border-black/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">User</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-textSecondary tracking-widest">Verification</th>
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
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${u.isBanned ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                               {u.isBanned ? 'Banned' : 'Active'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${u.isVerified ? 'text-gray-400' : 'text-green-600'} hover:bg-muted`}
                                 onClick={() => handleToggleVerify(u.id, u.isVerified ?? false)}
                               >
                                 <CheckCircle className={`h-4 w-4 ${u.isVerified ? 'fill-green-600 text-white' : ''}`} />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${u.isBanned ? 'text-blue-600' : 'text-error'} hover:bg-muted`}
                                 onClick={() => handleToggleBan(u.id, u.isBanned ?? false)}
                               >
                                 <Ban className="h-4 w-4" />
                               </Button>
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
                )}

                {activeTab === 'listings' && (
                  <div className="overflow-x-auto">
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
                  <div className="overflow-x-auto">
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
                )}

                {activeTab === 'analytics' && (
                  <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-muted/10 p-6 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-black uppercase text-textSecondary tracking-widest mb-2">Total Revenue</p>
                      <h3 className="text-3xl font-black text-textPrimary">
                        ₦{orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0).toLocaleString()}
                      </h3>
                    </div>
                    <div className="bg-muted/10 p-6 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-black uppercase text-textSecondary tracking-widest mb-2">Total Users</p>
                      <h3 className="text-3xl font-black text-textPrimary">{users.length}</h3>
                    </div>
                    <div className="bg-muted/10 p-6 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-black uppercase text-textSecondary tracking-widest mb-2">Active Listings</p>
                      <h3 className="text-3xl font-black text-textPrimary">{listings.filter(l => l.status === 'approved').length}</h3>
                    </div>
                    <div className="bg-muted/10 p-6 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-black uppercase text-textSecondary tracking-widest mb-2">Pending Orders</p>
                      <h3 className="text-3xl font-black text-textPrimary">{orders.filter(o => o.status === 'paid' || o.status === 'processing').length}</h3>
                    </div>
                    <div className="bg-muted/10 p-6 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-black uppercase text-textSecondary tracking-widest mb-2">Reported Items</p>
                      <h3 className="text-3xl font-black text-textPrimary">{reports.length}</h3>
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

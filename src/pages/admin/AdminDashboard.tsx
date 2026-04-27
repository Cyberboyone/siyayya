import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, writeBatch
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, Users, Package, Flag, Loader2,
  Trash2, Ban, CheckCircle, Search, RefreshCw, Menu, X, ExternalLink
} from "lucide-react";

import { ADMIN_EMAILS } from "@/lib/config";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "listings" | "reports">("users");
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("[Admin] Fetching data...");
      
      const [usersSnap, productsSnap, servicesSnap, reportsSnap] = await Promise.all([
        getDocs(collection(db, "users")).catch(e => { console.error("Users fetch failed:", e); throw e; }),
        getDocs(collection(db, "products")).catch(e => { console.error("Products fetch failed:", e); throw e; }),
        getDocs(collection(db, "services")).catch(e => { console.error("Services fetch failed:", e); throw e; }),
        getDocs(collection(db, "reports")).catch(e => { console.error("Reports fetch failed:", e); throw e; })
      ]);

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const allListings = [
        ...productsSnap.docs.map(d => ({ id: d.id, type: 'product', ...d.data() })),
        ...servicesSnap.docs.map(d => ({ id: d.id, type: 'service', ...d.data() }))
      ].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return (dateB as any) - (dateA as any);
      });

      setListings(allListings);
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      console.log("[Admin] Data refresh successful");
      toast.success("Admin data refreshed");
    } catch (error: any) {
      console.error("Admin Fetch error:", error.message || error);
      toast.error(`Failed to load admin data: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Security Helper
  const checkAdmin = () => {
    if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="bg-surface border-b border-black/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Logo textClassName="text-xl" />
          <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading}>
             <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
           </Button>
           <Link to="/" className="text-xs font-bold text-textSecondary hover:text-primary flex items-center gap-1">
             <ExternalLink className="h-3 w-3" /> Site
           </Link>
        </div>
      </header>

      <div className="flex-grow flex">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-surface border-r border-black/5 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-white' : 'hover:bg-muted text-textSecondary'}`}
          >
            <Users className="h-4 w-4" /> Users ({users.length})
          </button>
          <button 
            onClick={() => setActiveTab("listings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'listings' ? 'bg-primary text-white' : 'hover:bg-muted text-textSecondary'}`}
          >
            <Package className="h-4 w-4" /> Listings ({listings.length})
          </button>
          <button 
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-primary text-white' : 'hover:bg-muted text-textSecondary'}`}
          >
            <Flag className="h-4 w-4" /> Reports ({reports.length})
          </button>
        </aside>

        {/* Main Panel */}
        <main className="flex-grow p-8 bg-muted/20">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-textPrimary capitalize">{activeTab} Management</h1>
              <div className="relative w-64">
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
                  <table className="w-full text-left border-collapse">
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
                                 title={u.isVerified ? "Unverify" : "Verify"}
                               >
                                 <CheckCircle className={`h-4 w-4 ${u.isVerified ? 'fill-green-600 text-white' : ''}`} />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${u.isBanned ? 'text-blue-600' : 'text-error'} hover:bg-muted`}
                                 onClick={() => handleToggleBan(u.id, u.isBanned ?? false)}
                                 title={u.isBanned ? "Unban" : "Ban"}
                               >
                                 <Ban className="h-4 w-4" />
                               </Button>
                               <Button variant="ghost" size="sm" className="text-error hover:bg-error/10 hover:text-error" onClick={() => handleDeleteUser(u.id)} title="Delete">
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'listings' && (
                   <table className="w-full text-left border-collapse">
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
                               <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 animate-pulse border border-black/5">
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
                                 title="Edit"
                               >
                                 <RefreshCw className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.status === 'approved' ? 'text-gray-300' : 'text-green-600'} hover:bg-green-50`} 
                                 onClick={() => handleUpdateStatus(l.id, l.type, 'approved')}
                                 title="Approve"
                               >
                                 <CheckCircle className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.status === 'removed' ? 'text-gray-300' : 'text-error'} hover:bg-red-50`} 
                                 onClick={() => handleUpdateStatus(l.id, l.type, 'removed')}
                                 title="Reject"
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className={`${l.isFeatured ? 'text-primary fill-primary' : 'text-textMuted'} hover:bg-muted`}
                                 onClick={() => handleToggleFeature(l.id, l.type, !!l.isFeatured)}
                                 title={l.isFeatured ? "Unfeature" : "Feature"}
                               >
                                 <Flag className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="text-error hover:bg-error/10" 
                                 onClick={() => handleDeleteListing(l.id, l.type)}
                                 title="Delete"
                                >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

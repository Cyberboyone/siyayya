import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getUserOrders } from '@/features/marketplace/services/orderService';
import { Navbar } from '@/components/Navbar';
import { formatPrice } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { Loader2, Package, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const fetchedOrders = await getUserOrders(user.id);
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" /> Processing</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><Package className="w-3 h-3 mr-1" /> Shipped</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-error/10 text-error border-error/20"><AlertCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container max-w-4xl py-12">
        <h1 className="text-3xl font-black italic tracking-tighter text-textPrimary mb-8 uppercase">My Orders</h1>
        
        {orders.length === 0 ? (
          <div className="bg-surface border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm">
            <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Package className="h-10 w-10 text-textMuted" />
            </div>
            <h2 className="text-xl font-black text-textPrimary tracking-tighter italic uppercase mb-2">No Orders Yet</h2>
            <p className="text-sm text-textSecondary font-medium mb-8">
              You haven't placed any orders yet. Start exploring the marketplace!
            </p>
            <Link to="/marketplace">
              <Button className="h-12 px-8 rounded-2xl bg-black text-white uppercase tracking-widest text-[10px] font-black">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order.id} className="bg-surface border border-black/5 rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-black/5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary/60 mb-1">
                      Order Placed
                    </p>
                    <p className="text-sm font-bold text-textPrimary">
                      {order.createdAt?.toDate ? formatDate(order.createdAt.toDate()) : 'Recent'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary/60 mb-1">
                      Total Amount
                    </p>
                    <p className="text-sm font-black text-primary">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary/60 mb-1">
                      Order ID
                    </p>
                    <p className="text-sm font-mono text-textPrimary">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0">
                        <img src={item.images?.[0] || item.image} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <Link to={`/product/${item.id}`} className="font-bold text-sm text-textPrimary hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </Link>
                        <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mt-1">
                          Qty: {item.quantity} • {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

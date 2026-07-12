import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { AppNotification } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { notificationService } from "@/lib/notificationService";
import { Bell, Heart, MessageSquare, UserPlus, Sparkles, CheckCircle2, Package, Megaphone, Shield, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "users", user.id, "notifications"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read && user?.id) {
      await notificationService.markAsRead(user.id, notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await notificationService.markAllAsRead(user.id);
  };

  const getNotifIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary stroke-[3px]" />;
      case "order":
        return <Package className="h-4 w-4 text-emerald-500 stroke-[3px]" />;
      case "forum_reply":
        return <MessageSquare className="h-4 w-4 text-accent stroke-[3px]" />;
      case "like":
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-blue-500 stroke-[3px]" />;
      case "mention":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-zinc-800" />;
      case "listing_expiring":
        return <Clock className="h-4 w-4 text-amber-500 stroke-[3px]" />;
      case "listing_expired":
        return <Trash2 className="h-4 w-4 text-red-500 stroke-[3px]" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="container max-w-3xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-textPrimary tracking-tight">Notifications</h1>
            <p className="text-sm font-medium text-textSecondary mt-1">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}.
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              className="text-xs font-black uppercase tracking-wider rounded-xl px-4"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex gap-4 p-5 rounded-[2rem] border cursor-pointer transition-all ${
                  !notif.read 
                    ? "bg-primary/5 border-primary/20 shadow-md" 
                    : "bg-surface border-black/5 hover:border-primary/20 hover:shadow-lg"
                }`}
              >
                {/* Sender Avatar */}
                <div className="relative shrink-0">
                  {notif.senderAvatar && notif.senderAvatar.length > 2 ? (
                    <img src={notif.senderAvatar} className="h-12 w-12 rounded-2xl object-cover border border-black/5" alt="Avatar" />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-black uppercase text-lg">
                      {notif.senderName?.charAt(0) || "S"}
                    </div>
                  )}
                  {/* Action Badge Indicator */}
                  <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-900 border border-black/5 p-1.5 rounded-full shadow-sm">
                    {getNotifIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-grow min-w-0 flex flex-col justify-center">
                  <p className="text-sm text-textSecondary leading-relaxed">
                    {notif.senderName && <span className="font-black text-textPrimary uppercase tracking-tight mr-2">{notif.senderName}</span>}
                    {notif.body}
                  </p>
                  <span className="text-xs font-bold text-textMuted mt-1.5">
                    {notif.createdAt?.toDate
                      ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })
                      : "just now"}
                  </span>
                </div>
                
                {!notif.read && (
                  <div className="shrink-0 flex items-center justify-center pl-4">
                    <span className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-black/10 rounded-[3rem] bg-black/5">
              <CheckCircle2 className="h-16 w-16 text-zinc-300 stroke-[1.5px] mb-4" />
              <h2 className="text-xl font-black text-textPrimary tracking-tight">You're all caught up!</h2>
              <p className="text-sm text-textMuted font-medium mt-2 max-w-xs">No new notifications to show. Go explore Siyayya!</p>
              
              <Button onClick={() => navigate("/")} className="mt-6 rounded-2xl font-black uppercase tracking-widest text-[10px] px-8">
                Explore Marketplace
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

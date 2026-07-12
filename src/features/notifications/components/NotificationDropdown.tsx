import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { AppNotification } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, doc, writeBatch, where, getDocs } from "firebase/firestore";
import { notificationService } from "@/lib/notificationService";
import { Bell, Heart, MessageSquare, UserPlus, Sparkles, CheckCircle2, Package, Megaphone, Shield, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "users", user.id, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];

      setNotifications(list);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // The badge count is driven by its own uncapped `read == false` query,
  // independent of the 20-item preview list above. Previously the count was
  // just `list.filter(n => !n.read).length` on that same capped list, so any
  // unread notification older than the 20 most recent (e.g. after a burst of
  // reads/new items push it out of the window) silently vanished from the
  // badge even though it was still unread — the badge could under-count or
  // even show 0 while unread notifications existed.
  useEffect(() => {
    if (!user?.id) return;

    const unreadQuery = query(
      collection(db, "users", user.id, "notifications"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
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
        return <MessageSquare className="h-3 w-3 text-primary stroke-[3px]" />;
      case "order":
        return <Package className="h-3 w-3 text-emerald-500 stroke-[3px]" />;
      case "forum_reply":
        return <MessageSquare className="h-3 w-3 text-accent stroke-[3px]" />;
      case "like":
        return <Heart className="h-3 w-3 text-red-500 fill-red-500" />;
      case "follow":
        return <UserPlus className="h-3 w-3 text-blue-500 stroke-[3px]" />;
      case "mention":
        return <Sparkles className="h-3 w-3 text-purple-500" />;
      case "announcement":
        return <Megaphone className="h-3 w-3 text-yellow-500" />;
      case "admin":
        return <Shield className="h-3 w-3 text-zinc-800" />;
      case "listing_expiring":
        return <Clock className="h-3 w-3 text-amber-500 stroke-[3px]" />;
      case "listing_expired":
        return <Trash2 className="h-3 w-3 text-red-500 stroke-[3px]" />;
      default:
        return <Bell className="h-3 w-3 text-zinc-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/5 hover:border-primary/20 flex items-center justify-center transition-all text-textSecondary"
        >
          <Bell className="h-5 w-5 stroke-[2.5px]" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-black text-white shadow-lg shadow-primary/20"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-3 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] glass border-white/20 animate-in fade-in duration-300" align="end">
        <div className="flex items-center justify-between p-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-textPrimary">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              onClick={handleMarkAllRead}
              className="h-8 text-[8px] font-black uppercase tracking-wider hover:bg-black/5 rounded-xl px-2 text-primary"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-black/5 my-1" />

        <div className="max-h-80 overflow-y-auto space-y-1 py-1 pr-1 custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-colors focus:bg-primary/5 ${
                  !notif.read ? "bg-primary/5 border-l-2 border-primary" : ""
                }`}
              >
                {/* Sender Avatar */}
                <div className="relative shrink-0">
                  {notif.senderAvatar && notif.senderAvatar.length > 2 ? (
                    <img src={notif.senderAvatar} className="h-9 w-9 rounded-lg object-cover border border-black/5" alt="Avatar" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-black uppercase text-xs">
                      {notif.senderName?.charAt(0) || "S"}
                    </div>
                  )}
                  {/* Action Badge Indicator */}
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 border border-black/5 p-0.5 rounded-full shadow">
                    {getNotifIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <p className="text-[10px] text-textSecondary leading-normal">
                    {notif.senderName && <span className="font-black text-textPrimary uppercase tracking-tight mr-1">{notif.senderName}</span>}
                    {notif.body}
                  </p>
                  <span className="text-[8px] font-bold text-textMuted opacity-60 mt-1 block">
                    {notif.createdAt?.toDate
                      ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })
                      : "just now"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-zinc-300 stroke-[1.5px] mb-2" />
              <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">All caught up!</p>
            </div>
          )}
        </div>
        <div className="p-1 mt-1 border-t border-black/5">
          <Button 
            variant="ghost" 
            className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-textSecondary hover:text-primary hover:bg-primary/5"
            onClick={() => navigate('/notifications')}
          >
            See All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BellRing, Loader2 } from 'lucide-react';
import { useFCM } from '@/hooks/useFCM';

export function NotificationSettings() {
  const { user } = useAuth();
  const { permission, requestPermission } = useFCM();
  const [preferences, setPreferences] = useState({
    message: true,
    order: true,
    like: true,
    follow: true,
    mention: true,
    announcement: true,
    dailyDigest: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists() && userDoc.data().notificationPreferences) {
          setPreferences(prev => ({
            ...prev,
            ...userDoc.data().notificationPreferences
          }));
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        notificationPreferences: preferences
      });
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const notificationTypes = [
    { key: 'message', label: 'Direct Messages', description: 'When someone sends you a message' },
    { key: 'order', label: 'Order Updates', description: 'When there are updates to your listings or purchases' },
    { key: 'like', label: 'Likes & Reactions', description: 'When someone reacts to your posts' },
    { key: 'follow', label: 'New Followers', description: 'When someone starts following you' },
    { key: 'mention', label: 'Mentions', description: 'When you are mentioned in a discussion' },
    { key: 'announcement', label: 'Campus Announcements', description: 'Important updates from the Siyayya team' },
    { key: 'dailyDigest', label: 'Daily Marketplace Reminder', description: 'One daily reminder to check new campus deals' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[11px] font-black text-textPrimary uppercase tracking-widest italic">Push Notifications</h4>
          <p className="text-[9px] font-bold text-textMuted uppercase mt-1 tracking-wider">
            {permission === 'granted' ? 'Device Push Enabled' : 'Enable device push for daily reminders'}
          </p>
        </div>
      </div>

      {permission !== 'granted' && (
        <button
          onClick={requestPermission}
          className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all"
        >
          Enable Push Notifications
        </button>
      )}

      <div className="space-y-4 bg-black/5 dark:bg-white/5 rounded-2xl p-6">
        {notificationTypes.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={key} className="text-[10px] font-black text-textPrimary uppercase tracking-widest cursor-pointer">
                {label}
              </Label>
              <p className="text-[9px] text-textMuted font-bold uppercase tracking-wider opacity-60">
                {description}
              </p>
            </div>
            <Switch
              id={key}
              checked={preferences[key as keyof typeof preferences]}
              onCheckedChange={() => handleToggle(key as keyof typeof preferences)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        ))}
      </div>

      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-12 rounded-xl bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

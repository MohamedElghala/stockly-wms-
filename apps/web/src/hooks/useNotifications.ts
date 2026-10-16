import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AppNotification } from '@stockly/domain';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data() as AppNotification;
        notifs.push({ ...data, id: doc.id });
        if (!data.isRead) {
          unread++;
        }
      });

      if (notifs.length > 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const latestNotif = notifs[0];
        if (!latestNotif.isRead && (Date.now() - latestNotif.createdAt < 5000)) {
          new Notification(latestNotif.title, {
            body: latestNotif.message,
          });
        }
      }

      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) {
      console.error('Error marking notification as read', e);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    for (const notif of unreadNotifs) {
      if (notif.id) {
        markAsRead(notif.id);
      }
    }
  };

  const requestPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestPermission
  };
}

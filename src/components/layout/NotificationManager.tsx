"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

export function NotificationManager() {
  const { user, profile } = useAuth();
  const previousUnreadRef = useRef<Record<string, number>>({});
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Request notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const userChatsRef = collection(db, "userChats", user.uid, "chats");
    const q = query(userChatsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadRef.current) {
        // Just store the initial unread counts so we don't spam notifications on reload
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          previousUnreadRef.current[doc.id] = data.unreadCount || 0;
        });
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          const currentUnread = data.unreadCount || 0;
          const prevUnread = previousUnreadRef.current[change.doc.id] || 0;

          // If unread count increased, we have a new message
          if (currentUnread > prevUnread) {
            // Check global mute AND chat-specific mute
            if (!profile?.muteAllNotifications && !data.isMuted) {
              // 1. Play Sound
              try {
                const audio = new Audio("/notification.mp3");
                audio.play().catch(e => console.log("Audio play blocked by browser", e));
              } catch (e) {
                console.error("Audio error", e);
              }

              // 2. Vibrate
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }

              // 3. Web Push Notification
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                // Ensure we don't spam the desktop if they are actively in the browser
                if (document.hidden) {
                  const title = data.title || "New Message";
                  const body = data.lastMessagePreview || "You received a new message";
                  new Notification(title, {
                    body,
                  });
                }
              }
            }
          }

          // Update ref
          previousUnreadRef.current[change.doc.id] = currentUnread;
        }
      });
    });

    return () => unsubscribe();
  }, [user, profile?.muteAllNotifications]);

  return null; // This component is invisible
}

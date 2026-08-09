"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace("/");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    
    const updateStatus = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationStatus(Notification.permission);
      }
    };

    if (typeof window !== 'undefined' && 'Notification' in window) {
      updateStatus();
      
      // Use Permissions API for continuous monitoring if available
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then(status => {
          permissionStatus = status;
          status.onchange = updateStatus;
        }).catch(e => {
          console.warn("Permissions API not supported for notifications", e);
        });
      }
      
      // Fallback polling for browsers that don't support permissions.query for notifications (e.g. Safari)
      const interval = setInterval(updateStatus, 1000);
      
      return () => {
        clearInterval(interval);
        if (permissionStatus) {
          permissionStatus.onchange = null;
        }
      };
    } else {
      setNotificationStatus("granted"); // fallback if not supported
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'denied') {
        alert("Please enable notifications in your browser settings to continue.");
      }
    }
  };

  if (loading || !user || !profile || notificationStatus === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
            <span className="sr-only">Loading Obsidian...</span>
          </div>
        </div>
      </div>
    );
  }

  if (notificationStatus === 'default' || notificationStatus === 'denied') {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Blurry App Background */}
        <div className="h-screen w-full blur-xl scale-105 opacity-60 pointer-events-none select-none overflow-hidden fixed inset-0 z-0">
          <AppShell>{children}</AppShell>
        </div>
        
        {/* Blocker Overlay */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background/40 backdrop-blur-3xl p-6 text-center z-50 fixed inset-0">
          <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mb-6 text-primary-500 ring-4 ring-primary-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <h1 className="text-3xl font-extrabold mb-3 text-foreground tracking-tight">Allow Notifications to enter</h1>
          <p className="text-text-muted mb-8 max-w-sm text-base">
            Obsidian Chat requires notifications to alert you of new messages. Please allow notifications to continue.
          </p>
          <button 
            onClick={requestPermission}
            className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
          >
            {notificationStatus === 'denied' ? 'I have enabled them' : 'Allow Notifications'}
          </button>
          {notificationStatus === 'denied' && (
            <p className="text-sm text-red-500 mt-6 max-w-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <strong>Action required:</strong> You have blocked notifications. Please tap the site settings (lock icon) in your browser address bar to allow them, then tap the button above.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

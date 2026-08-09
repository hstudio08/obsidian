"use client";

import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, profile, logout, requestNotificationPermission } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleHideEmail = async () => {
    if (!user || !profile) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        hideEmail: !profile.hideEmail
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-background relative overflow-y-auto pb-24">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl border-b border-border pt-safe">
        <div className="h-16 px-4 flex items-center">
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto w-full space-y-6 mt-2">
        {/* Account Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider ml-2">Account</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Privacy & Security</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Storage & Data</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider ml-2">Preferences</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Appearance</span>
              <span className="text-text-muted text-sm mr-1 flex items-center gap-2">System <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Language</span>
              <span className="text-text-muted text-sm mr-1 flex items-center gap-2">English <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>
            </button>
          </div>
        </div>

        {/* Privacy Options */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider ml-2">Privacy & Notifications</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
              <div className="flex flex-col">
                <span className="font-medium">Hide Email</span>
                <span className="text-xs text-text-muted">Don't show my email to other users</span>
              </div>
              <button 
                onClick={toggleHideEmail}
                disabled={isUpdating}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${profile?.hideEmail ? 'bg-primary-500' : 'bg-surface-hover border border-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${profile?.hideEmail ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                  if (Notification.permission === 'granted') {
                    alert('Notifications are already enabled!');
                  } else if (Notification.permission === 'denied') {
                    alert('Notifications are blocked by your browser. Please enable them in your browser settings.');
                  } else {
                    requestNotificationPermission();
                  }
                } else {
                  alert('Push notifications are not supported in this browser.');
                }
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="font-medium">Enable Notifications</span>
                <span className="text-xs text-text-muted">Receive push notifications for new messages</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
          </div>
        </div>

        {/* Legal Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider ml-2">Legal</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <Link href="/terms" className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Terms & Conditions</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <Link href="/privacy" className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
              <span className="font-medium">Privacy Policy</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4">
          <button 
            onClick={logout}
            className="w-full p-4 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-2xl transition-colors border border-red-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

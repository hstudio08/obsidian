import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationManager } from "./NotificationManager";
import { useState, useEffect } from "react";
import { NewChatModal } from "../chat/NewChatModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsNewChatOpen(true);
    window.addEventListener('openNewChat', handleOpen);
    return () => window.removeEventListener('openNewChat', handleOpen);
  }, []);

  const isChats = pathname?.startsWith("/chats");
  const isNotifications = pathname?.startsWith("/notifications");
  const isProfile = pathname?.startsWith("/profile");
  const isSettings = pathname?.startsWith("/settings");
  const isChatDetail = pathname?.match(/^\/chats\/[a-zA-Z0-9_-]+$/);

  return (
    <div className={`flex h-screen bg-background text-foreground ${isChatDetail ? 'chat-pattern-bg' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface/50 backdrop-blur-xl">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground rounded-lg transform rotate-45 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-primary-500 rounded-sm" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Obsidian</span>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          <Link 
            href="/chats" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isChats ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-hover'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            Chats
          </Link>
          <Link 
            href="/contacts" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname?.startsWith("/contacts") ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-hover'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><circle cx="12" cy="8" r="2"/><path d="M12 13a4 4 0 0 0-4 4v2h8v-2a4 4 0 0 0-4-4Z"/></svg>
            Contacts
          </Link>
          <Link 
            href="/profile" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isProfile || isSettings ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-hover'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Settings & Profile
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <NotificationManager />
        {children}
        <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      </main>

      {/* Mobile Bottom Navigation - Telegram Floating Style */}
      <nav className={`md:hidden fixed bottom-6 left-5 right-5 z-50 ${isChatDetail ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between px-3 py-2.5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-border/40 shadow-2xl rounded-[32px]">
           {/* Chats */}
           <Link href="/chats" className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-14 ${isChats ? 'text-primary-600 scale-105' : 'text-slate-400 hover:text-primary-500'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={isChats ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isChats ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
             {isChats && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary-600"></span>}
           </Link>

           {/* Contacts (Call Icon) */}
           <Link href="/contacts" className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-14 ${pathname?.startsWith("/contacts") ? 'text-primary-600 scale-105' : 'text-slate-400 hover:text-primary-500'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={pathname?.startsWith("/contacts") ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={pathname?.startsWith("/contacts") ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
             {pathname?.startsWith("/contacts") && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary-600"></span>}
           </Link>

           {/* Plus - New Chat */}
           <button 
             onClick={() => setIsNewChatOpen(true)}
             className="relative flex flex-col items-center justify-center p-2 w-14 group"
           >
             <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 transform group-active:scale-95 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
             </div>
           </button>

           {/* Settings (Gear Icon) */}
           <Link href="/profile" className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-14 ${(isProfile || isSettings) ? 'text-primary-600 scale-105' : 'text-slate-400 hover:text-primary-500'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={(isProfile || isSettings) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={(isProfile || isSettings) ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             {(isProfile || isSettings) && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary-600"></span>}
           </Link>
        </div>
      </nav>
    </div>
  );
}

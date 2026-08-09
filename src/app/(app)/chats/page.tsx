"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { NewGroupModal } from "@/components/chat/NewGroupModal";
import { ChatListItem } from "@/components/chat/ChatListItem";

interface ConversationSnippet {
  id: string;
  title: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export default function ChatsList() {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<ConversationSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'groups' | 'spam'>('direct');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    const userChatsRef = collection(db, "userChats", user.uid, "chats");
    const q = query(userChatsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats: ConversationSnippet[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        let timeString = "";
        if (data.lastMessageAt) {
          const date = data.lastMessageAt.toDate ? data.lastMessageAt.toDate() : new Date(data.lastMessageAt);
          timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        fetchedChats.push({
          id: data.conversationId || docSnap.id,
          title: data.title || "Chat",
          lastMessage: data.lastMessagePreview || "No messages yet",
          time: timeString,
          unread: data.unreadCount || 0
        });
      });
      
      setChats(fetchedChats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter chats
  const filteredChats = chats.filter(chat => {
    let otherUid = null;
    if (chat.id.startsWith('direct_')) {
      const parts = chat.id.replace('direct_', '').split('_');
      otherUid = parts[0] === user?.uid ? parts[1] : parts[0];
    }
    const isGroup = chat.id.startsWith('group_');
    const isBlocked = otherUid && profile?.blockedUserIds?.includes(otherUid);
    const isRestricted = otherUid && profile?.restrictedUserIds?.includes(otherUid);
    
    // Completely hide blocked chats
    if (isBlocked) return false;
    
    // Search Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      if (!chat.title.toLowerCase().includes(q) && !chat.lastMessage.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    if (activeTab === 'spam') {
      return isRestricted;
    } else if (activeTab === 'groups') {
      return isGroup && !isRestricted;
    } else {
      return !isGroup && !isRestricted;
    }
  });

  return (
    <div className="flex flex-col w-full h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-20 pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
          <div className="flex gap-2 sm:gap-3">
            <Link 
              href="/profile"
              className="px-3 sm:px-4 h-10 flex items-center justify-center gap-2 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm rounded-full transition-all border border-slate-200/50 dark:border-slate-700/50 text-sm font-semibold"
              title="Profile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="px-3 sm:px-4 h-10 flex items-center justify-center gap-2 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm rounded-full transition-all border border-slate-200/50 dark:border-slate-700/50 text-sm font-semibold"
              title="New Group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span className="hidden sm:inline">Group</span>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openNewChat'))}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm rounded-full transition-all border border-slate-200/50 dark:border-slate-700/50"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 mt-3">
          <div className="relative group">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary-500 transition-colors"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white text-sm rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-sm transition-all"
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 pb-2 pt-3 flex gap-4">
          <button 
            onClick={() => setActiveTab('direct')}
            className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${activeTab === 'direct' ? 'border-primary-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Direct
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${activeTab === 'groups' ? 'border-primary-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Groups
          </button>
          <button 
            onClick={() => setActiveTab('spam')}
            className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${activeTab === 'spam' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Spam
          </button>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 mt-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center p-4 bg-white/40 dark:bg-slate-800/20 backdrop-blur-md rounded-2xl animate-pulse">
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 dark:text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p>{activeTab === 'spam' ? "Spam folder is empty" : "No conversations yet"}</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <ChatListItem key={chat.id} chat={chat} currentUserId={user?.uid || ""} />
              ))
            )}
          </div>
        )}
      </div>

      <NewGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
}

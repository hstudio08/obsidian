"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { sendMessage } from "@/lib/chat";
import Image from "next/image";

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
}

export function ForwardMessageModal({ isOpen, onClose, messageText }: ForwardMessageModalProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardingTo, setForwardingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    const chatsRef = collection(db, "userChats", user.uid, "chats");
    const q = query(chatsRef, orderBy("lastMessageAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedChats.push({ id: docSnap.id, ...docSnap.data() });
      });
      setChats(fetchedChats);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const handleForward = async (chat: any) => {
    if (!user || forwardingTo) return;
    setForwardingTo(chat.id);
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const convDoc = await getDoc(doc(db, "conversations", chat.id));
      if (!convDoc.exists()) {
        alert("Conversation not found.");
        return;
      }
      
      const memberIds = convDoc.data().members;
      
      await sendMessage(chat.id, user.uid, messageText, memberIds, user.displayName || "User");
      
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to forward message.");
    } finally {
      setForwardingTo(null);
    }
  };

  if (!isOpen) return null;

  const filteredChats = chats.filter(chat => 
    (chat.title || "Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex items-center p-4 bg-surface/80 border-b border-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-surface-hover transition-colors">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-lg ml-2">Forward to...</h3>
      </div>
      
      <div className="p-4">
        <input 
          type="text" 
          placeholder="Search chats..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-hover border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pb-safe">
        {filteredChats.map(chat => (
          <div key={chat.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-surface-hover cursor-pointer" onClick={() => handleForward(chat)}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold">
                {(chat.title || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{chat.title || "Chat"}</h4>
                <p className="text-xs text-text-muted truncate max-w-[200px]">{chat.lastMessagePreview || "No messages"}</p>
              </div>
            </div>
            <button 
              disabled={forwardingTo === chat.id}
              className="bg-primary-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {forwardingTo === chat.id ? "..." : "Send"}
            </button>
          </div>
        ))}
        {filteredChats.length === 0 && (
          <div className="p-8 text-center text-text-muted">No chats found.</div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { createDirectConversation } from "@/lib/chat";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

export function NewChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [foundUser, setFoundUser] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim() || !user || !profile) return;
    
    setIsSearching(true);
    setError(null);
    setFoundUser(null);
    
    try {
      const normalizedQuery = searchUsername.trim().toLowerCase();
      

      
      const usernameDoc = await getDoc(doc(db, "usernames", normalizedQuery));
      if (!usernameDoc.exists()) {
        setError("User not found.");
        setIsSearching(false);
        return;
      }
      
      const uid = usernameDoc.data().uid;
      
      if (uid === user.uid) {
        setError("You cannot start a chat with yourself.");
        setIsSearching(false);
        return;
      }
      
      const userProfileDoc = await getDoc(doc(db, "users", uid));
      if (userProfileDoc.exists()) {
        setFoundUser(userProfileDoc.data());
      } else {
        setError("User profile data not found.");
      }
      
    } catch (err) {
      console.error(err);
      setError("An error occurred while searching.");
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = async () => {
    if (!user || !foundUser) return;
    
    try {
      const convId = await createDirectConversation(user.uid, foundUser.uid);
      onClose();
      router.push(`/chats/${convId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to start conversation.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-[#1b1b1c]">New Chat</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Search by username..." 
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:bg-white transition-all"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isSearching || !searchUsername.trim()}
              className="bg-[#1b1b1c] text-white px-5 rounded-xl font-medium text-sm hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg text-center mb-4 border border-red-100">
              {error}
            </div>
          )}

          {foundUser && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 relative">
                  {(foundUser.avatarUrl?.startsWith("http") || foundUser.avatarUrl?.startsWith("/")) ? (
                    <img src={foundUser.avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-gradient-to-tr from-primary-600 to-primary-400 text-white">
                      {foundUser.displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-[#1b1b1c]">{foundUser.displayName}</h4>
                  <p className="text-sm text-primary-500">@{foundUser.username}</p>
                </div>
              </div>
              <button 
                onClick={startChat}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-primary-500/30"
              >
                Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { createGroupConversation } from "@/lib/chat";
import { useAuth } from "@/contexts/AuthContext";

export function NewGroupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [groupName, setGroupName] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim() || !user || !profile) return;
    
    setIsSearching(true);
    setError(null);
    
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
        setError("You are already in the group.");
        setIsSearching(false);
        return;
      }

      if (selectedMembers.find(m => m.uid === uid)) {
        setError("User is already added to the group.");
        setIsSearching(false);
        return;
      }
      
      const userProfileDoc = await getDoc(doc(db, "users", uid));
      if (userProfileDoc.exists()) {
        setSelectedMembers(prev => [...prev, userProfileDoc.data()]);
        setSearchUsername("");
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

  const removeMember = (uid: string) => {
    setSelectedMembers(prev => prev.filter(m => m.uid !== uid));
  };

  const startGroupChat = async () => {
    if (!user || selectedMembers.length === 0 || !groupName.trim()) return;
    
    try {
      const memberIds = [user.uid, ...selectedMembers.map(m => m.uid)];
      const convId = await createGroupConversation(groupName.trim(), memberIds, user.uid);
      onClose();
      router.push(`/chats/${convId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create group.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">New Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-800">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Group Name</label>
            <input 
              type="text" 
              placeholder="Enter group name..." 
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-all text-slate-900 dark:text-white"
            />
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Search by username to add members..." 
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-all text-slate-900 dark:text-white"
            />
            <button 
              type="submit" 
              disabled={isSearching || !searchUsername.trim()}
              className="bg-primary-500 text-white px-5 rounded-xl font-medium text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Add"}
            </button>
          </form>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-center mb-4 border border-red-100 dark:border-red-500/20">
              {error}
            </div>
          )}

          {selectedMembers.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Members ({selectedMembers.length})</label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(m => (
                  <div key={m.uid} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full pl-2 pr-1 py-1">
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">@{m.username}</span>
                    <button 
                      onClick={() => removeMember(m.uid)}
                      className="w-5 h-5 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={startGroupChat}
            disabled={selectedMembers.length === 0 || !groupName.trim()}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

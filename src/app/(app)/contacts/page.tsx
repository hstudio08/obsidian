"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore";
import { UserProfile } from "@/types";
import Image from "next/image";
import { getCloudinaryThumbnail } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDirectConversation } from "@/lib/chat";

interface ContactData {
  uid: string;
  addedAt: number;
  profile: UserProfile | null;
}

export default function ContactsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const handleStartChat = async (targetUid: string) => {
    if (!user) return;
    setStartingChat(targetUid);
    try {
      const convId = await createDirectConversation(user.uid, targetUid);
      router.push(`/chats/${convId}`);
    } catch (e) {
      console.error("Failed to start chat", e);
      alert("Failed to start conversation.");
      setStartingChat(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    const contactsRef = collection(db, "users", user.uid, "contacts");
    const q = query(contactsRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedContacts: ContactData[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const contactUid = data.uid;
        
        // Fetch profile
        let profileData = null;
        try {
          const profileSnap = await getDoc(doc(db, "users", contactUid));
          if (profileSnap.exists()) {
            profileData = profileSnap.data() as UserProfile;
          }
        } catch (e) {
          console.error("Error fetching contact profile", e);
        }

        fetchedContacts.push({
          uid: contactUid,
          addedAt: data.addedAt ? (data.addedAt.toMillis ? data.addedAt.toMillis() : data.addedAt) : Date.now(),
          profile: profileData
        });
      }
      
      // Sort by recently added
      fetchedContacts.sort((a, b) => b.addedAt - a.addedAt);
      
      setContacts(fetchedContacts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contacts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteContact = async (contactUid: string, username?: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to remove @${username || "this user"} from your contacts?`)) return;
    
    try {
      await deleteDoc(doc(db, "users", user.uid, "contacts", contactUid));
    } catch (e) {
      console.error("Failed to delete contact", e);
      alert("Failed to delete contact.");
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    if (!c.profile) return false;
    const lowerQ = searchQuery.toLowerCase();
    return c.profile.displayName.toLowerCase().includes(lowerQ) || 
           c.profile.username.toLowerCase().includes(lowerQ);
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col p-4 animate-pulse gap-4 mt-16">
        <div className="h-10 bg-surface rounded-xl w-full"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-surface"></div>
            <div className="flex-1">
              <div className="h-5 bg-surface rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-surface rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 p-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Contacts
          </h1>
          <span className="bg-surface border border-border text-xs px-2.5 py-1 rounded-full font-semibold">
            {contacts.length} saved
          </span>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border/50 focus:border-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            {searchQuery ? "No contacts found." : "Your contact list is empty."}
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.uid} className="flex items-center gap-4 p-3 bg-surface border border-border/50 rounded-2xl hover:bg-surface-hover transition-colors">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-background shrink-0 border border-border/50">
                {contact.profile && contact.profile.avatarUrl ? (
                  <img 
                    src={getCloudinaryThumbnail(contact.profile.avatarUrl)}
                    alt={contact.profile.displayName}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-full flex items-center justify-center bg-primary-500/10 text-primary-500 font-bold text-xl"
                  style={{ display: (contact.profile && contact.profile.avatarUrl) ? 'none' : 'flex' }}
                >
                  {contact.profile?.displayName?.charAt(0).toUpperCase() || "?"}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {contact.profile?.displayName || "Unknown User"}
                </h3>
                <p className="text-sm text-text-muted truncate">
                  @{contact.profile?.username || "unknown"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleStartChat(contact.uid)}
                  disabled={startingChat === contact.uid}
                  className="p-2 text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 rounded-full transition-colors disabled:opacity-50"
                  title="Message"
                >
                  {startingChat === contact.uid ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="animate-spin">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={() => handleDeleteContact(contact.uid, contact.profile?.username)}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                  title="Remove from contacts"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

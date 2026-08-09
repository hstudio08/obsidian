"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createDirectConversation } from "@/lib/chat";

export default function DeepLinkUsernamePage({ params }: { params: { username: string } }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Need to wait until user auth is resolved
    if (user === undefined || profile === undefined) return;
    
    // If not logged in, redirect to login page (which handles next redirects if implemented, or just home)
    if (user === null) {
      router.replace("/");
      return;
    }

    const startDeepLinkChat = async () => {
      try {
        const username = params.username.toLowerCase();
        

        const usernameDoc = await getDoc(doc(db, "usernames", username));
        if (!usernameDoc.exists()) {
          setError(`User @${params.username} does not exist.`);
          return;
        }

        const targetUid = usernameDoc.data().uid;

        if (targetUid === user.uid) {
          setError("You cannot start a chat with yourself.");
          return;
        }

        // Create or find existing direct conversation
        const convId = await createDirectConversation(user.uid, targetUid);
        
        // Redirect to the chat
        router.replace(`/chats/${convId}`);

      } catch (err) {
        console.error("Deep link error:", err);
        setError("An error occurred while resolving the user.");
      }
    };

    startDeepLinkChat();
  }, [user, profile, params.username, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <div className="bg-surface p-8 rounded-3xl shadow-sm border border-border max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="red" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-text-muted">{error}</p>
          <button 
            onClick={() => router.replace("/chats")}
            className="mt-6 w-full py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-colors"
          >
            Go to Chats
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
      <p className="text-text-muted font-medium animate-pulse">Resolving user @{params.username}...</p>
    </div>
  );
}

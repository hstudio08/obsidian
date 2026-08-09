"use client";

import { useEffect, useState } from "react";
import { getCloudinaryThumbnail } from "@/lib/utils";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ChatListItemProps {
  chat: {
    id: string;
    title: string;
    lastMessage: string;
    time: string;
    unread: number;
    avatarUrl?: string;
  };
  currentUserId: string;
}

export function ChatListItem({ chat, currentUserId }: ChatListItemProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(chat.avatarUrl || null);
  const [displayName, setDisplayName] = useState<string>(chat.title);

  useEffect(() => {
    let unsubscribe = () => {};

    if (chat.id.startsWith("direct_")) {
      const parts = chat.id.replace("direct_", "").split("_");
      const otherUid = parts[0] === currentUserId ? parts[1] : parts[0];
      
      import("firebase/firestore").then(({ doc, onSnapshot }) => {
        unsubscribe = onSnapshot(doc(db, "users", otherUid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
            if (!chat.title || chat.title === "Chat" || chat.title === data.displayName) {
              setDisplayName(data.displayName || "Unknown");
            }
          }
        });
      });
    } else if (chat.id.startsWith("group_")) {
      import("firebase/firestore").then(({ doc, onSnapshot }) => {
        unsubscribe = onSnapshot(doc(db, "conversations", chat.id), (convDoc) => {
          if (convDoc.exists()) {
            const data = convDoc.data();
            if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
            if (data.name || data.title) setDisplayName(data.name || data.title);
          }
        });
      });
    }

    return () => unsubscribe();
  }, [chat.id, currentUserId, chat.title]);

  return (
    <Link 
      href={`/chats/${chat.id}`} 
      className="flex items-center gap-4 p-4 bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-sm rounded-2xl transition-all group cursor-pointer"
    >
      <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xl shadow-inner bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 overflow-hidden relative">
        {avatarUrl ? (
          <img 
            src={getCloudinaryThumbnail(avatarUrl, 100)} 
            alt={displayName} 
            className="absolute inset-0 w-full h-full object-cover" 
            onError={() => setAvatarUrl(null)}
          />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className={`font-semibold truncate text-base ${chat.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
            {displayName}
          </h3>
          <span className={`text-xs whitespace-nowrap ml-2 ${chat.unread > 0 ? 'text-primary-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
            {chat.time}
          </span>
        </div>
        <p className={`text-sm truncate ${chat.unread > 0 ? 'text-slate-800 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {chat.lastMessage}
        </p>
      </div>

      {chat.unread > 0 && (
        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-primary-500/30">
          {chat.unread}
        </div>
      )}
    </Link>
  );
}

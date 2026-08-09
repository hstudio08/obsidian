"use client";

import { useState, useRef, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { getCloudinaryThumbnail } from "@/lib/utils";
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendMessage, deleteMessage, togglePinMessage, markChatAsRead } from "@/lib/chat";
import { Message } from "@/types";
import { ProfileViewerModal } from "@/components/chat/ProfileViewerModal";
import { ForwardMessageModal } from "@/components/chat/ForwardMessageModal";
import { MessageInput } from "@/components/chat/MessageInput";
import Image from "next/image";
import React from "react";

const ImageMessageRenderer = ({ url, autoDownload }: { url: string, autoDownload: boolean }) => {
  const [isLoaded, setIsLoaded] = useState(autoDownload);
  
  if (!url) return null;
  
  return (
    <div className="relative overflow-hidden rounded-lg mt-1 mb-2 max-w-full" style={{ minHeight: '120px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center z-10 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLoaded(true); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-md shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
          <span className="text-white/90 text-[10px] mt-1.5 font-medium uppercase tracking-wider">Download</span>
        </div>
      )}
      <img 
        src={isLoaded ? url : (url.includes('cloudinary') ? getCloudinaryThumbnail(url, 20) : url)} 
        alt="Attachment"
        className={`w-full h-auto max-h-[300px] object-cover transition-all duration-300 ${!isLoaded ? 'blur-xl scale-110' : ''}`}
        loading="lazy"
        onLoad={() => {
          if (!isLoaded && !url.includes('cloudinary')) {
            // If it's not a cloudinary image, we can't reliably generate a small thumbnail via URL, so the browser loads the full image anyway. But we still blur it.
          }
        }}
      />
    </div>
  );
};

export default function ChatView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLimit, setMessageLimit] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoDownload, setAutoDownload] = useState(true);
  
  const conversationId = resolvedParams?.id;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (conversationId) {
        const savedLimit = sessionStorage.getItem(`messageLimit_${conversationId}`);
        if (savedLimit) {
          setMessageLimit(parseInt(savedLimit, 10));
        }
      }
      
      const storedAutoDownload = localStorage.getItem("autoDownloadMedia");
      if (storedAutoDownload !== null) {
        setAutoDownload(storedAutoDownload === "true");
      }
    }
  }, [conversationId]);
  
  const handlePressStart = (id: string) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setSelectedMessageId(id);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); // 400ms hold
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const getMessageTint = (id: string, isMe: boolean) => {
    const tints = [
      'bg-rose-500/15 text-slate-900 dark:text-rose-50',
      'bg-sky-500/15 text-slate-900 dark:text-sky-50',
      'bg-emerald-500/15 text-slate-900 dark:text-emerald-50',
      'bg-amber-500/15 text-slate-900 dark:text-amber-50',
      'bg-purple-500/15 text-slate-900 dark:text-purple-50',
      'bg-teal-500/15 text-slate-900 dark:text-teal-50',
      'bg-indigo-500/15 text-slate-900 dark:text-indigo-50',
      'bg-pink-500/15 text-slate-900 dark:text-pink-50',
      'bg-cyan-500/15 text-slate-900 dark:text-cyan-50',
      'bg-orange-500/15 text-slate-900 dark:text-orange-50'
    ];
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return tints[sum % tints.length];
  };
  
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardMessageText, setForwardMessageText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return "Sending...";
    try {
      let dateObj;
      if (typeof createdAt.toDate === 'function') {
        dateObj = createdAt.toDate();
      } else if (createdAt.seconds) {
        dateObj = new Date(createdAt.seconds * 1000);
      } else if (createdAt._seconds) {
        dateObj = new Date(createdAt._seconds * 1000);
      } else if (typeof createdAt === 'number' || typeof createdAt === 'string') {
        dateObj = new Date(createdAt);
      } else {
        return "Just now"; // Fallback for unknown object shapes
      }
      
      if (isNaN(dateObj.getTime())) return "Just now";
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Just now";
    }
  };
  
  // Real data state
  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Refs for closure inside useEffect
  const otherUserRef = useRef<any>(null);
  const conversationRef = useRef<any>(null);
  const customTitleRef = useRef<string | null>(null);
  const clearedAtRef = useRef<number>(0);

  // Group members state
  const [groupMembers, setGroupMembers] = useState<Record<string, any>>({});

  // Typing indicator state
  const [otherTyping, setOtherTyping] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // 1. Fetch Conversation and Other User
    const fetchChatData = async () => {
      const convDoc = await getDoc(doc(db, "conversations", conversationId));
      if (convDoc.exists()) {
        const convData = convDoc.data();
        setConversation(convData);
        conversationRef.current = convData;
        
        if (convData.type !== "GROUP") {
          const otherUid = convData.members?.find((id: string) => id !== user.uid);
          if (otherUid) {
            import("firebase/firestore").then(({ onSnapshot }) => {
              onSnapshot(doc(db, "users", otherUid), (userDoc) => {
                if (userDoc.exists()) {
                  setOtherUser(userDoc.data());
                  otherUserRef.current = userDoc.data();
                }
              });
            });
          }
        } else {
          // Fetch all group members
          const membersPromises = (convData.members || []).map(async (uid: string) => {
            if (uid === user.uid) return null;
            const uDoc = await getDoc(doc(db, "users", uid));
            if (uDoc.exists()) {
              return uDoc.data();
            }
            return null;
          });
          const membersData = await Promise.all(membersPromises);
          const membersMap: Record<string, any> = {};
          membersData.forEach(m => {
            if (m) membersMap[m.uid] = m;
          });
          setGroupMembers(membersMap);
        }
      }
    };
    fetchChatData();

    // 2. Listen to custom contact title and mute status
    const userChatUnsub = onSnapshot(doc(db, "userChats", user.uid, "chats", conversationId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomTitle(data.title || null);
        customTitleRef.current = data.title || null;
        setIsMuted(!!data.isMuted);
        clearedAtRef.current = data.clearedAt || 0;
      } else {
        setCustomTitle(null);
        setIsMuted(false);
        clearedAtRef.current = 0;
      }
    });

    // 4. Listen to typing status
    const typingUnsub = onSnapshot(collection(db, "conversations", conversationId, "typing"), (snapshot) => {
      let someoneElseIsTyping = false;
      snapshot.forEach(docSnap => {
        if (docSnap.id !== user.uid && docSnap.data().isTyping) {
          someoneElseIsTyping = true;
        }
      });
      setOtherTyping(someoneElseIsTyping);
    });

    return () => {
      userChatUnsub();
      typingUnsub();
    };
  }, [conversationId, user]);

  // Messages Effect
  useEffect(() => {
    if (!user) return;
    
    let isFirstSnapshot = true;
    
    // 3. Listen to messages
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(messageLimit));
    const unsubscribeMessages = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      let incomingMessage = false;
      let incomingMessageContent = "You received a new message";
      let ownMessageDelivered = false;
      let ownMessageSent = false;

      snapshot.docChanges().forEach((change) => {
        if (!isFirstSnapshot) {
          if (change.type === "added" && change.doc.data().senderId !== user.uid) {
            const senderId = change.doc.data().senderId;
            const isBlocked = profile?.blockedUserIds?.includes(senderId);
            const isRestricted = profile?.restrictedUserIds?.includes(senderId);
            
            if (!isBlocked && !isRestricted) {
              incomingMessage = true;
            }
          }
          if (change.type === "added" && change.doc.data().senderId === user.uid) {
            ownMessageSent = true;
          }
          if (change.type === "modified" && change.doc.data().senderId === user.uid && !change.doc.metadata.hasPendingWrites) {
            ownMessageDelivered = true;
          }
        }
      });

      const globalMute = profile?.muteAllNotifications;

      if (ownMessageDelivered && navigator.vibrate && !isMuted && !globalMute) {
        navigator.vibrate(30);
      }
      
      // Auto-scroll to bottom only on first load, or when a brand new message arrives
      if (isFirstSnapshot || incomingMessage || ownMessageSent) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }

      isFirstSnapshot = false;

      const fetchedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip messages before clearedAt
        let createdAtMs = Date.now(); // default to now for pending messages
        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt.seconds) {
            createdAtMs = data.createdAt.seconds * 1000;
          } else if (typeof data.createdAt === 'number') {
            createdAtMs = data.createdAt;
          }
        }
        
        if (createdAtMs < clearedAtRef.current) return;

        if (!data.deletedBy?.includes(user.uid)) {
          if (data.senderId !== user.uid && profile?.blockedUserIds?.includes(data.senderId)) {
            return;
          }
          fetchedMessages.push({ 
            id: doc.id, 
            ...data,
            isPending: snapshot.metadata.hasPendingWrites && doc.metadata.hasPendingWrites
          } as Message);
        }
      });
      setMessages(fetchedMessages.reverse());
      setHasMore(snapshot.docs.length === messageLimit);
      setIsLoadingMore(false);
      
      // Mark as read when messages load or arrive
      markChatAsRead(conversationId, user.uid);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [conversationId, user, messageLimit]);


  const isGroup = conversation?.type === "GROUP";
  const displayNameToUse = customTitle || (isGroup ? conversation.title : (otherUser?.displayName || "Loading..."));
  
  const getAvatarLetter = () => {
    if (isGroup) return conversation.title?.charAt(0)?.toUpperCase() || "G";
    return displayNameToUse.charAt(0).toUpperCase();
  };

  const getSubtitle = () => {
    if (otherTyping) return "Typing...";
    if (isGroup) {
      return `${conversation.members?.length || 0} members`;
    }
    return otherUser ? `@${otherUser.username}` : "Loading...";
  };

  const renderMessageText = (text: string) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
      }
      return part;
    });
  };


  return (
    <div className="flex flex-col w-full h-full bg-background relative chat-pattern-bg">
      {/* Invisible Overlay for closing menus */}
      {selectedMessageId && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setSelectedMessageId(null)}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedMessageId(null);
          }}
        />
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl shadow-sm border-b border-border pt-safe rounded-b-3xl">
        <div className="h-16 px-4 flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="md:hidden w-10 h-10 -ml-2 flex items-center justify-center text-foreground hover:bg-surface-hover rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex-1 min-w-0 text-left transition-opacity flex items-center gap-3 hover:opacity-80 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-surface-hover flex items-center justify-center relative overflow-hidden">
              {(isGroup ? conversation?.avatarUrl : otherUser?.avatarUrl) ? (
                <img 
                  src={getCloudinaryThumbnail(isGroup ? conversation?.avatarUrl : otherUser?.avatarUrl, 100)} 
                  alt="Avatar" 
                  className="absolute inset-0 w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <span 
                className="text-sm font-bold text-foreground"
                style={{ display: (isGroup ? conversation?.avatarUrl : otherUser?.avatarUrl) ? 'none' : 'block' }}
              >
                {getAvatarLetter()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base leading-tight truncate text-foreground">{displayNameToUse}</h2>
              <p className="text-xs text-primary-500 font-medium truncate">
                {getSubtitle()}
              </p>
            </div>
          </button>
          
          <button onClick={() => { setIsSearchOpen(!isSearchOpen); setSearchQuery(""); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isSearchOpen ? 'bg-primary-100 text-primary-600' : 'text-text-muted hover:text-foreground hover:bg-surface-hover'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="absolute top-16 left-4 right-4 bg-surface border border-border rounded-2xl p-2 shadow-lg animate-in fade-in slide-in-from-top-2 z-30">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted ml-2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              type="text" 
              placeholder="Search messages..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:ring-0"
              autoFocus
            />
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="p-1.5 text-text-muted hover:text-foreground rounded-full hover:bg-surface-hover">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {conversation?.pinnedMessageIds?.length > 0 && (
        <div className="sticky top-16 z-10 bg-surface/95 backdrop-blur-md border-b border-border px-4 py-2 flex flex-col gap-1 shadow-sm">
          {messages.filter(m => conversation.pinnedMessageIds.includes(m.id)).map(pinned => (
            <div key={pinned.id} className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80" onClick={() => {
              // Scroll to message
              const el = document.getElementById(`msg-${pinned.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500 flex-shrink-0"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
              <div className="truncate flex-1 font-medium text-foreground">
                {pinned.deleted ? "Message deleted" : pinned.ciphertext}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:pb-24">
        <div className="flex flex-col gap-1">
          {hasMore && !isLoadingMore && (
            <div className="flex justify-center mb-4">
              <button 
                onClick={() => {
                  setIsLoadingMore(true);
                  const increments = [10, 30, 70, 130, 230, 380, 630];
                  const nextLimit = increments.find(l => l > messageLimit) || (messageLimit + 400);
                  setMessageLimit(nextLimit);
                  if (typeof window !== 'undefined' && conversationId) {
                    sessionStorage.setItem(`messageLimit_${conversationId}`, nextLimit.toString());
                  }
                }}
                className="px-4 py-1.5 bg-surface-hover hover:bg-surface border border-border text-xs font-medium text-text-muted hover:text-foreground rounded-full shadow-sm transition-colors"
              >
                See previous messages
              </button>
            </div>
          )}
          
          {isLoadingMore && (
            <div className="flex flex-col gap-3 w-full animate-pulse my-4 opacity-50">
              <div className="h-[50px] bg-surface/40 rounded-2xl w-2/3 self-start rounded-tl-sm backdrop-blur-md"></div>
              <div className="h-[60px] bg-surface/40 rounded-2xl w-3/4 self-end rounded-br-sm backdrop-blur-md"></div>
              <div className="h-[40px] bg-surface/40 rounded-2xl w-1/2 self-start rounded-tl-sm backdrop-blur-md"></div>
            </div>
          )}
          {(searchQuery ? messages.filter(m => m.ciphertext?.toLowerCase().includes(searchQuery.toLowerCase())) : messages).map((msg, index, arr) => {
            const isMe = msg.senderId === user?.uid;
            const prevMsg = index > 0 ? arr[index - 1] : null;
            const prevIsMe = prevMsg ? prevMsg.senderId === user?.uid : null;
            const isFirstInSequence = index === 0 || prevIsMe !== isMe;
            
            let msgDateStr = "";
            let prevMsgDateStr = "";
            
            try {
              const msgTime = typeof msg.createdAt === 'object' && (msg.createdAt as any).seconds ? (msg.createdAt as any).seconds * 1000 : msg.createdAt;
              msgDateStr = new Date(msgTime as number).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
              
              if (prevMsg) {
                const prevTime = typeof prevMsg.createdAt === 'object' && (prevMsg.createdAt as any).seconds ? (prevMsg.createdAt as any).seconds * 1000 : prevMsg.createdAt;
                prevMsgDateStr = new Date(prevTime as number).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
              }
            } catch (e) {
              msgDateStr = "Unknown Date";
            }
            
            const showDateHeader = msgDateStr !== prevMsgDateStr;
            const todayStr = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            
            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-6 w-full">
                    <span className="px-3 py-1 bg-surface/80 backdrop-blur-md text-text-muted text-xs font-medium uppercase tracking-wider rounded-full shadow-sm ring-1 ring-black/[0.03]">
                      {msgDateStr === todayStr ? 'Today' : msgDateStr}
                    </span>
                  </div>
                )}
                
                <div 
                  id={`msg-${msg.id}`}
                  className={`flex flex-col min-w-0 max-w-[75%] md:max-w-[60%] relative ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start'} ${isFirstInSequence ? 'mt-4' : 'mt-1'}`}
                >
                {msg.deleted ? (
                  <div className={`px-4 py-2.5 rounded-2xl shadow-sm backdrop-blur-md italic text-sm min-w-0 ${isMe ? 'bg-blue-600/50 text-white/80 rounded-br-sm' : 'bg-white/50 border border-slate-200/50 text-slate-500 rounded-bl-sm'}`}>
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                      This message was deleted
                    </span>
                  </div>
                ) : (
                  <div className={`flex items-end gap-2 relative group min-w-0 w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for others (only show on first in sequence) */}
                    {!isMe && (
                      <div className={`w-6 h-6 rounded-full bg-surface-hover flex-shrink-0 flex items-center justify-center relative overflow-hidden ${isFirstInSequence ? 'opacity-100' : 'opacity-0'}`}>
                        {(conversation?.type === 'GROUP' ? groupMembers[msg.senderId]?.avatarUrl : otherUser?.avatarUrl)?.startsWith("http") || (conversation?.type === 'GROUP' ? groupMembers[msg.senderId]?.avatarUrl : otherUser?.avatarUrl)?.startsWith("/") ? (
                          <img src={conversation?.type === 'GROUP' ? groupMembers[msg.senderId]?.avatarUrl : otherUser?.avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold">
                            {(conversation?.type === 'GROUP' ? (groupMembers[msg.senderId]?.displayName || "U") : displayNameToUse).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div 
                      onPointerDown={(e) => {
                        if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left click or touch
                        handlePressStart(msg.id);
                      }}
                      onPointerUp={handlePressEnd}
                      onPointerLeave={handlePressEnd}
                      onPointerCancel={handlePressEnd}
                      className={`message-glass min-w-0 px-4 py-2.5 rounded-2xl cursor-pointer transition-transform active:scale-[0.98] ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} ${getMessageTint(msg.id, isMe)}`}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      {conversation?.type === 'GROUP' && !isMe && isFirstInSequence && (
                        <div className="font-semibold text-[11px] mb-0.5 opacity-80 text-primary-500">
                          {groupMembers[msg.senderId]?.displayName || "Unknown User"}
                        </div>
                      )}
                      
                      {msg.replyTo && !msg.deleted && (
                        <div className={`mb-1.5 p-2 rounded-lg text-sm border-l-4 bg-black/5 dark:bg-white/5 border-current/50 opacity-90 truncate max-w-full`}>
                          <div className="font-semibold text-xs mb-0.5 opacity-80">{msg.replyTo.senderId === user?.uid ? "You" : (conversation?.type === 'GROUP' ? groupMembers[msg.replyTo.senderId]?.displayName || "User" : displayNameToUse)}</div>
                          <div className="truncate text-xs opacity-90">{msg.replyTo.text}</div>
                        </div>
                      )}
                      {msg.type?.startsWith('image') && msg.attachmentUrl && !msg.deleted && (
                        <ImageMessageRenderer url={msg.attachmentUrl} autoDownload={autoDownload} />
                      )}
                      {msg.ciphertext && (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
                          {renderMessageText(msg.ciphertext)}
                          {msg.showEditedLabel && !(isMe ? user?.email === 'officialhaadi81@gmail.com' : (isGroup ? groupMembers.find(m => m.uid === msg.senderId)?.email === 'officialhaadi81@gmail.com' : otherUser?.email === 'officialhaadi81@gmail.com')) && (
                            <span className="text-[10px] opacity-70 ml-2 italic text-text-muted">(edited)</span>
                          )}
                        </p>
                      )}
                    </div>
                    
                    {/* Context Menu Overlay */}
                    {selectedMessageId === msg.id && (
                      <div className={`absolute bottom-full mb-2 z-30 flex flex-col bg-surface/95 backdrop-blur-xl shadow-lg border border-border rounded-xl overflow-hidden min-w-[180px] ${isMe ? 'right-0' : 'left-8'}`}>
                        {!msg.deleted && (
                          <>
                            <button onClick={() => { setReplyingToMessage(msg); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                              Reply
                            </button>
                            <button onClick={() => { setForwardMessageText(msg.ciphertext || ""); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
                              Forward
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(msg.ciphertext || ""); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                              Copy
                            </button>
                            {isMe && (
                              <button onClick={() => { setEditingMessage(msg); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                Edit
                              </button>
                            )}
                          </>
                        )}
                        <button onClick={() => { togglePinMessage(conversationId, msg.id, !conversation?.pinnedMessageIds?.includes(msg.id)); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3 border-t border-border">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                          {conversation?.pinnedMessageIds?.includes(msg.id) ? 'Unpin' : 'Pin'}
                        </button>
                        <button onClick={() => { deleteMessage(conversationId, msg.id, false, user!.uid); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-surface-hover flex items-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/></svg>
                          Delete for me
                        </button>
                        {isMe && !msg.deleted && (
                          <button onClick={() => { deleteMessage(conversationId, msg.id, true, user!.uid); setSelectedMessageId(null); }} className="px-4 py-2.5 text-left text-sm hover:bg-red-500/10 text-red-500 flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Status & Time */}
                <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end pr-0 mr-0' : 'justify-start pl-8 ml-0'}`}>
                  <span className="text-[10px] text-text-muted font-medium">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                  {isMe && !msg.deleted && (
                    <span className="flex items-center">
                      {msg.status === 'failed' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                      ) : msg.isPending ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ) : conversation?.lastRead?.[otherUser?.uid] >= (msg.createdAt as any) ? (
                        /* Read Blue Ticks */
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                      ) : conversation?.lastDelivered?.[otherUser?.uid] >= (msg.createdAt as any) ? (
                        /* Delivered Double Gray Ticks */
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                      ) : (
                        /* Sent Gray Tick */
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 6 9 17l-5-5"/></svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
            );
          })}
          
          {/* Typing Indicator */}
          {otherTyping && (
            <div className="flex flex-col self-start items-start mt-4 max-w-[85%] md:max-w-[70%]">
              <div className="flex items-end gap-2 flex-row">
                <div className="w-6 h-6 rounded-full bg-surface-hover flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                  {(otherUser?.avatarUrl?.startsWith("http") || otherUser?.avatarUrl?.startsWith("/")) ? (
                    <img src={otherUser.avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{displayNameToUse.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="px-4 py-3.5 bg-surface border border-border text-foreground rounded-[18px] rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[40px]">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <MessageInput 
        conversationId={conversationId}
        user={user}
        displayNameToUse={displayNameToUse}
        replyingToMessage={replyingToMessage}
        setReplyingToMessage={setReplyingToMessage}
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        memberIds={conversation?.members || [user!.uid, otherUser?.uid].filter(Boolean) as string[]}
      />
      
      <ProfileViewerModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        otherUser={otherUser} 
        conversationId={conversationId} 
        customContactName={customTitle}
        isMuted={isMuted}
        messages={messages}
        conversation={conversation}
        groupMembers={Object.values(groupMembers)}
      />
      
      {forwardMessageText && (
        <ForwardMessageModal
          isOpen={true}
          onClose={() => setForwardMessageText(null)}
          messageText={forwardMessageText}
        />
      )}
    </div>
  );
}

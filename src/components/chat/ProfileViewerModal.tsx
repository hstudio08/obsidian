"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getCloudinaryThumbnail } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ImageCropper } from "@/components/ui/ImageCropper";

import { Message, Conversation } from "@/types";

interface ProfileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser?: any; // For direct chats
  conversationId: string;
  customContactName: string | null;
  isMuted?: boolean;
  messages?: Message[];
  conversation?: Conversation;
  groupMembers?: any[];
}

export function ProfileViewerModal({ 
  isOpen, onClose, otherUser, conversationId, customContactName, isMuted = false, messages, conversation, groupMembers 
}: ProfileViewerModalProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const isGroup = conversation?.type === "GROUP";
  const isAdmin = isGroup && conversation?.admins?.includes(user?.uid || "");
  
  const [isEditing, setIsEditing] = useState(false);
  
  // For group editing
  const initialName = isGroup ? conversation?.name || "Group" : customContactName || otherUser?.displayName || "";
  const [editName, setEditName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group Image Cropper state
  const [selectedImageStr, setSelectedImageStr] = useState<string | null>(null);
  
  const [canSeeAvatar, setCanSeeAvatar] = useState(true);
  const [canSeeEmail, setCanSeeEmail] = useState(true);

  useEffect(() => {
    const checkVisibility = async () => {
      if (isGroup || !otherUser || !user) {
        setCanSeeAvatar(true);
        setCanSeeEmail(true);
        return;
      }

      const evaluate = async (visibility: string, allowedUsers?: string[]) => {
        if (!visibility || visibility === 'everyone') return true;
        if (visibility === 'nobody') return false;
        if (visibility === 'contacts') {
          // Check if 'user' is in 'otherUser's contacts
          const contactRef = doc(db, "users", otherUser.uid, "contacts", user.uid);
          const snap = await getDoc(contactRef);
          return snap.exists();
        }
        if (visibility === 'selected' && allowedUsers) {
          return allowedUsers.includes(user.uid);
        }
        return false;
      };

      const avatarVis = await evaluate(otherUser.avatarVisibility, otherUser.avatarAllowedUsers);
      const emailVis = await evaluate(otherUser.emailVisibility, otherUser.emailAllowedUsers);
      
      setCanSeeAvatar(avatarVis);
      setCanSeeEmail(emailVis);
    };
    
    if (isOpen) {
      checkVisibility();
    }
  }, [isOpen, otherUser, user, isGroup]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large.");
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageStr(imageUrl);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    setSelectedImageStr(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "group_avatar.webp");
      formData.append("upload_preset", "Obsidian"); // Ensure this matches your unsigned upload preset
      const res = await fetch(`https://api.cloudinary.com/v1_1/dislib3k/image/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload");
      const data = await res.json();
      
      await updateDoc(doc(db, "conversations", conversationId), {
        avatarUrl: data.secure_url
      });
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContactName = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (isGroup) {
        if (isAdmin) {
          await updateDoc(doc(db, "conversations", conversationId), {
            name: editName.trim() || "Group"
          });
        }
      } else {
        const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
        const newTitle = editName.trim() || null;
        await setDoc(userChatRef, { title: newTitle }, { merge: true });
      }
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this chat from your recent list? The other person will still see it.")) return;
    
    setIsDeleting(true);
    try {
      const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
      await deleteDoc(userChatRef);
      router.push("/chats");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to leave this group?")) return;
    
    setIsDeleting(true);
    try {
      if (conversation) {
        await updateDoc(doc(db, "conversations", conversationId), {
          members: conversation.members?.filter(id => id !== user.uid) || [],
          admins: conversation.admins?.filter(id => id !== user.uid) || []
        });
      }
      const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
      await deleteDoc(userChatRef);
      router.push("/chats");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !isAdmin) return;
    if (!confirm("Are you sure you want to delete this group for everyone? This cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "conversations", conversationId));
      
      const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
      await deleteDoc(userChatRef);
      router.push("/chats");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to clear messages in this chat? New messages will still appear.")) return;
    
    try {
      const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
      await setDoc(userChatRef, {
        clearedAt: Date.now()
      }, { merge: true });
      alert("Chat cleared.");
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMute = async () => {
    if (!user) return;
    try {
      const userChatRef = doc(db, "userChats", user.uid, "chats", conversationId);
      await setDoc(userChatRef, {
        isMuted: !isMuted
      }, { merge: true });
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  };

  const handleReport = () => {
    if (!otherUser) return;
    const subject = encodeURIComponent(`Report User: ${otherUser.username || "Unknown"}`);
    const body = encodeURIComponent(`I would like to report the user @${otherUser.username} (${otherUser.uid}) for the following reason:\n\n`);
    window.location.href = `mailto:qurevotechnologies@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleBlock = async () => {
    if (!user || !profile || !otherUser) return;
    const isCurrentlyBlocked = profile?.blockedUserIds?.includes(otherUser.uid);
    const action = isCurrentlyBlocked ? "unblock" : "block";
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        const userRef = doc(db, "users", user.uid);
        const currentBlocked = profile.blockedUserIds || [];
        const newBlocked = isCurrentlyBlocked 
          ? currentBlocked.filter((id: string) => id !== otherUser.uid)
          : [...currentBlocked, otherUser.uid];
          
        await setDoc(userRef, { blockedUserIds: newBlocked }, { merge: true });
        
        if (!isCurrentlyBlocked) {
          const currentRestricted = profile.restrictedUserIds || [];
          if (currentRestricted.includes(otherUser.uid)) {
            await setDoc(userRef, { 
              restrictedUserIds: currentRestricted.filter((id: string) => id !== otherUser.uid) 
            }, { merge: true });
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRestrict = async () => {
    if (!user || !profile || !otherUser) return;
    const isCurrentlyRestricted = profile?.restrictedUserIds?.includes(otherUser.uid);
    const action = isCurrentlyRestricted ? "unrestrict" : "restrict";
    
    if (confirm(`Are you sure you want to ${action} this user? Restricted chats go to the Spam folder.`)) {
      try {
        const userRef = doc(db, "users", user.uid);
        const currentRestricted = profile.restrictedUserIds || [];
        const newRestricted = isCurrentlyRestricted 
          ? currentRestricted.filter((id: string) => id !== otherUser.uid)
          : [...currentRestricted, otherUser.uid];
          
        await setDoc(userRef, { restrictedUserIds: newRestricted }, { merge: true });
        
        if (!isCurrentlyRestricted) {
          const currentBlocked = profile.blockedUserIds || [];
          if (currentBlocked.includes(otherUser.uid)) {
            await setDoc(userRef, { 
              blockedUserIds: currentBlocked.filter((id: string) => id !== otherUser.uid) 
            }, { merge: true });
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportChat = () => {
    if (!messages || messages.length === 0) {
      alert("No messages to export.");
      return;
    }
    
    let textContent = `Chat Export\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    
    messages.forEach(msg => {
      let dateObj;
      if (typeof msg.createdAt === 'object' && (msg.createdAt as any).toDate) {
        dateObj = (msg.createdAt as any).toDate();
      } else if (typeof msg.createdAt === 'object' && (msg.createdAt as any).seconds) {
        dateObj = new Date((msg.createdAt as any).seconds * 1000);
      } else {
        dateObj = new Date(msg.createdAt);
      }
      
      const time = dateObj.toLocaleString();
      let sender = "You";
      if (msg.senderId !== user?.uid) {
        if (isGroup && groupMembers) {
          const m = groupMembers.find(m => m.uid === msg.senderId);
          sender = m ? m.displayName : msg.senderId;
        } else {
          sender = displayNameToUse;
        }
      }
      textContent += `[${time}] ${sender}: ${msg.deleted ? "This message was deleted" : msg.ciphertext}\n`;
    });
    
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ObsidianChat_Export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!isAdmin) return;
    if (!confirm("Remove this member?")) return;
    try {
      await updateDoc(doc(db, "conversations", conversationId), {
        members: arrayRemove(memberUid),
        admins: arrayRemove(memberUid)
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleMakeAdmin = async (memberUid: string) => {
    if (!isAdmin) return;
    if (!confirm("Make this member an admin?")) return;
    try {
      await updateDoc(doc(db, "conversations", conversationId), {
        admins: arrayUnion(memberUid)
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddParticipantPrompt = async () => {
    if (!isAdmin) return;
    const uid = prompt("Enter the exact user UID to add them to this group (In a real app, this would be a search modal):");
    if (uid && uid.trim()) {
      try {
        await updateDoc(doc(db, "conversations", conversationId), {
          members: arrayUnion(uid.trim())
        });
        alert("Added!");
      } catch (err) {
        console.error(err);
        alert("Failed to add.");
      }
    }
  };

  // Determine avatar and name
  const avatarToUse = isGroup 
    ? conversation?.avatarUrl 
    : (canSeeAvatar ? otherUser?.avatarUrl : undefined);
    
  const displayNameToUse = isGroup ? conversation?.name || "Group" : customContactName || otherUser?.displayName || "Unknown";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface/80 backdrop-blur-lg border-b border-border">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-foreground transition-colors">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-lg ml-2">{isGroup ? "Group Info" : "Contact Info"}</h3>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex flex-col items-center pb-12 w-full mx-auto">
        {/* Large Avatar */}
        <div className="w-full bg-surface border-b border-border p-8 flex flex-col items-center shadow-sm relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-surface-hover mb-4 shadow-lg ring-4 ring-background relative group/avatar">
            {(avatarToUse?.startsWith("http") || avatarToUse?.startsWith("/")) ? (
              <img src={getCloudinaryThumbnail(avatarToUse, 200)} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-gradient-to-tr from-primary-600 to-primary-400 text-white">
                {displayNameToUse.charAt(0).toUpperCase()}
              </div>
            )}
            
            {isGroup && isAdmin && (
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-xs font-medium mt-1">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mt-2 text-center break-words max-w-full">
            {displayNameToUse}
          </h2>
          {!isGroup && otherUser?.username && canSeeEmail && (
            <p className="text-primary-600 font-medium text-lg mt-1">@{otherUser.username}</p>
          )}
          {!isGroup && otherUser?.email && canSeeEmail && (
            <p className="text-text-muted font-medium text-sm mt-1">{otherUser.email}</p>
          )}
          {isGroup && (
            <p className="text-text-muted font-medium text-sm mt-1">{conversation?.members?.length || 0} participants</p>
          )}
        </div>

        {selectedImageStr && (
          <ImageCropper 
            imageSrc={selectedImageStr} 
            onCropComplete={handleCropComplete} 
            onCancel={() => setSelectedImageStr(null)} 
          />
        )}

        <div className="w-full max-w-2xl px-4 mt-6">
          {/* Options */}
          <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Contact/Group Edit */}
            {(!isGroup || isAdmin) && (
              isEditing ? (
                <div className="p-4 border-b border-border/50 bg-surface-hover/30">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">{isGroup ? "Group Name" : "Custom Name"}</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={isGroup ? "Group name..." : "Contact name..."}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveContactName}
                      disabled={isSaving}
                      className="bg-primary-600 text-white px-5 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
                    >
                      {isSaving ? "..." : "Save"}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-surface border border-border text-foreground px-4 rounded-xl font-medium hover:bg-surface-hover transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full flex justify-between items-center p-4 border-b border-border/50 hover:bg-surface-hover transition-colors group"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-foreground font-medium text-[16px]">{isGroup ? "Edit Group Name" : "Edit Contact Name"}</span>
                  </div>
                  <svg className="text-text-muted group-hover:text-primary-500 transition-colors" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )
            )}

            {/* Direct Chat only Actions */}
            {!isGroup && otherUser && (
              <>
                <div className="p-4 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-text-muted px-1 mb-3 uppercase tracking-wider">Privacy</h3>
                  
                  <div className="flex gap-2">
                    <button onClick={handleRestrict} className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border hover:bg-surface-hover transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                      <span className="text-[11px] font-semibold uppercase tracking-wider">{profile?.restrictedUserIds?.includes(otherUser.uid) ? "Unrestrict" : "Restrict"}</span>
                    </button>
                    
                    <button onClick={handleBlock} className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-red-600"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" /></svg>
                      <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">{profile?.blockedUserIds?.includes(otherUser.uid) ? "Unblock" : "Block"}</span>
                    </button>
                    
                    <button onClick={handleReport} className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                      <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Report</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-background/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-text-muted font-medium">Email</span>
                    <span className="text-sm font-medium">{otherUser.hideEmail ? "Hidden by user" : otherUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 mb-1">
                    <span className="text-text-muted text-sm">Date Joined</span>
                    <span className="font-medium text-sm">
                      {otherUser.createdAt ? new Date(otherUser.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Participants for Group */}
            {isGroup && groupMembers && (
              <div className="p-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Participants ({groupMembers.length})</h3>
                  {isAdmin && (
                    <button onClick={handleAddParticipantPrompt} className="text-primary-600 text-sm font-medium hover:underline">
                      + Add
                    </button>
                  )}
                </div>
                <div className="space-y-3 mt-4">
                  {groupMembers.map(member => {
                    const isMemAdmin = conversation?.admins?.includes(member.uid);
                    return (
                      <div key={member.uid} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-hover overflow-hidden">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">{member.displayName?.charAt(0)}</div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{member.uid === user?.uid ? "You" : member.displayName}</span>
                            {isMemAdmin && <span className="text-[10px] text-primary-500 uppercase tracking-wider font-semibold">Admin</span>}
                          </div>
                        </div>
                        {isAdmin && member.uid !== user?.uid && (
                          <div className="flex gap-2">
                            {!isMemAdmin && (
                              <button onClick={() => handleMakeAdmin(member.uid)} className="text-xs text-primary-500 hover:underline">Make Admin</button>
                            )}
                            <button onClick={() => handleRemoveMember(member.uid)} className="text-xs text-red-500 hover:underline">Remove</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Settings / Options */}
          <div className="w-full mt-6 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={handleToggleMute}
              className="w-full flex justify-between items-center px-4 py-4 hover:bg-surface-hover transition-colors group border-b border-border/50"
            >
              <div className="flex items-center gap-3">
                <svg className="text-text-muted" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isMuted ? (
                    <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                  ) : (
                    <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                  )}
                </svg>
                <span className="text-foreground font-medium text-[16px]">Mute Notifications</span>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${isMuted ? 'bg-primary-500' : 'bg-surface-hover border border-border'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${isMuted ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
            <button 
              onClick={handleExportChat}
              className="w-full text-left px-4 py-4 text-foreground hover:bg-surface-hover font-medium text-[16px] transition-colors flex items-center gap-3"
            >
              <svg className="text-text-muted" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export Chat
            </button>
          </div>

          {/* Delete / Clear */}
          <div className="w-full mt-6 bg-surface border border-red-500/20 rounded-2xl overflow-hidden shadow-sm mb-6">
            <button 
              onClick={handleClearChat}
              className="w-full text-left px-4 py-4 text-red-500 hover:bg-red-500/10 font-medium text-[16px] transition-colors flex items-center gap-3 border-b border-border/50"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Messages
            </button>
            {!isGroup && (
              <button 
                onClick={handleDeleteChat}
                disabled={isDeleting}
                className="w-full text-left px-4 py-4 text-red-500 hover:bg-red-500/10 font-medium text-[16px] transition-colors flex items-center gap-3"
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? "Deleting..." : "Delete from Recents"}
              </button>
            )}
            {isGroup && (
              <>
                <button 
                  onClick={handleLeaveGroup}
                  disabled={isDeleting}
                  className="w-full text-left px-4 py-4 text-red-500 hover:bg-red-500/10 font-medium text-[16px] transition-colors flex items-center gap-3 border-b border-border/50"
                >
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {isDeleting ? "Leaving..." : "Leave Group"}
                </button>
                {isAdmin && (
                  <button 
                    onClick={handleDeleteGroup}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-4 text-red-500 hover:bg-red-500/10 font-medium text-[16px] transition-colors flex items-center gap-3"
                  >
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? "Deleting..." : "Delete Group for Everyone"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

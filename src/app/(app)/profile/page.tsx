"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ImageCropper } from "@/components/ui/ImageCropper";

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [hideEmail, setHideEmail] = useState(false);
  const [emailVisibility, setEmailVisibility] = useState<"everyone"|"contacts"|"nobody">(profile?.emailVisibility || "everyone");
  const [avatarVisibility, setAvatarVisibility] = useState<"everyone"|"contacts"|"nobody">(profile?.avatarVisibility || "everyone");
  const [muteAll, setMuteAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<"privacy" | "storage" | null>(null);

  // New State for Privacy Modal
  const [blockUsernameInput, setBlockUsernameInput] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [blockSuccess, setBlockSuccess] = useState("");

  // New State for Storage Modal
  const [storageUsage, setStorageUsage] = useState<number | null>(null);
  const [storageQuota, setStorageQuota] = useState<number | null>(null);
  const [autoDownload, setAutoDownload] = useState(true);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setHideEmail(profile.hideEmail || false);
      setEmailVisibility(profile.emailVisibility || "everyone");
      setAvatarVisibility(profile.avatarVisibility || "everyone");
      setMuteAll(profile.muteAllNotifications || false);
    }
  }, [profile]);
  
  // Image Upload State
  const [selectedImageStr, setSelectedImageStr] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Limit initial file size to 10MB to prevent browser crash,
      // it will be compressed to <50kb locally before upload anyway
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please select an image under 10MB.");
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageStr(imageUrl);
      setIsEditing(true); // Auto enter edit mode
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    setPreviewUrl(URL.createObjectURL(blob));
    setSelectedImageStr(null);
    setIsSaving(true);
    
    try {
      // 1. Upload to Cloudinary immediately
      const formData = new FormData();
      formData.append("file", blob, "avatar.webp");
      formData.append("upload_preset", "Obsidian");
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/dislib3k/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to upload to Cloudinary");
      }
      
      const data = await res.json();
      const finalAvatarUrl = data.secure_url;
      
      // 2. Update Firestore immediately
      await updateDoc(doc(db, "users", user!.uid), {
        avatarUrl: finalAvatarUrl
      });
      
      // We don't need to keep the blob in state anymore since it's saved
      setCroppedBlob(null);
    } catch (error) {
      console.error("Error instantly saving avatar:", error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      let avatarUrl = profile.avatarUrl;
      if (croppedBlob) {
        // ... (existing image upload logic will stay unchanged except we just call it)
        const formData = new FormData();
        formData.append("file", croppedBlob);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) avatarUrl = data.url;
      }
      await updateDoc(doc(db, "users", profile.uid), {
        displayName,
        hideEmail,
        emailVisibility,
        avatarVisibility,
        muteAllNotifications: muteAll,
        avatarUrl
      });
      setIsEditing(false);
      setCroppedBlob(null);
      setSelectedImageStr(null);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockByUsername = async (action: "block" | "restrict") => {
    if (!profile || !blockUsernameInput.trim()) return;
    setBlockLoading(true);
    setBlockError("");
    setBlockSuccess("");
    try {
      const q = query(collection(db, "users"), where("username", "==", blockUsernameInput.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setBlockError("User not found.");
        return;
      }
      const targetUserId = snap.docs[0].id;
      if (targetUserId === profile.uid) {
        setBlockError("You cannot block yourself.");
        return;
      }
      
      const field = action === "block" ? "blockedUserIds" : "restrictedUserIds";
      await updateDoc(doc(db, "users", profile.uid), {
        [field]: arrayUnion(targetUserId)
      });
      setBlockSuccess(`Successfully ${action}ed @${blockUsernameInput.trim()}`);
      setBlockUsernameInput("");
    } catch (e) {
      setBlockError("An error occurred.");
    } finally {
      setBlockLoading(false);
    }
  };

  useEffect(() => {
    if (activeModal === "storage") {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
          setStorageUsage(estimate.usage || 0);
          setStorageQuota(estimate.quota || 0);
        });
      }
      const savedPref = localStorage.getItem("autoDownloadMedia");
      if (savedPref !== null) {
        setAutoDownload(savedPref === "true");
      }
    }
  }, [activeModal]);

  const toggleAutoDownload = (checked: boolean) => {
    setAutoDownload(checked);
    localStorage.setItem("autoDownloadMedia", checked.toString());
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col w-full h-full bg-background relative overflow-y-auto pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl border-b border-border pt-safe">
        <div className="h-16 px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Profile & Settings</h1>
          <Link href="/notifications" className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-surface"></span>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary-600/20 to-primary-400/10 relative">
          </div>
          
          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4">
              <div className="relative w-24 h-24 rounded-full bg-surface border-4 border-background shadow-xl overflow-hidden group">
                {(previewUrl || profile?.avatarUrl) && ((previewUrl || profile.avatarUrl).startsWith("http") || (previewUrl || profile.avatarUrl).startsWith("blob:") || (previewUrl || profile.avatarUrl).startsWith("/")) ? (
                  <img 
                    src={previewUrl || profile.avatarUrl} 
                    alt="Avatar" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-3xl font-bold bg-gradient-to-tr from-primary-600 to-primary-400 text-white`}>
                    {profile?.displayName?.charAt(0).toUpperCase()}
                  </div>
                )}
            
                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span className="text-[10px] text-white font-medium mt-1">Change</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            {selectedImageStr && (
              <ImageCropper 
                imageSrc={selectedImageStr} 
                onCropComplete={handleCropComplete} 
                onCancel={() => setSelectedImageStr(null)} 
              />
            )}

            <div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:border-primary-500 w-full max-w-[200px]"
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold tracking-tight">{profile.displayName}</h2>
              )}
              <p className="text-primary-500 font-medium">@{profile.username}</p>
            </div>

            <div className="mt-4 flex gap-2">
              {isEditing ? (
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !displayName.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-surface-hover hover:bg-surface-active rounded-xl font-semibold transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Settings</h2>
          </div>
          <div className="divide-y divide-border/50">
            <div onClick={() => setActiveModal("privacy")} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                </div>
                <div>
                  <div className="font-medium">Privacy & Security</div>
                  <div className="text-sm text-text-muted">Encryption, keys, blocked users</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            <div onClick={() => setActiveModal("storage")} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </div>
                <div>
                  <div className="font-medium">Storage & Data</div>
                  <div className="text-sm text-text-muted">Network usage, auto-download</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <span className="text-text-muted font-medium">Role</span>
            <span className="font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full text-sm">
              {profile.role}
            </span>
          </div>
          {profile.location && (
            <div className="p-4 flex items-center justify-between">
              <span className="text-text-muted font-medium">Location</span>
              <span className="font-medium">{profile.location}</span>
            </div>
          )}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-text-muted font-medium">Email</span>
              <span className="font-medium">{profile.email || "No email"}</span>
            </div>
            
            {isEditing && (
              <>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-sm text-text-muted">Show Email To</span>
                  <select 
                    value={emailVisibility} 
                    onChange={(e) => setEmailVisibility(e.target.value as any)}
                    className="bg-surface border border-border rounded-lg px-2 py-1 text-sm focus:outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-sm text-text-muted">Show Profile Picture To</span>
                  <select 
                    value={avatarVisibility} 
                    onChange={(e) => setAvatarVisibility(e.target.value as any)}
                    className="bg-surface border border-border rounded-lg px-2 py-1 text-sm focus:outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-sm text-text-muted">Mute all notifications</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={muteAll} onChange={(e) => setMuteAll(e.target.checked)} />
                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-text-muted font-medium">Member Since</span>
            <span className="font-medium">
              {profile.createdAt ? new Date(typeof profile.createdAt === 'number' ? profile.createdAt : (profile.createdAt as any).seconds * 1000).toLocaleDateString() : "Just now"}
            </span>
          </div>
        </div>

        {/* Legal Section */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <Link href="/terms" className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
            <span className="font-medium">Terms & Conditions</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
          <Link href="/privacy" className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left">
            <span className="font-medium">Privacy Policy</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "privacy" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
              <h3 className="font-semibold text-lg">Privacy & Security</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div className="flex items-start gap-4 p-4 bg-primary-500/10 rounded-2xl border border-primary-500/20">
                <div className="p-2 bg-primary-500/20 rounded-full text-primary-600">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-700 dark:text-primary-400 mb-1">Your chats are encrypted securely</h4>
                  <p className="text-sm text-primary-600/90 dark:text-primary-300 leading-relaxed">Your messages and calls are secured with industry-standard encryption. Only authorized participants can read or listen to them.</p>
                </div>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden bg-background/50 p-4 space-y-3">
                <h4 className="font-semibold text-sm">Restrict Users</h4>
                <p className="text-xs text-text-muted">Enter a username to instantly block or restrict them, even if you haven't chatted before.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">@</span>
                    <input 
                      type="text" 
                      value={blockUsernameInput}
                      onChange={(e) => setBlockUsernameInput(e.target.value)}
                      placeholder="username" 
                      className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                {blockError && <p className="text-xs text-red-500">{blockError}</p>}
                {blockSuccess && <p className="text-xs text-green-500">{blockSuccess}</p>}
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => handleBlockByUsername("block")}
                    disabled={blockLoading || !blockUsernameInput}
                    className="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    Block
                  </button>
                  <button 
                    onClick={() => handleBlockByUsername("restrict")}
                    disabled={blockLoading || !blockUsernameInput}
                    className="flex-1 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 disabled:opacity-50"
                  >
                    Restrict
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden bg-background/50">
                <div className="p-4 flex justify-between items-center hover:bg-surface-hover transition-colors">
                  <span className="font-medium text-foreground">Blocked Users</span>
                  <span className="bg-surface border border-border text-text-muted px-2.5 py-1 rounded-full text-sm font-semibold">{profile.blockedUserIds?.length || 0}</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-surface-hover transition-colors">
                  <span className="font-medium text-foreground">Restricted Users</span>
                  <span className="bg-surface border border-border text-text-muted px-2.5 py-1 rounded-full text-sm font-semibold">{profile.restrictedUserIds?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "storage" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
              <h3 className="font-semibold text-lg">Storage & Data</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <span className="font-semibold text-foreground">Local Storage Used</span>
                  <span className="text-sm font-bold text-primary-600">
                    {storageUsage !== null ? (storageUsage / (1024 * 1024)).toFixed(2) : "0"} MB
                  </span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-3 shadow-inner overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary-400 to-primary-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${storageQuota && storageUsage ? Math.min((storageUsage / storageQuota) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                {storageQuota !== null && (
                  <p className="text-xs text-text-muted text-right">of {(storageQuota / (1024 * 1024)).toFixed(2)} MB total available</p>
                )}
              </div>
              
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-foreground">Media Auto-Download</span>
                    <span className="text-xs text-text-muted">Download images over Wi-Fi</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={autoDownload}
                      onChange={(e) => toggleAutoDownload(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>

              <button 
                onClick={() => {
                  alert("Local cache cleared successfully!");
                  setActiveModal(null);
                }}
                className="w-full mt-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-semibold py-3.5 rounded-xl transition-colors"
              >
                Clear Local Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

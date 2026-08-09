"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { UserRole } from "@/types";
import { ImageCropper } from "@/components/ui/ImageCropper";

export function OnboardingForm() {
  const { user, profile } = useAuth();
  
  const [age, setAge] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  
  // Image Upload State
  const [selectedImageStr, setSelectedImageStr] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Prefill Google Auth details if available
  useEffect(() => {
    if (user) {
      if (user.displayName && !displayName) setDisplayName(user.displayName);
      if (user.photoURL && !previewUrl) setPreviewUrl(user.photoURL);
    }
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please select an image under 10MB.");
        return;
      }
      
      // Generate a temporary URL for the cropper
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageStr(imageUrl);
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setSelectedImageStr(null);
  };

  const checkUsername = async (value: string) => {
    if (!value || value.length > 10 || !/^[a-zA-Z0-9_.]+$/.test(value)) {
      setUsernameStatus("idle");
      return;
    }
    
    setUsernameStatus("checking");
    try {
      // Use Promise.race to prevent hanging if Firebase connection drops
      const docPromise = getDoc(doc(db, "usernames", value.toLowerCase()));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      
      const usernameDoc = await Promise.race([docPromise, timeoutPromise]) as any;
      
      if (usernameDoc.exists()) {
        setUsernameStatus("taken");
      } else {
        setUsernameStatus("available");
      }
    } catch (err: any) {
      console.warn("Could not check username online", err.message);
      // If we are offline or hit a rules delay, we let it fail gently
      setUsernameStatus("idle");
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    
    // Simple debounce would be better here, but for simplicity we check on blur or if length is complete
    if (value.length > 2) {
      checkUsername(value);
    } else {
      setUsernameStatus("idle");
    }
  };

  const generateDeterministicAvatar = (name: string) => {
    // Basic deterministic color based on name
    const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"];
    const hash = name.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const colorIndex = Math.abs(hash) % colors.length;
    return `avatar-${colors[colorIndex]}`; // In a real app we'd store the SVG or color code
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation
    if (!displayName.trim()) {
      setError("Display Name is required.");
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13) {
      setError("You must be at least 13 years old.");
      return;
    }
    if (username.length < 3 || username.length > 10) {
      setError("Username must be between 3 and 10 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError("Username can only contain letters, numbers, underscores, and periods.");
      return;
    }
    if (usernameStatus !== "available") {
      setError("Please choose an available username.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms and Conditions and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);
      
      const normalizedUsername = username.toLowerCase();
      const usernameRef = doc(db, "usernames", normalizedUsername);
      const userRef = doc(db, "users", user.uid);

      // We double check if username is still available (using Firestore Rules transaction in production is safer)
      try {
        const docPromise = getDoc(usernameRef);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 4000) // Shorter timeout to not make user wait too long
        );
        
        const usernameDoc = await Promise.race([docPromise, timeoutPromise]) as any;
        
        if (usernameDoc.exists()) {
          setError("Username was just taken. Please choose another.");
          setUsernameStatus("taken");
          setIsLoading(false);
          return;
        }
      } catch (checkErr) {
        // If it times out or errors, we assume they are offline or having connection issues
        // and let them proceed optimistically.
        console.warn("Skipped final username check due to network:", checkErr);
      }

      batch.set(usernameRef, {
        uid: user.uid,
        username: normalizedUsername,
        createdAt: serverTimestamp()
      });

      let finalAvatarUrl = generateDeterministicAvatar(displayName || normalizedUsername);

      if (croppedBlob) {
        try {
          const formData = new FormData();
          formData.append("file", croppedBlob, "avatar.webp");
          formData.append("upload_preset", "Obsidian");
          
          const res = await fetch(`https://api.cloudinary.com/v1_1/dislib3k/image/upload`, {
            method: "POST",
            body: formData,
          });
          
          if (!res.ok) {
            throw new Error("Failed to upload to Cloudinary");
          }
          
          const data = await res.json();
          finalAvatarUrl = data.secure_url;
        } catch (uploadErr: any) {
          console.error("Avatar upload failed:", uploadErr);
          // Fallback to deterministic avatar if upload fails
        }
      }

      batch.set(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        username: normalizedUsername,
        role: "USER",
        age: ageNum,
        avatarUrl: finalAvatarUrl,
        createdAt: serverTimestamp()
      });

      // Await batch.commit() to ensure we catch any permission errors
      await batch.commit();
      
    } catch (err: any) {
      console.error("Error creating profile", err);
      setError(err.message || "An error occurred while creating your profile. Please try again.");
      setIsLoading(false);
    }
  };

  // If we're already onboarded (has profile), we shouldn't be here
  if (profile) return null;

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-3xl relative overflow-hidden group/form">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-2 text-center text-[#1b1b1c] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Complete your profile</h2>
        <p className="text-sm text-center text-[#45474c] mb-6">Let's get you set up to start chatting.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
          <div className="flex flex-col items-center mb-2">
            <div className="relative group cursor-pointer w-24 h-24 mb-3 transition-transform duration-300 hover:scale-105">
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-white" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/50 border border-white/60 shadow-sm flex flex-col items-center justify-center text-gray-500 group-hover:bg-white/80 transition-all backdrop-blur-sm">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] mt-1 font-medium">Add Photo</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload profile picture"
              />
            </div>
            {selectedImageStr && (
              <ImageCropper 
                imageSrc={selectedImageStr} 
                onCropComplete={handleCropComplete} 
                onCancel={() => setSelectedImageStr(null)} 
              />
            )}
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#1b1b1c]/70 ml-1">Display Name</label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/50 border border-white/60 shadow-sm rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white transition-all backdrop-blur-sm"
              placeholder="Jane Doe"
            />
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#1b1b1c]/70 ml-1">Username <span className="text-[#45474c]/60 font-normal lowercase">(max 10 chars)</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#45474c] font-medium">@</span>
              <input
                type="text"
                required
                maxLength={10}
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => checkUsername(username)}
                className="w-full bg-white/50 border border-white/60 shadow-sm rounded-2xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white transition-all backdrop-blur-sm"
                placeholder="jane_d"
              />
            </div>
            <div className="h-4 mt-1 ml-1">
              {usernameStatus === "checking" && <p className="text-xs text-[#45474c] animate-pulse">Checking availability...</p>}
              {usernameStatus === "available" && <p className="text-xs text-green-600 font-medium">Username available!</p>}
              {usernameStatus === "taken" && <p className="text-xs text-red-500 font-medium">Username is taken.</p>}
            </div>
          </div>

          <div className="group/input -mt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#1b1b1c]/70 ml-1">Age</label>
            <input
              type="number"
              required
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-white/50 border border-white/60 shadow-sm rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white transition-all backdrop-blur-sm"
              placeholder="25"
            />
          </div>

          <div className="flex items-start gap-3 mt-2 mb-1 p-3 bg-white/40 border border-white/50 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="terms"
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
            <div className="text-[11px] text-[#45474c] leading-tight">
              <label htmlFor="terms" className="cursor-pointer">
                I have read and accept the{" "}
                <a href="/terms" target="_blank" className="text-primary-600 font-medium hover:underline">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="text-primary-600 font-medium hover:underline">
                  Privacy Policy
                </a>
                . I understand that once I message, it will be in the database and the company is not under any force to delete or keep it. Due to database restrictions, all messages may be deleted or data may never be deleted as it is a messaging system.
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50/80 backdrop-blur-sm p-3 rounded-xl text-center mt-1 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || usernameStatus === "taken" || !acceptedTerms}
            className="mt-2 relative w-full overflow-hidden rounded-2xl group/btn disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 transition-all group-hover/btn:scale-[1.02]"></div>
            <div className="relative py-3.5 text-sm font-semibold text-white tracking-wide">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating profile...
                </span>
              ) : "Complete Setup"}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}

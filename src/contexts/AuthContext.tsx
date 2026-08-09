"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, onSnapshot, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  redirectError: string | null;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    // Check for redirect result errors (e.g. user cancelled on mobile)
    getRedirectResult(auth).catch((error) => {
      console.error("Error from redirect sign in", error);
      setRedirectError(`Redirect Error (${error.code}): ${error.message}`);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Subscribe to user profile
        unsubscribeProfile = onSnapshot(doc(db, "users", currentUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setLoading(false);
          } else {
            setProfile(null); // Needs onboarding
            setLoading(false);
          }
        }, (error) => {
          console.error("Error fetching profile", error);
          setLoading(false);
        });

        // Request FCM Token if permission is granted
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            import('firebase/messaging').then(({ getMessaging, getToken }) => {
              try {
                const messaging = getMessaging(auth.app);
                getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY })
                  .then((token) => {
                    if (token) {
                      import('firebase/firestore').then(({ setDoc, arrayUnion }) => {
                        setDoc(doc(db, "users", currentUser.uid), {
                          fcmTokens: arrayUnion(token)
                        }, { merge: true }).catch(console.error);
                      });
                    }
                  })
                  .catch((e) => console.log('Failed to get FCM token', e));
              } catch (e) {
                console.log('FCM not supported or failed to initialize', e);
              }
            }).catch(console.error);
          }
        }
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    // ALWAYS use popup. Redirect fails on iOS Safari due to ITP (cross-site tracking prevention).
    return signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with Email/Password", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, redirectError, signInWithGoogle, signInWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

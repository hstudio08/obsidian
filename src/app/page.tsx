"use client";

import { useAuth } from "@/contexts/AuthContext";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, profile, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && profile) {
      router.push("/chats");
    }
  }, [user, profile, router]);

  const LoaderScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#fcf8f9]">
      <div className="flex flex-col items-center gap-8">
        <img 
          src="/images/logo-vector-only.png" 
          alt="Obsidian Logo" 
          width="100" 
          height="100" 
          className="w-24 h-24 object-contain mix-blend-multiply animate-pulse" 
        />
        <div className="w-48 h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden relative shadow-inner">
          <div className="absolute top-0 bottom-0 left-0 bg-primary-600 w-1/3 rounded-full animate-[loading-rod_1.5s_ease-in-out_infinite]" />
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loading-rod {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(300%); }
          }
        `}} />
      </div>
    </div>
  );

  // Avoid hydration mismatch by waiting for mount
  if (!mounted || loading) {
    return <LoaderScreen />;
  }

  if (user && !profile) {
    return (
      <main className="relative min-h-screen bg-[#fcf8f9] text-[#1b1b1c] font-sans overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLutJjoQ7YlMQy0y97wJgRFYuz1-hEVrc1Vj10EFMrjuhaYMzx5JLzrnaiYsJ3OZwynZYc5N2auPpp1-tWVCgAHujM5kUcQ-exgZMVgH68fCrfsg8OI5YWCuqrSUib_aFWDKgt0TA7voYYVvu12BWSrxEXa0tzFb1YqnU-tHytKyDqSv4NlIzHO0gPR7NF6r4RNfUM9957zdZop3tkohoiIJLHfNC5Agmx91VboJDGD3zaZ93L-rsNJq_Q')", backgroundSize: '40px 40px' }} />
        <div className="flex flex-col w-full h-full min-h-screen items-center justify-center relative z-10 p-4">
          <OnboardingForm />
          <button 
            onClick={() => logout()}
            className="mt-6 text-sm text-[#45474c] hover:text-[#1b1b1c] hover:underline"
          >
            Cancel and sign out
          </button>
        </div>
      </main>
    );
  }

  // If user and profile exist, we will be redirecting, so show loading
  if (user && profile) {
    return <LoaderScreen />;
  }

  return (
    <main className="relative min-h-screen bg-[#fcf8f9] text-[#1b1b1c] font-sans">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLutJjoQ7YlMQy0y97wJgRFYuz1-hEVrc1Vj10EFMrjuhaYMzx5JLzrnaiYsJ3OZwynZYc5N2auPpp1-tWVCgAHujM5kUcQ-exgZMVgH68fCrfsg8OI5YWCuqrSUib_aFWDKgt0TA7voYYVvu12BWSrxEXa0tzFb1YqnU-tHytKyDqSv4NlIzHO0gPR7NF6r4RNfUM9957zdZop3tkohoiIJLHfNC5Agmx91VboJDGD3zaZ93L-rsNJq_Q')", backgroundSize: '40px 40px' }} />
      <div className="flex flex-col w-full h-full min-h-screen justify-between relative z-10">
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
          <div className="mb-8">
            <Image 
              src="/images/logo-vector-only.png" 
              alt="Obsidian Logo" 
              width={112} 
              height={112} 
              className="w-28 h-28 object-contain mix-blend-multiply drop-shadow-sm" 
              priority
            />
          </div>
          <div className="text-center mb-12 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#1b1b1c]">Welcome to Obsidian</h1>
            <p className="text-sm text-[#45474c] max-w-[280px] mx-auto">Your private business communication hub.</p>
          </div>
          <div className="w-full max-w-sm flex flex-col gap-3">
            <GoogleSignIn text="Log in with Google" />
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <GoogleSignIn text="Sign up with Google" />
          </div>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-[12px] font-medium tracking-wide text-[#45474c]/70 uppercase">
            By continuing, you agree to our <Link className="text-[#040b16] hover:underline transition-colors duration-200" href="/terms">Terms</Link> and <Link className="text-[#040b16] hover:underline transition-colors duration-200" href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

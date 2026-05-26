/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  signInWithPopup,
  AuthError
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebaseConfig';
import { AppUser } from '../types';

interface LoginViewProps {
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: AppUser) => void;
  onNavigate: (page: 'home' | 'login' | 'signup' | 'dashboard') => void;
}

export function LoginView({ initialMode = 'login', onLoginSuccess, onNavigate }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Controls
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showEnableHelper, setShowEnableHelper] = useState(false);

  // Helper to sync or create user doc in Firestore
  const syncUserDoc = async (userUid: string, userEmail: string, displayName?: string): Promise<AppUser> => {
    const userDocRef = doc(db, 'users', userUid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: userUid,
        email: userEmail,
        name: data.name || displayName || userEmail.split('@')[0],
        streamKey: data.streamKey,
        createdAt: data.createdAt
      };
    } else {
      // Create new user profile document
      const randomStreamKey = `live_${Math.floor(100000 + Math.random() * 900000)}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = new Date().toISOString();
      const finalName = displayName || name || userEmail.split('@')[0];
      
      const newUserProfile = {
        id: userUid,
        email: userEmail,
        name: finalName,
        streamKey: randomStreamKey,
        createdAt: createdAt
      };
      
      await setDoc(userDocRef, newUserProfile);
      return newUserProfile;
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setShowEnableHelper(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Could not retrieve email from Google Account.");
      }
      
      const appUser = await syncUserDoc(user.uid, user.email, user.displayName || undefined);
      
      setSuccessMsg("গুগল একাউন্টের মাধ্যমে সফলভাবে লগইন হয়েছে! রিডাইরেক্ট করা হচ্ছে...");
      onLoginSuccess(appUser);
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1200);
      
    } catch (err: any) {
      console.error(err);
      const authErr = err as AuthError;
      if (authErr.code === 'auth/operation-not-allowed') {
        setShowEnableHelper(true);
        setError("ফায়ারবেজ কনসোলে Google Auth সাইন-ইন পদ্ধতি নিষ্ক্রিয় করা আছে।");
      } else {
        setError(err.message || "গুগল সাইন-ইন সম্পন্ন করতে সমস্যা হয়েছে।");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setShowEnableHelper(false);

    try {
      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const appUser = await syncUserDoc(user.uid, user.email || email);
        
        setSuccessMsg("সফলভাবে লগইন হয়েছে! রিডাইরেক্ট করা হচ্ছে...");
        onLoginSuccess(appUser);
        setTimeout(() => {
          onNavigate('dashboard');
        }, 1200);

      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          throw new Error("পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে।");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update Firebase Auth profile
        if (name) {
          await updateProfile(user, { displayName: name });
        }
        
        const appUser = await syncUserDoc(user.uid, user.email || email, name);
        
        setSuccessMsg("সফলভাবে একাউন্ট তৈরি করা হয়েছে! ডাটাবেজ সিঙ্ক হচ্ছে...");
        onLoginSuccess(appUser);
        setTimeout(() => {
          onNavigate('dashboard');
        }, 1500);

      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(`পাসওয়ার্ড রিসেট লিংকটি ${email} ঠিকানায় পাঠানো হয়েছে। দয়া করে আপনার ইনবক্স চেক করুন।`);
        setTimeout(() => setMode('login'), 3500);
      }
    } catch (err: any) {
      console.error(err);
      const authErr = err as AuthError;
      if (authErr.code === 'auth/operation-not-allowed') {
        setShowEnableHelper(true);
        setError("ফায়ারবেজ কনসোলে Email/Password সাইন-ইন পদ্ধতি নিষ্ক্রিয় করা আছে।");
      } else if (authErr.code === 'auth/email-already-in-use') {
        setError("এই ইমেইল ঠিকানাটি ইতিমধ্যে ব্যবহৃত হয়েছে।");
      } else if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
        setError("ভুল ইমেইল অথবা পাসওয়ার্ড দেওয়া হয়েছে। আবার চেষ্টা করুন।");
      } else if (authErr.code === 'auth/weak-password') {
        setError("পাসওয়ার্ড দুর্বল! এটি কমপক্ষে ৬ অক্ষরের হতে হবে।");
      } else {
        setError(err.message || "একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-view" className="max-w-md w-full mx-auto my-12 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Border accent */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' && "Sign In to Portal"}
            {mode === 'signup' && "Create Ingress Account"}
            {mode === 'forgot' && "Restore Credentials"}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-normal">
            {mode === 'login' && "ফায়ারবেজ ব্যবহার করে সিস্টেমে লগইন করুন বা সেশন সচল করুন।"}
            {mode === 'signup' && "জিমেইল ইমেইল অথবা গুগল একাউন্ট লাইভ সিঙ্কের মাধ্যমে অ্যাকাউন্ট রেজিস্টার করুন।"}
            {mode === 'forgot' && "পাসওয়ার্ড পুনরুদ্ধারের জন্য নিচের ইনপুটে আপনার ইমেইল প্রদান করুন।"}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-xs flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-rose-300">ত্রুটি ঘটেছে:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-xs flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Enable Guide Helper */}
        {showEnableHelper && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-[11px] leading-relaxed flex flex-col gap-1">
            <span className="font-bold">গুরুত্বপূর্ণ নির্দেশনা (Administrator Setup Needed):</span>
            <p>আপনার ফায়ারবেজ প্রকল্পে Authentication ইনস্ট্রুমেন্ট সচল করার জন্য:</p>
            <ol className="list-decimal list-inside ml-1 flex flex-col gap-0.5">
              <li>Firebase Console এ প্রবেশ করুন।</li>
              <li>Build &gt; Authentication &gt; Sign-In method এ যান।</li>
              <li>পছন্দের ইমেইল (Email/Password) এবং গুগল (Google) সাইন-ইন পদ্ধতি সচল (Enable) করুন।</li>
            </ol>
          </div>
        )}

        {/* Google Signup/Login Button */}
        {mode !== 'forgot' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2.5 transition active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61a5.66 5.66 0 01-2.45 3.71v3.08h3.95c2.31-2.13 3.63-5.26 3.63-8.64z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.95-3.08c-1.1.74-2.5 1.18-4.01 1.18-3.09 0-5.71-2.09-6.64-4.89H1.38v3.18C3.36 21.3 7.42 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.36 14.3c-.24-.7-.38-1.45-.38-2.3s.14-1.6.38-2.3V6.52H1.38A11.94 11.94 0 000 12c0 2.01.5 3.9 1.38 5.48l3.98-3.18z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.42 0 3.36 2.7 1.38 6.52l3.98 3.18c.93-2.8 3.55-4.89 6.64-4.89z"
                />
              </svg>
              <span>{mode === 'login' ? 'Sign In with Google' : 'Register with Google'}</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-800 grow" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600">OR WITH EMAIL</span>
              <div className="h-px bg-slate-800 grow" />
            </div>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Email Address (Gmail etc.)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] text-amber-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg w-full pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-lg text-xs tracking-wide uppercase hover:bg-amber-400 focus:outline-none transition mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === 'login' && "Sign In Now"}
                {mode === 'signup' && "Deploy New Account"}
                {mode === 'forgot' && "Confirm Reset"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Form Toggles */}
        <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400 flex flex-col gap-2">
          {mode === 'login' ? (
            <p>
              New to StreamSync?{" "}
              <button
                onClick={() => setMode('signup')}
                className="text-amber-500 font-semibold hover:underline"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already registered in databases?{" "}
              <button
                onClick={() => setMode('login')}
                className="text-amber-500 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          
          <button
            onClick={() => onNavigate('home')}
            className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline mt-1"
          >
            ← Back to Platform home
          </button>
        </div>

      </div>
    </div>
  );
}

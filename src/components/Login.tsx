import React, { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import { Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
  defaultEmail?: string;
}

export default function Login({ onLogin, defaultEmail = '' }: LoginProps) {
  const [email, setEmail] = useState<string>(defaultEmail);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Keep simulated masukAplikasi function for backwards compatibility if needed
  useEffect(() => {
    (window as any).masukAplikasi = async function (emailInput: string, passwordInput: string) {
      console.log("[Firebase Simulator] masukAplikasi called with:", emailInput);
      onLogin(emailInput);
      window.location.hash = "beranda";
    };

    return () => {
      delete (window as any).masukAplikasi;
    };
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Harap masukkan email Anda');
      return;
    }
    if (!password) {
      setError('Harap masukkan kata sandi Anda');
      return;
    }
    
    // Quick regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid. Harap gunakan format@domain.com');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Firebase Auth Login
      if (!(window as any).masukAkunFirebase) {
        throw new Error("Layanan Firebase Auth belum terpasang.");
      }
      await (window as any).masukAkunFirebase(email, password);
      // onLogin is handled reactively in App.tsx
    } catch (err: any) {
      console.error("Auth error:", err);
      let errMsg = err.message || "Terjadi kesalahan autentikasi.";
      if (errMsg.includes("invalid-credential") || errMsg.includes("user-not-found") || errMsg.includes("wrong-password")) {
        errMsg = "Email tidak terdaftar atau kata sandi salah.";
      } else if (errMsg.includes("invalid-email")) {
        errMsg = "Format email tidak valid.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#0B111E] text-on-surface px-6 py-12 relative overflow-hidden font-body-md select-none">
      
      {/* Ambient Radial Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Header spacer */}
      <div className="w-full" />

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col items-center gap-8 z-10 my-auto">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 p-3 bg-surface-variant/40 rounded-3xl border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-center relative group">
            <BrandLogo className="w-20 h-20" />
          </div>
          
          <div className="text-center flex flex-col gap-1.5 mt-2">
            <h1 className="font-display-lg text-4xl text-primary font-bold tracking-tight glow-text-primary">
              KantongKu
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-[280px] mx-auto text-center leading-relaxed">
              Solusi Manajemen Keuangan Kamu
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-label-caps text-primary/80 tracking-wider">
              Email Pengguna
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-on-surface-variant/60">
                <Mail className="w-5 h-5" />
              </span>
              <input
                id="email-input"
                type="email"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white font-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:shadow-[0_0_12px_rgba(78,222,163,0.1)] transition-all duration-200"
              />
            </div>
          </div>

          {/* Password (for Firebase auth) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-label-caps text-primary/80 tracking-wider">
              Kata Sandi
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-on-surface-variant/60">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="Masukkan kata sandi Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white font-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
              />
            </div>
            {error && (
              <span className="text-xs text-rose-400 mt-2 block px-1 animate-pulse border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                {error}
              </span>
            )}
          </div>

          {/* Masuk Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-primary text-on-primary disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Login'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Footer restriction note */}
      <div className="w-full max-w-sm text-center z-10 mt-auto pt-8">
        <p className="text-[10px] sm:text-xs text-on-surface-variant/40 font-label-caps tracking-wider leading-relaxed uppercase border-t border-white/5 pt-4">
          AKSES MASUK DIJAMIN AMAN MENGGUNAKAN TEKNOLOGI AUTENTIKASI DARI GOOGLE FIREBASE.
        </p>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import {
  LogOut, User, Calendar, RefreshCw, Mail,
  CreditCard, Moon, Sun, Volume2, VolumeX,
  Camera, Edit3, Save, X, Lock, Eye, EyeOff, Check
} from 'lucide-react';

export interface AppSettings {
  currency: 'IDR' | 'USD';
  theme: 'dark' | 'light';
  alarmRem: boolean;
  geminiApiKey?: string;
}

interface ProfileViewProps {
  userProfile: UserProfile;
  appSettings: AppSettings;
  onLogout: () => void;
  onResetData: () => void;
  onSaveProfile: (name: string, avatarUrl: string) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => void;
  onChangePassword: (oldPass: string, newPass: string) => Promise<void>;
}

export default function ProfileView({
  userProfile,
  appSettings,
  onLogout,
  onResetData,
  onSaveProfile,
  onSaveSettings,
  onChangePassword
}: ProfileViewProps) {
  // Profile edit state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings state (local copy for immediate feedback)
  const [settings, setSettings] = useState<AppSettings>({ ...appSettings });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          try {
            await onSaveProfile(userProfile.name, compressedBase64);
            setAvatarUrl(compressedBase64);
          } catch (err: any) {
            alert("Gagal memperbarui foto profil: " + err.message);
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      await onSaveProfile(nameInput.trim(), avatarUrl);
      setEditingName(false);
    } catch (err: any) {
      alert("Gagal memperbarui nama profil: " + err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPass) return setPassMsg({ type: 'error', text: 'Masukkan kata sandi lama.' });
    if (newPass.length < 6) return setPassMsg({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
    if (newPass !== confirmPass) return setPassMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
    
    try {
      setPassMsg({ type: 'success', text: 'Sedang memperbarui kata sandi di Firebase...' });
      await onChangePassword(oldPass, newPass);
      setPassMsg({ type: 'success', text: 'Kata sandi berhasil diperbarui!' });
      setOldPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => { setPassMsg(null); setShowPasswordForm(false); }, 2000);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: 'Gagal: ' + (err.message || 'Kesalahan Autentikasi') });
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSaveSettings(newSettings);
  };

  return (
    <div className="flex flex-col gap-6 select-none font-body-md">
      
      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Profil Pengguna</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Kelola detail akun, preferensi sistem, dan konfigurasi KantongKu.
        </p>
      </div>

      {/* Profile Card */}
      <section className="glass-card rounded-xl p-card_padding flex flex-col items-center text-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
        
        {/* Avatar with camera button */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30">
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover"
              src={avatarUrl}
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-background"
            title="Ganti foto profil"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name edit */}
        {editingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 h-9 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60 text-center"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            />
            <button onClick={handleSaveName} className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditingName(false); setNameInput(userProfile.name); }} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant flex items-center justify-center hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-white font-bold text-lg">{userProfile.name}</h2>
            <button
              onClick={() => { setEditingName(true); setNameInput(userProfile.name); }}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
              title="Edit nama"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <span className="text-xs text-on-surface-variant flex items-center justify-center gap-1 mt-0.5 font-mono-data">
          <Mail className="w-3.5 h-3.5" />
          {userProfile.email}
        </span>

        <div className="w-full flex items-center justify-center gap-1.5 text-xs text-on-surface-variant/70 border-t border-white/5 pt-3 mt-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Terdaftar Sejak: {new Date(userProfile.joinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
      </section>

      {/* Password Change */}
      <section className="flex flex-col gap-2.5">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Keamanan Akun</span>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="glass-card rounded-lg p-3.5 flex justify-between items-center text-sm hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-white font-medium">Atur Kata Sandi</span>
            </div>
            <span className="text-xs text-on-surface-variant group-hover:text-white transition-colors">Ubah →</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="glass-card rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Ubah Kata Sandi
              </span>
              <button type="button" onClick={() => { setShowPasswordForm(false); setPassMsg(null); }} className="text-[10px] text-on-surface-variant hover:text-white">Batal</button>
            </div>

            {passMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg border ${passMsg.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {passMsg.text}
              </div>
            )}

            {[
              { label: 'Kata Sandi Lama', val: oldPass, set: setOldPass, show: showOld, toggle: () => setShowOld(v => !v) },
              { label: 'Kata Sandi Baru', val: newPass, set: setNewPass, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Konfirmasi Sandi Baru', val: confirmPass, set: setConfirmPass, show: showNew, toggle: () => setShowNew(v => !v) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-3 pr-9"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-white">
                    {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}

            <button type="submit" className="w-full h-9 bg-primary text-on-primary font-label-caps text-[10px] rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
              <Save className="w-3.5 h-3.5" /> Simpan Kata Sandi
            </button>
          </form>
        )}
      </section>



      {/* AI Settings */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Konfigurasi AI</span>
        
        <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Gemini API Key</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={settings.geminiApiKey || ''}
                onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
                className="w-full h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-3 pr-9"
                placeholder="Masukkan API Key Gemini Anda"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-white">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 mt-1">Kosongkan untuk menggunakan kunci bawaan server. Masukkan kunci Anda sendiri jika AI tidak merespons.</p>
          </div>
        </div>
      </section>

      {/* Dangerous Actions */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Tindakan Keamanan</span>
        
        <div className="flex flex-col gap-2.5">
          <button 
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin melakukan RESET DATA? Seluruh transaksi yang ditambahkan akan dihapus dan kembali ke mock data awal.')) {
                onResetData();
              }
            }}
            className="w-full h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-orange-500/20 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Data Ke Mockup Awal
          </button>

          <button 
            type="button"
            onClick={onLogout}
            className="w-full h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-[#EF4444]/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Aplikasi
          </button>
        </div>
      </section>
    </div>
  );
}

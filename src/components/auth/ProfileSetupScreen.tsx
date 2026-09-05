import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Camera, Sparkles, User as UserIcon, Check, Loader2, ArrowRight, Info } from 'lucide-react';

export const ProfileSetupScreen: React.FC = () => {
  const { currentUser, updateProfile, isLoading, error } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [about, setAbout] = useState(currentUser?.about || 'Available | Using ERROREN CHAT ⚡');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'Erroren'}`
  );

  const presetAvatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=CyberAlpha',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NeonMatrix',
    'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumPulse',
    'https://api.dicebear.com/7.x/bottts/svg?seed=HyperNova',
    'https://api.dicebear.com/7.x/bottts/svg?seed=EchoVortex',
    'https://api.dicebear.com/7.x/bottts/svg?seed=SolarFlare',
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = displayName.trim() || currentUser?.email?.split('@')[0] || 'ERROREN Member';
    await updateProfile(finalName, about.trim(), avatarUrl);
  };

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold mt-4">
            <Check className="w-3.5 h-3.5" />
            <span>Google Account Connected: {currentUser?.email}</span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="mt-1 text-xs text-slate-400">
            Set your public display name, photo, and status.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
              />
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-white text-[10px]">
                <Camera className="w-5 h-5 mb-0.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Avatar presets */}
            <div className="mt-3 flex items-center gap-2">
              {presetAvatars.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(av)}
                  className={`w-7 h-7 rounded-full overflow-hidden border transition ${
                    avatarUrl === av ? 'border-emerald-400 scale-110' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Display Name <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Alex Morgan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* About Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              About / Status Bio
            </label>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={120}
                placeholder="Available | Using ERROREN CHAT ⚡"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Optional Phone Notice */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Phone number is optional and not required to start chatting. You can add and link a phone number anytime in <strong>Settings → Account → Phone Number</strong>.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !displayName.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Save & Enter ERROREN CHAT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Camera, Sparkles, User as UserIcon, Check, Loader2, ArrowRight, AtSign, Phone, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+92', country: 'Pakistan' },
  { code: '+1', country: 'US / Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+91', country: 'India' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+61', country: 'Australia' },
];

export const ProfileSetupScreen: React.FC = () => {
  const { currentUser, updateProfile, isLoading, error } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(currentUser?.countryCode || '+92');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [about, setAbout] = useState(currentUser?.about || 'Available | Using ERROREN CHAT ⚡');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.id || 'Erroren'}`
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const presetAvatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=CyberAlpha',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NeonMatrix',
    'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumPulse',
    'https://api.dicebear.com/7.x/bottts/svg?seed=HyperNova',
    'https://api.dicebear.com/7.x/bottts/svg?seed=EchoVortex',
    'https://api.dicebear.com/7.x/bottts/svg?seed=SolarFlare',
  ];

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const cleanPhone = phoneNumber.trim();
  const cleanPhoneDigits = cleanPhone.replace(/[^0-9]/g, '');
  const cleanEmail = email.trim().toLowerCase();

  const hasValidName = displayName.trim().length >= 2 && displayName.trim() !== 'New Member';
  const hasValidUsername = cleanUsername.length >= 3;
  const hasValidPhone = cleanPhoneDigits.length >= 6;
  const hasValidEmail = Boolean(cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5);

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
    setLocalError(null);

    if (!hasValidName) {
      setLocalError('Please enter a valid display name (at least 2 characters).');
      return;
    }
    if (!hasValidUsername) {
      setLocalError('Username is required (at least 3 alphanumeric characters).');
      return;
    }
    if (!hasValidPhone) {
      setLocalError('Phone number is required (at least 6 digits).');
      return;
    }
    if (!hasValidEmail) {
      setLocalError('A valid Gmail or email address is required (e.g. name@gmail.com).');
      return;
    }

    const success = await updateProfile(
      displayName.trim(),
      about.trim(),
      avatarUrl,
      cleanUsername,
      cleanPhone,
      countryCode,
      cleanEmail
    );

    if (!success) {
      setLocalError(error || 'Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl my-6">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />

          <h2 className="mt-3 text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="mt-1 text-xs text-slate-400">
            Set your Name, Username, Phone & Gmail to activate messaging.
          </p>

          {/* Requirements Bar */}
          <div className="mt-3 flex items-center flex-wrap justify-center gap-1.5 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
              hasValidName ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {hasValidName ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Name
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
              hasValidUsername ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {hasValidUsername ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Username
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
              hasValidPhone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {hasValidPhone ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Phone
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
              hasValidEmail ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {hasValidEmail ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              Gmail
            </span>
          </div>
        </div>

        {(error || localError) && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="w-20 h-20 rounded-full object-cover bg-slate-800 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
              />
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-white text-[10px]">
                <Camera className="w-4 h-4 mb-0.5" />
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
            <div className="mt-2.5 flex items-center gap-1.5">
              {presetAvatars.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(av)}
                  className={`w-6 h-6 rounded-full overflow-hidden border transition ${
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name <span className="text-emerald-400">*</span>
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

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Username <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={30}
                placeholder="username (e.g. alex_erroren)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone Number <span className="text-emerald-400">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-2.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white focus:outline-none shrink-0"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="3001234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Gmail / Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gmail / Email Address <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* About Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !displayName.trim() || !cleanUsername || !cleanPhone || !cleanEmail}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Save Profile & Start Chatting</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

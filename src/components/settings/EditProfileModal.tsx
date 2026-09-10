import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Camera, 
  User as UserIcon, 
  Sparkles, 
  Check, 
  Loader2, 
  ShieldCheck,
  RefreshCw,
  Phone,
  AtSign,
  Mail,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BIO_TEMPLATES = [
  'Available | Using ERROREN CHAT ⚡',
  'Busy ⛔',
  'At work 💻',
  'In a meeting 📅',
  'Urgent calls only 📞',
  "Can't talk, ERROREN CHAT only 💬",
  'Living life one day at a time ✨',
  'Offline / Traveling ✈️',
];

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

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, savePhoneNumber, userSettings, updateUserSettings, error } = useAuth();
  const { isDark, currentAccent } = useTheme();
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(currentUser?.countryCode || '+92');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [about, setAbout] = useState(currentUser?.about || 'Available | Using ERROREN CHAT ⚡');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  
  // Privacy State
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState<'everyone' | 'contacts' | 'nobody'>(
    userSettings.privacy?.profilePhotoVisibility || 'everyone'
  );
  const [aboutVisibility, setAboutVisibility] = useState<'everyone' | 'contacts' | 'nobody'>(
    userSettings.privacy?.aboutVisibility || 'everyone'
  );
  const [lastSeenVisibility, setLastSeenVisibility] = useState<'everyone' | 'contacts' | 'nobody'>(
    userSettings.privacy?.lastSeenVisibility || 'everyone'
  );
  const [onlineVisibility, setOnlineVisibility] = useState<'everyone' | 'same_as_last_seen'>(
    userSettings.privacy?.onlineVisibility || 'everyone'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const cleanPhoneDigits = phoneNumber.replace(/[^0-9]/g, '');
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = email.trim().toLowerCase();

  const hasValidName = displayName.trim().length >= 2 && displayName.trim() !== 'New Member';
  const hasValidUsername = cleanUsername.length >= 3;
  const hasValidPhone = cleanPhoneDigits.length >= 6;
  const hasValidEmail = Boolean(cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5);
  const isAllValid = hasValidName && hasValidUsername && hasValidPhone && hasValidEmail;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size exceeds 5MB. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim() || displayName.trim() === 'New Member') {
      setErrorMsg('Please enter a valid display name (at least 2 characters).');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('Username is required and must be at least 3 characters.');
      return;
    }

    if (!hasValidPhone) {
      setErrorMsg('Phone number is required (at least 6 digits) to complete your profile.');
      return;
    }

    if (!hasValidEmail) {
      setErrorMsg('A valid Gmail or email address is required (e.g. name@gmail.com).');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const cleanPhone = phoneNumber.trim();

      // 1. If phone number is being changed or added, validate phone uniqueness first
      if (cleanPhone && cleanPhone !== currentUser.phoneNumber) {
        const phoneRes = await savePhoneNumber(cleanPhone, countryCode);
        if (!phoneRes.success) {
          setErrorMsg(phoneRes.message || 'This phone number is already associated with another account.');
          setIsSaving(false);
          return;
        }
      }

      // 2. Update Profile (Name, Username, Bio, Avatar, Phone, CountryCode, Email)
      const success = await updateProfile(
        displayName.trim(),
        about.trim(),
        avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`,
        cleanUsername,
        cleanPhone,
        countryCode,
        cleanEmail
      );

      if (!success) {
        setErrorMsg(error || 'Failed to update profile. Please check your details.');
        setIsSaving(false);
        return;
      }

      // 3. Update Privacy Settings
      updateUserSettings({
        privacy: {
          ...userSettings.privacy,
          profilePhotoVisibility,
          aboutVisibility,
          lastSeenVisibility,
          onlineVisibility,
        },
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={{
          boxShadow: `0 25px 50px -12px ${currentAccent.hex}25`
        }}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: isDark ? currentAccent.softBgDark : currentAccent.softBgLight,
                color: currentAccent.textColor,
                border: `1px solid ${isDark ? currentAccent.borderDark : currentAccent.borderLight}`
              }}
            >
              <UserIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Profile Completion</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Name, Username, Phone Number & Gmail are all required to unlock messaging
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mandatory Checklist Bar */}
        <div className={`px-4 sm:px-6 py-2.5 border-b text-xs flex items-center justify-between flex-wrap gap-2 ${
          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
        }`}>
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
            Requirements:
          </span>
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>Profile completed successfully! You can now send messages.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`}
                alt="Profile DP"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover bg-slate-800 border-2 shadow-xl"
                style={{ borderColor: currentAccent.hex }}
              />
              <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-white text-[11px] font-semibold">
                <Camera className="w-5 h-5 mb-1" />
                <span>Upload</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              <label className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 border ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}>
                <Camera className="w-3.5 h-3.5" />
                <span>Choose Photo</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleGenerateRandomAvatar}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Generate Bottts Avatar"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Random Avatar</span>
              </button>
            </div>
          </div>

          {/* 1. Display Name (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Full Name / Display Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Alex Morgan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none transition ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* 2. Username (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Username <span className="text-rose-500">* (REQUIRED)</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={30}
                placeholder="username (e.g. alex_erroren)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none transition ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your unique handle for contacts, mentions, and search (min 3 chars).
            </p>
          </div>

          {/* 3. Phone Number (MANDATORY per user requirement) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Phone Number <span className="text-rose-500">* (REQUIRED)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`px-3 py-2.5 rounded-xl text-xs border focus:outline-none shrink-0 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="3001234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none transition ${
                    isDark 
                      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Required for WhatsApp-style registered contacts and identity verification.
            </p>
          </div>

          {/* 4. Gmail / Email (MANDATORY per user requirement) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Gmail / Email Address <span className="text-rose-500">* (REQUIRED)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none transition ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used for account security, multi-device backup, and profile verification.
            </p>
          </div>

          {/* About / Bio */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              About / Bio Status
            </label>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows={2}
                maxLength={140}
                placeholder="What's on your mind?"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none transition resize-none ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Quick Bio Presets */}
            <div className="mt-2">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                Suggested Statuses
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BIO_TEMPLATES.map((tpl, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setAbout(tpl)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition text-left border ${
                      isDark 
                        ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300' 
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy Settings Section */}
          <div className={`pt-3 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: currentAccent.textColor }}>
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Controls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Profile Photo Visibility */}
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Profile Photo (DP)
                </label>
                <select
                  value={profilePhotoVisibility}
                  onChange={(e) => setProfilePhotoVisibility(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* About / Bio Visibility */}
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  About / Bio
                </label>
                <select
                  value={aboutVisibility}
                  onChange={(e) => setAboutVisibility(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center gap-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              type="submit"
              disabled={isSaving || !displayName.trim() || !username.trim()}
              className="flex-1 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              style={{
                backgroundColor: currentAccent.hex,
                color: '#070A0F',
                boxShadow: `0 4px 14px ${currentAccent.hex}40`
              }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Complete Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


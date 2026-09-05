import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { WallpaperStyle } from '../../types';
import { WallpaperModal } from './WallpaperModal';
import { EditProfileModal } from './EditProfileModal';
import { toast } from '../common/Toast';
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Palette, 
  Sparkles, 
  Smartphone, 
  Database, 
  LogOut, 
  Trash2, 
  Check, 
  Moon, 
  Sun, 
  Monitor, 
  Volume2, 
  VolumeX,
  Key,
  Info,
  ChevronRight,
  Phone,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  Loader2,
  FileText,
  AlertCircle,
  X,
  Image as ImageIcon,
  Edit3,
  Users,
  PlusCircle
} from 'lucide-react';

const wallpapersList: { id: WallpaperStyle; name: string; previewColor: string }[] = [
  { id: 'cyber-mesh', name: 'Cyber Mesh Grid', previewColor: 'bg-slate-900 border-emerald-500/40' },
  { id: 'midnight-dark', name: 'Midnight Pitch Black', previewColor: 'bg-black border-slate-700' },
  { id: 'emerald-glow', name: 'Emerald Glow Gradient', previewColor: 'bg-gradient-to-tr from-emerald-950 to-slate-950 border-emerald-500/40' },
  { id: 'minimal-slate', name: 'Minimal Slate', previewColor: 'bg-slate-800 border-slate-600' },
  { id: 'deep-carbon', name: 'Deep Carbon', previewColor: 'bg-neutral-900 border-neutral-700' },
];

export const SettingsView: React.FC = () => {
  const { 
    currentUser, 
    logout, 
    deleteAccount, 
    userSettings, 
    updateUserSettings, 
    savePhoneNumber,
    savedAccounts,
    switchAccount,
    removeSavedAccount,
    startAddAccount,
    isProfileComplete,
    profileCompletionDetails,
    isProfileModalOpen,
    setIsProfileModalOpen,
    openProfileModal
  } = useAuth();
  const { 
    theme, 
    setTheme, 
    accentColor, 
    setAccentColor, 
    currentAccent, 
    ACCENT_OPTIONS, 
    isDark, 
    wallpaper, 
    setWallpaper, 
    soundEnabled, 
    setSoundEnabled 
  } = useTheme();

  // Modals for legal / support / wallpaper / profile edit
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Phone number state
  const [phoneCountryCode, setPhoneCountryCode] = useState(currentUser?.countryCode || '+92');
  const [phoneNumberInput, setPhoneNumberInput] = useState(currentUser?.phoneNumber || '');
  const [phoneVisibility, setPhoneVisibility] = useState<'everyone' | 'contacts' | 'nobody'>(
    currentUser?.phoneVisibility || 'everyone'
  );
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneFeedback, setPhoneFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  if (!currentUser) return null;

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    setPhoneFeedback(null);

    const res = await savePhoneNumber(phoneNumberInput, phoneCountryCode, phoneVisibility);
    setIsSavingPhone(false);

    if (res.success) {
      setPhoneFeedback({
        type: res.isSmsConfigured ? 'success' : 'info',
        message: res.message,
      });
    } else {
      setPhoneFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  const handleRequestPushPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        toast.success('Push notifications enabled for ERROREN CHAT!');
      } else {
        toast.info('Notification permission was not granted.');
      }
    } else {
      toast.info('Your browser does not support web push notifications.');
    }
  };

  const openWhatsAppSupport = () => {
    const supportPhone = '923399951515';
    const message = encodeURIComponent(
      `Hello ERROREN CHAT Support! I need assistance with my account (${currentUser.email || currentUser.displayName}).`
    );
    window.open(`https://wa.me/${supportPhone}?text=${message}`, '_blank');
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full transition-colors duration-200 ${
      isDark ? 'bg-[#080B11] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your account, privacy, appearance, and themes
          </p>
        </div>
      </div>

      {/* Mandatory Profile Incomplete Warning Alert */}
      {!isProfileComplete && (
        <div className="mb-6 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">Mandatory Profile Details Required</div>
              <p className="text-[11px] text-amber-300/80">
                You must complete your <strong>Name</strong>, <strong>Username (@tag)</strong>, and <strong>Phone Number</strong> before you can send chat messages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEditProfileModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shrink-0 flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Complete Profile</span>
          </button>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <div 
            onClick={() => setShowEditProfileModal(true)}
            className="cursor-pointer group relative"
            title="Click to edit profile"
          >
            <Avatar src={currentUser.avatarUrl} name={currentUser.displayName} size="lg" isOnline={currentUser.isOnline} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
              <Edit3 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser.displayName}</h3>
              {isProfileComplete ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold shrink-0">
                  Incomplete
                </span>
              )}
            </div>

            <p className="text-xs truncate font-medium" style={{ color: currentAccent.hex }}>
              {currentUser.username ? `@${currentUser.username}` : currentUser.email}
            </p>

            {currentUser.phoneNumber ? (
              <p className={`text-[11px] mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentUser.countryCode || '+92'} {currentUser.phoneNumber}
              </p>
            ) : (
              <span className="inline-block text-[10px] text-amber-400 mt-0.5 font-semibold">
                ⚠️ Phone number missing (Mandatory to send messages)
              </span>
            )}
            <p className={`text-xs mt-1 truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{currentUser.about || 'Available'}</p>
          </div>
        </div>

        {/* Edit Profile Action Button */}
        <button
          type="button"
          onClick={() => setShowEditProfileModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-slate-950 text-xs font-bold transition shadow-lg shrink-0"
          style={{
            backgroundColor: currentAccent.hex,
            boxShadow: `0 4px 14px ${currentAccent.hex}40`
          }}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Profile & Phone</span>
        </button>
      </div>

      {/* Main Settings Sections Grid */}
      <div className="space-y-4">
        {/* Switch Account / Multi-Account Manager */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Switch Account</span>
            </div>
            <button
              type="button"
              onClick={startAddAccount}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Switch seamlessly between multiple registered accounts on this device.
          </p>

          <div className="space-y-2 pt-1">
            {savedAccounts.map((acc) => {
              const isCurrent = acc.id === currentUser.id;
              return (
                <div
                  key={acc.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={acc.avatarUrl} name={acc.displayName} size="sm" isOnline={acc.isOnline} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{acc.displayName}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrent ? (
                      <button
                        type="button"
                        onClick={() => switchAccount(acc.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-sm"
                      >
                        Switch
                      </button>
                    ) : null}

                    {savedAccounts.length > 1 && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => removeSavedAccount(acc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Remove saved account"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* 1. Account & Phone Number */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <User className="w-4 h-4" />
            <span>Account & Phone Number</span>
          </div>

          <form onSubmit={handleSavePhone} className="space-y-3 pt-1">
            <div className="text-xs font-semibold text-slate-200">Add / Update Phone Number (Optional)</div>
            <p className="text-[11px] text-slate-400">
              Link an optional phone number to allow contacts to discover and verify you.
            </p>

            {phoneFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  phoneFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : phoneFeedback.type === 'info'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{phoneFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Country Code</label>
                <input
                  type="text"
                  placeholder="+92"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="3001234567"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Phone Number Visibility</label>
              <select
                value={phoneVisibility}
                onChange={(e) => setPhoneVisibility(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="everyone">Everyone on ERROREN CHAT</option>
                <option value="contacts">My Saved Contacts Only</option>
                <option value="nobody">Nobody (Private)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingPhone}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              {isSavingPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
              <span>Save Phone Number</span>
            </button>
          </form>
        </div>

        {/* 2. Appearance, Themes & Accent Colors (DARK MODE, LIGHT MODE, 8 ACCENTS) */}
        <div className={`p-5 rounded-2xl border space-y-5 transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: currentAccent.hex }}>
            <Palette className="w-4 h-4" />
            <span>Appearance & Theme System</span>
          </div>

          {/* Dark Mode / Light Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Display Theme
              </label>
              <span className={`text-[11px] font-mono capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Active: {theme} mode
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'dark' as const, label: 'Dark Mode', icon: Moon },
                { id: 'light' as const, label: 'Light Mode', icon: Sun },
                { id: 'system' as const, label: 'System', icon: Monitor },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      toast.success(`Theme set to ${t.label}`);
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold capitalize transition border group ${
                      isSelected
                        ? 'text-slate-950 shadow-md font-extrabold'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? currentAccent.hex : undefined,
                      borderColor: isSelected ? currentAccent.hex : undefined,
                      color: isSelected ? '#070A0F' : undefined
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] ml-0.5" />}
                  </button>
                );
              })}
            </div>
            <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Theme mode is saved immediately to persistent storage and restored across browser sessions.
            </p>
          </div>

          {/* EXACTLY 8 ACCENT COLORS */}
          <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <label className={`text-xs block font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Accent Color (8 Vibrant Choices)
                </label>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Choose 1 of exactly 8 accent colors to style your buttons, highlights, and icons
                </p>
              </div>
              <span 
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                style={{
                  backgroundColor: currentAccent.hex,
                  color: '#070A0F'
                }}
              >
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                {currentAccent.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ACCENT_OPTIONS.map((c) => {
                const isSelected = accentColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setAccentColor(c.id);
                      toast.success(`Theme accent set to ${c.name}`);
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition text-left group hover:scale-[1.02] active:scale-98 ${
                      isSelected 
                        ? 'shadow-lg ring-2 ring-offset-2' 
                        : isDark
                        ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${c.hex}18` : undefined,
                      borderColor: isSelected ? c.hex : undefined,
                    }}
                  >
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: c.hex,
                        boxShadow: `0 0 10px ${c.hex}60`
                      }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {c.name}
                      </div>
                      <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {c.hex}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Selected color is saved automatically to localStorage and applied instantly across the entire interface.
            </p>
          </div>

          {/* Wallpapers */}
          <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <label className={`text-xs block font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Chat Wallpaper
                </label>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Choose built-in styles, solid colors, or upload from your device gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWallpaperModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-950 text-xs font-bold transition shadow-md"
                style={{ backgroundColor: currentAccent.hex }}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Change Wallpaper</span>
              </button>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs"
                  style={{
                    backgroundColor: `${currentAccent.hex}20`,
                    borderColor: `${currentAccent.hex}40`,
                    color: currentAccent.hex
                  }}
                >
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-xs font-bold capitalize ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {wallpaper.startsWith('data:image') || wallpaper.startsWith('http')
                      ? 'Custom Gallery Photo'
                      : wallpaper.replace('-', ' ')}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: currentAccent.hex }}>
                    Active Default Wallpaper
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowWallpaperModal(true)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                Preview & Edit
              </button>
            </div>
          </div>

          {/* Audio Synthesizer Sounds */}
          <div className={`flex items-center justify-between pt-3 border-t text-xs ${
            isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" style={{ color: currentAccent.hex }} />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Futuristic Sound Effects & Tones</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-10 h-6 rounded-full transition-colors relative"
              style={{
                backgroundColor: soundEnabled ? currentAccent.hex : (isDark ? '#334155' : '#cbd5e1')
              }}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  soundEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Privacy & Encryption */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Privacy & Security</span>
          </div>

          {/* Read Receipts */}
          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-semibold text-slate-200">Read Receipts (Blue Ticks)</div>
              <div className="text-[11px] text-slate-400">Let recipients see when you read their messages</div>
            </div>
            <button
              onClick={() =>
                updateUserSettings({
                  privacy: {
                    ...userSettings.privacy,
                    readReceipts: !userSettings.privacy.readReceipts,
                  },
                })
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                userSettings.privacy.readReceipts ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  userSettings.privacy.readReceipts ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Online & Last Seen Privacy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Who can see my Last Seen</label>
              <select
                value={userSettings.privacy.lastSeenVisibility}
                onChange={(e) =>
                  updateUserSettings({
                    privacy: {
                      ...userSettings.privacy,
                      lastSeenVisibility: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Who can see my Profile Photo</label>
              <select
                value={userSettings.privacy.profilePhotoVisibility}
                onChange={(e) =>
                  updateUserSettings({
                    privacy: {
                      ...userSettings.privacy,
                      profilePhotoVisibility: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Notifications */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-semibold text-slate-200">Message & Call Notifications</div>
              <div className="text-[11px] text-slate-400">Play sounds and alert for new incoming chats</div>
            </div>
            <button
              onClick={() =>
                updateUserSettings({
                  notifications: {
                    ...userSettings.notifications,
                    messageNotifications: !userSettings.notifications.messageNotifications,
                  },
                })
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                userSettings.notifications.messageNotifications ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  userSettings.notifications.messageNotifications ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRequestPushPermission}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-2"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Enable Browser Push Notifications</span>
            </button>
          </div>
        </div>

        {/* 5. ERROREN AI Assistant Configuration */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>ERROREN AI Configuration</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-semibold text-slate-200">Smart Reply Suggestions</div>
              <div className="text-[11px] text-slate-400">Display instant smart reply chips in chats</div>
            </div>
            <button
              onClick={() =>
                updateUserSettings({
                  aiPreferences: {
                    ...userSettings.aiPreferences,
                    autoSuggestReplies: !userSettings.aiPreferences.autoSuggestReplies,
                  },
                })
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                userSettings.aiPreferences.autoSuggestReplies ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  userSettings.aiPreferences.autoSuggestReplies ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 6. Help Center & WhatsApp Support Button */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Help Center & Support</span>
          </div>

          <p className="text-xs text-slate-300">
            Have questions or need technical support? Contact our official support desk:
          </p>

          {/* Official WhatsApp Support Button */}
          <button
            onClick={openWhatsAppSupport}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 transition group shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  Official WhatsApp Support
                </div>
                <div className="text-[11px] text-emerald-400/90 font-mono">+92 339 9951515</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400" />
          </button>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
            <button
              onClick={() => setShowLegalModal('terms')}
              className="hover:text-emerald-400 transition underline underline-offset-2"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setShowLegalModal('privacy')}
              className="hover:text-emerald-400 transition underline underline-offset-2"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* 7. Account Actions & Danger Zone */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <button
            onClick={logout}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 transition"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-4">
          <p className="font-semibold text-slate-400">ERROREN CHAT • Production v3.7</p>
          <p className="text-[11px] mt-0.5">Secure. Private. Real-time.</p>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Account?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action is permanent and will remove your account profile, chats, and saved preferences.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  deleteAccount();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms / Privacy Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {showLegalModal === 'terms' ? 'ERROREN CHAT Terms of Service' : 'ERROREN CHAT Privacy Policy'}
              </h3>
              <button onClick={() => setShowLegalModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto text-xs text-slate-300 space-y-3 leading-relaxed pr-1">
              <p>
                Welcome to ERROREN CHAT ("Secure. Private. Real-time."). By accessing and using this application, you agree to comply with our community guidelines and security standards.
              </p>
              <p>
                <strong>1. Privacy & Encryption:</strong> We prioritize user confidentiality. Messages and media streams are exchanged directly through secure WebSocket and WebRTC signaling protocols.
              </p>
              <p>
                <strong>2. Google Authentication:</strong> Google login provides account authentication without exposing credentials. No passwords are stored.
              </p>
              <p>
                <strong>3. Contact Support:</strong> Official support is available via WhatsApp at +92 339 9951515.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowLegalModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Wallpaper Picker Modal */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
      />

      {/* Edit Profile & Privacy Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal || isProfileModalOpen}
        onClose={() => {
          setShowEditProfileModal(false);
          setIsProfileModalOpen(false);
        }}
      />
    </div>
  );
};

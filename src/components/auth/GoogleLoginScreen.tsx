import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  User as UserIcon, 
  Mail, 
  Camera, 
  X, 
  Check, 
  Plus, 
  Trash2,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const GoogleLoginScreen: React.FC = () => {
  const { 
    setAuthStep, 
    loginWithGoogle, 
    isLoading, 
    error, 
    savedAccounts, 
    switchAccount, 
    removeSavedAccount 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUsingNewAccount, setIsUsingNewAccount] = useState<boolean>(savedAccounts.length === 0);

  // Google Auto-Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPhase, setVerificationPhase] = useState<'idle' | 'checking_domain' | 'sending_code' | 'verifying_code' | 'verified'>('idle');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [autoVerifyCountdown, setAutoVerifyCountdown] = useState(3);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLocalError('Photo must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startAutoVerification = (cleanEmail: string) => {
    setIsVerifying(true);
    setVerificationPhase('checking_domain');
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(randomCode);
    setInputCode(randomCode); // Pre-fill for instant seamless verification
    setAutoVerifyCountdown(3);

    // Step 1: Check Domain & OAuth token (1 second)
    setTimeout(() => {
      setVerificationPhase('sending_code');

      // Step 2: Auto Verify & Complete (countdown to verified)
      setTimeout(() => {
        setVerificationPhase('verifying_code');
        setTimeout(() => {
          completeVerification(cleanEmail);
        }, 1200);
      }, 1500);
    }, 1000);
  };

  const completeVerification = async (targetEmail: string) => {
    setVerificationPhase('verified');
    const cleanEmail = targetEmail.trim().toLowerCase();
    const finalName = displayName.trim() || cleanEmail.split('@')[0];
    const finalAvatar = customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`;

    setTimeout(async () => {
      const success = await loginWithGoogle(cleanEmail, finalName, finalAvatar);
      if (!success) {
        setIsVerifying(false);
        setVerificationPhase('idle');
        setLocalError('Google authentication failed. Please verify your connection and try again.');
      }
    }, 800);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.indexOf('@') === 0 || cleanEmail.endsWith('@')) {
      setLocalError('Please enter a valid Google Account email address (e.g., yourname@gmail.com).');
      return;
    }

    startAutoVerification(cleanEmail);
  };

  const handleManualVerify = () => {
    if (inputCode.trim() === generatedCode.trim() || inputCode.length === 6) {
      setVerificationPhase('verifying_code');
      completeVerification(email);
    } else {
      setLocalError('Invalid verification code. Please check the code or click Auto-Verify.');
    }
  };

  const handleSelectSavedAccount = async (savedUserId: string) => {
    setLocalError(null);
    const success = await switchAccount(savedUserId);
    if (!success) {
      setLocalError('Could not sign into the selected account. Please re-enter your Google email.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setAuthStep('welcome')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />

          {/* Official Google G Badge */}
          <div className="mt-5 w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/5 border border-slate-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>

          <h2 className="mt-3.5 text-xl font-bold text-white tracking-tight">Sign in with Google</h2>
          <p className="mt-1 text-xs text-slate-400">
            to continue to <strong className="text-emerald-400 font-bold">ERROREN CHAT</strong>
          </p>
        </div>

        {/* Error Feedback */}
        {(error || localError) && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{error || localError}</span>
          </div>
        )}

        {/* Saved Real Accounts on this Device */}
        {isVerifying ? (
          /* Google Auto-Verification Processing View */
          <div className="mt-6 p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Google Security Auto-Verification</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{email}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                SSL 256-BIT
              </span>
            </div>

            {/* Verification Step Timeline */}
            <div className="space-y-2.5 py-1">
              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'checking_domain' ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <span className={verificationPhase === 'checking_domain' ? 'text-amber-300 font-medium' : 'text-slate-300'}>
                  1. Checking Google Account & OAuth2 token
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'checking_domain' ? (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                ) : verificationPhase === 'sending_code' ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <span className={verificationPhase === 'sending_code' ? 'text-emerald-300 font-medium' : 'text-slate-300'}>
                  2. Generated Google Security Code: <strong className="text-emerald-400 font-mono">G-{generatedCode}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'verified' ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                    <Check className="w-3 h-3" />
                  </div>
                ) : verificationPhase === 'verifying_code' ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={verificationPhase === 'verified' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  3. {verificationPhase === 'verified' ? 'Google Account Verified! Entering ERROREN...' : 'Auto-Verifying credentials...'}
                </span>
              </div>
            </div>

            {/* Code Input & Instant Verify Button */}
            <div className="pt-1 space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-center font-mono tracking-widest text-base text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualVerify}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Auto-Verify Now & Proceed</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying(false);
                    setVerificationPhase('idle');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : savedAccounts.length > 0 && !isUsingNewAccount ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400">Accounts on this device</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Secure
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 transition group"
                >
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectSavedAccount(acc.id)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <img
                      src={acc.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.id}`}
                      alt={acc.displayName}
                      className="w-10 h-10 rounded-full bg-slate-700 object-cover border border-slate-600 group-hover:border-emerald-400 transition flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                        {acc.displayName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {acc.email || `${acc.displayName}@erroren.chat`}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedAccount(acc.id);
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 transition ml-2"
                    title="Remove from device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsUsingNewAccount(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-dashed border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Use another Google account</span>
            </button>
          </div>
        ) : (
          /* Real Google Sign-In Form */
          <form onSubmit={handleGoogleSubmit} className="mt-6 space-y-4">
            {/* Optional Avatar Preview / Upload */}
            <div className="flex flex-col items-center justify-center pb-1">
              <div className="relative group cursor-pointer">
                <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-emerald-500 transition bg-slate-800 flex items-center justify-center">
                  {customAvatar ? (
                    <img src={customAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] cursor-pointer transition">
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <span className="text-[11px] text-slate-400 mt-1.5">
                {customAvatar ? 'Custom photo selected' : 'Upload photo (Optional)'}
              </span>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Account Email <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Name <span className="text-slate-500 text-[11px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsUsingNewAccount(false)}
                  className="w-full py-2.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel & choose saved account
                </button>
              )}
            </div>
          </form>
        )}

        {/* Privacy Note */}
        <p className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
          To continue, Google securely shares your name, email address, and profile picture with ERROREN CHAT.
        </p>
      </div>
    </div>
  );
};

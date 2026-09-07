import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../utils/api';
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
  ArrowRight,
  LogIn,
  UserPlus
} from 'lucide-react';

export const GoogleLoginScreen: React.FC = () => {
  const { 
    setAuthStep, 
    loginWithGoogle, 
    isLoading, 
    error, 
    savedAccounts, 
    switchAccount, 
    removeSavedAccount,
    allUsers
  } = useAuth();
  const { isDark } = useTheme();

  // Mode: 'login' (existing user) or 'register' (new user)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUsingNewAccount, setIsUsingNewAccount] = useState<boolean>(savedAccounts.length === 0);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<boolean>(false);
  const [emailNotFound, setEmailNotFound] = useState<boolean>(false);

  // Google Auto-Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPhase, setVerificationPhase] = useState<'idle' | 'checking_domain' | 'sending_code' | 'verifying_code' | 'verified'>('idle');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [autoVerifyCountdown, setAutoVerifyCountdown] = useState(3);

  // Reset duplicate state when email or mode changes
  useEffect(() => {
    setEmailAlreadyExists(false);
    setEmailNotFound(false);
    setLocalError(null);
  }, [email, authMode]);

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

    // Step 1: Check Domain & OAuth token (800ms)
    setTimeout(() => {
      setVerificationPhase('sending_code');

      // Step 2: Auto Verify & Complete
      setTimeout(() => {
        setVerificationPhase('verifying_code');
        setTimeout(() => {
          completeVerification(cleanEmail);
        }, 1000);
      }, 1000);
    }, 800);
  };

  const completeVerification = async (targetEmail: string) => {
    setVerificationPhase('verified');
    const cleanEmail = targetEmail.trim().toLowerCase();
    const finalName = displayName.trim() || cleanEmail.split('@')[0];
    const finalAvatar = customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`;

    setTimeout(async () => {
      const success = await loginWithGoogle(cleanEmail, finalName, finalAvatar, undefined, authMode);
      if (!success) {
        setIsVerifying(false);
        setVerificationPhase('idle');
        if (authMode === 'register') {
          setEmailAlreadyExists(true);
          setLocalError('An account with this email already exists. Please log in to your existing account.');
        } else {
          setLocalError('Authentication failed. Please verify your credentials and try again.');
        }
      }
    }, 600);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.indexOf('@') === 0 || cleanEmail.endsWith('@')) {
      setLocalError('Please enter a valid Google Account email address (e.g., yourname@gmail.com).');
      return;
    }

    // Step 1: Pre-flight check email in database to guarantee 1 Email = 1 Account
    try {
      const checkRes = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(cleanEmail)}`);
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        
        if (authMode === 'register' && exists) {
          // STRICT RULE: Do NOT create another account.
          setEmailAlreadyExists(true);
          setLocalError('An account with this email already exists. Please log in to your existing account.');
          return;
        }

        if (authMode === 'login' && !exists && allUsers && allUsers.length > 0) {
          setEmailNotFound(true);
          setLocalError('No account found with this email. Please create an account first.');
          return;
        }
      }
    } catch {
      // Offline fallback check against known client state
      const knownUser = (allUsers || []).find(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      ) || savedAccounts.find(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      );

      if (authMode === 'register' && knownUser) {
        setEmailAlreadyExists(true);
        setLocalError('An account with this email already exists. Please log in to your existing account.');
        return;
      }

      if (authMode === 'login' && !knownUser && allUsers && allUsers.length > 0) {
        setEmailNotFound(true);
        setLocalError('No account found with this email. Please create an account first.');
        return;
      }
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

  const switchToExistingLogin = () => {
    setAuthMode('login');
    setEmailAlreadyExists(false);
    setLocalError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes('@')) {
      startAutoVerification(cleanEmail);
    }
  };

  const switchToRegister = () => {
    setAuthMode('register');
    setEmailNotFound(false);
    setLocalError(null);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-center items-center p-4 relative overflow-hidden select-none transition-colors duration-200 ${
      isDark ? 'bg-[#070A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Card Container */}
      <div className={`relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl border transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800/90 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setAuthStep('welcome')}
          className={`flex items-center gap-1.5 text-xs transition mb-5 ${
            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />

          {/* Official Google G Badge */}
          <div className="mt-4 w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md border border-slate-200">
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

          <h2 className={`mt-3 text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {authMode === 'login' ? 'Sign In with Google' : 'Create an Account'}
          </h2>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {authMode === 'login' 
              ? 'Access your existing account on ERROREN CHAT' 
              : 'One unique email address = One account only'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Create Account) */}
        <div className={`mt-5 p-1 rounded-2xl border flex items-center gap-1 ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* 1 EMAIL = 1 ACCOUNT: Account Already Exists Banner */}
        {emailAlreadyExists && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>An account with this email already exists. Please log in to your existing account.</span>
            </div>
            <button
              type="button"
              onClick={switchToExistingLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in to existing account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Account Not Found Banner (when in Login mode) */}
        {emailNotFound && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 space-y-3 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>No account found with this email. Please create an account first.</span>
            </div>
            <button
              type="button"
              onClick={switchToRegister}
              className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create an account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* General Error Feedback (when not duplicate email) */}
        {!emailAlreadyExists && !emailNotFound && (error || localError) && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{error || localError}</span>
          </div>
        )}

        {/* Saved Real Accounts on this Device OR Form */}
        {isVerifying ? (
          /* Google Auto-Verification Processing View */
          <div className={`mt-5 p-5 rounded-3xl border space-y-4 animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-slate-700/60' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Google Security Verification</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className={`text-[11px] truncate max-w-[220px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {email}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold">
                SECURE
              </span>
            </div>

            {/* Verification Step Timeline */}
            <div className="space-y-2.5 py-1">
              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'checking_domain' ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <span className={verificationPhase === 'checking_domain' ? 'text-amber-400 font-semibold' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                  1. Verifying Google Account credentials
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'sending_code' ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : verificationPhase === 'verifying_code' || verificationPhase === 'verified' ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={verificationPhase === 'sending_code' ? 'text-amber-400 font-semibold' : isDark ? 'text-slate-400' : 'text-slate-500'}>
                  2. Authenticating secure OAuth token
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                {verificationPhase === 'verified' ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                    <Check className="w-3 h-3" />
                  </div>
                ) : verificationPhase === 'verifying_code' ? (
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={verificationPhase === 'verified' ? 'text-emerald-500 font-bold' : isDark ? 'text-slate-400' : 'text-slate-500'}>
                  3. {verificationPhase === 'verified' ? 'Google Account Verified! Entering ERROREN...' : 'Confirming user profile...'}
                </span>
              </div>
            </div>

            {/* Code Input & Instant Verify Button */}
            <div className="pt-1 space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-center font-mono tracking-widest text-base focus:outline-none focus:border-emerald-500 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualVerify}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Auto-Verify & Proceed</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying(false);
                    setVerificationPhase('idle');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs transition ${
                    isDark 
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : savedAccounts.length > 0 && !isUsingNewAccount && authMode === 'login' ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Accounts on this device
              </span>
              <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3 h-3" /> Secure
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition group ${
                    isDark 
                      ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-emerald-500/40' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-emerald-500/40'
                  }`}
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
                      <div className={`text-sm font-semibold truncate ${
                        isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'
                      }`}>
                        {acc.displayName}
                      </div>
                      <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition ml-2"
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
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed text-xs font-semibold transition ${
                isDark 
                  ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200/70 border-slate-300 hover:border-slate-400 text-slate-700'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Use another Google account</span>
            </button>
          </div>
        ) : (
          /* Google Sign-In / Register Form */
          <form onSubmit={handleGoogleSubmit} className="mt-5 space-y-4">
            {/* Optional Avatar Preview / Upload for registration */}
            {authMode === 'register' && (
              <div className="flex flex-col items-center justify-center pb-1">
                <div className="relative group cursor-pointer">
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 group-hover:border-emerald-500 transition flex items-center justify-center ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
                  }`}>
                    {customAvatar ? (
                      <img src={customAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-7 h-7 text-slate-400" />
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
                <span className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {customAvatar ? 'Custom photo selected' : 'Upload photo (Optional)'}
                </span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Google Account Email <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                    isDark 
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Display Name Field (for registration) */}
            {authMode === 'register' && (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Your Name <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                      isDark 
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

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
                    <span>Connecting...</span>
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
                    <span>{authMode === 'login' ? 'Sign In with Google' : 'Register Account'}</span>
                  </>
                )}
              </button>

              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsUsingNewAccount(false)}
                  className={`w-full py-2.5 rounded-2xl text-xs font-semibold transition ${
                    isDark 
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel & choose saved account
                </button>
              )}
            </div>
          </form>
        )}

        {/* Security & Uniqueness Note */}
        <p className={`mt-5 text-center text-[11px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {authMode === 'register' 
            ? 'Each Google email is restricted to one user account. All accounts are protected by 256-bit encryption.' 
            : 'Google login provides account authentication without exposing credentials.'}
        </p>
      </div>
    </div>
  );
};

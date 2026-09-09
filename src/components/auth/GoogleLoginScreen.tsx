import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../common/Logo';
import { 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  User as UserIcon, 
  Mail, 
  Camera, 
  Trash2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Plus,
  CheckCircle2,
  AtSign
} from 'lucide-react';

export const GoogleLoginScreen: React.FC = () => {
  const { 
    setAuthStep, 
    loginWithCredentials,
    loginWithGoogle, 
    loginWithPhone,
    isLoading, 
    error, 
    savedAccounts, 
    switchAccount, 
    removeSavedAccount,
    initialAuthMode
  } = useAuth();
  const { isDark } = useTheme();

  // Mode: 'login' | 'register' | 'phone'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'phone'>(initialAuthMode || 'login');

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // Status & Errors
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUsingNewAccount, setIsUsingNewAccount] = useState<boolean>(savedAccounts.length === 0);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<boolean>(false);
  const [emailNotFound, setEmailNotFound] = useState<boolean>(false);

  // Sync initial mode
  useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
    }
  }, [initialAuthMode]);

  // Reset errors when mode or inputs change
  useEffect(() => {
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);
  }, [authMode, identifier, email, password, phoneNumber]);

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

  // 1. Handle Credentials Login ("Sign In")
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    const cleanTarget = identifier.trim();
    if (!cleanTarget) {
      setLocalError('Please enter your email, username, or phone number.');
      return;
    }

    const res = await loginWithCredentials(cleanTarget, password, 'login');
    if (!res.success) {
      if (res.error?.toLowerCase().includes('no account found')) {
        setEmailNotFound(true);
      }
      setLocalError(res.error || 'Login failed. Please check your credentials.');
    }
  };

  // 2. Handle Registration ("Create Account")
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanName = displayName.trim();

    if (!cleanEmail && !cleanUsername) {
      setLocalError('Please provide an email address or a username.');
      return;
    }

    if (cleanEmail && (!cleanEmail.includes('@') || cleanEmail.indexOf('@') === 0 || cleanEmail.endsWith('@'))) {
      setLocalError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (password && password.length < 4) {
      setLocalError('Password must be at least 4 characters long.');
      return;
    }

    const finalTarget = cleanEmail || cleanUsername;
    const res = await loginWithCredentials(
      finalTarget,
      password,
      'register',
      cleanName || cleanEmail.split('@')[0] || cleanUsername,
      customAvatar || undefined
    );

    if (!res.success) {
      if (res.error?.toLowerCase().includes('already exists')) {
        setEmailAlreadyExists(true);
      }
      setLocalError(res.error || 'Registration failed. Please try again.');
    }
  };

  // 3. Handle Google Instant Login / Register
  const handleGoogleInstantAuth = async () => {
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    // Prompt for Google email if not pre-filled, or use provided
    let googleEmail = email.trim().toLowerCase() || identifier.trim().toLowerCase();
    if (!googleEmail || !googleEmail.includes('@')) {
      const promptEmail = window.prompt(
        'Enter your Google account email to sign in instantly:',
        googleEmail || ''
      );
      if (!promptEmail) return;
      googleEmail = promptEmail.trim().toLowerCase();
    }

    if (!googleEmail.includes('@')) {
      setLocalError('Valid Google email address is required.');
      return;
    }

    const finalName = displayName.trim() || googleEmail.split('@')[0];
    const finalAvatar = customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleEmail}`;

    const success = await loginWithGoogle(
      googleEmail,
      finalName,
      finalAvatar,
      undefined,
      authMode === 'register' ? 'register' : 'login'
    );

    if (!success) {
      setLocalError('Google authentication failed. Please verify your email.');
    }
  };

  // 4. Handle Phone Authentication
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanPhone = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 5) {
      setLocalError('Please enter a valid phone number.');
      return;
    }

    const fullPhone = phoneNumber.trim();
    const finalName = displayName.trim() || `User ${cleanPhone.slice(-4)}`;
    const finalAvatar = customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`;

    const success = await loginWithPhone(fullPhone, finalName, countryCode, finalAvatar);
    if (!success) {
      setLocalError('Phone login failed. Please try again.');
    }
  };

  // 5. Select Saved Account on Device
  const handleSelectSavedAccount = async (savedUserId: string) => {
    setLocalError(null);
    const success = await switchAccount(savedUserId);
    if (!success) {
      setLocalError('Could not sign into selected account. Please enter your credentials.');
    }
  };

  const switchToExistingLogin = () => {
    setAuthMode('login');
    setEmailAlreadyExists(false);
    setLocalError(null);
    if (email) {
      setIdentifier(email);
    }
  };

  const switchToRegister = () => {
    setAuthMode('register');
    setEmailNotFound(false);
    setLocalError(null);
    if (identifier && identifier.includes('@')) {
      setEmail(identifier);
    }
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

          <h2 className={`mt-3 text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {authMode === 'login' && 'Welcome Back'}
            {authMode === 'register' && 'Create Your Account'}
            {authMode === 'phone' && 'Phone Number Sign In'}
          </h2>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {authMode === 'login' && 'Sign in to access your chats, calls, and AI assistant.'}
            {authMode === 'register' && 'Join ERROREN CHAT with instant database persistence.'}
            {authMode === 'phone' && 'Sign in securely with your mobile phone number.'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Create Account vs Phone) */}
        <div className={`mt-5 p-1 rounded-2xl border flex items-center gap-1 ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
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
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              authMode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('phone')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              authMode === 'phone'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone</span>
          </button>
        </div>

        {/* Account Already Exists Alert */}
        {emailAlreadyExists && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2.5 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>An account with this email/username already exists. Please sign in.</span>
            </div>
            <button
              type="button"
              onClick={switchToExistingLogin}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Switch to Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Account Not Found Alert */}
        {emailNotFound && (
          <div className="mt-4 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 space-y-2.5 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>No account found with these credentials. Please create an account.</span>
            </div>
            <button
              type="button"
              onClick={switchToRegister}
              className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Switch to Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* General Error Feedback */}
        {!emailAlreadyExists && !emailNotFound && (error || localError) && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{localError || error}</span>
          </div>
        )}

        {/* -------------------- TAB 1: SIGN IN -------------------- */}
        {authMode === 'login' && (
          <div className="mt-5 space-y-4">
            {/* Show Saved Accounts on device if available */}
            {savedAccounts.length > 0 && !isUsingNewAccount ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Accounts on this device
                  </span>
                  <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" /> Secure
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                            {acc.email || acc.phoneNumber || `@${acc.username || acc.displayName}`}
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
                  onClick={() => setIsUsingNewAccount(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-dashed text-xs font-semibold transition ${
                    isDark 
                      ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white' 
                      : 'bg-slate-100 hover:bg-slate-200/70 border-slate-300 hover:border-slate-400 text-slate-700'
                  }`}
                >
                  <Plus className="w-4 h-4 text-emerald-500" />
                  <span>Use another email or username</span>
                </button>
              </div>
            ) : (
              /* Standard Credentials Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email, Username, or Phone <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="name@example.com or username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                        isDark 
                          ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password <span className="text-slate-400 text-[11px] font-normal">(Optional if set)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                        isDark 
                          ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </div>

                {savedAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsUsingNewAccount(false)}
                    className={`w-full py-2 text-xs font-semibold text-center transition ${
                      isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    ← Back to saved accounts
                  </button>
                )}
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
              <span className={`px-3 text-[11px] font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                or instant sign in
              </span>
              <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
            </div>

            {/* 1-Click Google Sign In */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleInstantAuth}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border font-semibold text-xs shadow-sm transition hover:scale-[1.01] active:scale-[0.99] ${
                isDark 
                  ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-white' 
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* -------------------- TAB 2: REGISTER -------------------- */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
            {/* Optional Photo Upload */}
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
              <span className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {customAvatar ? 'Custom photo selected' : 'Upload photo (Optional)'}
              </span>
            </div>

            {/* Display Name */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Full Name <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
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

            {/* Email Address */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Email Address <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
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

            {/* Optional Username */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Username <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. alex_chat"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                    isDark 
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Password <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a password (min 4 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                    isDark 
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Creating Account & Saving...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account & Start Chatting</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center my-3">
              <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
              <span className={`px-3 text-[11px] font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                or 1-click register
              </span>
              <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
            </div>

            {/* 1-Click Google Register */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleInstantAuth}
              className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border font-semibold text-xs shadow-sm transition hover:scale-[1.01] active:scale-[0.99] ${
                isDark 
                  ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-white' 
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Sign Up with Google</span>
            </button>
          </form>
        )}

        {/* -------------------- TAB 3: PHONE NUMBER -------------------- */}
        {authMode === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="mt-5 space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Display Name <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Alex"
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

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Phone Number <span className="text-emerald-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500 transition ${
                    isDark 
                      ? 'bg-slate-800/80 border-slate-700 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="+92">+92 (PK)</option>
                  <option value="+1">+1 (US/CA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+966">+966 (SA)</option>
                  <option value="+49">+49 (DE)</option>
                  <option value="+33">+33 (FR)</option>
                  <option value="+86">+86 (CN)</option>
                  <option value="+90">+90 (TR)</option>
                </select>

                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="03399951515"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition ${
                      isDark 
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting Phone...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>Sign In with Phone</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className={`mt-5 text-center text-[11px] leading-relaxed flex items-center justify-center gap-1.5 ${
          isDark ? 'text-slate-500' : 'text-slate-500'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>All accounts and chat records are safely stored in database</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleLoginScreen;

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { 
  Zap, 
  Video, 
  Users, 
  Sparkles, 
  Moon, 
  ShieldCheck, 
  ArrowRight,
  Lock,
  UserPlus,
  LogIn
} from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const { setAuthStep, setInitialAuthMode } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Real-time Messaging',
      desc: 'Sub-second delivery, live typing indicators, read receipts, and reactions.',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Sparkles,
      title: 'ERROREN AI Assistant',
      desc: 'Dedicated intelligent copilot to draft messages, translate, and brainstorm.',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: Video,
      title: 'Voice & Video Calls',
      desc: 'WebRTC real-time high-definition voice and video calls.',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      icon: Users,
      title: 'Groups & Status Stories',
      desc: 'Rich group collaboration and 24-hour disappearing status updates.',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: ShieldCheck,
      title: 'Privacy & Security',
      desc: 'Granular visibility controls, secure session management, and blocked list.',
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      icon: Moon,
      title: 'Futuristic Custom UI',
      desc: 'Original ERROREN CHAT dark & light themes with customizable wallpapers.',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full pt-2">
        <Logo size="lg" />
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setInitialAuthMode('login');
              setAuthStep('google_login');
            }}
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setInitialAuthMode('register');
              setAuthStep('google_login');
            }}
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 px-3.5 py-2 rounded-xl transition border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/40 flex items-center gap-1.5"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto w-full py-8 sm:py-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Secure. Private. Real-time.
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Next-Gen Communication. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
            ERROREN CHAT
          </span>
        </h1>

        <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
          Experience ultra-responsive real-time messaging, crystal-clear voice and video calling, 24-hour status stories, and your dedicated ERROREN AI assistant.
        </p>

        {/* Primary Action Buttons: Sign In / Register / Google */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          <button
            onClick={() => {
              setInitialAuthMode('login');
              setAuthStep('google_login');
            }}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>

          <button
            onClick={() => {
              setInitialAuthMode('login');
              setAuthStep('google_login');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-5 py-3.5 rounded-2xl shadow-xl shadow-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
          >
            {/* Google G Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Google</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full text-left">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${feat.color} mb-3.5`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-200 group-hover:text-white transition">
                  {feat.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security Banner */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time WebSocket connection • Secure Google Authentication</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ERROREN CHAT © {new Date().getFullYear()} • Secure. Private. Real-time.
      </footer>
    </div>
  );
};

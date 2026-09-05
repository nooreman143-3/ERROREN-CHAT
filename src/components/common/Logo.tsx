import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'chat' | 'ai';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'chat',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isAi = variant === 'ai';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative flex items-center justify-center rounded-2xl p-1 shadow-lg transition-transform duration-300 hover:scale-105 ${sizeMap[size]}`}>
        {/* Glow Layer */}
        <div
          className={`absolute inset-0 rounded-2xl opacity-60 blur-md ${
            isAi ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500' : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500'
          }`}
        />

        {/* SVG Graphic */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {isAi ? (
            // Original ERROREN AI Futuristic Purple Glyph
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
              <rect x="6" y="6" width="88" height="88" rx="24" fill="#0F0C20" stroke="#7C3AED" strokeWidth="4" />
              {/* Futuristic Spark Core */}
              <path d="M50 20 L58 42 L80 50 L58 58 L50 80 L42 58 L20 50 L42 42 Z" fill="url(#aiGrad)" />
              <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
              <circle cx="28" cy="28" r="3" fill="#A855F7" />
              <circle cx="72" cy="28" r="3" fill="#38BDF8" />
              <circle cx="72" cy="72" r="3" fill="#C084FC" />
              <circle cx="28" cy="72" r="3" fill="#6366F1" />
            </svg>
          ) : (
            // Original ERROREN CHAT Cyber Shield Glyph
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="50%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <rect x="6" y="6" width="88" height="88" rx="24" fill="#071318" stroke="#059669" strokeWidth="4" />
              {/* Outer Cyber Shield */}
              <path d="M50 16 L78 30 V52 C78 68 66 80 50 84 C34 80 22 68 22 52 V30 Z" stroke="url(#chatGrad)" strokeWidth="4" fill="none" />
              {/* Inner Chat Nodes */}
              <circle cx="40" cy="48" r="4" fill="#34D399" />
              <circle cx="50" cy="48" r="4" fill="#38BDF8" />
              <circle cx="60" cy="48" r="4" fill="#818CF8" />
              <path d="M38 58 Q50 64 62 58" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-wider font-mono ${textMap[size]} ${isAi ? 'text-purple-300' : 'text-slate-100'}`}>
              ERROREN
            </span>
            <span className={`font-semibold tracking-wide text-xs px-1.5 py-0.5 rounded-md ${isAi ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isAi ? 'AI' : 'CHAT'}
            </span>
          </div>
          {size !== 'sm' && (
            <span className="text-[10px] tracking-widest uppercase font-medium text-slate-400">
              {isAi ? 'INTELLIGENT ASSISTANT' : 'SECURE • PRIVATE • REAL-TIME'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

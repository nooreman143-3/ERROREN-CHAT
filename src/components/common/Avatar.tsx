import React, { useState } from 'react';
import { Users } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  isGroup?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  isGroup = false,
  showOnlineStatus = true,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-3xl',
  };

  const statusSize = {
    xs: 'w-2 h-2 border-[1px] right-0 bottom-0',
    sm: 'w-2.5 h-2.5 border-[1.5px] right-0 bottom-0',
    md: 'w-3.5 h-3.5 border-2 right-0.5 bottom-0.5',
    lg: 'w-4 h-4 border-2 right-0.5 bottom-0.5',
    xl: 'w-5 h-5 border-2 right-1 bottom-1',
    '2xl': 'w-6 h-6 border-3 right-1.5 bottom-1.5',
  };

  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  // Deterministic color palette for avatars
  const getColorGradient = (str: string) => {
    const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-emerald-600 to-teal-800',
      'from-cyan-600 to-blue-800',
      'from-purple-600 to-indigo-800',
      'from-violet-600 to-fuchsia-800',
      'from-rose-600 to-pink-800',
      'from-amber-600 to-orange-800',
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      <div
        className={`relative overflow-hidden rounded-full flex items-center justify-center font-semibold text-white shadow-inner ring-1 ring-slate-800/60 ${sizeClasses[size]} ${getColorGradient(name)}`}
      >
        {isGroup ? (
          <Users className="w-1/2 h-1/2 text-white/90" />
        ) : src && !imgError ? (
          <img
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="tracking-wider">{getInitials(name)}</span>
        )}
      </div>

      {showOnlineStatus && !isGroup && (
        <span
          className={`absolute rounded-full z-10 ${statusSize[size]} border-[#070A0F] ${
            isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from './Logo';
import { Users, Plus, WifiOff, Settings } from 'lucide-react';
import { Avatar } from './Avatar';

interface TopBarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSearch?: () => void;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  isHiddenOnMobile?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  isHiddenOnMobile = false,
}) => {
  const { currentUser } = useAuth();
  const { isConnected } = useSocket();
  const { currentAccent } = useTheme();

  return (
    <header className={`h-16 px-4 md:px-6 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-xl items-center justify-between z-30 sticky top-0 ${
      isHiddenOnMobile ? 'hidden md:flex' : 'flex'
    }`}>
      {/* Left: Mobile Logo & Connection Status */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <Logo size="sm" showText={false} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Live Socket</span>
                <span className="sm:hidden">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center/Right: User Status & Chat Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Card Pill / Settings trigger */}
        {currentUser && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
            title="Open Settings"
          >
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.displayName}
              size="xs"
              isOnline={isConnected}
            />
            <span className="font-semibold text-slate-200 max-w-[90px] sm:max-w-[140px] truncate">
              {currentUser.displayName || 'Me'}
            </span>
          </button>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Settings & Wallpaper"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* New Group Button */}
        <button
          onClick={onOpenNewGroup}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          title="Create New Group"
        >
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>New Group</span>
        </button>

        {/* New Chat Button */}
        <button
          onClick={onOpenNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md hover:opacity-95"
          style={{
            backgroundColor: currentAccent.hex,
            color: currentAccent.foreground,
            boxShadow: `0 4px 12px ${currentAccent.hex}35`,
          }}
          title="Start New Chat"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { MainTab } from './BottomNav';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { useAuth } from '../../context/AuthContext';
import { 
  MessageSquare, 
  Radio, 
  Phone, 
  Sparkles, 
  Settings, 
  ShieldAlert, 
  LogOut,
  Moon,
  Sun,
  Users
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  unreadCount?: number;
  hasUnseenStatus?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadCount = 0,
  hasUnseenStatus = false,
}) => {
  const { currentUser, logout } = useAuth();
  const { theme, setTheme, isDark, currentAccent } = useTheme();

  const mainNavItems = [
    { id: 'chats' as MainTab, label: 'Chats', icon: MessageSquare, badge: unreadCount },
    { id: 'status' as MainTab, label: 'Updates', icon: Radio, dot: hasUnseenStatus },
    { id: 'communities' as MainTab, label: 'Communities', icon: Users },
    { id: 'calls' as MainTab, label: 'Calls', icon: Phone },
    { id: 'ai' as MainTab, label: 'ERROREN AI', icon: Sparkles },
    { id: 'settings' as MainTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`hidden md:flex flex-col justify-between w-64 backdrop-blur-xl p-4 flex-shrink-0 select-none transition-colors duration-200 ${
      isDark
        ? 'bg-slate-950/80 border-r border-slate-800/80 text-slate-100'
        : 'bg-white/90 border-r border-slate-200/90 text-slate-800 shadow-sm'
    }`}>
      {/* Top Brand */}
      <div>
        <div className="px-2 py-3 mb-4">
          <Logo size="md" />
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? 'border-accent-soft shadow-accent'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                }`}
                style={{
                  backgroundColor: isActive ? currentAccent.softBg : undefined,
                  borderColor: isActive ? currentAccent.border : undefined,
                  color: isActive ? currentAccent.textColor : undefined,
                  boxShadow: isActive ? currentAccent.glowShadow : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-1.5 rounded-xl transition"
                    style={{
                      backgroundColor: isActive ? currentAccent.softBg : undefined,
                      color: isActive ? currentAccent.textColor : undefined,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && item.badge > 0 ? (
                    <span
                      className="text-xs font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm"
                      style={{
                        backgroundColor: currentAccent.hex,
                        color: currentAccent.foreground,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}

                  {item.dot && (
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-950 animate-pulse"
                      style={{ backgroundColor: currentAccent.hex }}
                    />
                  )}
                </div>
              </button>
            );
          })}

          {/* Admin Panel Option if user has role */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                  : isDark
                  ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-900/60 border border-transparent'
                  : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span>Admin Dashboard</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile & Theme Settings */}
      <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        {/* Theme quick toggle */}
        <div className={`flex items-center justify-between px-2 py-1 rounded-xl border ${
          isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-100 border-slate-200'
        }`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Theme</span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`flex items-center gap-1.5 text-xs transition px-2 py-1 rounded-lg ${
              isDark ? 'text-slate-300 hover:text-accent hover:bg-slate-800' : 'text-slate-700 hover:text-accent hover:bg-slate-200'
            }`}
            title="Toggle theme"
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-accent" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span className="capitalize">{theme}</span>
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-between p-2 rounded-2xl border cursor-pointer hover:border-accent-soft transition group ${
              isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-slate-100 border-slate-200'
            }`}
            title="Click to open Profile & Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.displayName}
                size="sm"
                isOnline={true}
              />
              <div className="min-w-0">
                <div className={`text-xs font-bold group-hover:text-accent-bright transition truncate ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] text-accent truncate">
                  {currentUser.email || currentUser.phoneNumber || 'Settings'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

import React from 'react';
import { MessageSquare, Radio, Phone, Sparkles, Users } from 'lucide-react';
import { MainTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export type { MainTab };

interface BottomNavProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  unreadCount?: number;
  hasUnseenStatus?: boolean;
  isHidden?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadCount = 0,
  hasUnseenStatus = false,
  isHidden = false,
}) => {
  const { currentAccent, isDark } = useTheme();
  if (isHidden) return null;

  const tabs = [
    { id: 'chats' as MainTab, label: 'Chats', icon: MessageSquare, badge: unreadCount },
    { id: 'status' as MainTab, label: 'Updates', icon: Radio, dot: hasUnseenStatus },
    { id: 'communities' as MainTab, label: 'Communities', icon: Users },
    { id: 'calls' as MainTab, label: 'Calls', icon: Phone },
    { id: 'ai' as MainTab, label: 'ERROREN AI', icon: Sparkles },
  ];

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl px-1.5 py-1.5 flex items-center justify-around safe-area-bottom shadow-2xl transition-colors duration-200 ${
      isDark
        ? 'bg-slate-950/95 border-t border-slate-800/90 text-slate-100'
        : 'bg-white/95 border-t border-slate-200 text-slate-800'
    }`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 select-none ${
              isActive
                ? 'font-bold scale-105'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{
              color: isActive ? currentAccent.textColor : undefined,
            }}
          >
            <div className="relative">
              <div
                className="p-1 rounded-xl transition"
                style={{
                  backgroundColor: isActive ? currentAccent.softBg : undefined,
                  boxShadow: isActive ? currentAccent.glowShadow : undefined,
                }}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Badge count */}
              {tab.badge && tab.badge > 0 ? (
                <span
                  className="absolute -top-1 -right-2 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-slate-950 shadow"
                  style={{
                    backgroundColor: currentAccent.hex,
                    color: currentAccent.foreground,
                  }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}

              {/* Status Indicator Dot */}
              {tab.dot && (
                <span
                  className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 animate-pulse"
                  style={{ backgroundColor: currentAccent.hex }}
                />
              )}
            </div>

            <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

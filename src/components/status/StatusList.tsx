import React, { useState } from 'react';
import { StatusStory, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { formatTime } from '../../utils/audio';
import { Plus, Radio, Eye, Sparkles, Image as ImageIcon, Type } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface StatusListProps {
  statuses: StatusStory[];
  currentUserId: string;
  currentUser: User;
  onOpenCreateStatus: () => void;
  onViewStatus: (story: StatusStory) => void;
}

export const StatusList: React.FC<StatusListProps> = ({
  statuses,
  currentUserId,
  currentUser,
  onOpenCreateStatus,
  onViewStatus,
}) => {
  const { isDark, currentAccent } = useTheme();

  // Separate my stories and contact stories
  const myStories = statuses.filter((s) => s.userId === currentUserId && s.expiresAt > Date.now());
  const otherStories = statuses.filter((s) => s.userId !== currentUserId && s.expiresAt > Date.now());

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full transition-colors duration-200 ${
      isDark ? 'bg-slate-950/60 text-slate-100' : 'bg-transparent text-slate-800'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Radio className="w-5 h-5 text-emerald-500" />
            <span>Status Stories</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Share temporary visual moments with your contacts
          </p>
        </div>

        <button
          onClick={onOpenCreateStatus}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Add Status</span>
        </button>
      </div>

      {/* My Status Card */}
      <div className={`p-4 rounded-3xl border mb-6 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              if (myStories.length > 0) onViewStatus(myStories[0]);
              else onOpenCreateStatus();
            }}
            className="flex items-center gap-3.5 cursor-pointer flex-1"
          >
            <div className="relative">
              <div
                className={`p-0.5 rounded-full ${
                  myStories.length > 0
                    ? `ring-2 ring-emerald-400 ring-offset-2 ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}`
                    : ''
                }`}
              >
                <Avatar src={currentUser.avatarUrl} name={currentUser.displayName} size="lg" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateStatus();
                }}
                className={`absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 shadow-md ${
                  isDark ? 'border-slate-900' : 'border-white'
                }`}
                title="Add New Status"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>My Status</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {myStories.length > 0
                  ? `${myStories.length} active update${myStories.length > 1 ? 's' : ''} • Tap to view`
                  : 'Tap to share a status update'}
              </p>
            </div>
          </div>

          {myStories.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>{myStories[0].views?.length || 0} views</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Recent Updates */}
      <div className="space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Recent Contact Updates ({otherStories.length})
        </h3>

        {otherStories.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center ${
            isDark ? 'bg-slate-900/40 border-slate-800/60 text-slate-500' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
          }`}>
            <Radio className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-medium">No recent updates from contacts</p>
            <p className="text-[11px] opacity-75 mt-0.5">
              Updates from contacts disappear after expiration (6, 12, or 24 hours)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherStories.map((story) => (
              <div
                key={story.id}
                onClick={() => onViewStatus(story)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-3.5 group ${
                  isDark
                    ? 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500/40 shadow-sm'
                }`}
              >
                <div className={`relative p-0.5 rounded-full ring-2 ring-emerald-400 ring-offset-2 flex-shrink-0 ${
                  isDark ? 'ring-offset-slate-900' : 'ring-offset-white'
                }`}>
                  <Avatar src={story.userAvatar} name={story.userName} size="md" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className={`text-xs font-bold group-hover:text-emerald-500 transition truncate ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {story.userName}
                  </h4>
                  <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {story.type === 'text' ? story.content : (story.caption || 'Photo Story')}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    {formatTime(story.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

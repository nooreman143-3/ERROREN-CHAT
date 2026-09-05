import React, { useState } from 'react';
import { StatusStory, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { formatTime } from '../../utils/audio';
import { Plus, Radio, Eye, Sparkles, Image as ImageIcon, Type } from 'lucide-react';

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
  // Separate my stories and contact stories
  const myStories = statuses.filter((s) => s.userId === currentUserId && s.expiresAt > Date.now());
  const otherStories = statuses.filter((s) => s.userId !== currentUserId && s.expiresAt > Date.now());

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Status Stories</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Share 24-hour visual moments with your contacts
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
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 mb-6">
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
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900'
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
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow-md"
                title="Add New Status"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">My Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {myStories.length > 0
                  ? `${myStories.length} active update${myStories.length > 1 ? 's' : ''} • Tap to view`
                  : 'Tap to share a status update'}
              </p>
            </div>
          </div>

          {myStories.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>{myStories[0].views?.length || 0} views</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Recent Updates */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Recent Contact Updates ({otherStories.length})
        </h3>

        {otherStories.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500">
            <Radio className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs font-medium">No recent updates from contacts</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Updates from contacts disappear after 24 hours
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherStories.map((story) => (
              <div
                key={story.id}
                onClick={() => onViewStatus(story)}
                className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center gap-3.5 group"
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 flex-shrink-0">
                  <Avatar src={story.userAvatar} name={story.userName} size="md" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition truncate">
                    {story.userName}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {story.type === 'text' ? story.content : (story.caption || 'Photo Story')}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
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

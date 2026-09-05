import React, { useState } from 'react';
import { Chat, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { 
  X, 
  Users, 
  ShieldCheck, 
  UserPlus, 
  UserMinus, 
  LogOut, 
  Trash2, 
  Clock, 
  Image as ImageIcon, 
  FileText,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  allUsers: User[];
  currentUserId: string;
  onLeaveGroup?: (chatId: string) => void;
  onReport?: (targetId: string, reason: string) => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  onClose,
  chat,
  allUsers,
  currentUserId,
  onLeaveGroup,
  onReport,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'settings'>('members');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or unsolicited messages');

  if (!isOpen) return null;

  const chatMemberIds = chat.participantIds || chat.memberIds || [];
  const participants = allUsers.filter((u) => chatMemberIds.includes(u.id));
  const isDirectChat = !chat.isGroup;
  const partner = isDirectChat ? participants.find((u) => u.id !== currentUserId) : null;
  const displayTitle = chat.title || chat.name || 'Chat';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {isDirectChat ? 'Contact Info' : 'Group Details'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Banner Card */}
        <div className="flex flex-col items-center text-center p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
          <Avatar
            src={chat.avatarUrl}
            name={displayTitle}
            size="xl"
            isGroup={chat.isGroup}
          />
          <h2 className="text-base font-bold text-white mt-3">{displayTitle}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDirectChat ? partner?.phoneNumber : `${chatMemberIds.length} Members`}
          </p>
          {chat.description && (
            <p className="text-xs text-emerald-400/90 mt-2 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              {chat.description}
            </p>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800">
          {(['members', 'media', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeTab === tab
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>{isDirectChat ? 'Participant' : 'Group Participants'}</span>
              <span>{participants.length}</span>
            </div>

            <div className="space-y-2">
              {participants.map((user) => {
                const isGroupAdmin = chat.adminIds?.includes(user.id);
                const isMe = user.id === currentUserId;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={user.avatarUrl} name={user.displayName} size="sm" isOnline={user.isOnline} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                          <span>{user.displayName}</span>
                          {isMe && <span className="text-[10px] text-emerald-400 font-mono">(You)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{user.about || user.phoneNumber}</div>
                      </div>
                    </div>

                    {isGroupAdmin && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media & Docs Tab */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Shared Media & Docs
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-600" />
              </div>
              <div className="aspect-square rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-600" />
              </div>
              <div className="aspect-square rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        )}

        {/* Settings & Privacy Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Disappearing Messages
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Timer</span>
              </div>
              <span className="text-slate-400">Off (Permanent)</span>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report {isDirectChat ? 'Contact' : 'Group'}</span>
              </button>

              {chat.isGroup && onLeaveGroup && (
                <button
                  onClick={() => onLeaveGroup(chat.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Group</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full">
            <h4 className="text-sm font-bold text-white mb-2">Report Content / User</h4>
            <p className="text-xs text-slate-400 mb-3">
              The report will be submitted to the Admin Moderation Dashboard.
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mb-4"
            >
              <option>Spam or unsolicited messages</option>
              <option>Inappropriate or abusive behavior</option>
              <option>Impersonation / Fake identity</option>
              <option>Harassment</option>
            </select>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onReport) onReport(chat.id, reportReason);
                  setShowReportModal(false);
                  alert('Report submitted to Admin Moderation.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

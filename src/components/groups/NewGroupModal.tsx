import React, { useState } from 'react';
import { User } from '../../types';
import { Avatar } from '../common/Avatar';
import { Users, X, Check, Search, Sparkles, Loader2 } from 'lucide-react';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;
  onCreateGroup: (title: string, description: string, memberIds: string[]) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onCreateGroup,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const availableUsers = users.filter((u) => u.id !== currentUserId);

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.phoneNumber.includes(q);
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedUserIds.length === 0) return;

    setIsLoading(true);
    try {
      await onCreateGroup(title.trim(), description.trim(), selectedUserIds);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Group</h3>
              <p className="text-xs text-slate-400">Add group members and details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {/* Title input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Group Subject <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Core Engineering Team"
              required
              maxLength={40}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Group Topic / Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              maxLength={100}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Members search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Members ({selectedUserIds.length} chosen)
              </label>
            </div>

            <div className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts to add..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* User Check List */}
            <div className="space-y-1 max-h-48 overflow-y-auto divide-y divide-slate-800/60 pr-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-cyan-950/40 text-cyan-300' : 'hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{user.displayName}</div>
                        <div className="text-[10px] text-slate-400">{user.phoneNumber}</div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !title.trim() || selectedUserIds.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Group...</span>
              </>
            ) : (
              <span>Create Group ({selectedUserIds.length} Members)</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

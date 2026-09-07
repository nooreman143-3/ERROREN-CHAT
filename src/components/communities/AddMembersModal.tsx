import React, { useState } from 'react';
import { User } from '../../types';
import { Avatar } from '../common/Avatar';
import { UserPlus, X, Search, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  allUsers: User[];
  currentMemberIds: string[];
  currentUser: User | null;
  onMembersAdded: () => void;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  communityId,
  communityName,
  allUsers,
  currentMemberIds,
  currentUser,
  onMembersAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableUsers = allUsers.filter(
    (u) => !currentMemberIds.includes(u.id) && u.id !== currentUser?.id
  );

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.phoneNumber?.includes(q);
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0 || !currentUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/communities/${communityId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          userIds: selectedUserIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add members');
      }

      onMembersAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding members:', err);
      setError(err.message || 'Network error adding members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0C1017] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 flex flex-col max-h-[85vh]"
        id="add-members-modal"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Members</h3>
              <p className="text-[11px] text-slate-400">To {communityName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users to add..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Selected Counter */}
        {selectedUserIds.length > 0 && (
          <div className="text-xs text-emerald-400 font-semibold px-1">
            {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px] max-h-[320px]">
          {filteredUsers.map((u) => {
            const isSelected = selectedUserIds.includes(u.id);
            return (
              <div
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800/70 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={u.avatarUrl} name={u.displayName} size="sm" isOnline={u.isOnline} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{u.displayName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{u.phoneNumber || u.about || 'User'}</div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              {availableUsers.length === 0 ? 'All users are already members of this community.' : 'No users match your search.'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting || selectedUserIds.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-40 shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Selected ({selectedUserIds.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

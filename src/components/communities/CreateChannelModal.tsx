import React, { useState } from 'react';
import { User, Channel } from '../../types';
import { Megaphone, X, Loader2, Lock, Globe, Shield } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  currentUser: User | null;
  onChannelCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  communityId,
  communityName,
  currentUser,
  onChannelCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Channel name is required.');
      return;
    }
    if (!currentUser) {
      setError('You must be signed in to create a channel.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/communities/${communityId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          creatorId: currentUser.id,
          isReadOnly,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create channel');
      }

      onChannelCreated(data.channel);
      onClose();
    } catch (err: any) {
      console.error('Error creating channel:', err);
      setError(err.message || 'Network error creating channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0C1017] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100"
        id="create-channel-modal"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Channel</h3>
              <p className="text-[11px] text-slate-400">Inside {communityName}</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Channel Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Announcements, Updates, Job Board"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              id="input-channel-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Channel Description
            </label>
            <textarea
              rows={2}
              maxLength={250}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this channel..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none transition"
              id="input-channel-description"
            />
          </div>

          {/* Posting Permissions Switch */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Channel Mode</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReadOnly(!isReadOnly)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                  isReadOnly
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isReadOnly ? 'Broadcast (Only Admins Post)' : 'Discussion (All Members Post)'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {isReadOnly 
                ? 'Only community admins can publish posts. All members can view and react.' 
                : 'Any community member can publish posts and share updates in this channel.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Create Channel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

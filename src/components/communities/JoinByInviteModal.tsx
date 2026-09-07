import React, { useState } from 'react';
import { User, Community } from '../../types';
import { Avatar } from '../common/Avatar';
import { Link, X, Loader2, Check, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface JoinByInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onCommunityJoined: (community: Community) => void;
}

export const JoinByInviteModal: React.FC<JoinByInviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCommunityJoined,
}) => {
  const [inviteInput, setInviteInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previewCommunity, setPreviewCommunity] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const extractCode = (raw: string) => {
    let clean = raw.trim();
    if (clean.includes('/join/')) {
      clean = clean.split('/join/')[1];
    } else if (clean.includes('code=')) {
      clean = clean.split('code=')[1].split('&')[0];
    }
    return clean;
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractCode(inviteInput);
    if (!code) {
      setError('Please paste a valid invite code or link.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setPreviewCommunity(null);

    try {
      const response = await apiFetch(`/api/invites/${encodeURIComponent(code)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Community not found or invite is expired.');
      }
      setPreviewCommunity(data);
    } catch (err: any) {
      console.error('Invite lookup failed:', err);
      setError(err.message || 'Could not find community with that invite code.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!previewCommunity || !currentUser) return;

    setIsJoining(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/communities/${previewCommunity.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join community.');
      }

      onCommunityJoined(data.community);
      onClose();
    } catch (err: any) {
      console.error('Error joining community:', err);
      setError(err.message || 'Failed to join community.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0C1017] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100"
        id="join-invite-modal"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Join via Invite Code</h3>
              <p className="text-[11px] text-slate-400">Paste code or link to join community</p>
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

        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Invite Link or Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="e.g. comm_inv_8x92a or https://..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                type="submit"
                disabled={isSearching || !inviteInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>
        </form>

        {/* Preview Card */}
        {previewCommunity && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <Avatar
                src={previewCommunity.avatarUrl}
                name={previewCommunity.name}
                size="lg"
                isGroup
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{previewCommunity.name}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Users className="w-3 h-3" />
                    {previewCommunity.memberCount} members
                  </span>
                  <span>•</span>
                  <span>By {previewCommunity.creatorName}</span>
                </div>
              </div>
            </div>

            {previewCommunity.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                {previewCommunity.description}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Community...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Join this Community</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

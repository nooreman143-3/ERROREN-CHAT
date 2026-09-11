import React, { useState, useRef } from 'react';
import { User, Community } from '../../types';
import { Avatar } from '../common/Avatar';
import { apiFetch } from '../../utils/api';
import { createCommunityInSupabase, isSupabaseConfigured } from '../../services/supabaseChat';
import { 
  Users, 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Globe, 
  Lock 
} from 'lucide-react';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onCommunityCreated: (community: Community) => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCommunityCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRandomAvatar = () => {
    const seed = name.trim() || `community_${Date.now()}`;
    setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Community name is required.');
      return;
    }
    if (!currentUser) {
      setError('You must be signed in to create a community.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const communityAvatar = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`;

    const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Supabase first
    if (isSupabaseConfigured()) {
      try {
        const sbComm = await createCommunityInSupabase({
          id: commId,
          name: name.trim(),
          description: description.trim(),
          avatarUrl: communityAvatar,
          creatorId: currentUser.id,
        });
        if (sbComm) {
          onCommunityCreated(sbComm);
          onClose();
          return;
        }
      } catch (err: any) {
        console.warn('[CreateCommunityModal] Supabase creation error:', err);
      }
    }

    try {
      const response = await apiFetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          avatarUrl: communityAvatar,
          creatorId: currentUser.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.community) {
          onCommunityCreated(data.community);
          onClose();
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend unavailable, using static fallback for community:', err);
    }

    // Static / Offline fallback (e.g. GitHub Pages)
    const fallbackCommunity: Community = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim() || 'Welcome to our ERROREN community!',
      avatarUrl: communityAvatar,
      creatorId: currentUser.id,
      adminIds: [currentUser.id],
      memberIds: [currentUser.id],
      members: [{ userId: currentUser.id, role: 'owner', joinedAt: Date.now() }],
      groupIds: [],
      channelIds: [],
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      memberCount: 1,
      isJoined: true,
      channels: [
        {
          id: `chan_gen_${Date.now()}`,
          name: 'general',
          description: 'General discussion for community members',
          type: 'text',
          createdAt: Date.now(),
        },
        {
          id: `chan_ann_${Date.now()}`,
          name: 'announcements',
          description: 'Official announcements from admins',
          type: 'announcement',
          createdAt: Date.now(),
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('erroren_communities') || '[]');
      localStorage.setItem('erroren_communities', JSON.stringify([fallbackCommunity, ...existing]));
    } catch {}

    onCommunityCreated(fallbackCommunity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0C1017] border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto"
        id="create-community-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">New Community</h3>
              <p className="text-xs text-slate-400">Create a real space for groups, channels & members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition"
            id="btn-close-create-community"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar / Photo Picker */}
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <div className="relative group">
              <Avatar
                src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || 'new_community')}`}
                name={name || 'Community'}
                size="2xl"
                isGroup
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-white text-[10px] font-medium"
                title="Change Community DP"
              >
                <Camera className="w-6 h-6 mb-1 text-emerald-400" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload Photo</span>
              </button>
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Generate Icon</span>
              </button>
            </div>
          </div>

          {/* Community Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Community Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flutter & React Native Developers"
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
              id="input-community-name"
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Community Description
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe topics, rules, and discussion goals for your community members..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none shadow-inner"
              id="input-community-description"
            />
          </div>

          {/* Default Features Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Automatic Community Provisioning</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
              <li>Includes a dedicated <strong>#Announcements</strong> channel for official updates.</li>
              <li>Generates an instant <strong>Invite Link</strong> to share with members.</li>
              <li>Enables creating and attaching unlimited discussion groups.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              id="btn-cancel-create-community"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              id="btn-submit-create-community"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating in Database...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Create Community</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

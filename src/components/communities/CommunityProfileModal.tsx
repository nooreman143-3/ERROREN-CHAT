import React, { useState, useEffect, useRef } from 'react';
import { User, Community, Chat, Channel, CommunityRole } from '../../types';
import { Avatar } from '../common/Avatar';
import { CreateChannelModal } from './CreateChannelModal';
import { ChannelViewModal } from './ChannelViewModal';
import { AddMembersModal } from './AddMembersModal';
import { toast } from '../common/Toast';

const safeConfirm = (message: string): boolean => {
  try {
    return window.confirm(message);
  } catch (e) {
    return true;
  }
};
import { 
  Users, 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageSquare, 
  Megaphone, 
  Plus, 
  ShieldCheck, 
  Crown, 
  Shield, 
  UserMinus, 
  Trash2, 
  LogOut, 
  Settings, 
  Edit3, 
  Camera, 
  ChevronRight, 
  Link, 
  Sparkles, 
  Loader2, 
  MoreVertical 
} from 'lucide-react';

interface CommunityProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  currentUser: User | null;
  allUsers: User[];
  allChats: Chat[];
  onSelectChat: (chatId: string) => void;
  onCommunityUpdated?: (comm: Community) => void;
  onCommunityDeleted?: (commId: string) => void;
}

export const CommunityProfileModal: React.FC<CommunityProfileModalProps> = ({
  isOpen,
  onClose,
  communityId,
  currentUser,
  allUsers,
  allChats,
  onSelectChat,
  onCommunityUpdated,
  onCommunityDeleted,
}) => {
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'channels' | 'members' | 'settings'>('groups');
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-modals
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [selectedChannelForView, setSelectedChannelForView] = useState<Channel | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showLinkGroupModal, setShowLinkGroupModal] = useState(false);
  const [showCreateGroupInline, setShowCreateGroupInline] = useState(false);
  
  // Inline Create Group state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Edit Community State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = Boolean(currentUser && community?.creatorId === currentUser.id);
  const isAdmin = Boolean(currentUser && (isOwner || community?.adminIds?.includes(currentUser.id)));
  const isJoined = Boolean(currentUser && community?.members?.some((m) => m.userId === currentUser.id));

  const fetchCommunityDetails = async () => {
    if (!communityId) return;
    try {
      const url = currentUser ? `/api/communities/${communityId}?userId=${currentUser.id}` : `/api/communities/${communityId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCommunity(data);
        setEditName(data.name || '');
        setEditDesc(data.description || '');
        setEditAvatar(data.avatarUrl || '');
      } else {
        setError(data.error || 'Failed to load community details');
      }
    } catch (e: any) {
      console.error('Error loading community:', e);
      setError('Network error loading community');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !communityId) return;
    setIsLoading(true);
    fetchCommunityDetails();
  }, [isOpen, communityId, currentUser?.id]);

  if (!isOpen) return null;

  const handleCopyInviteLink = () => {
    if (!community) return;
    const inviteUrl = `${window.location.origin}/join/${community.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleJoinCommunity = async () => {
    if (!currentUser || !community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchCommunityDetails();
        if (onCommunityUpdated) onCommunityUpdated(data.community);
      }
    } catch (e) {
      console.error('Error joining:', e);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!currentUser || !community) return;
    if (isOwner) {
      toast.info('Community creators cannot leave their own community. You can delete it in Settings.');
      return;
    }
    if (!safeConfirm('Are you sure you want to leave this community?')) return;

    try {
      const res = await fetch(`/api/communities/${community.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchCommunityDetails();
        if (onCommunityUpdated) onCommunityUpdated(data.community);
      }
    } catch (e) {
      console.error('Error leaving:', e);
    }
  };

  const handleCreateGroupInsideCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser || !community) return;

    setIsCreatingGroup(true);
    try {
      const memberIds = (community.members || []).map((m) => m.userId);
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: currentUser.id,
          isGroup: true,
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newGroupName)}`,
          communityId: community.id,
          memberIds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewGroupName('');
        setNewGroupDesc('');
        setShowCreateGroupInline(false);
        fetchCommunityDetails();
        // Immediately select the created chat
        if (data.id) {
          onSelectChat(data.id);
          onClose();
        }
      }
    } catch (e) {
      console.error('Error creating group:', e);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleLinkGroup = async (groupId: string) => {
    if (!currentUser || !community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/link-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          requesterId: currentUser.id,
        }),
      });
      if (res.ok) {
        setShowLinkGroupModal(false);
        fetchCommunityDetails();
      }
    } catch (e) {
      console.error('Error linking group:', e);
    }
  };

  const handleUnlinkGroup = async (groupId: string) => {
    if (!currentUser || !community) return;
    if (!safeConfirm('Unlink this group from the community? (The group chat will remain active)')) return;

    try {
      await fetch(`/api/communities/${community.id}/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
      fetchCommunityDetails();
    } catch (e) {
      console.error('Error unlinking group:', e);
    }
  };

  const handleMemberRoleChange = async (targetUserId: string, newRole: 'admin' | 'member') => {
    if (!currentUser || !community || !isOwner) return;
    try {
      await fetch(`/api/communities/${community.id}/members/${targetUserId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          role: newRole,
        }),
      });
      fetchCommunityDetails();
    } catch (e) {
      console.error('Error changing role:', e);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!currentUser || !community || !isAdmin) return;
    if (!safeConfirm('Remove this member from the community?')) return;

    try {
      await fetch(`/api/communities/${community.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
      fetchCommunityDetails();
    } catch (e) {
      console.error('Error removing member:', e);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !community || !isAdmin) return;

    setIsSavingDetails(true);
    try {
      const res = await fetch(`/api/communities/${community.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          name: editName.trim(),
          description: editDesc.trim(),
          avatarUrl: editAvatar || community.avatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommunity(data.community);
        if (onCommunityUpdated) onCommunityUpdated(data.community);
        toast.success('Community details updated successfully!');
      }
    } catch (e) {
      console.error('Error updating community:', e);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!currentUser || !community || !isOwner) return;
    if (!safeConfirm(`Are you sure you want to PERMANENTLY DELETE the community "${community.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/communities/${community.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
      if (res.ok) {
        if (onCommunityDeleted) onCommunityDeleted(community.id);
        onClose();
      }
    } catch (e) {
      console.error('Error deleting community:', e);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Available groups for linking (groups user is admin/in that are not already linked)
  const unlinkedGroups = allChats.filter(
    (c) => c.isGroup && !(community?.groupIds || []).includes(c.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#0A0E15] border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[90vh] text-slate-100 overflow-hidden"
        id="community-profile-modal"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-xs">Loading community profile...</span>
          </div>
        ) : !community ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <Shield className="w-10 h-10 text-rose-400" />
            <p className="text-sm font-semibold text-rose-300">{error || 'Community not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header / Hero */}
            <div className="p-4 sm:p-6 bg-slate-900/80 border-b border-slate-800/90 flex-shrink-0 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar
                    src={community.avatarUrl}
                    name={community.name}
                    size="xl"
                    isGroup
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                        {community.name}
                      </h2>
                      {isOwner && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {community.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Bar (Invite Link + Join/Leave) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    {community.memberCount || community.members?.length || 0} members
                  </span>
                  <span>•</span>
                  <span>{(community.groups || []).length} groups</span>
                  <span>•</span>
                  <span>{(community.channels || []).length} channels</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                    title="Copy community invite link"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Invite Link</span>
                      </>
                    )}
                  </button>

                  {!isJoined ? (
                    <button
                      onClick={handleJoinCommunity}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/20"
                    >
                      Join Community
                    </button>
                  ) : !isOwner && (
                    <button
                      onClick={handleLeaveCommunity}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs font-semibold border border-slate-700 transition"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-t border-slate-800/70 pt-3">
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'groups'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Groups ({(community.groups || []).length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('channels')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'channels'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Channels ({(community.channels || []).length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'members'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Members ({community.members?.length || 0})</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'settings'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* --- GROUPS TAB --- */}
              {activeTab === 'groups' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Discussion Groups
                    </h3>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowLinkGroupModal(true)}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                          <Link className="w-3 h-3 text-cyan-400" />
                          <span>Link Existing</span>
                        </button>
                        <button
                          onClick={() => setShowCreateGroupInline(!showCreateGroupInline)}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Create Group</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Create Group Box */}
                  {showCreateGroupInline && (
                    <form
                      onSubmit={handleCreateGroupInsideCommunity}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3 animate-in fade-in"
                    >
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        <span>Create New Group in {community.name}</span>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Group Subject (e.g. Frontend Architecture)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newGroupDesc}
                          onChange={(e) => setNewGroupDesc(e.target.value)}
                          placeholder="Group topic or description (optional)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateGroupInline(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingGroup || !newGroupName.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-40"
                        >
                          {isCreatingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Create & Open</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Groups List */}
                  <div className="space-y-2">
                    {(community.groups || []).map((grp: any) => (
                      <div
                        key={grp.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 transition group"
                      >
                        <div
                          onClick={() => {
                            onSelectChat(grp.id);
                            onClose();
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <Avatar
                            src={grp.avatarUrl}
                            name={grp.title || grp.name || 'Group'}
                            size="md"
                            isGroup
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                              {grp.title || grp.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {grp.lastMessage?.content || 'Tap to open discussion'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {(grp.participantIds || grp.memberIds || []).length} members
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleUnlinkGroup(grp.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Unlink Group"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
                        </div>
                      </div>
                    ))}

                    {(community.groups || []).length === 0 && (
                      <div className="text-center py-10 text-slate-500 space-y-2">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-400">No discussion groups yet</p>
                        <p className="text-[11px] text-slate-500">
                          {isAdmin ? 'Create or link a group above to start discussions.' : 'Admins will add topic groups here.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- CHANNELS TAB --- */}
              {activeTab === 'channels' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Broadcast Channels
                    </h3>

                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateChannelModal(true)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Channel</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(community.channels || []).map((ch: any) => (
                      <div
                        key={ch.id}
                        onClick={() => setSelectedChannelForView(ch)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={ch.avatarUrl}
                            name={ch.name}
                            size="md"
                            isGroup
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                                {ch.name}
                              </span>
                              {ch.isReadOnly && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400 font-semibold border border-slate-700">
                                  Read-Only
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {ch.description || 'Tap to view posts and announcements'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30">
                            {ch.postsCount || 0} posts
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- MEMBERS TAB --- */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Members List ({community.members?.length || 0})
                    </h3>

                    {isAdmin && (
                      <button
                        onClick={() => setShowAddMembersModal(true)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/20"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Members</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(community.members || []).map((m: any) => {
                      const user = m.user || allUsers.find((u) => u.id === m.userId);
                      const isTargetOwner = m.role === 'owner' || community.creatorId === m.userId;
                      const isTargetAdmin = m.role === 'admin' || community.adminIds?.includes(m.userId);

                      return (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={user?.avatarUrl}
                              name={user?.displayName || 'User'}
                              size="sm"
                              isOnline={user?.isOnline}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">
                                  {user?.displayName || 'User'}
                                </span>
                                {isTargetOwner ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> Owner
                                  </span>
                                ) : isTargetAdmin ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-medium">Member</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {user?.phoneNumber || user?.about || 'Active Member'}
                              </div>
                            </div>
                          </div>

                          {/* Member actions for Owner/Admins */}
                          {isAdmin && m.userId !== currentUser?.id && !isTargetOwner && (
                            <div className="flex items-center gap-1.5">
                              {isOwner && (
                                <button
                                  onClick={() => handleMemberRoleChange(m.userId, isTargetAdmin ? 'member' : 'admin')}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition"
                                >
                                  {isTargetAdmin ? 'Dismiss Admin' : 'Make Admin'}
                                </button>
                              )}

                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                                title="Remove member"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- SETTINGS / MANAGE TAB --- */}
              {activeTab === 'settings' && isAdmin && (
                <div className="space-y-5">
                  <form onSubmit={handleSaveDetails} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit Community Info</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Community Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={isSavingDetails || !editName.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-40"
                      >
                        {isSavingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>

                  {/* Danger Zone */}
                  {isOwner && (
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-3">
                      <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        <span>Danger Zone</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Deleting this community will remove all connected channels and membership records. Discussion group chats will be preserved.
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteCommunity}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow"
                      >
                        Delete Community Permanently
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Channel Modal */}
        {community && (
          <CreateChannelModal
            isOpen={showCreateChannelModal}
            onClose={() => setShowCreateChannelModal(false)}
            communityId={community.id}
            communityName={community.name}
            currentUser={currentUser}
            onChannelCreated={() => {
              fetchCommunityDetails();
            }}
          />
        )}

        {/* Channel View Feed Modal */}
        {selectedChannelForView && community && (
          <ChannelViewModal
            isOpen={!!selectedChannelForView}
            onClose={() => setSelectedChannelForView(null)}
            channel={selectedChannelForView}
            community={community}
            currentUser={currentUser}
            onChannelUpdated={() => {
              fetchCommunityDetails();
            }}
          />
        )}

        {/* Add Members Modal */}
        {community && (
          <AddMembersModal
            isOpen={showAddMembersModal}
            onClose={() => setShowAddMembersModal(false)}
            communityId={community.id}
            communityName={community.name}
            allUsers={allUsers}
            currentMemberIds={(community.members || []).map((m) => m.userId)}
            currentUser={currentUser}
            onMembersAdded={() => {
              fetchCommunityDetails();
            }}
          />
        )}

        {/* Link Existing Group Modal */}
        {showLinkGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md bg-[#0C1017] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Link Group to Community</h3>
                </div>
                <button
                  onClick={() => setShowLinkGroupModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {unlinkedGroups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleLinkGroup(g.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={g.avatarUrl} name={g.title || g.name || 'Group'} size="sm" isGroup />
                      <div className="text-xs font-bold text-white truncate">{g.title || g.name}</div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">Link</span>
                  </div>
                ))}

                {unlinkedGroups.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No unlinked groups available. Create a new group above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

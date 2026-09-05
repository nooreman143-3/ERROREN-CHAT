import React, { useState, useEffect, useCallback } from 'react';
import { User, Chat, Community, Channel } from '../../types';
import { Avatar } from '../common/Avatar';
import { CreateCommunityModal } from './CreateCommunityModal';
import { CommunityProfileModal } from './CommunityProfileModal';
import { ChannelViewModal } from './ChannelViewModal';
import { JoinByInviteModal } from './JoinByInviteModal';
import { 
  Users, 
  Plus, 
  Megaphone, 
  MessageSquare, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  Search,
  ArrowRight,
  Link,
  Crown,
  Compass,
  Layers,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface CommunitiesViewProps {
  currentUser: User | null;
  chats: Chat[];
  allUsers?: User[];
  onSelectChat: (chatId: string) => void;
  onOpenNewGroup?: () => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  currentUser,
  chats,
  allUsers = [],
  onSelectChat,
  onOpenNewGroup,
}) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'explore' | 'channels'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [selectedChannelForView, setSelectedChannelForView] = useState<{ channel: Channel; community: Community | null } | null>(null);

  // Fetch communities from real backend
  const fetchCommunities = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const url = currentUser ? `/api/communities?userId=${currentUser.id}` : '/api/communities';
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        setCommunities(data);
      }
    } catch (err) {
      console.error('Error fetching communities from backend:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchCommunities();

    // Listen for WebSocket updates on communities
    const handleWsEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type?.startsWith('community:') ||
          data.type?.startsWith('channel:') ||
          data.type === 'chat:new'
        ) {
          fetchCommunities(true);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('message', handleWsEvent);
    return () => window.removeEventListener('message', handleWsEvent);
  }, [fetchCommunities]);

  const handleJoinToggle = async (commId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const comm = communities.find((c) => c.id === commId);
    if (!comm) return;

    const endpoint = comm.isJoined ? `/api/communities/${commId}/leave` : `/api/communities/${commId}/join`;

    // Optimistic update
    setCommunities((prev) =>
      prev.map((c) => {
        if (c.id === commId) {
          const nextJoined = !c.isJoined;
          return {
            ...c,
            isJoined: nextJoined,
            memberCount: nextJoined ? (c.memberCount || 1) + 1 : Math.max(1, (c.memberCount || 1) - 1),
          };
        }
        return c;
      })
    );

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      fetchCommunities(true);
    } catch (err) {
      console.error('Error joining/leaving community:', err);
      fetchCommunities(true);
    }
  };

  // Filter and search
  const filteredCommunities = communities.filter((comm) => {
    const matchesSearch =
      comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comm.groups || []).some((g) => (g.title || g.name || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
      (comm.channels || []).some((ch) => ch.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'my') {
      return comm.isJoined || comm.creatorId === currentUser?.id;
    }
    if (activeFilter === 'explore') {
      return !comm.isJoined && comm.creatorId !== currentUser?.id;
    }
    return true;
  });

  // Extract all channels for "channels" tab
  const allCommunityChannels = communities.flatMap((c) =>
    (c.channels || []).map((ch) => ({ ...ch, communityName: c.name, communityObj: c }))
  );

  const filteredChannels = allCommunityChannels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.communityName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-[#080B11] text-slate-100 overflow-y-auto p-3 sm:p-6 max-w-4xl mx-auto w-full select-text"
      id="communities-view-container"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              <span>Communities & Channels</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
              Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organize discussion groups, follow announcement channels, and collaborate.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
            id="btn-join-invite-code"
          >
            <Link className="w-3.5 h-3.5 text-cyan-400" />
            <span>Join with Code</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex-shrink-0"
            id="btn-new-community"
          >
            <Plus className="w-4 h-4" />
            <span>New Community</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities, groups, and channels..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
            id="input-search-communities"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-1 border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Communities ({communities.length})
            </button>

            <button
              onClick={() => setActiveFilter('my')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeFilter === 'my'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Joined ({communities.filter((c) => c.isJoined || c.creatorId === currentUser?.id).length})
            </button>

            <button
              onClick={() => setActiveFilter('explore')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeFilter === 'explore'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Explore Public
            </button>

            <button
              onClick={() => setActiveFilter('channels')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeFilter === 'channels'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Channels ({allCommunityChannels.length})
            </button>
          </div>

          <button
            onClick={() => fetchCommunities(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-xs">Loading real communities...</span>
        </div>
      ) : activeFilter === 'channels' ? (
        /* Channels View Tab */
        <div className="space-y-3">
          {filteredChannels.map((ch) => (
            <div
              key={ch.id}
              onClick={() => setSelectedChannelForView({ channel: ch, community: ch.communityObj })}
              className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition shadow-lg group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={ch.avatarUrl} name={ch.name} size="md" isGroup />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                        {ch.name}
                      </h4>
                      {ch.isReadOnly && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400 font-semibold">
                          Broadcast
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {ch.communityName} • {(ch.followerIds || []).length} followers
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30">
                    Open Channel
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                </div>
              </div>

              {ch.description && (
                <p className="text-xs text-slate-400 line-clamp-1 pl-12">
                  {ch.description}
                </p>
              )}
            </div>
          ))}

          {filteredChannels.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-xs">
              No channels found matching your search.
            </div>
          )}
        </div>
      ) : (
        /* Communities Cards List */
        <div className="space-y-4">
          {filteredCommunities.map((comm) => {
            const isCreator = currentUser?.id === comm.creatorId;
            const groups = comm.groups || [];
            const channels = comm.channels || [];

            return (
              <div
                key={comm.id}
                onClick={() => setSelectedCommunityId(comm.id)}
                className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-xl space-y-4 transition hover:border-slate-700 cursor-pointer group"
              >
                {/* Community Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      src={comm.avatarUrl}
                      name={comm.name}
                      size="lg"
                      isGroup
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition truncate">
                          {comm.name}
                        </h3>
                        {isCreator && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                            <Crown className="w-2.5 h-2.5" /> Owner
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-medium flex-shrink-0">
                          {comm.memberCount || comm.members?.length || 1} members
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {comm.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleJoinToggle(comm.id, e)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        comm.isJoined
                          ? 'bg-slate-800 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {comm.isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>

                {/* Sub-groups & Channels Preview */}
                <div className="pt-3 border-t border-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Community Topics & Channels</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 group-hover:underline flex items-center gap-0.5">
                      View all ({groups.length + channels.length}) <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Announcement Channels preview */}
                    {channels.slice(0, 2).map((ch) => (
                      <div
                        key={ch.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChannelForView({ channel: ch, community: comm });
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 hover:bg-slate-850 border border-slate-800/80 hover:border-emerald-500/40 transition group/item"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Megaphone className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover/item:text-emerald-300 truncate">
                              {ch.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {ch.isReadOnly ? 'Read-only announcements' : 'Discussion channel'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover/item:text-emerald-400 flex-shrink-0" />
                      </div>
                    ))}

                    {/* Group Chats Preview */}
                    {groups.slice(0, 2).map((grp) => (
                      <div
                        key={grp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChat(grp.id);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 hover:bg-slate-850 border border-slate-800/80 hover:border-emerald-500/40 transition group/item"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={grp.avatarUrl}
                            name={grp.title || grp.name || 'Group'}
                            size="xs"
                            isGroup
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover/item:text-emerald-300 truncate">
                              {grp.title || grp.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {grp.lastMessage?.content || 'Tap to open chat'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover/item:text-emerald-400 flex-shrink-0" />
                      </div>
                    ))}

                    {channels.length === 0 && groups.length === 0 && (
                      <div className="col-span-full py-2 text-center text-[11px] text-slate-500">
                        Tap to open community profile and create groups or channels.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCommunities.length === 0 && (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery ? `No communities match "${searchQuery}"` : 'No communities yet'}
              </p>
              <p className="text-xs text-slate-500">
                Create a new community or join via invite code to get started.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow transition"
              >
                Create Community
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onCommunityCreated={(newComm) => {
          fetchCommunities(true);
          setSelectedCommunityId(newComm.id);
        }}
      />

      {/* Join By Invite Modal */}
      <JoinByInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        currentUser={currentUser}
        onCommunityJoined={(comm) => {
          fetchCommunities(true);
          setSelectedCommunityId(comm.id);
        }}
      />

      {/* Community Profile Modal */}
      {selectedCommunityId && (
        <CommunityProfileModal
          isOpen={!!selectedCommunityId}
          onClose={() => setSelectedCommunityId(null)}
          communityId={selectedCommunityId}
          currentUser={currentUser}
          allUsers={allUsers}
          allChats={chats}
          onSelectChat={onSelectChat}
          onCommunityUpdated={() => fetchCommunities(true)}
          onCommunityDeleted={() => {
            setSelectedCommunityId(null);
            fetchCommunities(true);
          }}
        />
      )}

      {/* Channel View Feed Modal */}
      {selectedChannelForView && (
        <ChannelViewModal
          isOpen={!!selectedChannelForView}
          onClose={() => setSelectedChannelForView(null)}
          channel={selectedChannelForView.channel}
          community={selectedChannelForView.community}
          currentUser={currentUser}
          onChannelUpdated={() => fetchCommunities(true)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ChannelPost, Community } from '../../types';
import { Avatar } from '../common/Avatar';
import { apiFetch } from '../../utils/api';
import { 
  Megaphone, 
  X, 
  Send, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Heart, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Lock, 
  Globe, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface ChannelViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  community: Community | null;
  currentUser: User | null;
  onChannelUpdated?: (channel: Channel) => void;
}

export const ChannelViewModal: React.FC<ChannelViewModalProps> = ({
  isOpen,
  onClose,
  channel,
  community,
  currentUser,
  onChannelUpdated,
}) => {
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Check if current user is admin in this channel or community
  const isChannelAdmin = Boolean(
    currentUser && (
      channel?.creatorId === currentUser.id ||
      channel?.adminIds?.includes(currentUser.id) ||
      community?.creatorId === currentUser.id ||
      community?.adminIds?.includes(currentUser.id)
    )
  );

  const canPost = !channel?.isReadOnly || isChannelAdmin;

  useEffect(() => {
    if (!isOpen || !channel) return;

    setIsFollowing(Boolean(currentUser && channel.followerIds?.includes(currentUser.id)));
    setFollowerCount(channel.followerIds?.length || 0);

    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(`/api/channels/${channel.id}/posts`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setPosts(data);
        }
      } catch (err) {
        console.error('Error fetching channel posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();

    // Listen to WebSocket events for real-time posts
    const handleWsEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'channel:post:new' && data.channelId === channel.id) {
          setPosts((prev) => [data.post, ...prev.filter((p) => p.id !== data.post.id)]);
        } else if (data.type === 'channel:post:updated' && data.channelId === channel.id) {
          setPosts((prev) => prev.map((p) => (p.id === data.post.id ? data.post : p)));
        } else if (data.type === 'channel:post:deleted' && data.channelId === channel.id) {
          setPosts((prev) => prev.filter((p) => p.id !== data.postId));
        }
      } catch (e) {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleWsEvent);
    return () => window.removeEventListener('message', handleWsEvent);
  }, [isOpen, channel?.id, currentUser?.id]);

  if (!isOpen || !channel) return null;

  const handleToggleFollow = async () => {
    if (!currentUser) return;
    const endpoint = isFollowing ? `/api/channels/${channel.id}/leave` : `/api/channels/${channel.id}/join`;
    
    // Optimistic update
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setFollowerCount((prev) => nextFollowing ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok && onChannelUpdated) {
        onChannelUpdated(data.channel);
      }
    } catch (e) {
      console.error('Error following channel:', e);
      // Revert optimistic update
      setIsFollowing(!nextFollowing);
      setFollowerCount((prev) => !nextFollowing ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Media exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!postContent.trim() && !mediaUrl) || !currentUser) return;

    setIsPublishing(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/channels/${channel.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          title: postTitle.trim() || undefined,
          content: postContent.trim(),
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaUrl ? 'image' : undefined,
          linkUrl: linkUrl.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish post');
      }

      setPosts((prev) => [data.post, ...prev]);
      setPostTitle('');
      setPostContent('');
      setMediaUrl('');
      setLinkUrl('');
      setShowLinkInput(false);
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setError(err.message || 'Error publishing post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentLikes = p.likes || [];
          const hasLiked = currentLikes.includes(currentUser.id);
          const newLikes = hasLiked
            ? currentLikes.filter((id) => id !== currentUser.id)
            : [...currentLikes, currentUser.id];
          return { ...p, likes: newLikes };
        }
        return p;
      })
    );

    try {
      await apiFetch(`/api/channels/${channel.id}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this channel post?')) return;

    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await apiFetch(`/api/channels/${channel.id}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#0A0E15] border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[90vh] text-slate-100 overflow-hidden"
        id="channel-view-modal"
      >
        {/* Channel Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/90 bg-slate-900/60 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar
              src={channel.avatarUrl}
              name={channel.name}
              size="md"
              isGroup
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-emerald-400" />
                  <span>{channel.name}</span>
                </h3>
                {channel.isReadOnly && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-700">
                    Broadcast
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {community ? `${community.name} • ` : ''}{followerCount} followers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser && (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Channel Description Banner */}
        {channel.description && (
          <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/60 text-xs text-slate-300 flex items-center justify-between gap-2 flex-shrink-0">
            <span className="truncate">{channel.description}</span>
          </div>
        )}

        {/* Posts Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Loading channel posts...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Megaphone className="w-8 h-8 mx-auto text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-400">No posts in this channel yet</p>
              <p className="text-xs text-slate-500">
                {canPost
                  ? 'Be the first to share an announcement or update!'
                  : 'Updates from community admins will appear here.'}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const hasLiked = currentUser && post.likes?.includes(currentUser.id);
              const isAuthor = currentUser && post.authorId === currentUser.id;
              const canDelete = isAuthor || isChannelAdmin;

              return (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-xl space-y-3 transition hover:border-slate-700"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={post.authorAvatar}
                        name={post.authorName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{post.authorName}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Post Title */}
                  {post.title && (
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {post.title}
                    </h4>
                  )}

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* Media Attachment */}
                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-80 bg-black/40">
                      <img
                        src={post.mediaUrl}
                        alt="Channel Media"
                        className="w-full h-full object-contain max-h-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Link Attachment */}
                  {post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-emerald-400 hover:text-emerald-300 transition truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{post.linkUrl}</span>
                    </a>
                  )}

                  {/* Post Footer & Reactions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                        hasLiked
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          hasLiked ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span>{(post.likes || []).length}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Post Composer */}
        {canPost ? (
          <form
            onSubmit={handleCreatePost}
            className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-900/90 space-y-2.5 flex-shrink-0"
          >
            {error && (
              <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-900/60">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Post title (optional)..."
                className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-start gap-2">
              <textarea
                rows={2}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write a message or announcement for this channel..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Media Preview if uploaded */}
            {mediaUrl && (
              <div className="relative inline-block">
                <img
                  src={mediaUrl}
                  alt="Attachment Preview"
                  className="h-16 w-16 object-cover rounded-xl border border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Link Input field */}
            {showLinkInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/link..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLinkUrl('');
                    setShowLinkInput(false);
                  }}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 transition"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
                  title="Add Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isPublishing || (!postContent.trim() && !mediaUrl)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-40 shadow-md shadow-emerald-500/20"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Publish Post</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>This is a read-only broadcast channel. Only community admins can post.</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Chat, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { formatTime } from '../../utils/audio';
import { 
  Search, 
  Pin, 
  VolumeX, 
  Check, 
  CheckCheck, 
  Image as ImageIcon, 
  Mic, 
  FileText, 
  MoreVertical,
  Trash2,
  Archive,
  Eye,
  MessageSquare,
  Users
} from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  currentUserId: string;
  onPinChat: (chatId: string) => void;
  onMuteChat: (chatId: string) => void;
  onArchiveChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onMarkUnread: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  currentUserId,
  onPinChat,
  onMuteChat,
  onArchiveChat,
  onDeleteChat,
  onMarkUnread,
}) => {
  const { onlineUserIds, typingUsers } = useSocket();
  const { currentAccent } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [menuChatId, setMenuChatId] = useState<string | null>(null);

  // Filtered & Sorted Chats
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      // Filter out archived
      if (chat.isArchived) return false;

      // Filter tabs
      if (activeFilter === 'unread' && (!chat.unreadCount || chat.unreadCount === 0)) return false;
      if (activeFilter === 'groups' && !chat.isGroup) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (chat.title || chat.name || '').toLowerCase().includes(q);
        const lastMsgMatch = chat.lastMessage?.content?.toLowerCase()?.includes(q);
        return Boolean(titleMatch || lastMsgMatch);
      }
      return true;
    }).sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [chats, searchQuery, activeFilter]);

  const getPartnerStatus = (chat: Chat) => {
    if (chat.isGroup) return false;
    const partnerId = (chat.participantIds || chat.memberIds || []).find(id => id !== currentUserId);
    return partnerId ? onlineUserIds.has(partnerId) : false;
  };

  const renderStatusIcon = (status?: string) => {
    if (status === 'read') return <CheckCheck className="w-3.5 h-3.5" style={{ color: currentAccent.textColor }} />;
    if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    if (status === 'sent') return <Check className="w-3.5 h-3.5 text-slate-400" />;
    return null;
  };

  const renderLastMessagePreview = (chat: Chat) => {
    const isTyping = typingUsers[chat.id];
    if (isTyping) {
      return (
        <span 
          className="font-medium animate-pulse flex items-center gap-1 text-xs"
          style={{ color: currentAccent.textColor }}
        >
          <span>{isTyping} is typing...</span>
        </span>
      );
    }

    const lastMsg = chat.lastMessage;
    if (!lastMsg) {
      return <span className="text-slate-500 italic text-xs">No messages yet</span>;
    }

    const isMine = lastMsg.senderId === currentUserId;

    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-full">
        {isMine && renderStatusIcon(lastMsg.status)}
        {lastMsg.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
        {lastMsg.type === 'voice' && (
          <Mic className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentAccent.textColor }} />
        )}
        {lastMsg.type === 'document' && <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
        <span className="truncate">
          {chat.isGroup && !isMine && lastMsg.senderName ? `${lastMsg.senderName.split(' ')[0]}: ` : ''}
          {lastMsg.content}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-slate-950/60 border-r border-slate-800/80 flex-shrink-0">
      {/* Search & Filter Header */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, contacts, or messages..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent transition"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5">
          {(['all', 'unread', 'groups'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition ${
                activeFilter === filter
                  ? 'shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              style={{
                backgroundColor: activeFilter === filter ? currentAccent.hex : undefined,
                color: activeFilter === filter ? currentAccent.foreground : undefined,
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <MessageSquare className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">No chats found</p>
            <p className="text-[11px] text-slate-600 mt-1">
              {searchQuery ? 'Try another search query' : 'Start a new conversation to begin'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            const isOnline = getPartnerStatus(chat);

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`relative flex items-center gap-3 p-3.5 cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-slate-800/80 border-l-4'
                    : 'hover:bg-slate-900/60'
                }`}
                style={{
                  borderLeftColor: isSelected ? currentAccent.hex : 'transparent',
                }}
              >
                {/* Avatar */}
                <Avatar
                  src={chat.avatarUrl}
                  name={chat.title || chat.name || 'Chat'}
                  size="md"
                  isGroup={chat.isGroup}
                  isOnline={isOnline}
                  showOnlineStatus={!chat.isGroup}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {chat.title || chat.name || 'Chat'}
                      </span>
                      {chat.isGroup && (
                        <span className="p-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono">
                          GRP
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
                      {chat.updatedAt ? formatTime(chat.updatedAt) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {renderLastMessagePreview(chat)}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {chat.isPinned && (
                        <Pin 
                          className="w-3 h-3 rotate-45"
                          style={{
                            color: currentAccent.textColor,
                            fill: `${currentAccent.hex}30`,
                          }}
                        />
                      )}
                      {chat.isMuted && (
                        <VolumeX className="w-3 h-3 text-slate-500" />
                      )}
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <span
                          className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm"
                          style={{
                            backgroundColor: currentAccent.hex,
                            color: currentAccent.foreground,
                          }}
                        >
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* More Action Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuChatId(menuChatId === chat.id ? null : chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Chat Context Dropdown */}
                {menuChatId === chat.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuChatId(null);
                      }}
                    />
                    <div className="absolute right-4 top-10 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPinChat(chat.id);
                          setMenuChatId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <Pin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{chat.isPinned ? 'Unpin Chat' : 'Pin to Top'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMuteChat(chat.id);
                          setMenuChatId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                        <span>{chat.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveChat(chat.id);
                          setMenuChatId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <Archive className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Archive Chat</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkUnread(chat.id);
                          setMenuChatId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Mark as Unread</span>
                      </button>

                      <div className="my-1 border-t border-slate-800" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                          setMenuChatId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Chat</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, User, MessageType } from '../../types';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { WallpaperModal, WALLPAPER_PRESETS } from '../settings/WallpaperModal';
import { toast } from '../common/Toast';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  ArrowLeft, 
  Lock, 
  Search, 
  Info, 
  Trash2, 
  VolumeX, 
  ShieldCheck,
  ChevronDown,
  Palette
} from 'lucide-react';

interface ChatConversationProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (content: string, type: MessageType, mediaUrl?: string, replyTo?: any, fileName?: string, fileSize?: string, duration?: number) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void;
  onStarMessage: (messageId: string) => void;
  onClearChat: (chatId: string) => void;
  onOpenInfo: () => void;
  allUsers: User[];
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  chat,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  onReactMessage,
  onEditMessage,
  onDeleteMessage,
  onStarMessage,
  onClearChat,
  onOpenInfo,
  allUsers,
}) => {
  const { onlineUserIds, typingUsers, startCall, sendTyping } = useSocket();
  const { getEffectiveWallpaper, currentAccent } = useTheme();
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers[chat.id]]);

  // Find partner for direct 1-on-1 chat
  const partnerId = (chat.participantIds || chat.memberIds || []).find((id) => id !== currentUserId);
  const partnerUser = allUsers.find((u) => u.id === partnerId);
  const isOnline = partnerId ? onlineUserIds.has(partnerId) : false;
  const isTyping = typingUsers[chat.id];

  const handleStartAudioCall = () => {
    if (chat.isGroup) {
      toast.info('Group audio calls are supported in 1-on-1 direct rooms currently.');
      return;
    }
    if (partnerUser) {
      startCall(partnerUser.id, partnerUser.displayName, partnerUser.avatarUrl, 'audio');
    }
  };

  const handleStartVideoCall = () => {
    if (chat.isGroup) {
      toast.info('Group video calls are supported in 1-on-1 direct rooms currently.');
      return;
    }
    if (partnerUser) {
      startCall(partnerUser.id, partnerUser.displayName, partnerUser.avatarUrl, 'video');
    }
  };

  // Filter messages if search inside chat is active
  const displayedMessages = searchInChat.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchInChat.toLowerCase()))
    : messages;

  const currentWallpaper = getEffectiveWallpaper(chat.id);

  // Wallpaper styles & custom background image handler
  const getWallpaperStyles = (): React.CSSProperties | undefined => {
    if (currentWallpaper.startsWith('data:image') || currentWallpaper.startsWith('http')) {
      return {
        backgroundImage: `url(${currentWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return undefined;
  };

  const getWallpaperBackground = () => {
    if (currentWallpaper.startsWith('data:image') || currentWallpaper.startsWith('http')) {
      return 'bg-slate-950';
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === currentWallpaper);
    return preset?.className || 'bg-[#070A0F] bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px]';
  };

  const chatTitle = chat.title || chat.name || 'Chat';
  const memberCount = (chat.participantIds || chat.memberIds || []).length;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950 overflow-hidden relative">
      {/* Chat Top Header */}
      <header className="h-16 px-3 sm:px-4 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar and Header Info */}
          <div
            onClick={onOpenInfo}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition min-w-0"
          >
            <Avatar
              src={chat.avatarUrl}
              name={chatTitle}
              size="md"
              isGroup={chat.isGroup}
              isOnline={isOnline}
              showOnlineStatus={!chat.isGroup}
            />

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate">
                {chatTitle}
              </h3>
              <div className="text-[11px] truncate">
                {isTyping ? (
                  <span 
                    className="font-semibold animate-pulse"
                    style={{ color: currentAccent.textColor }}
                  >
                    {isTyping} is typing...
                  </span>
                ) : chat.isGroup ? (
                  <span className="text-slate-400">
                    {memberCount} members
                  </span>
                ) : isOnline ? (
                  <span 
                    className="font-medium"
                    style={{ color: currentAccent.textColor }}
                  >
                    Online
                  </span>
                ) : (
                  <span className="text-slate-400">Offline</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Actions: Audio Call, Video Call, Search, Info/Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!chat.isGroup && (
            <>
              <button
                onClick={handleStartAudioCall}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={handleStartVideoCall}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowSearchBox(!showSearchBox)}
            className={`p-2.5 rounded-xl border transition ${
              showSearchBox
                ? ''
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
            }`}
            style={{
              backgroundColor: showSearchBox ? currentAccent.softBg : undefined,
              borderColor: showSearchBox ? currentAccent.border : undefined,
              color: showSearchBox ? currentAccent.textColor : undefined,
            }}
            title="Search in Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      onOpenInfo();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{chat.isGroup ? 'Group Info' : 'Contact Info'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowWallpaperModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 transition"
                  >
                    <Palette className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chat Wallpaper</span>
                  </button>

                  <button
                    onClick={() => {
                      onClearChat(chat.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Messages</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* In-Chat Search Banner */}
      {showSearchBox && (
        <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 z-10">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            placeholder="Filter messages in this chat..."
            className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500"
            autoFocus
          />
          {searchInChat && (
            <button onClick={() => setSearchInChat('')} className="text-xs text-slate-400 hover:text-white px-2">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area with custom wallpaper */}
      <div 
        className={`flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-1 relative ${getWallpaperBackground()}`}
        style={getWallpaperStyles()}
      >
        {/* Subtle readability overlay if image wallpaper is used */}
        {getWallpaperStyles() && (
          <div className="absolute inset-0 bg-slate-950/40 pointer-events-none backdrop-brightness-95" />
        )}

        {/* End-to-end encryption banner */}
        <div className="flex justify-center my-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/85 border border-slate-800/80 text-slate-300 text-[11px] backdrop-blur-md shadow-xs select-none">
            <Lock className="w-3 h-3" style={{ color: currentAccent.textColor }} />
            <span>Messages are encrypted & synced real-time</span>
          </div>
        </div>

        {/* Message Stream or Empty State */}
        {displayedMessages.length === 0 ? (
          <div className="relative z-10 py-12 flex flex-col items-center justify-center text-center px-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-lg">
              <Avatar
                src={chat.avatarUrl}
                name={chatTitle}
                size="lg"
                isGroup={chat.isGroup}
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">No messages yet</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Send a message, photo, voice note, or location to start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <div className="relative z-10 space-y-1">
            {displayedMessages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  onReact={onReactMessage}
                  onReply={(m) => setReplyToMessage(m)}
                  onEdit={(m) => setEditingMessage(m)}
                  onDelete={onDeleteMessage}
                  onStar={onStarMessage}
                />
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Wallpaper Picker Modal for this chat */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        targetChatId={chat.id}
        targetChatTitle={chatTitle}
      />

      {/* Bottom Message Composer */}
      <MessageComposer
        chatId={chat.id}
        onSendMessage={onSendMessage}
        onSendTyping={(isTyping) => sendTyping(chat.id, isTyping)}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        editingMessage={editingMessage}
        onSaveEdit={(msgId, newText) => {
          onEditMessage(msgId, newText);
          setEditingMessage(null);
        }}
        onCancelEdit={() => setEditingMessage(null)}
        lastPartnerMessage={messages.filter(m => m.senderId !== currentUserId).pop()?.content}
      />
    </div>
  );
};

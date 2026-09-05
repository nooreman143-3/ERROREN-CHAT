import React, { useState, useRef } from 'react';
import { Message, Reaction } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatDuration } from '../../utils/audio';
import { 
  Check, 
  CheckCheck, 
  Play, 
  Pause, 
  FileText, 
  Download, 
  Star, 
  Smile, 
  Reply, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Copy,
  Clock,
  MapPin,
  ExternalLink,
  Video as VideoIcon
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onStar: (messageId: string) => void;
}

const quickEmojis = ['👍', '❤️', '🔥', '😂', '😮', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onStar,
}) => {
  const { currentAccent, isDark } = useTheme();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlayingAudio(true);
    }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce((acc: Record<string, number>, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const renderStatus = () => {
    if (!isMine) return null;
    if (message.status === 'read') return <CheckCheck className="w-3.5 h-3.5" style={{ color: currentAccent.textColor }} />;
    if (message.status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    if (message.status === 'sent') return <Check className="w-3.5 h-3.5 text-slate-400" />;
    return <Clock className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div
      className={`group relative flex flex-col my-1.5 px-3 select-text ${
        isMine ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowMenu(false);
      }}
    >
      {/* Sender name for group chats if received */}
      {!isMine && message.senderName && (
        <span 
          className="text-[11px] font-semibold ml-2 mb-0.5"
          style={{ color: currentAccent.textColor }}
        >
          {message.senderName}
        </span>
      )}

      {/* Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Hover Quick Actions Bar */}
        {showActions && (
          <div
            className={`absolute top-[-26px] z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-full px-2 py-0.5 backdrop-blur-md shadow-lg ${
              isMine ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick React Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-400 hover:text-amber-400 transition"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Reply Button */}
            <button
              onClick={() => onReply(message)}
              className="p-1 text-slate-400 transition"
              style={{ color: undefined }}
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* Star Button */}
            <button
              onClick={() => onStar(message.id)}
              className="p-1 text-slate-400 hover:text-yellow-400 transition"
              title="Star"
            >
              <Star className={`w-3.5 h-3.5 ${message.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>

            {/* More Menu */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-white transition"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Selector Popup */}
        {showEmojiPicker && (
          <div
            className={`absolute top-[-60px] z-30 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-full px-2.5 py-1.5 shadow-2xl animate-in fade-in ${
              isMine ? 'right-0' : 'left-0'
            }`}
          >
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-125 transition text-base px-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* More Actions Dropdown Menu */}
        {showMenu && (
          <div
            className={`absolute top-0 z-30 w-36 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 animate-in fade-in ${
              isMine ? 'right-0' : 'left-0'
            }`}
          >
            <button
              onClick={copyContent}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </button>

            {isMine && message.type === 'text' && (
              <button
                onClick={() => {
                  onEdit(message);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={() => {
                onDelete(message.id, false);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Delete for me</span>
            </button>

            {isMine && (
              <button
                onClick={() => {
                  onDelete(message.id, true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for everyone</span>
              </button>
            )}
          </div>
        )}

        {/* Bubble Core */}
        <div
          className={`relative rounded-3xl p-3.5 shadow-md ${
            isMine
              ? 'rounded-tr-sm text-slate-100'
              : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-tl-sm'
          }`}
          style={
            isMine
              ? {
                  backgroundColor: isDark ? `${currentAccent.hex}22` : currentAccent.hex,
                  borderColor: isDark ? `${currentAccent.hex}55` : 'transparent',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: isDark ? '#F1F5F9' : currentAccent.foreground,
                }
              : undefined
          }
        >
          {/* Replied Message Header Preview */}
          {message.replyTo && (
            <div 
              className="mb-2 p-2 rounded-xl bg-slate-950/50 border-l-4 text-xs"
              style={{ borderLeftColor: currentAccent.hex }}
            >
              <div 
                className="font-bold text-[11px]"
                style={{ color: currentAccent.textColor }}
              >
                {message.replyTo.senderName}
              </div>
              <div className="text-slate-400 truncate text-[11px] mt-0.5">
                {message.replyTo.content}
              </div>
            </div>
          )}

          {/* Media: Image */}
          {message.type === 'image' && message.mediaUrl && (
            <div className="mb-2 rounded-2xl overflow-hidden max-w-sm max-h-72 border border-slate-700/50">
              <img
                src={message.mediaUrl}
                alt="Shared media"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Media: Video */}
          {message.type === 'video' && message.mediaUrl && (
            <div className="mb-2 rounded-2xl overflow-hidden max-w-sm max-h-72 border border-slate-700/50 bg-black">
              <video
                src={message.mediaUrl}
                controls
                className="w-full h-full rounded-2xl max-h-72"
              />
            </div>
          )}

          {/* Location Message */}
          {message.type === 'location' && (
            <div 
              className="mb-2 p-3 rounded-2xl bg-slate-950/70 border max-w-sm space-y-2"
              style={{ borderColor: currentAccent.border }}
            >
              <div 
                className="flex items-center gap-2 text-xs font-bold"
                style={{ color: currentAccent.textColor }}
              >
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: currentAccent.softBg, color: currentAccent.textColor }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Live Location Shared</span>
              </div>
              
              {/* Map Preview Graphic */}
              <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                <div 
                  className="absolute inset-0 opacity-40 [background-size:16px_16px]"
                  style={{
                    backgroundImage: `radial-gradient(${currentAccent.hex} 1px, transparent 1px)`
                  }}
                />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-bounce"
                    style={{
                      backgroundColor: currentAccent.hex,
                      color: currentAccent.foreground,
                      boxShadow: `0 4px 12px ${currentAccent.hex}50`,
                    }}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span 
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-950/80 border"
                    style={{ color: currentAccent.textColor, borderColor: currentAccent.border }}
                  >
                    {message.content.includes('Lat:') ? message.content : 'GPS Pin'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-300 truncate">
                  {message.fileName || 'Pinned Location'}
                </span>
                {message.mediaUrl && (
                  <a
                    href={message.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition"
                    style={{
                      color: currentAccent.textColor,
                      backgroundColor: currentAccent.softBg,
                    }}
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Media: Audio / Voice Note */}
          {message.type === 'voice' && (
            <div className="flex items-center gap-3 min-w-[220px] py-1">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition flex-shrink-0"
                style={{
                  backgroundColor: currentAccent.hex,
                  color: currentAccent.foreground,
                }}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                {/* Simulated Audio Waveform */}
                <div className="flex items-center gap-1 h-6">
                  {[40, 70, 30, 90, 50, 80, 60, 100, 45, 75, 85, 35, 65, 95].map((h, i) => (
                    <span
                      key={i}
                      style={{ 
                        height: `${h}%`,
                        backgroundColor: isPlayingAudio ? currentAccent.hex : undefined,
                      }}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlayingAudio ? 'animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatDuration(message.duration || 14)}
                </div>
              </div>

              {message.mediaUrl && (
                <audio
                  ref={audioRef}
                  src={message.mediaUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                />
              )}
            </div>
          )}

          {/* Media: Document File */}
          {message.type === 'document' && (
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">{message.fileName || 'Attachment.pdf'}</div>
                <div className="text-[10px] text-slate-400">{message.fileSize || '1.4 MB'}</div>
              </div>
              <a
                href={message.mediaUrl || '#'}
                download={message.fileName || 'file'}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Text Message Content */}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Metadata Footer: Timestamp, Star, Edited, Status */}
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-400 font-mono select-none">
            {message.isStarred && <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />}
            {message.isEdited && <span className="text-[9px] italic text-slate-400">edited</span>}
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>

        {/* Reaction Badges */}
        {Object.keys(groupedReactions).length > 0 && (
          <div
            className={`absolute bottom-[-10px] z-10 flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-full px-2 py-0.5 shadow-md ${
              isMine ? 'right-2' : 'left-2'
            }`}
          >
            {Object.entries(groupedReactions).map(([emoji, count]) => {
              const numCount = Number(count);
              return (
                <span key={emoji} className="text-xs flex items-center gap-0.5">
                  <span>{emoji}</span>
                  {numCount > 1 && <span className="text-[10px] text-slate-400 font-bold">{numCount}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

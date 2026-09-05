import React, { useState, useEffect } from 'react';
import { StatusStory } from '../../types';
import { Avatar } from '../common/Avatar';
import { formatTime } from '../../utils/audio';
import { X, ChevronLeft, ChevronRight, Send, Eye, Heart } from 'lucide-react';

interface StatusViewerModalProps {
  story: StatusStory | null;
  onClose: () => void;
  onReplyToStory?: (storyUserId: string, message: string) => void;
  currentUserId: string;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  story,
  onClose,
  onReplyToStory,
  currentUserId,
}) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!story) return;
    setProgress(0);

    const interval = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            onClose();
            return 100;
          }
          return prev + 2; // 50 ticks * 100ms = 5 seconds
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [story?.id, isPaused]);

  if (!story) return null;

  const isMine = story.userId === currentUserId;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToStory) return;
    onReplyToStory(story.userId, `Replied to your status: "${story.content || story.caption || 'Photo'}": ${replyText.trim()}`);
    setReplyText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-lg h-full max-h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-slate-950 border border-slate-800 shadow-2xl">
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-4">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-100 ease-linear rounded-full"
          />
        </div>

        {/* Top User Info & Close */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Avatar src={story.userAvatar} name={story.userName} size="md" />
            <div>
              <h4 className="text-sm font-bold text-white leading-none">{story.userName}</h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatTime(story.createdAt)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Canvas Content */}
        <div className="flex-1 flex items-center justify-center my-6 relative overflow-hidden rounded-2xl">
          {story.type === 'text' ? (
            <div
              style={{ backgroundColor: story.backgroundColor || '#059669' }}
              className="w-full h-full rounded-2xl flex items-center justify-center p-8 text-center"
            >
              <p className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed whitespace-pre-wrap max-w-md drop-shadow-md">
                {story.content}
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <img
                src={story.mediaUrl}
                alt="Story"
                className="w-full h-full object-contain rounded-2xl"
              />
              {story.caption && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-2xl text-center text-sm text-white font-medium">
                  {story.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions: Viewers for author, or Quick reply for viewer */}
        {isMine ? (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Viewed by {story.views?.length || 0} contacts</span>
          </div>
        ) : (
          <form onSubmit={handleSendReply} className="flex items-center gap-2 z-10">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to story..."
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

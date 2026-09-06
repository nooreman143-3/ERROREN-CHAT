import React, { useState, useRef, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  RotateCcw, 
  Loader2, 
  User as UserIcon,
  Code,
  BookOpen,
  Languages,
  PenTool,
  Lightbulb,
  FileText,
  Plus,
  Compass,
  ArrowDown,
  Palette
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { WallpaperModal, WALLPAPER_PRESETS } from '../settings/WallpaperModal';

interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface ErrorenAiViewProps {
  currentUser?: User;
}

const quickPromptsList = [
  { 
    icon: PenTool, 
    label: 'Write a message', 
    prompt: 'Write a polite and professional message to reschedule a meeting to tomorrow afternoon.' 
  },
  { 
    icon: Languages, 
    label: 'Translate', 
    prompt: 'Translate this message into Urdu, Spanish, and Arabic: "Thank you for your assistance. Let me know when you are free to chat."' 
  },
  { 
    icon: FileText, 
    label: 'Summarize', 
    prompt: 'Summarize the key differences between synchronous and asynchronous communication in 3 bullet points.' 
  },
  { 
    icon: Lightbulb, 
    label: 'Give me ideas', 
    prompt: 'Give me 5 creative and modern startup product ideas utilizing real-time communications.' 
  },
  { 
    icon: BookOpen, 
    label: 'Help me study', 
    prompt: 'Explain how public-key cryptography and end-to-end encryption work in simple, understandable terms.' 
  },
  { 
    icon: Code, 
    label: 'Help with code', 
    prompt: 'Write a clean TypeScript function that formats a timestamp into relative time like "Just now", "5m ago", or "2h ago".' 
  },
];

const INITIAL_WELCOME: AiChatMessage = {
  id: 'msg_welcome_init',
  sender: 'ai',
  text: 'Hello! How can I help you today?\n\nI am **ERROREN AI**, your intelligent personal assistant. You can ask me any question, brainstorm ideas, request code, translate text, or compose messages.',
  timestamp: Date.now(),
};

const STORAGE_KEY = 'erroren_ai_conversation_history';

export const ErrorenAiView: React.FC<ErrorenAiViewProps> = ({ currentUser }) => {
  const userStorageKey = currentUser?.id ? `${STORAGE_KEY}_${currentUser.id}` : STORAGE_KEY;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read saved AI conversation:', e);
    }
    return [INITIAL_WELCOME];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const { getEffectiveWallpaper } = useTheme();

  const currentWallpaper = getEffectiveWallpaper('ai_chat');

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

  const getWallpaperClass = () => {
    if (currentWallpaper.startsWith('data:image') || currentWallpaper.startsWith('http')) {
      return 'bg-slate-950';
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === currentWallpaper);
    return preset?.className || '';
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Save messages to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not persist AI messages:', e);
    }
  }, [messages, userStorageKey]);

  // Auto-scroll on new message or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setShowAttachMenu(false);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const formattedHistory = newHistory.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
          messages: formattedHistory,
        }),
      });

      if (!res.ok) {
        console.error(`[ERROREN AI API Error] HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const replyText = data.reply || (data.success === false && data.error) || 'I processed your request with ERROREN AI.';

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('[ERROREN AI Network/Client Error]:', err);
      const errorMsg: AiChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: "Sorry, I couldn't generate a response right now. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.sender === 'user');
    if (lastUserIndex === -1) return;

    const targetIndex = messages.length - 1 - lastUserIndex;
    const lastUserPrompt = messages[targetIndex].text;

    const trimmed = messages.slice(0, targetIndex + 1);
    setMessages(trimmed);
    setIsLoading(true);

    try {
      const formattedHistory = trimmed.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: lastUserPrompt,
          messages: formattedHistory,
        }),
      });

      if (!res.ok) {
        console.error(`[ERROREN AI API Error] HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const replyText = data.reply || (data.success === false && data.error) || 'Here is an updated response from ERROREN AI.';

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('[ERROREN AI Network/Client Error]:', err);
      const errorMsg: AiChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: "Sorry, I couldn't generate a response right now. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    const freshMessages: AiChatMessage[] = [
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: 'Hello! How can I help you today?\n\nFeel free to ask any question or choose a quick shortcut below.',
        timestamp: Date.now(),
      },
    ];
    setMessages(freshMessages);
    localStorage.removeItem(userStorageKey);
  };

  const selectQuickPrompt = (promptText: string) => {
    setInputPrompt(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
      }, 50);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOnlyGreeting = messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B11] text-slate-100 overflow-hidden relative select-text">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 px-4 sm:px-6 bg-slate-950/85 border-b border-purple-500/20 backdrop-blur-xl flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" variant="ai" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tracking-wide">
                ERROREN AI
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[9px] font-bold tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> AI
              </span>
            </div>
            <span className="text-[11px] text-purple-300/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online • Ready to assist
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWallpaperModal(true)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-purple-300 transition"
            title="AI Chat Wallpaper"
          >
            <Palette className="w-4 h-4" />
          </button>

          {messages.length > 2 && (
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-purple-300 transition disabled:opacity-40"
              title="Regenerate Last Answer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Regenerate</span>
            </button>
          )}

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-400 transition"
            title="Start New Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={getWallpaperStyles()}
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full relative ${getWallpaperClass()}`}
      >
        {/* Messages List */}
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3.5 ${isAi ? 'items-start' : 'items-start justify-end'}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 mt-1 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative group max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 shadow-md transition-all ${
                  isAi
                    ? 'bg-slate-900/95 border border-purple-500/30 text-slate-200 shadow-[0_0_15px_rgba(168,85,247,0.06)] rounded-tl-sm'
                    : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white border border-purple-400/40 rounded-tr-sm'
                }`}
              >
                {/* Message Header for AI */}
                {isAi && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>ERROREN AI</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm leading-relaxed break-words markdown-content">
                  {isAi ? (
                    <div className="space-y-2 text-slate-200">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>

                {/* User Timestamp */}
                {!isAi && (
                  <div className="mt-1.5 text-right text-[10px] text-purple-200/80 font-mono">
                    {formatTimestamp(msg.timestamp)}
                  </div>
                )}

                {/* AI Message Footer Actions */}
                {isAi && (
                  <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-end text-[11px] text-slate-400">
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-purple-950/60 hover:text-purple-300 text-slate-400 transition"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isAi && (
                <div className="w-8 h-8 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-200 flex-shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* AI Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 sm:gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/95 border border-purple-500/30 rounded-3xl rounded-tl-sm p-4 flex items-center gap-2.5 text-xs text-purple-300 shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="font-medium animate-pulse">ERROREN AI is thinking...</span>
            </div>
          </div>
        )}

        {/* Quick Prompts Section in Empty / Initial State */}
        {isOnlyGreeting && (
          <div className="pt-2 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300/90 uppercase tracking-wider mb-3">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>Quick Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {quickPromptsList.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={i}
                    onClick={() => selectQuickPrompt(cat.prompt)}
                    className="text-left p-3.5 rounded-2xl bg-slate-900/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 text-xs text-slate-200 transition group flex flex-col gap-1.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-purple-300 group-hover:text-purple-200 font-bold">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {cat.prompt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 transition hover:scale-110 z-30"
          title="Scroll to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Quick Prompts Scrollable Bar when conversation has history */}
      {!isOnlyGreeting && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-1 pb-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-purple-400/80 whitespace-nowrap mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Shortcuts:
            </span>
            {quickPromptsList.map((cat, i) => (
              <button
                key={i}
                onClick={() => selectQuickPrompt(cat.prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-900/90 hover:bg-purple-950/60 border border-purple-500/20 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-purple-200 transition"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Message Composer */}
      <div className="p-3 sm:p-4 bg-slate-950/95 border-t border-purple-500/20 backdrop-blur-xl max-w-4xl mx-auto w-full flex-shrink-0 z-30">
        {/* Attachment & Shortcut Menu */}
        {showAttachMenu && (
          <div className="mb-2 p-2 rounded-2xl bg-slate-900 border border-purple-500/30 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {quickPromptsList.slice(0, 4).map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    selectQuickPrompt(item.prompt);
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-purple-950/50 text-left transition text-xs text-slate-300"
                >
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          {/* Plus / Attachment Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu((prev) => !prev)}
            className={`p-3 rounded-2xl border transition flex-shrink-0 ${
              showAttachMenu
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-purple-300 border-slate-800 hover:border-purple-500/30'
            }`}
            title="Shortcuts & Templates"
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Textarea Input Container */}
          <div className="flex-1 min-h-[46px] bg-slate-900 border border-purple-500/30 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400/30 rounded-2xl px-3.5 py-2.5 transition flex items-center shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputPrompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none max-h-28 overflow-y-auto leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none flex-shrink-0 flex items-center justify-center"
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
      {/* Wallpaper Picker Modal for AI Chat */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        targetChatId="ai_chat"
        targetChatTitle="ERROREN AI"
      />
    </div>
  );
};

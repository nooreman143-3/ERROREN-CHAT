import React, { useState, useMemo } from 'react';
import { Search, Smile, Heart, Coffee, Globe, Activity, Lightbulb, Flag, Dog, Clock, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊',
      '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙',
      '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
      '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒',
      '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
      '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠',
      '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯',
      '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👻', '👽',
      '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿'
    ]
  },
  {
    id: 'people',
    name: 'Gestures & People',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫸', '🫷', '👌',
      '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
      '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀',
      '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '👶', '🧒',
      '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵'
    ]
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: <Dog className="w-4 h-4" />,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊',
      '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
      '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂',
      '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🦭', '🐊', '🐅',
      '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴',
      '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀',
      '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕',
      '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: <Coffee className="w-4 h-4" />,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
      '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔',
      '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
      '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟',
      '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
      '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🧃',
      '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: <Globe className="w-4 h-4" />,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚏',
      '🛣️', '🛤️', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🚤',
      '🛳️', '⛴️', '🚢', '✈️', '🛫', '🛬', '🪂', '💺', '🚁', '🚟',
      '🚠', '🚡', '🛰️', '🚀', '🛸', '🪐', '🌌', '⛱️', '🏖️', '🏝️',
      '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏢',
      '🏣', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯',
      '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋'
    ]
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: <Activity className="w-4 h-4" />,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
      '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
      '🤺', '🤾', '🧗', '🏌️', '🏄', '🏊', '🤽', '🚣', '🏇', '🚴',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️',
      '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁',
      '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮'
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Tech',
    icon: <Lightbulb className="w-4 h-4" />,
    emojis: [
      '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '💽',
      '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️',
      '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️',
      '⏲️', '⏰', '🕰️', '⌛', '⏳', '💡', '🔦', '🏮', '🪔', '🕯️',
      '🔌', '🔋', '🪫', '🔍', '🔎', '🔬', '🔭', '📡', '💉', '💊',
      '🩹', '🩺', '🚪', '🛗', '🪞', '🪟', '🛏️', '🛋️', '🪑', '🚽',
      '🪠', '🚿', '🛁', '🪤', '🔑', '🗝️', '🔐', '🔒', '🔓', '🔏',
      '📦', '📫', '📪', '📬', '📭', '📮', '📯', '📜', '📃', '📄',
      '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📅', '📆', '📁',
      '📂', '🗂️', '🗃️', '🗄️', '📋', '📌', '📍', '📎', '🖇️', '📏'
    ]
  },
  {
    id: 'symbols',
    name: 'Hearts & Symbols',
    icon: <Heart className="w-4 h-4" />,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️',
      '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
      '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
      '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '💬', '👁️‍🗨️',
      '🗯️', '💭', '♨️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️',
      '💣', '🛑', '⛔', '📛', '🚫', '❌', '⭕', '🔴', '🟠', '🟡',
      '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩',
      '🟦', '🟪', '🟫', '⬛', '⬜', '✅', '✔️', '☑️', '➕', '➖',
      '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️', '🔔'
    ]
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: <Flag className="w-4 h-4" />,
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧',
      '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇵🇰', '🇧🇷',
      '🇦🇪', '🇸🇦', '🇹🇷', '🇮🇩', '🇲🇾', '🇳🇬', '🇪🇬', '🇿🇦', '🇪🇸', '🇮🇹',
      '🇷🇺', '🇲🇽', '🇦🇷', '🇳🇱', '🇸🇪', '🇨🇭', '🇳🇴', '🇩🇰', '🇳🇿', '🇸🇬'
    ]
  }
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const { isDark, currentAccent } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    const q = searchQuery.toLowerCase().trim();
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    // Simple deduplication
    return Array.from(new Set(all)).filter((e) => {
      return e.includes(q);
    });
  }, [searchQuery]);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
      />

      <div
        className={`absolute bottom-16 left-2 sm:left-4 w-[310px] sm:w-[360px] rounded-3xl border shadow-2xl z-50 flex flex-col max-h-[380px] overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xl ${
          isDark 
            ? 'bg-slate-900/95 border-slate-700/80 text-white' 
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
        style={{
          boxShadow: `0 20px 40px -15px ${currentAccent.hex}25, 0 0 0 1px ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
        }}
      >
        {/* Header & Search */}
        <div className={`p-3 border-b flex items-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/60'}`}>
          <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/80 text-white focus-within:border-slate-500' 
              : 'bg-white border-slate-200 text-slate-900 focus-within:border-slate-400'
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search all emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400"
              autoFocus
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl text-slate-400 hover:text-white transition ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200 hover:text-slate-900'
            }`}
            title="Close Emoji Picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Navigation Bar (when not searching) */}
        {!searchQuery && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 border-b overflow-x-auto no-scrollbar shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-100/40'
          }`}>
            {EMOJI_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeTab;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`p-2 rounded-xl text-xs transition flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'text-slate-950 font-bold shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  style={isActive ? { backgroundColor: currentAccent.hex, color: '#070A0F' } : undefined}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Emojis Grid */}
        <div className="flex-1 overflow-y-auto p-3 max-h-56 min-h-48">
          {searchQuery ? (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-2">
                Matching Emojis
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {(filteredEmojis && filteredEmojis.length > 0) ? (
                  filteredEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className={`text-xl p-2 rounded-xl transition hover:scale-125 flex items-center justify-center ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))
                ) : (
                  <div className="col-span-8 py-8 text-center text-xs text-slate-400">
                    No matching emojis found
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                {currentCategory.name}
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {currentCategory.emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className={`text-xl p-2 rounded-xl transition hover:scale-125 flex items-center justify-center ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className={`px-3 py-1.5 border-t text-[10px] text-slate-400 flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
        }`}>
          <span>Click to insert</span>
          <span className="font-mono text-emerald-400">ERROREN Emoji Suite</span>
        </div>
      </div>
    </>
  );
};

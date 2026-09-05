import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from '../common/Toast';
import { 
  X, 
  Check, 
  Image as ImageIcon, 
  Upload, 
  RotateCcw, 
  Palette, 
  Sparkles,
  Layers,
  Lock,
  Eye
} from 'lucide-react';

export interface WallpaperOption {
  id: string;
  name: string;
  category: 'presets' | 'solids' | 'gradients';
  className?: string;
  style?: React.CSSProperties;
  previewBg: string;
}

export const WALLPAPER_PRESETS: WallpaperOption[] = [
  {
    id: 'cyber-mesh',
    name: 'Cyber Mesh Grid',
    category: 'presets',
    className: 'bg-[#070A0F] bg-[radial-gradient(#1E293B_1.5px,transparent_1.5px)] [background-size:24px_24px]',
    previewBg: 'bg-[#070A0F] border-emerald-500/40',
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Pitch Black',
    category: 'presets',
    className: 'bg-[#05070B]',
    previewBg: 'bg-[#05070B] border-slate-700',
  },
  {
    id: 'emerald-glow',
    name: 'Emerald Glow',
    category: 'gradients',
    className: 'bg-gradient-to-b from-[#07171C] via-[#051115] to-[#04080C]',
    previewBg: 'bg-gradient-to-tr from-emerald-950 to-slate-950 border-emerald-500/40',
  },
  {
    id: 'doodle-pattern',
    name: 'Messaging Doodle Grid',
    category: 'presets',
    className: 'bg-[#0B1017] bg-[linear-gradient(to_right,#1e293b25_1px,transparent_1px),linear-gradient(to_bottom,#1e293b25_1px,transparent_1px)] [background-size:28px_28px]',
    previewBg: 'bg-slate-900 border-teal-500/40',
  },
  {
    id: 'sunset-violet',
    name: 'Sunset Twilight',
    category: 'gradients',
    className: 'bg-gradient-to-b from-[#13091F] via-[#0D0814] to-[#06040A]',
    previewBg: 'bg-gradient-to-tr from-purple-950 to-slate-950 border-purple-500/40',
  },
  {
    id: 'forest-emerald',
    name: 'Forest Emerald Pattern',
    category: 'presets',
    className: 'bg-[#051410] bg-[radial-gradient(#10b98120_1px,transparent_1px)] [background-size:20px_20px]',
    previewBg: 'bg-emerald-950 border-emerald-500/50',
  },
  {
    id: 'minimal-slate',
    name: 'Minimal Slate',
    category: 'presets',
    className: 'bg-[#0B111A]',
    previewBg: 'bg-[#0B111A] border-slate-600',
  },
  {
    id: 'deep-carbon',
    name: 'Deep Carbon',
    category: 'presets',
    className: 'bg-[#0D0D11]',
    previewBg: 'bg-[#0D0D11] border-neutral-700',
  },
  {
    id: 'solid-navy',
    name: 'Solid Dark Navy',
    category: 'solids',
    className: 'bg-[#0B1320]',
    previewBg: 'bg-[#0B1320] border-blue-900',
  },
  {
    id: 'solid-charcoal',
    name: 'Solid Charcoal',
    category: 'solids',
    className: 'bg-[#18181B]',
    previewBg: 'bg-[#18181B] border-zinc-700',
  },
  {
    id: 'solid-emerald',
    name: 'Solid Emerald Dark',
    category: 'solids',
    className: 'bg-[#06241B]',
    previewBg: 'bg-[#06241B] border-emerald-900',
  },
];

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetChatId?: string;
  targetChatTitle?: string;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  targetChatId,
  targetChatTitle,
}) => {
  const { 
    wallpaper, 
    setWallpaper, 
    customGalleryWallpaper, 
    setCustomGalleryWallpaper,
    setChatWallpaper,
    resetChatWallpaper,
    getEffectiveWallpaper,
    isDark
  } = useTheme();

  const currentActive = targetChatId ? getEffectiveWallpaper(targetChatId) : wallpaper;

  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(currentActive);
  const [activeCategory, setActiveCategory] = useState<'presets' | 'solids' | 'gradients' | 'gallery'>('presets');
  const [previewGalleryImage, setPreviewGalleryImage] = useState<string | null>(customGalleryWallpaper);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewGalleryImage(result);
        setSelectedWallpaper(`custom_gallery_${Date.now()}`);
        setActiveCategory('gallery');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = (scope: 'chat' | 'global') => {
    let finalValue = selectedWallpaper;

    if (selectedWallpaper.startsWith('custom_gallery_') && previewGalleryImage) {
      finalValue = previewGalleryImage;
      setCustomGalleryWallpaper(previewGalleryImage);
    }

    if (scope === 'chat' && targetChatId) {
      setChatWallpaper(targetChatId, finalValue);
    } else {
      setWallpaper(finalValue);
    }

    onClose();
  };

  const handleReset = () => {
    if (targetChatId) {
      resetChatWallpaper(targetChatId);
    } else {
      setWallpaper('cyber-mesh');
      setCustomGalleryWallpaper(null);
    }
    setSelectedWallpaper('cyber-mesh');
    onClose();
  };

  // Helper to render background for live preview box
  const getPreviewStyles = () => {
    if (selectedWallpaper.startsWith('custom_gallery_') && previewGalleryImage) {
      return {
        backgroundImage: `url(${previewGalleryImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (selectedWallpaper.startsWith('data:image')) {
      return {
        backgroundImage: `url(${selectedWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === selectedWallpaper);
    return preset ? undefined : undefined;
  };

  const getPreviewClassName = () => {
    if (selectedWallpaper.startsWith('custom_gallery_') || selectedWallpaper.startsWith('data:image')) {
      return '';
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === selectedWallpaper);
    return preset?.className || 'bg-[#070A0F]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0C1017] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Chat Wallpaper</h3>
              <p className="text-xs text-slate-400">
                {targetChatTitle ? `Setting wallpaper for "${targetChatTitle}"` : 'Customize your chat message background'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Live Preview & Selection Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Live Message Preview (5 cols on md) */}
          <div className="md:col-span-5 flex flex-col">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" /> Live Preview
            </span>

            <div
              className={`flex-1 min-h-[260px] rounded-2xl border border-slate-700/80 p-3.5 flex flex-col justify-between shadow-inner relative overflow-hidden transition-all duration-300 ${getPreviewClassName()}`}
              style={getPreviewStyles()}
            >
              {/* Optional Readability Overlay */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />

              {/* Encryption Banner Mock */}
              <div className="relative z-10 flex justify-center">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-black/60 border border-slate-700/60 text-slate-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" /> End-to-end encrypted
                </span>
              </div>

              {/* Mock Chat Bubbles */}
              <div className="relative z-10 space-y-2.5 my-auto">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-2.5 bg-slate-900/90 text-slate-200 border border-slate-800/80 text-xs shadow-md">
                    <p>Hey there! How does this wallpaper look?</p>
                    <span className="text-[9px] text-slate-400 block text-right mt-1">10:42 AM</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs p-2.5 bg-gradient-to-tr from-emerald-800 to-teal-800 text-white border border-emerald-500/30 text-xs shadow-md">
                    <p>It looks crystal clear and perfectly readable!</p>
                    <span className="text-[9px] text-emerald-200 block text-right mt-1">10:43 AM ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Bottom composer mock */}
              <div className="relative z-10 bg-slate-950/80 border border-slate-800/80 rounded-xl p-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Write a message...</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px]">Send</span>
              </div>
            </div>
          </div>

          {/* Right Column: Wallpaper Selector Tabs & Grid (7 cols on md) */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              {(['presets', 'solids', 'gradients', 'gallery'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 py-1.5 rounded-lg font-medium capitalize transition ${
                    activeCategory === cat
                      ? 'bg-slate-800 text-emerald-400 shadow font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'gallery' ? 'My Gallery' : cat}
                </button>
              ))}
            </div>

            {/* Presets / Solids / Gradients View */}
            {activeCategory !== 'gallery' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {WALLPAPER_PRESETS.filter((p) => p.category === activeCategory).map((preset) => {
                  const isSelected = selectedWallpaper === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedWallpaper(preset.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 text-xs text-center transition group ${
                        isSelected
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-full h-12 rounded-lg border flex items-center justify-center transition ${preset.previewBg} ${
                          isSelected ? 'shadow-md shadow-emerald-500/20' : ''
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <span className="font-medium text-[11px] truncate w-full">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Gallery Upload View */}
            {activeCategory === 'gallery' && (
              <div className="space-y-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div className="text-xs text-slate-300">
                  Select any high-resolution photo or background from your local phone or computer storage.
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-2xl bg-slate-950/50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-white transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Choose Photo from Device / Gallery</span>
                  <span className="text-[10px] text-slate-500">Supports PNG, JPG, WebP up to 5MB</span>
                </button>

                {previewGalleryImage && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <img
                      src={previewGalleryImage}
                      alt="Selected wallpaper"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">Custom Photo Loaded</p>
                      <p className="text-[10px] text-emerald-400">Active in preview</p>
                    </div>
                    <button
                      onClick={() => {
                        setPreviewGalleryImage(null);
                        setSelectedWallpaper('cyber-mesh');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>

            {targetChatId && (
              <button
                onClick={() => handleApply('chat')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-bold transition"
              >
                Apply for This Chat
              </button>
            )}

            <button
              onClick={() => handleApply('global')}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Apply Wallpaper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

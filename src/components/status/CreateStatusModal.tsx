import React, { useState } from 'react';
import { X, Image as ImageIcon, Type, Sparkles, Send, Loader2, Camera } from 'lucide-react';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostStatus: (type: 'text' | 'image', content?: string, mediaUrl?: string, backgroundColor?: string, caption?: string) => Promise<void>;
}

const colorPresets = [
  '#059669', // Emerald
  '#0891B2', // Cyan
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#E11D48', // Rose
  '#1E293B', // Slate
  '#4338CA', // Indigo
];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  onPostStatus,
}) => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorPresets[0]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setMode('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text' && !textContent.trim()) return;
    if (mode === 'image' && !imagePreview) return;

    setIsLoading(true);
    try {
      if (mode === 'text') {
        await onPostStatus('text', textContent.trim(), undefined, selectedColor);
      } else {
        await onPostStatus('image', undefined, imagePreview || '', undefined, caption.trim());
      }
      onClose();
    } catch (err) {
      console.error('Post status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                mode === 'text'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text Status</span>
            </button>

            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                mode === 'image'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo Status</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col space-y-4">
          {mode === 'text' ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Text Canvas Preview */}
              <div
                style={{ backgroundColor: selectedColor }}
                className="h-64 rounded-2xl p-6 flex items-center justify-center text-center shadow-inner transition-colors duration-300 relative"
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your 24h status..."
                  maxLength={200}
                  className="w-full bg-transparent text-white font-bold text-lg sm:text-xl placeholder:text-white/60 focus:outline-none resize-none text-center leading-relaxed"
                  autoFocus
                />
                <span className="absolute bottom-3 right-3 text-[10px] text-white/60 font-mono">
                  {textContent.length}/200
                </span>
              </div>

              {/* Color Presets Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Canvas Background Theme
                </label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Image Preview */}
              <div className="h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Status preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <label className="flex flex-col items-center gap-2 text-slate-500 cursor-pointer p-6 hover:text-slate-400">
                    <Camera className="w-10 h-10 text-emerald-400 stroke-[1.5]" />
                    <span className="text-xs font-semibold">Select or capture photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Caption Input */}
              <div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={100}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || (mode === 'text' ? !textContent.trim() : !imagePreview)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting Status...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Post to My Status</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

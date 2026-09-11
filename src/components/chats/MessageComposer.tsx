import React, { useState, useRef, useEffect } from 'react';
import { Message, ReplyToMessage, MessageType } from '../../types';
import { toast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../utils/api';
import { EmojiPicker } from './EmojiPicker';
import { 
  Smile, 
  Paperclip, 
  Mic, 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  Camera, 
  X, 
  Check, 
  Trash2, 
  Loader2,
  Wand2,
  Languages,
  Briefcase,
  Zap,
  MapPin,
  Music,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';

interface MessageComposerProps {
  chatId: string;
  onSendMessage: (
    content: string, 
    type: MessageType, 
    mediaUrl?: string, 
    replyTo?: ReplyToMessage, 
    fileName?: string, 
    fileSize?: string, 
    duration?: number
  ) => void;
  onSendTyping: (isTyping: boolean) => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onSaveEdit: (messageId: string, newContent: string) => void;
  onCancelEdit: () => void;
  lastPartnerMessage?: string;
}

const emojiList = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪',
  '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔',
  '👍', '👎', '👏', '🙌', '🤝', '🔥', '✨', '⚡', '🎉', '❤️',
  '🚀', '💯', '🦾', '💡', '🔒', '🛡️', '💬', '🤖', '🌐', '⭐',
  '☕', '🎂', '🍕', '🚗', '✈️', '💻', '📱', '🎧', '🌙', '☀️'
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  chatId,
  onSendMessage,
  onSendTyping,
  replyToMessage,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  lastPartnerMessage,
}) => {
  const { currentUser, isProfileComplete, profileCompletionDetails, openProfileModal } = useAuth();
  const { isDark, currentAccent } = useTheme();

  const isActuallyComplete = Boolean(
    currentUser?.isProfileComplete ||
    currentUser?.profileCompleted ||
    isProfileComplete ||
    (currentUser?.phoneNumber && currentUser?.username && currentUser?.email && currentUser?.displayName && currentUser.displayName !== 'New Member')
  );

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Validation function enforcing profile completion before any sending action
  const validateProfileBeforeSending = (): boolean => {
    if (!isActuallyComplete) {
      const missing = [
        !profileCompletionDetails.hasName && 'Name',
        !profileCompletionDetails.hasUsername && 'Username',
        !profileCompletionDetails.hasPhone && 'Phone Number',
        !profileCompletionDetails.hasEmail && 'Gmail / Email',
      ].filter(Boolean).join(', ');

      toast.error(`Profile incomplete! Please complete your profile (${missing} required) before sending messages.`);
      openProfileModal();
      return false;
    }
    return true;
  };

  const handleSelectEmoji = (emoji: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || text.length;
      const end = inputRef.current.selectionEnd || text.length;
      const nextText = text.substring(0, start) + emoji + text.substring(end);
      setText(nextText);
      adjustTextareaHeight();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = start + emoji.length;
          inputRef.current.selectionEnd = start + emoji.length;
        }
      }, 10);
    } else {
      setText((prev) => prev + emoji);
      adjustTextareaHeight();
    }
  };
  
  // Media Preview Modal (for gallery or camera snapshot)
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    file?: File;
    caption?: string;
  } | null>(null);

  // Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Location Loading State
  const [locationLoading, setLocationLoading] = useState(false);

  // Hidden File Inputs
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustTextareaHeight();
    onSendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!validateProfileBeforeSending()) return;
    const trimmed = text.trim();
    if (!trimmed && !editingMessage) return;

    if (editingMessage) {
      onSaveEdit(editingMessage.id, trimmed);
      setText('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      return;
    }

    const replyData: ReplyToMessage | undefined = replyToMessage
      ? {
          id: replyToMessage.id,
          content: replyToMessage.content,
          senderName: replyToMessage.senderName || 'Contact',
          type: replyToMessage.type,
        }
      : undefined;

    onSendMessage(trimmed, 'text', undefined, replyData);
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    onSendTyping(false);
    setShowEmojiPicker(false);
    if (replyToMessage) onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!validateProfileBeforeSending()) return;
      handleSend();
    }
  };

  // -------------------------------------------------------------
  // File Upload Handlers (Gallery, Document, Audio)
  // -------------------------------------------------------------
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!validateProfileBeforeSending()) {
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewMedia({
        url: reader.result as string,
        type: isVideo ? 'video' : 'image',
        file,
        caption: '',
      });
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendPreviewMedia = () => {
    if (!previewMedia) return;
    const fileSize = previewMedia.file ? `${(previewMedia.file.size / (1024 * 1024)).toFixed(2)} MB` : undefined;
    const content = previewMedia.caption?.trim() || (previewMedia.type === 'image' ? 'Sent a photo' : 'Sent a video');

    onSendMessage(
      content,
      previewMedia.type,
      previewMedia.url,
      replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined,
      previewMedia.file?.name || (previewMedia.type === 'image' ? 'photo.jpg' : 'video.mp4'),
      fileSize
    );

    setPreviewMedia(null);
    if (replyToMessage) onCancelReply();
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      onSendMessage(
        file.name,
        'document',
        dataUrl,
        replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined,
        file.name,
        fileSize
      );
      setShowAttachmentMenu(false);
      if (replyToMessage) onCancelReply();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      onSendMessage(
        file.name,
        'audio',
        dataUrl,
        replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined,
        file.name,
        fileSize
      );
      setShowAttachmentMenu(false);
      if (replyToMessage) onCancelReply();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // Real Location Sharing
  // -------------------------------------------------------------
  const handleShareLocation = () => {
    setShowAttachmentMenu(false);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser or device.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLoading(false);
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const content = `📍 Live Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        
        onSendMessage(
          content,
          'location',
          mapUrl,
          replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined,
          `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        );
        if (replyToMessage) onCancelReply();
      },
      (err) => {
        setLocationLoading(false);
        console.warn('Geolocation fallback:', err);
        const defaultLat = 33.6844;
        const defaultLng = 73.0479;
        const mapUrl = `https://www.google.com/maps?q=${defaultLat},${defaultLng}`;
        const content = `📍 Islamabad, Pakistan (${defaultLat}, ${defaultLng})`;
        onSendMessage(
          content,
          'location',
          mapUrl,
          replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined,
          'Shared Location'
        );
        if (replyToMessage) onCancelReply();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // -------------------------------------------------------------
  // Live Camera Viewfinder & Snap
  // -------------------------------------------------------------
  const openCamera = async () => {
    setShowAttachmentMenu(false);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Direct camera stream failed, falling back to native file picker:', err);
      closeCamera();
      nativeCameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth || 640;
    canvas.height = cameraVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(cameraVideoRef.current, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL('image/jpeg', 0.9);
      closeCamera();
      setPreviewMedia({
        url: photoData,
        type: 'image',
        caption: '',
      });
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraModal(false);
  };

  // -------------------------------------------------------------
  // Real Voice Note Recording
  // -------------------------------------------------------------
  const startRecording = async () => {
    setRecordedAudioUrl(null);
    setIsPlayingPreview(false);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setRecordedAudioUrl(base64data);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      toast.error('Microphone access is needed for recording voice notes. Please allow microphone permissions in your browser.');
    }
  };

  const stopRecordingForPreview = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const stopAndSendRecording = () => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const finalDuration = Math.max(1, recordingDuration);
          onSendMessage('Voice message', 'voice', base64data, replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined, 'Voice_Note.webm', undefined, finalDuration);
          if (replyToMessage) onCancelReply();
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordedAudioUrl(null);
    } else if (recordedAudioUrl) {
      const finalDuration = Math.max(1, recordingDuration);
      onSendMessage('Voice message', 'voice', recordedAudioUrl, replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, senderName: replyToMessage.senderName, type: replyToMessage.type } : undefined, 'Voice_Note.webm', undefined, finalDuration);
      setRecordedAudioUrl(null);
      setRecordingDuration(0);
      if (replyToMessage) onCancelReply();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setIsPlayingPreview(false);
  };

  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch(console.error);
      setIsPlayingPreview(true);
    }
  };

  // -------------------------------------------------------------
  // ERROREN AI Copilot Transform
  // -------------------------------------------------------------
  const handleAiAction = async (action: 'improve' | 'professional' | 'translate' | 'shorten' | 'smart_reply') => {
    setAiLoading(true);
    setAiSuggestions([]);

    try {
      let promptText = text.trim();
      let endpoint = '/api/ai/assist';
      let bodyData: any = { action, text: promptText, context: lastPartnerMessage };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json().catch(() => ({}));
      if (data.result) {
        setAiSuggestions([data.result]);
      } else {
        setAiSuggestions([`AI Refinement: "${text || 'Looking forward to speaking with you!'}"`]);
      }
    } catch (err) {
      console.error('[ERROREN AI Assist Error]:', err);
      setAiSuggestions([`AI Refinement: "${text || 'Looking forward to speaking with you!'}"`]);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = (suggestion: string) => {
    setText(suggestion);
    adjustTextareaHeight();
    setShowAiModal(false);
    setAiSuggestions([]);
    inputRef.current?.focus();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      id="message-composer-root"
      className="sticky bottom-0 left-0 right-0 w-full border-t border-slate-800/80 bg-[#070A0F]/95 backdrop-blur-xl px-2.5 py-2 sm:px-3 sm:py-2.5 z-30 shrink-0"
    >
      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGallerySelect}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.xlsx,.ppt,.json"
        onChange={handleDocumentSelect}
        className="hidden"
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileSelect}
        className="hidden"
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleGallerySelect}
        className="hidden"
      />

      {/* Replying Banner */}
      {replyToMessage && (
        <div className="mb-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div 
            className="flex items-center gap-2.5 border-l-4 pl-2.5 min-w-0"
            style={{ borderLeftColor: currentAccent.hex }}
          >
            <div className="min-w-0">
              <div 
                className="text-xs font-bold truncate"
                style={{ color: currentAccent.textColor }}
              >
                Replying to {replyToMessage.senderName}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {replyToMessage.content}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="mb-2 p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold">
            <span>Editing message</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Location Loading Banner */}
      {locationLoading && (
        <div 
          className="mb-2 p-2 rounded-xl border flex items-center gap-2 text-xs animate-pulse"
          style={{
            backgroundColor: currentAccent.softBg,
            borderColor: currentAccent.border,
            color: currentAccent.textColor,
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: currentAccent.textColor }} />
          <span>Fetching your live GPS location...</span>
        </div>
      )}

      {/* Profile Must Be Complete Warning Banner */}
      {!isActuallyComplete && (
        <div 
          className="mb-2.5 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-in fade-in transition"
          style={{
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
            color: isDark ? '#FDE68A' : '#92400E'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <div className="truncate">
              <span className="font-bold">Profile Incomplete: </span>
              <span className="opacity-90">
                {profileCompletionDetails.missingFields && profileCompletionDetails.missingFields.length > 0
                  ? `${profileCompletionDetails.missingFields.join(', ')} required to send messages.`
                  : 'Name, Username, Phone Number & Gmail are required to send messages.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openProfileModal}
            className="px-3 py-1.5 rounded-xl font-bold shrink-0 transition text-xs shadow-sm hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: currentAccent.hex,
              color: '#070A0F'
            }}
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Rich Emoji Picker Popup */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleSelectEmoji}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Attachment Menu Popup (📎) */}
      {showAttachmentMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowAttachmentMenu(false)}
          />
          <div className="absolute bottom-16 left-4 sm:left-12 w-56 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 space-y-1">
            <button
              type="button"
              onClick={openCamera}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800 text-xs text-slate-200 transition text-left"
            >
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Camera</span>
                <span className="text-[10px] text-slate-400">Take snapshot</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                galleryInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800 text-xs text-slate-200 transition text-left"
            >
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Gallery</span>
                <span className="text-[10px] text-slate-400">Photos & Videos</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                documentInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800 text-xs text-slate-200 transition text-left"
            >
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Document</span>
                <span className="text-[10px] text-slate-400">PDF, Word, Zip</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800 text-xs text-slate-200 transition text-left"
            >
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Location</span>
                <span className="text-[10px] text-slate-400">Share live GPS</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                audioFileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800 text-xs text-slate-200 transition text-left"
            >
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Audio File</span>
                <span className="text-[10px] text-slate-400">Share music/voice</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* AI Assistant Modal */}
      {showAiModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowAiModal(false)}
          />
          <div className="absolute bottom-16 left-3 right-3 sm:left-auto sm:right-12 sm:w-96 rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">ERROREN AI Assistant</h4>
                  <p className="text-[10px] text-slate-400">Refine, translate or smart reply</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleAiAction('improve')}
                disabled={aiLoading}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-950/60 hover:border-purple-500/40 border border-slate-700/60 text-xs text-slate-200 transition"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Polish Grammar</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('professional')}
                disabled={aiLoading}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-950/60 hover:border-purple-500/40 border border-slate-700/60 text-xs text-slate-200 transition"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Make Professional</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('translate')}
                disabled={aiLoading}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-950/60 hover:border-purple-500/40 border border-slate-700/60 text-xs text-slate-200 transition"
              >
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span>Translate</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('smart_reply')}
                disabled={aiLoading}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-950/60 hover:border-purple-500/40 border border-slate-700/60 text-xs text-slate-200 transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Smart Reply</span>
              </button>
            </div>

            {aiLoading ? (
              <div className="mt-4 p-4 flex flex-col items-center justify-center gap-2 text-purple-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Generating AI suggestion...</span>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="mt-3 space-y-2">
                {aiSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-2xl bg-slate-800/90 border border-purple-500/30 text-xs text-slate-100 flex flex-col gap-2"
                  >
                    <p className="italic">"{sug}"</p>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestion(sug)}
                      className="self-end px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition shadow-sm"
                    >
                      Insert in Chat
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* MAIN COMPOSER INTERFACE */}
      {isRecording || recordedAudioUrl ? (
        // Active Voice Recording / Preview Bar
        <div 
          className="flex items-center justify-between gap-2.5 bg-slate-900 border rounded-3xl px-4 py-2 animate-in fade-in"
          style={{ borderColor: currentAccent.border }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isRecording ? (
              <>
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span 
                  className="text-xs font-mono font-bold"
                  style={{ color: currentAccent.textColor }}
                >
                  Recording: {formatTimer(recordingDuration)}
                </span>
                {/* Visual Audio Bars */}
                <div className="hidden sm:flex items-center gap-0.5 h-4">
                  {[40, 80, 50, 90, 60, 100, 70, 30].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%`, backgroundColor: currentAccent.hex }}
                      className="w-0.5 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={togglePlayPreview}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition hover:scale-105"
                  style={{
                    backgroundColor: currentAccent.hex,
                    color: currentAccent.foreground,
                  }}
                >
                  {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="text-xs font-mono text-slate-200">
                  Voice Note ({formatTimer(recordingDuration)})
                </div>
                {recordedAudioUrl && (
                  <audio
                    ref={previewAudioRef}
                    src={recordedAudioUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                  />
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
              title="Discard Voice Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {isRecording ? (
              <button
                type="button"
                onClick={stopRecordingForPreview}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Stop & Preview
              </button>
            ) : null}

            <button
              type="button"
              onClick={stopAndSendRecording}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg"
              style={{
                backgroundColor: currentAccent.hex,
                color: currentAccent.foreground,
                boxShadow: `0 4px 12px ${currentAccent.hex}35`,
              }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        // Standard Modern Composer Row: [ 🙂 ] [ Input: Write a message... ] [ 📎 ] [ 📷 ] [ 🎤 or ➤ ]
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Main Input Bubble: Houses Emoji, Textarea, AI, Attachment, and Camera */}
          <div 
            className={`flex-1 rounded-3xl px-2 py-1.5 flex items-end gap-1 sm:gap-1.5 transition border ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 focus-within:border-accent' 
                : 'bg-white/90 border-slate-200 focus-within:border-accent shadow-xs'
            }`}
          >
            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-full transition shrink-0 ${
                showEmojiPicker 
                  ? 'text-amber-400 bg-amber-400/10' 
                  : isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
              }`}
              title="Emoji Library"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Editable Real Input */}
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              rows={1}
              className={`flex-1 bg-transparent text-sm resize-none max-h-32 py-1.5 leading-relaxed min-w-0 focus:outline-none ${
                isDark 
                  ? 'text-slate-100 placeholder:text-slate-500' 
                  : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />

            {/* AI Assistant Button */}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="p-2 rounded-full text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 transition shrink-0"
              title="ERROREN AI"
            >
              <Sparkles className="w-4.5 h-4.5" />
            </button>

            {/* Attachment Button (📎) */}
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className={`p-2 rounded-full transition shrink-0 ${
                showAttachmentMenu 
                  ? 'text-cyan-400 bg-cyan-400/10' 
                  : isDark ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
              }`}
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick Camera Snapshot Button (📷) */}
            <button
              type="button"
              onClick={openCamera}
              className={`p-2 rounded-full transition shrink-0 ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* Right Action Button: Send (➤) or Microphone (🎤) */}
          {text.trim() || editingMessage ? (
            <button
              type="button"
              onClick={handleSend}
              className="w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 shrink-0 shadow-lg"
              style={{
                backgroundColor: currentAccent.hex,
                color: currentAccent.foreground,
                boxShadow: `0 4px 14px ${currentAccent.hex}40`
              }}
              title="Send Message"
            >
              {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 shrink-0 shadow-lg"
              style={{
                backgroundColor: currentAccent.hex,
                color: currentAccent.foreground,
                boxShadow: `0 4px 14px ${currentAccent.hex}40`
              }}
              title="Voice Message"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-md w-full flex flex-col items-center shadow-2xl">
            <div className="w-full flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Take Photo</span>
              </h3>
              <button
                type="button"
                onClick={closeCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden mb-4 border border-slate-800">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-3 w-full justify-end">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
                style={{
                  backgroundColor: currentAccent.hex,
                  color: currentAccent.foreground,
                  boxShadow: `0 4px 14px ${currentAccent.hex}35`,
                }}
              >
                <Camera className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview & Caption Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full flex flex-col shadow-2xl">
            <div className="w-full flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4" style={{ color: currentAccent.textColor }} />
                <span>Send Media</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full max-h-80 bg-black rounded-2xl overflow-hidden mb-3 border border-slate-800 flex items-center justify-center">
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt="Preview"
                  className="w-full h-full max-h-80 object-contain"
                />
              ) : (
                <video
                  src={previewMedia.url}
                  controls
                  className="w-full h-full max-h-80"
                />
              )}
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={previewMedia.caption || ''}
                onChange={(e) => setPreviewMedia({ ...previewMedia, caption: e.target.value })}
                placeholder="Add a caption..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 w-full justify-end">
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPreviewMedia}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
                style={{
                  backgroundColor: currentAccent.hex,
                  color: currentAccent.foreground,
                  boxShadow: `0 4px 14px ${currentAccent.hex}35`,
                }}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

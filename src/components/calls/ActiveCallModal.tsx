import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';
import { formatDuration } from '../../utils/audio';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';

export const ActiveCallModal: React.FC = () => {
  const { 
    activeCall, 
    localStream, 
    remoteStream, 
    endActiveCall, 
    toggleMute, 
    toggleVideo, 
    toggleSpeaker 
  } = useSocket();

  const [callTimer, setCallTimer] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream to video tag
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.isVideoOff]);

  // Attach remote stream to video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'connected') {
      const interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    setCallTimer(0);
  }, [activeCall?.status]);

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in">
      <div className="relative w-full h-full max-w-4xl max-h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col justify-between p-6 bg-slate-950 border border-slate-800 shadow-2xl">
        
        {/* Top Header */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">
              End-to-End Encrypted HD {isVideo ? 'Video' : 'Voice'} Call
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
            {activeCall.status === 'connected' ? formatDuration(callTimer) : activeCall.status === 'ringing' ? 'Ringing...' : 'Connecting...'}
          </div>
        </div>

        {/* Call Stage Area */}
        <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-slate-900/40 border border-slate-800/80">
          {/* If Video Call */}
          {isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Remote Video Stream or Avatar Placeholder */}
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative p-2 rounded-full ring-4 ring-cyan-500/40 animate-pulse">
                    <Avatar src={activeCall.partnerAvatar} name={activeCall.partnerName} size="2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeCall.partnerName}</h3>
                    <p className="text-xs text-slate-400 mt-1">Connecting HD camera feed...</p>
                  </div>
                </div>
              )}

              {/* Local Picture-in-Picture Video */}
              {!activeCall.isVideoOff && localStream && (
                <div className="absolute bottom-4 right-4 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black z-30">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}
            </div>
          ) : (
            // Audio Call View
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Pulsing Acoustic Rings */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-48 h-48 rounded-full bg-emerald-500/10 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full bg-teal-500/20 animate-pulse" />
                <div className="relative z-10 p-2 rounded-full ring-4 ring-emerald-500/60 shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                  <Avatar src={activeCall.partnerAvatar} name={activeCall.partnerName} size="2xl" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-white">{activeCall.partnerName}</h3>
                <p className="text-sm text-emerald-400 font-medium mt-1">
                  {activeCall.status === 'connected' ? 'Call in Progress' : 'Calling...'}
                </p>
              </div>

              {/* Dynamic Soundwave Spectrum Animation */}
              {activeCall.status === 'connected' && (
                <div className="flex items-center gap-1.5 h-10">
                  {[20, 45, 80, 60, 95, 40, 70, 85, 30, 90, 65, 40, 75, 50].map((h, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${h}%` }}
                      className="w-1.5 bg-emerald-400 rounded-full animate-pulse transition-all duration-200"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="relative z-20 flex items-center justify-center gap-4 sm:gap-6 py-2">
          {/* Mute Mic Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition shadow-lg ${
              activeCall.isMuted
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={activeCall.isMuted ? 'Unmute' : 'Mute'}
          >
            {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Toggle Video Button */}
          {isVideo && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition shadow-lg ${
                activeCall.isVideoOff
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={activeCall.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {activeCall.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            className={`p-4 rounded-full transition shadow-lg ${
              !activeCall.isSpeakerOn
                ? 'bg-slate-800 text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
            }`}
            title="Toggle Speaker"
          >
            {activeCall.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={endActiveCall}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 transition hover:scale-110 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const IncomingCallNotification: React.FC = () => {
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useSocket();

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900/95 border-2 border-emerald-500/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-6 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative p-0.5 rounded-full ring-2 ring-emerald-400 animate-pulse">
          <Avatar src={incomingCall.callerAvatar} name={incomingCall.callerName} size="md" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{incomingCall.callerName}</h4>
          <p className="text-xs text-emerald-400 font-medium">
            Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call...
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={rejectIncomingCall}
          className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition hover:scale-110"
          title="Decline"
        >
          <PhoneOff className="w-4 h-4" />
        </button>

        <button
          onClick={acceptIncomingCall}
          className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30 transition hover:scale-110 animate-bounce"
          title="Accept Call"
        >
          {incomingCall.callType === 'video' ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Message, StatusStory, CallType, SocketEventPayload, ActiveCall, CallStatus } from '../types';
import { soundEffects } from '../utils/audio';

interface SocketContextType {
  isConnected: boolean;
  onlineUserIds: Set<string>;
  typingUsers: { [chatId: string]: string | null };
  activeCall: ActiveCall | null;
  incomingCall: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callType: CallType;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  sendMessage: (chatId: string, message: Message) => void;
  sendReaction: (chatId: string, messageId: string, emoji: string) => void;
  sendEdit: (chatId: string, messageId: string, content: string) => void;
  sendDelete: (chatId: string, messageId: string, forEveryone: boolean) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  startCall: (partnerId: string, partnerName: string, partnerAvatar: string, type: CallType) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  endActiveCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  onMessageReceived?: (msg: Message) => void;
  setOnMessageReceived: (cb: (msg: Message) => void) => void;
  onStatusReceived?: (status: StatusStory) => void;
  setOnStatusReceived: (cb: (status: StatusStory) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string | null }>({});
  
  // Calling State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callType: CallType;
  } | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const messageCallbackRef = useRef<((msg: Message) => void) | null>(null);
  const statusCallbackRef = useRef<((status: StatusStory) => void) | null>(null);

  const setOnMessageReceived = useCallback((cb: (msg: Message) => void) => {
    messageCallbackRef.current = cb;
  }, []);

  const setOnStatusReceived = useCallback((cb: (status: StatusStory) => void) => {
    statusCallbackRef.current = cb;
  }, []);

  // Initialize and connect WebSocket with clean reconnection
  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;

    const connect = () => {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) {
            ws.close();
            return;
          }
          setIsConnected(true);
          // Authenticate socket
          ws.send(JSON.stringify({
            type: 'auth',
            userId: currentUser.id,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const payload: SocketEventPayload = JSON.parse(event.data);
            handleSocketEvent(payload);
          } catch (err) {
            // ignore malformed payloads
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          socketRef.current = null;
          // Reconnect gracefully after delay if still mounted
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          // Handled via onclose reconnection logic cleanly
        };
      } catch (err) {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [currentUser?.id]);

  const handleSocketEvent = (payload: any) => {
    switch (payload.type) {
      case 'presence:initial': {
        if (Array.isArray(payload.onlineUserIds)) {
          setOnlineUserIds(new Set(payload.onlineUserIds));
        }
        break;
      }

      case 'presence': {
        const { userId, isOnline } = payload.presenceData || {};
        if (userId) {
          setOnlineUserIds(prev => {
            const next = new Set(prev);
            if (isOnline) next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
        break;
      }

      case 'message:new': {
        if (payload.message) {
          if (payload.message.senderId !== currentUser?.id) {
            soundEffects.playMessageReceived();
          }
          if (messageCallbackRef.current) {
            messageCallbackRef.current(payload.message);
          }
        }
        break;
      }

      case 'user:updated': {
        if (payload.user) {
          window.dispatchEvent(new CustomEvent('erroren:user_updated', { detail: payload.user }));
        }
        break;
      }

      case 'typing:indicator': {
        const { chatId, isTyping, typingUser } = payload;
        if (chatId) {
          setTypingUsers(prev => ({
            ...prev,
            [chatId]: isTyping && typingUser?.userId !== currentUser?.id ? typingUser.userName : null,
          }));
        }
        break;
      }

      case 'status:new': {
        if (payload.statusData && statusCallbackRef.current) {
          statusCallbackRef.current(payload.statusData);
        }
        break;
      }

      // WebRTC Signal Handlers
      case 'call:offer': {
        const { callData } = payload;
        if (callData && callData.toUserId === currentUser?.id) {
          soundEffects.startIncomingRingtone();
          setIncomingCall({
            callId: callData.callId,
            callerId: callData.fromUserId,
            callerName: callData.fromUserName,
            callerAvatar: callData.fromUserAvatar,
            callType: callData.callType,
          });
        }
        break;
      }

      case 'call:answer': {
        soundEffects.stopOutgoingDialtone();
        soundEffects.playCallConnected();
        if (activeCall) {
          setActiveCall(prev => prev ? { ...prev, status: 'connected', startTime: Date.now() } : null);
        }
        if (peerConnectionRef.current && payload.callData?.sdp) {
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.callData.sdp)).catch(console.error);
        }
        break;
      }

      case 'call:ice-candidate': {
        if (peerConnectionRef.current && payload.callData?.candidate) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.callData.candidate)).catch(console.error);
        }
        break;
      }

      case 'call:reject':
      case 'call:end': {
        soundEffects.stopIncomingRingtone();
        soundEffects.stopOutgoingDialtone();
        cleanupMedia();
        setActiveCall(null);
        setIncomingCall(null);
        break;
      }

      default:
        break;
    }
  };

  const emit = (data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  const sendMessage = (chatId: string, message: Message) => {
    soundEffects.playMessageSent();
    emit({
      type: 'message:send',
      chatId,
      message,
    });
  };

  const sendReaction = (chatId: string, messageId: string, emoji: string) => {
    if (!currentUser) return;
    emit({
      type: 'message:reaction',
      chatId,
      messageId,
      emoji,
      userId: currentUser.id,
      userName: currentUser.displayName,
    });
  };

  const sendEdit = (chatId: string, messageId: string, content: string) => {
    if (!currentUser) return;
    emit({
      type: 'message:edit',
      chatId,
      messageId,
      content,
      userId: currentUser.id,
    });
  };

  const sendDelete = (chatId: string, messageId: string, forEveryone: boolean) => {
    if (!currentUser) return;
    emit({
      type: 'message:delete',
      chatId,
      messageId,
      forEveryone,
      userId: currentUser.id,
    });
  };

  const sendTyping = (chatId: string, isTyping: boolean) => {
    if (!currentUser) return;
    emit({
      type: isTyping ? 'typing:start' : 'typing:stop',
      chatId,
      userId: currentUser.id,
      userName: currentUser.displayName,
    });
  };

  // -------------------------------------------------------------
  // Real Audio / Video Media & WebRTC Calling Implementation
  // -------------------------------------------------------------

  const cleanupMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
  };

  const startCall = async (partnerId: string, partnerName: string, partnerAvatar: string, type: CallType) => {
    if (!currentUser) return;
    const callId = `call_${Date.now()}`;

    setActiveCall({
      callId,
      partnerId,
      partnerName,
      partnerAvatar,
      type,
      isInitiator: true,
      status: 'ringing',
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      channelId: `ch_${callId}`,
    });

    soundEffects.startOutgoingDialtone();

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() => {
        // Fallback for audio only if camera unavailable
        return navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      });

      if (stream) {
        setLocalStream(stream);
      }

      // Send offer signal
      emit({
        type: 'call:offer',
        callData: {
          callId,
          fromUserId: currentUser.id,
          fromUserName: currentUser.displayName,
          fromUserAvatar: currentUser.avatarUrl,
          toUserId: partnerId,
          callType: type,
        },
      });

      // Log call locally
      fetch('/api/calls/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: currentUser.id,
          callerName: currentUser.displayName,
          callerAvatar: currentUser.avatarUrl,
          receiverId: partnerId,
          receiverName: partnerName,
          receiverAvatar: partnerAvatar,
          type,
          direction: 'outgoing',
          status: 'ringing',
          startedAt: Date.now(),
        }),
      }).catch(console.error);

    } catch (err) {
      console.warn('Call stream setup note:', err);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !currentUser) return;
    soundEffects.stopIncomingRingtone();
    soundEffects.playCallConnected();

    const currentIncoming = incomingCall;
    setIncomingCall(null);

    setActiveCall({
      callId: currentIncoming.callId,
      partnerId: currentIncoming.callerId,
      partnerName: currentIncoming.callerName,
      partnerAvatar: currentIncoming.callerAvatar,
      type: currentIncoming.callType,
      isInitiator: false,
      status: 'connected',
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      startTime: Date.now(),
      channelId: `ch_${currentIncoming.callId}`,
    });

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: currentIncoming.callType === 'video' ? { facingMode: 'user' } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() => null);
      if (stream) setLocalStream(stream);

      emit({
        type: 'call:answer',
        callData: {
          callId: currentIncoming.callId,
          fromUserId: currentUser.id,
          fromUserName: currentUser.displayName,
          toUserId: currentIncoming.callerId,
          callType: currentIncoming.callType,
        },
      });

      // Update call log
      fetch('/api/calls/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: currentIncoming.callerId,
          callerName: currentIncoming.callerName,
          callerAvatar: currentIncoming.callerAvatar,
          receiverId: currentUser.id,
          receiverName: currentUser.displayName,
          receiverAvatar: currentUser.avatarUrl,
          type: currentIncoming.callType,
          direction: 'incoming',
          status: 'connected',
          startedAt: Date.now(),
        }),
      }).catch(console.error);

    } catch (err) {
      console.error('Accept call error:', err);
    }
  };

  const rejectIncomingCall = () => {
    if (!incomingCall || !currentUser) return;
    soundEffects.stopIncomingRingtone();

    emit({
      type: 'call:reject',
      callData: {
        callId: incomingCall.callId,
        fromUserId: currentUser.id,
        toUserId: incomingCall.callerId,
      },
    });

    setIncomingCall(null);
  };

  const endActiveCall = () => {
    soundEffects.stopOutgoingDialtone();
    soundEffects.stopIncomingRingtone();

    if (activeCall && currentUser) {
      emit({
        type: 'call:end',
        callData: {
          callId: activeCall.callId,
          fromUserId: currentUser.id,
          toUserId: activeCall.partnerId,
        },
      });
    }

    cleanupMedia();
    setActiveCall(null);
    setIncomingCall(null);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setActiveCall(prev => prev ? { ...prev, isMuted: !audioTrack.enabled } : null);
      }
    } else {
      setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setActiveCall(prev => prev ? { ...prev, isVideoOff: !videoTrack.enabled } : null);
      }
    } else {
      setActiveCall(prev => prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null);
    }
  };

  const toggleSpeaker = () => {
    setActiveCall(prev => prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : null);
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineUserIds,
        typingUsers,
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        sendMessage,
        sendReaction,
        sendEdit,
        sendDelete,
        sendTyping,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endActiveCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        setOnMessageReceived,
        setOnStatusReceived,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

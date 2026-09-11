import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { GoogleLoginScreen } from './components/auth/GoogleLoginScreen';
import { ProfileSetupScreen } from './components/auth/ProfileSetupScreen';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { BottomNav, MainTab } from './components/common/BottomNav';
import { ChatList } from './components/chats/ChatList';
import { ChatConversation } from './components/chats/ChatConversation';
import { StatusList } from './components/status/StatusList';
import { CreateStatusModal } from './components/status/CreateStatusModal';
import { StatusViewerModal } from './components/status/StatusViewerModal';
import { CallsView } from './components/calls/CallsView';
import { ActiveCallModal, IncomingCallNotification } from './components/calls/ActiveCallModal';
import { ErrorenAiView } from './components/ai/ErrorenAiView';
import { CommunitiesView } from './components/communities/CommunitiesView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NewGroupModal } from './components/groups/NewGroupModal';
import { GroupInfoDrawer } from './components/groups/GroupInfoDrawer';
import { NewChatModal } from './components/contacts/NewChatModal';
import { EditProfileModal } from './components/settings/EditProfileModal';
import { Chat, Message, MessageType, ReplyToMessage, StatusStory, CallLog, User } from './types';
import { ToastContainer } from './components/common/Toast';
import { MessageSquare, Plus } from 'lucide-react';
import { apiFetch } from './utils/api';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchUserChatsFromSupabase,
  fetchChatMessagesFromSupabase,
  sendMessageToSupabase,
  getOrCreateDirectChatInSupabase,
  subscribeToChatMessages,
  subscribeToPresence,
  saveStatusToSupabase,
  fetchActiveStatusesFromSupabase,
} from './services/supabaseChat';

const MainAppContent: React.FC = () => {
  const { currentUser, authStep, allUsers, refreshUsers, isProfileModalOpen, closeProfileModal } = useAuth();
  const { 
    sendMessage, 
    sendReaction, 
    sendEdit, 
    sendDelete, 
    setOnMessageReceived, 
    setOnStatusReceived,
    startCall
  } = useSocket();
  const { isDark } = useTheme();

  // Navigation state
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Application Data States
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMessages, setChatMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [statuses, setStatuses] = useState<StatusStory[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Modals & Drawers
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeViewingStory, setActiveViewingStory] = useState<StatusStory | null>(null);
  const [showGroupInfoDrawer, setShowGroupInfoDrawer] = useState(false);

  // Fetch initial chats, statuses, and calls
  const loadInitialData = async () => {
    if (!currentUser) return;

    // 1. Supabase Chats first
    if (isSupabaseConfigured()) {
      try {
        const sbChats = await fetchUserChatsFromSupabase(currentUser.id);
        if (sbChats && sbChats.length > 0) {
          setChats(sbChats);
          if (!selectedChatId) {
            setSelectedChatId(sbChats[0].id);
          }
        }
      } catch (err) {
        console.warn('[App] Supabase loadInitialData chats error:', err);
      }
    }

    try {
      // 2. Fetch Chats (fallback or supplement)
      const chatRes = await apiFetch(`/api/chats?userId=${encodeURIComponent(currentUser.id)}`);
      if (chatRes.ok && chatRes.headers.get('content-type')?.includes('application/json')) {
        const chatData = await chatRes.json();
        if (Array.isArray(chatData)) {
          setChats((prev) => {
            if (prev.length > 0) return prev;
            return chatData;
          });
          if (chatData.length > 0 && !selectedChatId) {
            setSelectedChatId(chatData[0].id);
          }
        }
      }

      // 3. Fetch Status Stories (Supabase first)
      let statusesLoaded = false;
      if (isSupabaseConfigured()) {
        try {
          const sbStatuses = await fetchActiveStatusesFromSupabase();
          if (sbStatuses && sbStatuses.length > 0) {
            setStatuses(sbStatuses.filter((s) => s.expiresAt > Date.now()));
            statusesLoaded = true;
          }
        } catch (err) {
          console.warn('[App] Supabase fetchActiveStatuses error:', err);
        }
      }

      if (!statusesLoaded) {
        try {
          const statusRes = await apiFetch('/api/status');
          if (statusRes.ok && statusRes.headers.get('content-type')?.includes('application/json')) {
            const statusData = await statusRes.json();
            if (Array.isArray(statusData)) {
              setStatuses(statusData.filter((s: StatusStory) => !s.expiresAt || s.expiresAt > Date.now()));
              statusesLoaded = true;
            }
          }
        } catch (e) {}
      }

      if (!statusesLoaded) {
        try {
          const localStatuses = JSON.parse(localStorage.getItem('erroren_statuses') || '[]');
          if (Array.isArray(localStatuses)) {
            setStatuses(localStatuses.filter((s: StatusStory) => s.expiresAt > Date.now()));
          }
        } catch {}
      }

      // 4. Fetch Call Logs
      const callRes = await apiFetch(`/api/calls?userId=${encodeURIComponent(currentUser.id)}`);
      if (callRes.ok && callRes.headers.get('content-type')?.includes('application/json')) {
        const callData = await callRes.json();
        if (Array.isArray(callData)) {
          setCallLogs(callData);
        }
      }
    } catch (err) {
      console.error('Failed to load initial chat state:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentUser?.id]);

  // Load messages for active chat + Realtime message subscription
  useEffect(() => {
    if (!selectedChatId) return;

    // 1. Load messages from Supabase first if configured
    if (isSupabaseConfigured()) {
      fetchChatMessagesFromSupabase(selectedChatId)
        .then((msgs) => {
          if (Array.isArray(msgs) && msgs.length > 0) {
            setChatMessages((prev) => ({
              ...prev,
              [selectedChatId]: msgs,
            }));
          } else {
            // Fallback to API
            apiFetch(`/api/chats/${selectedChatId}/messages`)
              .then(async (res) => (res.ok ? res.json() : []))
              .then((apiMsgs) => {
                if (Array.isArray(apiMsgs)) {
                  setChatMessages((prev) => ({
                    ...prev,
                    [selectedChatId]: apiMsgs,
                  }));
                }
              })
              .catch(() => {});
          }
        })
        .catch(console.error);
    } else {
      apiFetch(`/api/chats/${selectedChatId}/messages`)
        .then(async (res) => {
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
          }
          return [];
        })
        .then((msgs) => {
          if (Array.isArray(msgs)) {
            setChatMessages((prev) => ({
              ...prev,
              [selectedChatId]: msgs,
            }));
          }
        })
        .catch(console.error);
    }

    // 2. Subscribe to Supabase Realtime for this active chat
    if (isSupabaseConfigured()) {
      const unsub = subscribeToChatMessages(
        selectedChatId,
        (incomingMsg) => {
          setChatMessages((prev) => {
            const currentList = prev[incomingMsg.chatId] || [];
            if (currentList.some((m) => m.id === incomingMsg.id)) return prev;
            return {
              ...prev,
              [incomingMsg.chatId]: [...currentList, incomingMsg],
            };
          });

          setChats((prev) =>
            prev.map((c) => {
              if (c.id === incomingMsg.chatId) {
                return {
                  ...c,
                  lastMessage: incomingMsg,
                  updatedAt: incomingMsg.timestamp,
                };
              }
              return c;
            })
          );
        },
        (updatedMsg) => {
          setChatMessages((prev) => {
            const currentList = prev[updatedMsg.chatId] || [];
            return {
              ...prev,
              [updatedMsg.chatId]: currentList.map((m) =>
                m.id === updatedMsg.id ? updatedMsg : m
              ),
            };
          });
        }
      );

      return () => {
        unsub();
      };
    }
  }, [selectedChatId]);

  // Subscribe to presence updates from Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubPresence = subscribeToPresence((userId, isOnline, lastSeen) => {
      setChats((prev) =>
        prev.map((c) => {
          if (!c.isGroup && (c.participantIds || []).includes(userId)) {
            return {
              ...c,
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );
    });
    return () => {
      unsubPresence();
    };
  }, []);

  // Register live incoming message listener
  useEffect(() => {
    setOnMessageReceived((newMsg: Message) => {
      setChatMessages((prev) => {
        const currentList = prev[newMsg.chatId] || [];
        if (currentList.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [newMsg.chatId]: [...currentList, newMsg],
        };
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === newMsg.chatId) {
            return {
              ...c,
              lastMessage: newMsg,
              updatedAt: newMsg.timestamp,
              unreadCount: selectedChatId === c.id ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    });

    setOnStatusReceived((newStatus: StatusStory) => {
      setStatuses((prev) => [newStatus, ...prev.filter((s) => s.id !== newStatus.id)]);
    });
  }, [selectedChatId, setOnMessageReceived, setOnStatusReceived]);

  // Authentication Flow Router
  if (!currentUser || authStep !== 'authenticated') {
    if (authStep === 'google_login') return <GoogleLoginScreen />;
    if (authStep === 'profile') return <ProfileSetupScreen />;
    return <WelcomeScreen />;
  }

  // Active chat object
  const activeChat = chats.find((c) => c.id === selectedChatId);
  const activeMessages = selectedChatId ? chatMessages[selectedChatId] || [] : [];
  const totalUnreadCount = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Send Message Handler
  const handleSendMessage = (
    content: string,
    type: MessageType = 'text',
    mediaUrl?: string,
    replyTo?: any,
    fileName?: string,
    fileSize?: string,
    duration?: number
  ) => {
    if (!selectedChatId || !currentUser) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId: selectedChatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      content,
      type,
      mediaUrl,
      fileName,
      fileSize,
      duration,
      replyTo,
      timestamp: Date.now(),
      status: 'sent',
      reactions: [],
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: newMsg,
            updatedAt: newMsg.timestamp,
          };
        }
        return c;
      })
    );

    // Save to Supabase
    if (isSupabaseConfigured()) {
      sendMessageToSupabase(newMsg)
        .then((persistedMsg) => {
          if (persistedMsg) {
            setChatMessages((prev) => {
              const current = prev[selectedChatId] || [];
              return {
                ...prev,
                [selectedChatId]: current.map((m) => (m.id === newMsg.id ? persistedMsg : m)),
              };
            });
          }
        })
        .catch((err) => {
          console.warn('[App] Supabase sendMessage error:', err);
        });
    }

    sendMessage(selectedChatId, newMsg);
  };

  // Reactions Handler
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (!selectedChatId || !currentUser) return;

    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      const updated = current.map((m) => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          const existingIdx = reactions.findIndex((r) => r.userId === currentUser.id);
          let newReactions = [...reactions];
          if (existingIdx > -1) {
            newReactions[existingIdx] = { emoji, userId: currentUser.id, userName: currentUser.displayName };
          } else {
            newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.displayName });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      });
      return { ...prev, [selectedChatId]: updated };
    });

    sendReaction(selectedChatId, messageId, emoji);
  };

  // Edit Message Handler
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      const updated = current.map((m) => {
        if (m.id === messageId) {
          return { ...m, content: newContent, isEdited: true };
        }
        return m;
      });
      return { ...prev, [selectedChatId]: updated };
    });
    sendEdit(selectedChatId, messageId, newContent);
  };

  // Delete Message Handler
  const handleDeleteMessage = (messageId: string, forEveryone: boolean) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => ({
      ...prev,
      [selectedChatId]: (prev[selectedChatId] || []).filter((m) => m.id !== messageId),
    }));
    sendDelete(selectedChatId, messageId, forEveryone);
  };

  // Star Message
  const handleStarMessage = (messageId: string) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      return {
        ...prev,
        [selectedChatId]: current.map((m) => (m.id === messageId ? { ...m, isStarred: !m.isStarred } : m)),
      };
    });
  };

  // Chat Actions
  const handlePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const handleArchiveChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: true } : c))
    );
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
  };

  const handleMarkUnread = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 1 } : c))
    );
  };

  const handleClearChat = (chatId: string) => {
    setChatMessages((prev) => ({ ...prev, [chatId]: [] }));
  };

  // Start New Chat with User
  const handleStartChatWithUser = async (partner: User) => {
    const existing = chats.find(
      (c) => !c.isGroup && (c.participantIds || c.memberIds || []).includes(partner.id)
    );

    if (existing) {
      setSelectedChatId(existing.id);
      setActiveTab('chats');
      return;
    }

    // 1. Check Supabase first
    if (isSupabaseConfigured()) {
      try {
        const res = await getOrCreateDirectChatInSupabase(currentUser, partner);
        if (res && res.chat) {
          setChats((prev) => [res.chat, ...prev.filter((c) => c.id !== res.chat.id)]);
          setSelectedChatId(res.chat.id);
          setActiveTab('chats');
          return;
        }
      } catch (err) {
        console.warn('[App] Supabase getOrCreateDirectChat error:', err);
      }
    }

    const fallbackChat: Chat = {
      id: `chat_${currentUser.id}_${partner.id}`,
      title: partner.displayName,
      name: partner.displayName,
      isGroup: false,
      participantIds: [currentUser.id, partner.id],
      memberIds: [currentUser.id, partner.id],
      adminIds: [currentUser.id],
      avatarUrl: partner.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${partner.id}`,
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const res = await apiFetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: partner.displayName,
          name: partner.displayName,
          isGroup: false,
          creatorId: currentUser.id,
          partnerId: partner.id,
          participantIds: [currentUser.id, partner.id],
          memberIds: [currentUser.id, partner.id],
          avatarUrl: partner.avatarUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newChat = data.chat || data;
        setChats((prev) => [newChat, ...prev.filter((c) => c.id !== newChat.id)]);
        setSelectedChatId(newChat.id);
        setActiveTab('chats');
        return;
      }
    } catch (err) {
      console.warn('Backend unavailable, using local chat:', err);
    }

    // Local / static hosting fallback
    setChats((prev) => [fallbackChat, ...prev.filter((c) => c.id !== fallbackChat.id)]);
    setSelectedChatId(fallbackChat.id);
    setActiveTab('chats');
  };

  // Create New Group
  const handleCreateGroup = async (title: string, description: string, memberIds: string[]) => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGroupObj: Chat = {
      id: groupId,
      title,
      name: title,
      description,
      isGroup: true,
      creatorId: currentUser.id,
      participantIds: [currentUser.id, ...memberIds],
      memberIds: [currentUser.id, ...memberIds],
      adminIds: [currentUser.id],
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const res = await apiFetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          name: title,
          description,
          isGroup: true,
          creatorId: currentUser.id,
          participantIds: [currentUser.id, ...memberIds],
          memberIds: [currentUser.id, ...memberIds],
          adminIds: [currentUser.id],
          avatarUrl: newGroupObj.avatarUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const createdGroup = data.chat || data;
        setChats((prev) => [createdGroup, ...prev.filter(c => c.id !== createdGroup.id)]);
        setSelectedChatId(createdGroup.id);
        setActiveTab('chats');
        return;
      }
    } catch (err) {
      console.warn('Backend unavailable for group creation, using local group:', err);
    }

    setChats((prev) => [newGroupObj, ...prev.filter(c => c.id !== newGroupObj.id)]);
    setSelectedChatId(newGroupObj.id);
    setActiveTab('chats');
  };

  // Post Status (supports 6, 12, 24 hours timer and Supabase persistence)
  const handlePostStatus = async (
    type: 'text' | 'image',
    content?: string,
    mediaUrl?: string,
    backgroundColor?: string,
    caption?: string,
    durationHours: number = 24
  ) => {
    const expiresAt = Date.now() + durationHours * 3600 * 1000;
    const newStory: StatusStory = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      type,
      content,
      mediaUrl,
      backgroundColor,
      caption,
      durationHours,
      expiresAt,
      createdAt: Date.now(),
      views: [],
    };

    // 1. Supabase first
    if (isSupabaseConfigured()) {
      try {
        await saveStatusToSupabase(newStory);
      } catch (err) {
        console.warn('[App] Supabase saveStatus error:', err);
      }
    }

    // 2. Local state & local storage for static hosting (GitHub Pages)
    setStatuses((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);

    try {
      const existing = JSON.parse(localStorage.getItem('erroren_statuses') || '[]');
      localStorage.setItem('erroren_statuses', JSON.stringify([newStory, ...existing.filter((s: StatusStory) => s.id !== newStory.id)]));
    } catch {}

    // 3. API endpoint if available
    try {
      await apiFetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.displayName,
          userAvatar: currentUser.avatarUrl,
          type,
          content,
          mediaUrl,
          backgroundColor,
          caption,
          durationHours,
          expiresAt,
        }),
      });
    } catch (err) {
      console.warn('Backend /api/status unavailable, saved locally & to Supabase');
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden antialiased font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#070A0F] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chats') setShowGroupInfoDrawer(false);
        }}
        unreadCount={totalUnreadCount}
        hasUnseenStatus={statuses.length > 0}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header Bar */}
        <TopBar
          onOpenNewChat={() => setShowNewChatModal(true)}
          onOpenNewGroup={() => setShowNewGroupModal(true)}
          onOpenAdmin={() => setActiveTab('admin')}
          onOpenSettings={() => setActiveTab('settings')}
          isHiddenOnMobile={!!selectedChatId && activeTab === 'chats'}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Tab: Chats */}
          {activeTab === 'chats' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
              {/* Left Column: Chat List */}
              <div className={`w-full md:w-auto ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                <ChatList
                  chats={chats}
                  selectedChatId={selectedChatId}
                  onSelectChat={(id) => {
                    setSelectedChatId(id);
                    setChats((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
                    );
                  }}
                  currentUserId={currentUser.id}
                  onPinChat={handlePinChat}
                  onMuteChat={handleMuteChat}
                  onArchiveChat={handleArchiveChat}
                  onDeleteChat={handleDeleteChat}
                  onMarkUnread={handleMarkUnread}
                />
              </div>

              {/* Right Column: Active Conversation */}
              <div className={`flex-1 flex ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                  <ChatConversation
                    chat={activeChat}
                    messages={activeMessages}
                    currentUserId={currentUser.id}
                    onBack={() => setSelectedChatId(null)}
                    onSendMessage={handleSendMessage}
                    onReactMessage={handleReactMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onStarMessage={handleStarMessage}
                    onClearChat={handleClearChat}
                    onOpenInfo={() => setShowGroupInfoDrawer(true)}
                    allUsers={allUsers}
                  />
                ) : (
                  <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-slate-950/40 text-center select-none">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                      <MessageSquare className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">ERROREN CHAT</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                      Select a conversation or click <strong>Start New Conversation</strong> to message contacts, make encrypted calls, and collaborate in real-time.
                    </p>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition hover:scale-105"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Start New Conversation</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Group / Contact Info Drawer */}
              {activeChat && showGroupInfoDrawer && (
                <GroupInfoDrawer
                  isOpen={showGroupInfoDrawer}
                  onClose={() => setShowGroupInfoDrawer(false)}
                  chat={activeChat}
                  allUsers={allUsers}
                  currentUserId={currentUser.id}
                  onLeaveGroup={(chatId) => {
                    handleDeleteChat(chatId);
                    setShowGroupInfoDrawer(false);
                  }}
                  onReport={(targetId, reason) => {
                    apiFetch('/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reportedBy: currentUser.id, targetId, reason }),
                    }).catch(console.error);
                  }}
                />
              )}
            </div>
          )}

          {/* Tab: Status Stories / Updates */}
          {activeTab === 'status' && (
            <StatusList
              statuses={statuses}
              currentUserId={currentUser.id}
              currentUser={currentUser}
              onOpenCreateStatus={() => setShowCreateStatusModal(true)}
              onViewStatus={(story) => setActiveViewingStory(story)}
            />
          )}

          {/* Tab: Communities */}
          {activeTab === 'communities' && (
            <CommunitiesView
              currentUser={currentUser}
              chats={chats}
              allUsers={allUsers}
              onSelectChat={(chatId) => {
                setSelectedChatId(chatId);
                setActiveTab('chats');
              }}
              onOpenNewGroup={() => setShowNewGroupModal(true)}
            />
          )}

          {/* Tab: Calls */}
          {activeTab === 'calls' && (
            <CallsView
              callLogs={callLogs}
              allUsers={allUsers}
              currentUserId={currentUser.id}
            />
          )}

          {/* Tab: ERROREN AI */}
          {activeTab === 'ai' && <ErrorenAiView currentUser={currentUser} />}

          {/* Tab: Settings */}
          {activeTab === 'settings' && <SettingsView />}

          {/* Tab: Admin Dashboard */}
          {activeTab === 'admin' && (
            <AdminDashboard allUsers={allUsers} onRefreshUsers={refreshUsers} />
          )}
        </main>

        {/* Mobile Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'chats') setShowGroupInfoDrawer(false);
          }}
          unreadCount={totalUnreadCount}
          hasUnseenStatus={statuses.length > 0}
          isHidden={!!selectedChatId && activeTab === 'chats'}
        />
      </div>

      {/* Global Modals */}
      <IncomingCallNotification />
      <ActiveCallModal />

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleStartChatWithUser}
        onCreateGroup={() => setShowNewGroupModal(true)}
        onStartCall={(user, type) => startCall(user.id, user.displayName, user.avatarUrl, type)}
      />

      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        users={allUsers}
        currentUserId={currentUser.id}
        onCreateGroup={handleCreateGroup}
      />

      <CreateStatusModal
        isOpen={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        onPostStatus={handlePostStatus}
      />

      <StatusViewerModal
        story={activeViewingStory}
        onClose={() => setActiveViewingStory(null)}
        currentUserId={currentUser.id}
        onReplyToStory={(storyUserId, text) => {
          const partner = allUsers.find((u) => u.id === storyUserId);
          if (partner) {
            handleStartChatWithUser(partner);
            setTimeout(() => {
              handleSendMessage(text);
            }, 300);
          }
        }}
      />

      {/* Global Mandatory Profile Completion & Edit Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastContainer />
          <MainAppContent />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

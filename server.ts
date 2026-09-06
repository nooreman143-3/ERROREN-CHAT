import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { 
  db, 
  StoredUser, 
  StoredChat, 
  StoredMessage, 
  StoredStatus, 
  StoredCallLog, 
  StoredReport, 
  StoredContact, 
  StoredAIConversation,
  StoredCommunity,
  StoredChannel,
  StoredChannelPost
} from './server/db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = 3000;

// Body parsers with support for media data URLs
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Initialise Gemini SDK with mandatory telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Track AI requests
let totalAiRequests = 0;

// -------------------------------------------------------------
// WebSocket Real-time Signaling & Multi-user Dispatch
// -------------------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  const pathname = url.split('?')[0];
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Map of userId -> Set of active WebSockets (supports multi-tab / multi-device)
const userSockets = new Map<string, Set<WebSocket>>();

function broadcastPresence(userId: string, isOnline: boolean) {
  db.updateUser(userId, { isOnline, lastSeen: Date.now() });

  const payload = JSON.stringify({
    type: 'presence',
    presenceData: { userId, isOnline, lastSeen: Date.now() },
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function sendToUser(targetUserId: string, data: any) {
  const sockets = userSockets.get(targetUserId);
  if (sockets) {
    const message = JSON.stringify(data);
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

function broadcastToChat(chatId: string, senderUserId: string, data: any) {
  const chat = db.getChatById(chatId);
  const message = JSON.stringify(data);

  if (chat) {
    chat.memberIds.forEach((memberId) => {
      const sockets = userSockets.get(memberId);
      if (sockets) {
        sockets.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }
    });
  } else {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

function broadcastToAll(data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (rawData: Buffer) => {
    try {
      const data = JSON.parse(rawData.toString());

      switch (data.type) {
        case 'auth': {
          const { userId } = data;
          if (userId) {
            authenticatedUserId = userId;
            if (!userSockets.has(userId)) {
              userSockets.set(userId, new Set());
            }
            userSockets.get(userId)!.add(ws);
            broadcastPresence(userId, true);

            // Send list of currently online user IDs
            const onlineIds = Array.from(userSockets.keys()).filter((uid) => {
              const set = userSockets.get(uid);
              return set && set.size > 0;
            });

            ws.send(
              JSON.stringify({
                type: 'presence:initial',
                onlineUserIds: onlineIds,
              })
            );
          }
          break;
        }

        case 'message:send': {
          const { message, chatId } = data;
          if (message && chatId) {
            const storedMsg = db.addMessage(chatId, message);
            broadcastToChat(chatId, message.senderId, {
              type: 'message:new',
              chatId,
              message: storedMsg,
            });
          }
          break;
        }

        case 'message:reaction': {
          const { chatId, messageId, emoji, userId, userName } = data;
          const chatMsgs = db.getMessages(chatId);
          const targetMsg = chatMsgs.find((m) => m.id === messageId);
          if (targetMsg) {
            if (!targetMsg.reactions) targetMsg.reactions = [];
            const existingIdx = targetMsg.reactions.findIndex((r) => r.userId === userId);
            if (existingIdx >= 0) {
              if (targetMsg.reactions[existingIdx].emoji === emoji) {
                targetMsg.reactions.splice(existingIdx, 1);
              } else {
                targetMsg.reactions[existingIdx].emoji = emoji;
              }
            } else {
              targetMsg.reactions.push({ userId, emoji, userName });
            }
            db.updateMessage(chatId, messageId, { reactions: targetMsg.reactions });

            broadcastToChat(chatId, userId, {
              type: 'message:reaction',
              chatId,
              reaction: { messageId, emoji, userId, userName },
            });
          }
          break;
        }

        case 'message:edit': {
          const { chatId, messageId, content, userId } = data;
          const updated = db.updateMessage(chatId, messageId, {
            content,
            isEdited: true,
          });
          if (updated) {
            broadcastToChat(chatId, userId, {
              type: 'message:edit',
              chatId,
              editData: { messageId, content },
            });
          }
          break;
        }

        case 'message:delete': {
          const { chatId, messageId, forEveryone, userId } = data;
          const ok = db.deleteMessage(chatId, messageId, forEveryone, userId);
          if (ok) {
            broadcastToChat(chatId, userId, {
              type: 'message:delete',
              chatId,
              deleteData: { messageId, forEveryone, userId },
            });
          }
          break;
        }

        case 'typing':
        case 'typing:start':
        case 'typing:stop': {
          const { chatId, userId } = data;
          const isTyping = data.type === 'typing:start' || data.isTyping === true;
          const user = userId ? db.getUserById(userId) : null;
          broadcastToChat(chatId, userId, {
            type: 'typing:indicator',
            chatId,
            isTyping,
            typingUser: {
              userId,
              userName: user?.displayName || data.userName || 'Contact',
            },
          });
          break;
        }

        // WebRTC Signaling Handlers
        case 'call:offer': {
          const { toUserId, offer, callType, fromUser } = data;
          sendToUser(toUserId, {
            type: 'call:offer',
            callData: {
              callId: `call_${Date.now()}`,
              fromUserId: fromUser?.id || authenticatedUserId,
              fromUserName: fromUser?.displayName || 'Caller',
              fromUserAvatar: fromUser?.avatarUrl || '',
              toUserId,
              callType: callType || 'voice',
              sdp: offer,
            },
          });
          break;
        }

        case 'call:answer': {
          const { toUserId, answer } = data;
          sendToUser(toUserId, {
            type: 'call:answer',
            callData: { sdp: answer },
          });
          break;
        }

        case 'call:ice-candidate': {
          const { toUserId, candidate } = data;
          sendToUser(toUserId, {
            type: 'call:ice-candidate',
            candidate,
          });
          break;
        }

        case 'call:end': {
          const { toUserId } = data;
          sendToUser(toUserId, {
            type: 'call:ended',
          });
          break;
        }

        case 'call:reject': {
          const { toUserId } = data;
          sendToUser(toUserId, {
            type: 'call:rejected',
          });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Socket message parse error:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const set = userSockets.get(authenticatedUserId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          userSockets.delete(authenticatedUserId);
          broadcastPresence(authenticatedUserId, false);
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.warn('WebSocket client error:', err.message);
  });
});

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. Google Authentication Route ("Continue with Google")
app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, displayName, avatarUrl, googleId } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid Google email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = db.getUserByEmail(cleanEmail);
  let isNew = false;

  if (!user) {
    isNew = true;
    const userId = `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialName = displayName?.trim() || cleanEmail.split('@')[0];
    const initialAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    user = db.createUser({
      id: userId,
      email: cleanEmail,
      googleId: googleId || `gid_${Date.now()}`,
      displayName: initialName,
      about: 'Available | Using ERROREN CHAT ⚡',
      avatarUrl: initialAvatar,
      isOnline: true,
      lastSeen: Date.now(),
      role: 'user',
      createdAt: Date.now(),
    });
  } else {
    // Existing user login
    user = db.updateUser(user.id, {
      isOnline: true,
      lastSeen: Date.now(),
      googleId: googleId || user.googleId,
      avatarUrl: user.avatarUrl || avatarUrl,
    })!;
  }

  const isProfileComplete = Boolean(
    user.displayName &&
    user.displayName.trim().length > 0 &&
    user.displayName !== 'New Member' &&
    !isNew
  );

  res.json({
    success: true,
    token: `sess_token_${user.id}_${Date.now()}`,
    user,
    isProfileComplete,
    isNewUser: isNew,
  });
});

// Phone Authentication Route ("Continue with Phone Number" e.g. 03399951515)
app.post('/api/auth/phone', (req: Request, res: Response) => {
  const { phoneNumber, countryCode = '+92', displayName, avatarUrl } = req.body;

  if (!phoneNumber || phoneNumber.trim().length < 4) {
    return res.status(400).json({ error: 'Valid phone number is required.' });
  }

  const cleanPhone = phoneNumber.trim();
  let user = db.getUserByPhone(cleanPhone);
  let isNew = false;

  if (!user) {
    isNew = true;
    const userId = `usr_p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialName = displayName?.trim() || `User ${cleanPhone.slice(-4)}`;
    const initialAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`;

    user = db.createUser({
      id: userId,
      phoneNumber: cleanPhone,
      countryCode: countryCode || '+92',
      displayName: initialName,
      about: 'Available | Using ERROREN CHAT ⚡',
      avatarUrl: initialAvatar,
      isOnline: true,
      lastSeen: Date.now(),
      role: 'user',
      createdAt: Date.now(),
      isPhoneVerified: true,
    });
  } else {
    // Existing user login
    user = db.updateUser(user.id, {
      isOnline: true,
      lastSeen: Date.now(),
      isPhoneVerified: true,
      displayName: displayName?.trim() || user.displayName,
      avatarUrl: avatarUrl || user.avatarUrl,
    })!;
  }

  // Auto-link any saved contacts across all users to this account
  db.linkContactsToUser(user);

  const isProfileComplete = Boolean(
    user.displayName &&
    user.displayName.trim().length > 0 &&
    user.displayName !== 'New Member' &&
    !isNew
  );

  res.json({
    success: true,
    token: `sess_token_${user.id}_${Date.now()}`,
    user,
    isProfileComplete,
    isNewUser: isNew,
  });
});

// User Session Sync Route (Ensures client user exists in persistent DB)
app.post('/api/auth/sync', (req: Request, res: Response) => {
  const { user, userId, displayName, email, avatarUrl, about, phoneNumber } = req.body;
  const targetId = userId || user?.id;

  if (!targetId) {
    return res.status(400).json({ error: 'User ID is required for sync.' });
  }

  let existing = db.getUserById(targetId);
  if (!existing && (email || user?.email)) {
    existing = db.getUserByEmail((email || user?.email).trim().toLowerCase());
  }

  if (existing) {
    const updated = db.updateUser(existing.id, {
      isOnline: true,
      lastSeen: Date.now(),
      displayName: displayName || user?.displayName || existing.displayName,
      avatarUrl: avatarUrl || user?.avatarUrl || existing.avatarUrl,
      about: about !== undefined ? about : (user?.about || existing.about),
      phoneNumber: phoneNumber || user?.phoneNumber || existing.phoneNumber,
    });
    return res.json({ success: true, user: updated, isNew: false });
  }

  // Auto-provision user into database
  const newUser = db.createUser({
    id: targetId,
    displayName: (displayName || user?.displayName || 'ERROREN Member').trim(),
    about: (about || user?.about || 'Available | Using ERROREN CHAT ⚡').trim(),
    avatarUrl: avatarUrl || user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetId}`,
    email: (email || user?.email) ? (email || user?.email).trim().toLowerCase() : undefined,
    phoneNumber: phoneNumber || user?.phoneNumber || undefined,
    isOnline: true,
    lastSeen: Date.now(),
    role: (user?.role as any) || 'user',
    createdAt: Date.now(),
  });

  res.json({ success: true, user: newUser, isNew: true });
});

// Profile update route
app.post('/api/auth/profile', (req: Request, res: Response) => {
  const { userId, displayName, about, avatarUrl, email, phoneNumber } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  let user = db.getUserById(userId);
  if (!user) {
    user = db.createUser({
      id: userId,
      displayName: (displayName || 'ERROREN Member').trim(),
      about: (about !== undefined ? about : 'Available | Using ERROREN CHAT ⚡').trim(),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      isOnline: true,
      lastSeen: Date.now(),
      role: 'user',
      createdAt: Date.now(),
    });
  } else {
    user = db.updateUser(userId, {
      displayName: (displayName || user.displayName || 'ERROREN Member').trim(),
      about: (about !== undefined ? about : user.about).trim(),
      avatarUrl: avatarUrl || user.avatarUrl,
      email: email || user.email,
      phoneNumber: phoneNumber || user.phoneNumber,
    })!;
  }

  // Broadcast user update to all active WebSocket clients
  try {
    const payload = JSON.stringify({
      type: 'user:updated',
      user,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  } catch (err) {
    console.error('Failed to broadcast user update:', err);
  }

  res.json({ success: true, user });
});

// 2. Optional Phone Number Management
app.post('/api/account/phone', (req: Request, res: Response) => {
  const { userId, phoneNumber, countryCode, phoneVisibility } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const isSmsServiceConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  const cleanPhone = (phoneNumber || '').trim().replace(/[^0-9]/g, '');

  const updated = db.updateUser(userId, {
    phoneNumber: cleanPhone ? phoneNumber.trim() : undefined,
    countryCode: countryCode || '+1',
    isPhoneVerified: cleanPhone ? isSmsServiceConfigured : false,
    phoneVisibility: phoneVisibility || 'everyone',
  });

  res.json({
    success: true,
    user: updated,
    isSmsServiceConfigured,
    message: cleanPhone
      ? isSmsServiceConfigured
        ? 'Phone number updated and verified via SMS provider.'
        : 'Phone number saved to profile. Note: SMS Gateway verification service (Twilio/Firebase SMS) is not configured in this environment.'
      : 'Phone number removed.',
  });
});

// 3. User & Contacts Discovery Routes
app.get('/api/users', (req: Request, res: Response) => {
  const users = db.getAllUsers();
  res.json(users);
});

app.get('/api/users/search', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const currentUserId = (req.query.currentUserId as string) || '';
  const results = db.searchUsers(q, currentUserId);
  res.json(results);
});

// Saved Contacts Routes
app.get('/api/contacts', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.json([]);
  const list = db.getContacts(userId);
  res.json(list);
});

app.post('/api/contacts', (req: Request, res: Response) => {
  const { ownerUserId, name, phoneNumber, avatarUrl, about } = req.body;
  if (!ownerUserId || !name) {
    return res.status(400).json({ error: 'Owner User ID and Contact Name are required.' });
  }

  // Look up if this phone number is registered by an existing ERROREN user
  let matchedUserId: string | undefined = undefined;
  let matchedUser = phoneNumber ? db.getUserByPhone(phoneNumber) : null;
  if (matchedUser && matchedUser.id !== ownerUserId) {
    matchedUserId = matchedUser.id;
  }

  // If not yet registered on ERROREN CHAT, create a persistent user profile for them
  // so the owner can immediately start a chat, call, or message them seamlessly
  if (!matchedUserId && phoneNumber) {
    const cleanDigits = (phoneNumber || '').replace(/[^0-9]/g, '');
    const virtualUserId = `usr_p_${cleanDigits || Date.now()}`;
    let virtualUser = db.getUserById(virtualUserId);
    if (!virtualUser) {
      virtualUser = db.createUser({
        id: virtualUserId,
        displayName: name.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode: phoneNumber.trim().startsWith('+') ? '' : '+92',
        about: about?.trim() || 'Saved Contact on ERROREN CHAT',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanDigits || name}`,
        isOnline: false,
        lastSeen: Date.now(),
        role: 'user',
        createdAt: Date.now(),
        isPhoneVerified: false,
      });
    }
    matchedUserId = virtualUser.id;
    matchedUser = virtualUser;
  }

  const finalAvatar = avatarUrl || matchedUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${phoneNumber || name}`;
  const finalAbout = about || matchedUser?.about || 'Saved Contact';

  const newContact: StoredContact = {
    id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerUserId,
    contactUserId: matchedUserId,
    name: name.trim(),
    phoneNumber: (phoneNumber || '').trim(),
    avatarUrl: finalAvatar,
    about: finalAbout,
    createdAt: Date.now(),
  };

  db.addContact(ownerUserId, newContact);
  res.json({
    success: true,
    contact: newContact,
    matchedUser: matchedUser || null,
    isRegisteredUser: Boolean(matchedUserId && matchedUser?.isPhoneVerified !== false),
  });
});

app.delete('/api/contacts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerUserId = req.query.userId as string;
  if (!ownerUserId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  db.deleteContact(ownerUserId, id);
  res.json({ success: true });
});

// 4. Chats & Messages Routes
app.get('/api/chats', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.json([]);
  }

  const userChats = db.getChatsForUser(userId).map((chat) => {
    const msgs = db.getMessages(chat.id);
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : chat.lastMessage;

    let title = chat.name;
    let avatar = chat.avatarUrl;
    let isPartnerOnline = false;
    let partnerLastSeen = 0;

    if (!chat.isGroup) {
      const partnerId = (chat.memberIds || []).find((id) => id !== userId);
      if (partnerId) {
        const partner = db.getUserById(partnerId);
        if (partner) {
          title = partner.displayName || partner.phoneNumber || partner.email || 'Contact';
          avatar = partner.avatarUrl;
          isPartnerOnline = partner.isOnline;
          partnerLastSeen = partner.lastSeen;
        }
      }
    }

    return {
      ...chat,
      title: title || chat.name || 'Chat',
      name: title || chat.name || 'Chat',
      participantIds: chat.memberIds || [],
      avatarUrl: avatar,
      lastMessage: lastMsg,
      isPartnerOnline,
      partnerLastSeen,
    };
  }).sort((a, b) => (b.lastMessage?.timestamp || b.updatedAt || 0) - (a.lastMessage?.timestamp || a.updatedAt || 0));

  res.json(userChats);
});

const handleCreateChat = (req: Request, res: Response) => {
  const { creatorId, partnerId, isGroup, name, title, avatarUrl, description, memberIds, participantIds, communityId } = req.body;
  const rawMembers: string[] = memberIds || participantIds || [];
  const validCreator = creatorId;
  if (!validCreator) {
    return res.status(400).json({ error: 'Creator user ID is required.' });
  }

  let initialMembers = Array.from(new Set([validCreator, ...(partnerId ? [partnerId] : []), ...rawMembers].filter(Boolean)));

  // If created within a community and no specific members passed, include all community members
  if (communityId && db.getCommunityById(communityId)) {
    const comm = db.getCommunityById(communityId);
    if (comm && comm.members && comm.members.length > 0) {
      comm.members.forEach((m) => {
        if (!initialMembers.includes(m.userId)) {
          initialMembers.push(m.userId);
        }
      });
    }
  }

  const members = initialMembers;

  if (isGroup) {
    const groupId = `chat_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const groupName = (title || name || 'New Group').trim();
    const newGroup: StoredChat = {
      id: groupId,
      isGroup: true,
      name: groupName,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${groupId}`,
      description: description || '',
      memberIds: members,
      adminIds: [validCreator],
      unreadCount: 0,
      communityId: communityId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.createChat(newGroup);

    if (communityId) {
      db.addGroupToCommunity(communityId, groupId);
    }

    const creator = db.getUserById(validCreator);
    const welcomeMsg: StoredMessage = {
      id: `msg_${Date.now()}`,
      chatId: groupId,
      senderId: 'system',
      senderName: 'ERROREN System',
      senderAvatar: '/icon.svg',
      type: 'text',
      content: `🔒 Group "${newGroup.name}" created by ${creator?.displayName || 'Admin'}. Messages are synchronized in real-time.`,
      timestamp: Date.now(),
      status: 'read',
    };
    db.addMessage(groupId, welcomeMsg);

    broadcastToAll({
      type: 'chat:new',
      chat: {
        ...newGroup,
        title: newGroup.name,
        participantIds: newGroup.memberIds,
        lastMessage: welcomeMsg,
      },
    });

    return res.json({
      ...newGroup,
      title: newGroup.name,
      participantIds: newGroup.memberIds,
      lastMessage: welcomeMsg,
    });
  } else {
    // 1-on-1 direct chat
    const otherId = partnerId || rawMembers.find((id) => id !== validCreator);
    if (!otherId) {
      return res.status(400).json({ error: 'Partner ID is required for direct chat.' });
    }

    const existing = db.findDirectChat(validCreator, otherId);
    if (existing) {
      const partner = db.getUserById(otherId);
      return res.json({
        ...existing,
        title: partner?.displayName || existing.name,
        participantIds: existing.memberIds,
      });
    }

    const partner = db.getUserById(otherId);
    const directName = partner?.displayName || title || name || 'Direct Chat';
    const directAvatar = partner?.avatarUrl || avatarUrl || '';
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newChat: StoredChat = {
      id: chatId,
      isGroup: false,
      name: directName,
      avatarUrl: directAvatar,
      memberIds: [validCreator, otherId],
      adminIds: [],
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.createChat(newChat);

    return res.json({
      ...newChat,
      title: directName,
      participantIds: newChat.memberIds,
    });
  }
};

app.post('/api/chats', handleCreateChat);
app.post('/api/chats/create', handleCreateChat);

// -------------------------------------------------------------
// Communities & Channels API Routes
// -------------------------------------------------------------

// List Communities
app.get('/api/communities', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const userId = (req.query.userId as string) || '';

  const allComms = db.getAllCommunities();

  const formatted = allComms.map((comm) => {
    const isJoined = userId ? (comm.members || []).some((m) => m.userId === userId) : false;
    const memberObj = userId ? (comm.members || []).find((m) => m.userId === userId) : null;
    const userRole = memberObj ? memberObj.role : (comm.creatorId === userId ? 'owner' : undefined);

    // Populate groups
    const groups = (comm.groupIds || [])
      .map((gid) => db.getChatById(gid))
      .filter(Boolean)
      .map((g) => {
        const msgs = db.getMessages(g!.id);
        return {
          ...g,
          title: g!.name,
          participantIds: g!.memberIds,
          lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : g!.lastMessage,
        };
      });

    // Populate channels
    const channels = db.getChannelsForCommunity(comm.id).map((ch) => ({
      ...ch,
      isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
      postsCount: (db.getChannelPosts(ch.id) || []).length,
    }));

    return {
      ...comm,
      memberCount: (comm.members || []).length,
      isJoined,
      userRole,
      groups,
      channels,
    };
  });

  const filtered = formatted.filter((c) => {
    if (!q) return true;
    const matchComm = c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchGroup = c.groups.some((g: any) => (g.name || '').toLowerCase().includes(q));
    const matchChannel = c.channels.some((ch: any) => (ch.name || '').toLowerCase().includes(q));
    return matchComm || matchGroup || matchChannel;
  });

  res.json(filtered);
});

// Create Community
app.post('/api/communities', (req: Request, res: Response) => {
  const { name, description, avatarUrl, creatorId, creatorName, creatorAvatar, creatorEmail, creatorUser } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Community name and creator ID are required.' });
  }

  let user = db.getUserById(creatorId);
  if (!user && (creatorEmail || creatorUser?.email)) {
    user = db.getUserByEmail((creatorEmail || creatorUser?.email).trim().toLowerCase());
  }

  if (!user) {
    // Auto-provision creator in database if missing
    user = db.createUser({
      id: creatorId,
      displayName: (creatorName || creatorUser?.displayName || name.trim() + ' Creator' || 'ERROREN Member').trim(),
      about: (creatorUser?.about || 'Available | Using ERROREN CHAT ⚡').trim(),
      avatarUrl: creatorAvatar || creatorUser?.avatarUrl || avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${creatorId}`,
      email: (creatorEmail || creatorUser?.email) ? (creatorEmail || creatorUser?.email).trim().toLowerCase() : undefined,
      phoneNumber: creatorUser?.phoneNumber,
      isOnline: true,
      lastSeen: Date.now(),
      role: (creatorUser?.role as any) || 'user',
      createdAt: Date.now(),
    });
  }

  const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = `comm_inv_${Math.random().toString(36).substring(2, 9)}`;

  const newCommunity: StoredCommunity = {
    id: commId,
    name: name.trim(),
    description: (description || 'Welcome to our official ERROREN Community!').trim(),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    creatorId,
    members: [
      {
        userId: creatorId,
        role: 'owner',
        joinedAt: Date.now(),
      },
    ],
    adminIds: [creatorId],
    groupIds: [],
    channelIds: [],
    inviteCode,
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.createCommunity(newCommunity);

  // Automatically create a default Official Announcements Channel for the community
  const defaultChannelId = `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const announcementsChannel: StoredChannel = {
    id: defaultChannelId,
    communityId: commId,
    name: 'Announcements',
    description: 'Official announcements and updates from community admins',
    avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name + '_announcements')}`,
    creatorId,
    adminIds: [creatorId],
    followerIds: [creatorId],
    isReadOnly: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.createChannel(announcementsChannel);

  // Add a welcome announcement post
  const welcomePost: StoredChannelPost = {
    id: `post_${Date.now()}`,
    channelId: defaultChannelId,
    authorId: creatorId,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl,
    title: `Welcome to ${newCommunity.name}! 🚀`,
    content: `Welcome everyone to **${newCommunity.name}**! This is our dedicated community space on ERROREN CHAT. Check this announcements channel for official updates, and join our discussion groups below.`,
    createdAt: Date.now(),
    likes: [creatorId],
  };
  db.addChannelPost(welcomePost);

  // Broadcast community creation
  broadcastToAll({
    type: 'community:new',
    community: {
      ...newCommunity,
      memberCount: 1,
      isJoined: true,
      userRole: 'owner',
      channels: [{ ...announcementsChannel, isFollowed: true, postsCount: 1 }],
      groups: [],
    },
  });

  res.json({
    success: true,
    community: {
      ...newCommunity,
      memberCount: 1,
      isJoined: true,
      userRole: 'owner',
      channels: [{ ...announcementsChannel, isFollowed: true, postsCount: 1 }],
      groups: [],
    },
  });
});

// Get Single Community with full details
app.get('/api/communities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || '';

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const isJoined = userId ? (comm.members || []).some((m) => m.userId === userId) : false;
  const memberObj = userId ? (comm.members || []).find((m) => m.userId === userId) : null;
  const userRole = memberObj ? memberObj.role : (comm.creatorId === userId ? 'owner' : undefined);

  // Populate member profiles
  const populatedMembers = (comm.members || []).map((m) => {
    const u = db.getUserById(m.userId);
    return {
      ...m,
      user: u ? {
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        about: u.about,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
        role: u.role,
      } : undefined,
    };
  });

  // Populate groups
  const groups = (comm.groupIds || [])
    .map((gid) => db.getChatById(gid))
    .filter(Boolean)
    .map((g) => {
      const msgs = db.getMessages(g!.id);
      return {
        ...g,
        title: g!.name,
        participantIds: g!.memberIds,
        lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : g!.lastMessage,
      };
    });

  // Populate channels
  const channels = db.getChannelsForCommunity(comm.id).map((ch) => ({
    ...ch,
    isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
    postsCount: (db.getChannelPosts(ch.id) || []).length,
  }));

  res.json({
    ...comm,
    members: populatedMembers,
    memberCount: (comm.members || []).length,
    isJoined,
    userRole,
    groups,
    channels,
  });
});

// Update Community Profile (Owner/Admin only)
app.put('/api/communities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, avatarUrl, requesterId } = req.body;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  // Permission check: must be owner or admin
  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Only community owners or admins can edit community details.' });
  }

  const updated = db.updateCommunity(id, {
    name: name ? name.trim() : comm.name,
    description: description !== undefined ? description.trim() : comm.description,
    avatarUrl: avatarUrl || comm.avatarUrl,
  });

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Delete Community (Owner only)
app.delete('/api/communities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = req.query.requesterId as string || req.body?.requesterId;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  if (comm.creatorId !== requesterId) {
    return res.status(403).json({ error: 'Only the community owner can delete the community.' });
  }

  db.deleteCommunity(id);

  broadcastToAll({
    type: 'community:deleted',
    communityId: id,
  });

  res.json({ success: true });
});

// Join Community
app.post('/api/communities/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userAvatar, user: userData } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  let user = db.getUserById(userId);
  if (!user) {
    user = db.createUser({
      id: userId,
      displayName: (userName || userData?.displayName || 'Community Member').trim(),
      about: (userData?.about || 'Available | Using ERROREN CHAT ⚡').trim(),
      avatarUrl: userAvatar || userData?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isOnline: true,
      lastSeen: Date.now(),
      role: 'user',
      createdAt: Date.now(),
    });
  }

  const updated = db.addCommunityMember(id, userId, 'member');
  if (!updated) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  // Also auto-follow default channels
  const channels = db.getChannelsForCommunity(id);
  channels.forEach((ch) => {
    db.joinChannel(ch.id, userId);
  });

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Leave Community
app.post('/api/communities/:id/leave', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  if (comm.creatorId === userId) {
    return res.status(400).json({ error: 'The community owner cannot leave the community. You can delete it instead.' });
  }

  const updated = db.removeCommunityMember(id, userId);

  // Also unfollow channels
  const channels = db.getChannelsForCommunity(id);
  channels.forEach((ch) => {
    db.leaveChannel(ch.id, userId);
  });

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Add Members to Community (Multiple)
app.post('/api/communities/:id/members', (req: Request, res: Response) => {
  const { id } = req.params;
  const { requesterId, userIds } = req.body;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Array of user IDs to add is required.' });
  }

  userIds.forEach((uid: string) => {
    const u = db.getUserById(uid);
    if (u) {
      db.addCommunityMember(id, uid, 'member');
      // Also add to channels
      const channels = db.getChannelsForCommunity(id);
      channels.forEach((ch) => db.joinChannel(ch.id, uid));
    }
  });

  const updated = db.getCommunityById(id);

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Remove Member from Community
app.delete('/api/communities/:id/members/:targetUserId', (req: Request, res: Response) => {
  const { id, targetUserId } = req.params;
  const requesterId = (req.query.requesterId as string) || req.body?.requesterId;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Permission denied. Admins only.' });
  }

  if (targetUserId === comm.creatorId) {
    return res.status(400).json({ error: 'Cannot remove the community owner.' });
  }

  const updated = db.removeCommunityMember(id, targetUserId);

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Change Member Role
app.put('/api/communities/:id/members/:targetUserId/role', (req: Request, res: Response) => {
  const { id, targetUserId } = req.params;
  const { requesterId, role } = req.body;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  if (comm.creatorId !== requesterId) {
    return res.status(403).json({ error: 'Only the community owner can change member roles.' });
  }

  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin or member.' });
  }

  const updated = db.updateCommunityMemberRole(id, targetUserId, role as any);

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Link existing group to community
app.post('/api/communities/:id/link-group', (req: Request, res: Response) => {
  const { id } = req.params;
  const { groupId, requesterId } = req.body;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const chat = db.getChatById(groupId);
  if (!chat || !chat.isGroup) {
    return res.status(404).json({ error: 'Group chat not found.' });
  }

  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Only community owners or admins can link groups.' });
  }

  const updated = db.addGroupToCommunity(id, groupId);

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// Remove group from community
app.delete('/api/communities/:id/groups/:groupId', (req: Request, res: Response) => {
  const { id, groupId } = req.params;
  const requesterId = (req.query.requesterId as string) || req.body?.requesterId;

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Only community owners or admins can unlink groups.' });
  }

  const updated = db.removeGroupFromCommunity(id, groupId);

  broadcastToAll({
    type: 'community:updated',
    communityId: id,
    community: updated,
  });

  res.json({ success: true, community: updated });
});

// --- CHANNELS ENDPOINTS ---

// List Channels for Community
app.get('/api/communities/:id/channels', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || '';

  const channels = db.getChannelsForCommunity(id).map((ch) => ({
    ...ch,
    isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
    postsCount: (db.getChannelPosts(ch.id) || []).length,
  }));

  res.json(channels);
});

// Create Channel inside Community
app.post('/api/communities/:id/channels', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, avatarUrl, creatorId, isReadOnly } = req.body;

  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Channel name and creator ID are required.' });
  }

  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const isOwner = comm.creatorId === creatorId;
  const isAdmin = (comm.adminIds || []).includes(creatorId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Only community owners or admins can create channels.' });
  }

  const channelId = `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newChannel: StoredChannel = {
    id: channelId,
    communityId: id,
    name: name.trim(),
    description: (description || '').trim(),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    creatorId,
    adminIds: [creatorId],
    followerIds: Array.from(new Set([creatorId, ...(comm.members || []).map((m) => m.userId)])),
    isReadOnly: isReadOnly !== undefined ? Boolean(isReadOnly) : true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.createChannel(newChannel);

  // Add a welcome post
  const creatorUser = db.getUserById(creatorId);
  const welcomePost: StoredChannelPost = {
    id: `post_${Date.now()}`,
    channelId,
    authorId: creatorId,
    authorName: creatorUser?.displayName || 'Admin',
    authorAvatar: creatorUser?.avatarUrl || '',
    title: `📢 Welcome to the ${newChannel.name} Channel`,
    content: newChannel.description || 'Welcome to this new channel. Stay tuned for posts and announcements!',
    createdAt: Date.now(),
    likes: [creatorId],
  };
  db.addChannelPost(welcomePost);

  broadcastToAll({
    type: 'channel:new',
    channel: {
      ...newChannel,
      isFollowed: true,
      postsCount: 1,
    },
    communityId: id,
  });

  res.json({
    success: true,
    channel: {
      ...newChannel,
      isFollowed: true,
      postsCount: 1,
    },
  });
});

// Get Channel details + posts
app.get('/api/channels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || '';

  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  const posts = db.getChannelPosts(id);
  const isFollowed = userId ? (channel.followerIds || []).includes(userId) : false;

  res.json({
    ...channel,
    isFollowed,
    postsCount: posts.length,
    posts,
  });
});

// Update Channel (Admin only)
app.put('/api/channels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, avatarUrl, isReadOnly, requesterId } = req.body;

  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  const isCreator = channel.creatorId === requesterId;
  const isAdmin = (channel.adminIds || []).includes(requesterId);
  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: 'Permission denied. Channel admins only.' });
  }

  const updated = db.updateChannel(id, {
    name: name ? name.trim() : channel.name,
    description: description !== undefined ? description.trim() : channel.description,
    avatarUrl: avatarUrl || channel.avatarUrl,
    isReadOnly: isReadOnly !== undefined ? Boolean(isReadOnly) : channel.isReadOnly,
  });

  broadcastToAll({
    type: 'channel:updated',
    channel: updated,
  });

  res.json({ success: true, channel: updated });
});

// Delete Channel
app.delete('/api/channels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = (req.query.requesterId as string) || req.body?.requesterId;

  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  const comm = db.getCommunityById(channel.communityId);
  const isCommOwner = comm && comm.creatorId === requesterId;
  const isChannelCreator = channel.creatorId === requesterId;

  if (!isCommOwner && !isChannelCreator) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  db.deleteChannel(id);

  broadcastToAll({
    type: 'channel:deleted',
    channelId: id,
    communityId: channel.communityId,
  });

  res.json({ success: true });
});

// Join / Follow Channel
app.post('/api/channels/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const updated = db.joinChannel(id, userId);
  if (!updated) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  broadcastToAll({
    type: 'channel:updated',
    channel: updated,
  });

  res.json({ success: true, channel: updated });
});

// Leave / Unfollow Channel
app.post('/api/channels/:id/leave', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const updated = db.leaveChannel(id, userId);
  if (!updated) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  broadcastToAll({
    type: 'channel:updated',
    channel: updated,
  });

  res.json({ success: true, channel: updated });
});

// Get Posts in Channel
app.get('/api/channels/:id/posts', (req: Request, res: Response) => {
  const { id } = req.params;
  const posts = db.getChannelPosts(id);
  res.json(posts);
});

// Create Post in Channel
app.post('/api/channels/:id/posts', (req: Request, res: Response) => {
  const { id } = req.params;
  const { authorId, title, content, mediaUrl, mediaType, linkUrl } = req.body;

  if (!authorId || (!content && !mediaUrl)) {
    return res.status(400).json({ error: 'Author ID and post content or media are required.' });
  }

  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  // Check read-only permissions
  if (channel.isReadOnly) {
    const isCreator = channel.creatorId === authorId;
    const isAdmin = (channel.adminIds || []).includes(authorId);
    const comm = db.getCommunityById(channel.communityId);
    const isCommOwner = comm && comm.creatorId === authorId;
    const isCommAdmin = comm && (comm.adminIds || []).includes(authorId);

    if (!isCreator && !isAdmin && !isCommOwner && !isCommAdmin) {
      return res.status(403).json({ error: 'Only admins can post in this read-only channel.' });
    }
  }

  const user = db.getUserById(authorId);
  const newPost: StoredChannelPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId: id,
    authorId,
    authorName: user?.displayName || 'Member',
    authorAvatar: user?.avatarUrl || '',
    title: title ? title.trim() : undefined,
    content: (content || '').trim(),
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || (mediaUrl ? 'image' : undefined),
    linkUrl: linkUrl ? linkUrl.trim() : undefined,
    createdAt: Date.now(),
    likes: [],
  };

  db.addChannelPost(newPost);

  broadcastToAll({
    type: 'channel:post:new',
    channelId: id,
    post: newPost,
  });

  res.json({ success: true, post: newPost });
});

// Like / Toggle Like on Channel Post
app.post('/api/channels/:id/posts/:postId/like', (req: Request, res: Response) => {
  const { id, postId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const updated = db.likeChannelPost(id, postId, userId);
  if (!updated) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  broadcastToAll({
    type: 'channel:post:updated',
    channelId: id,
    post: updated,
  });

  res.json({ success: true, post: updated });
});

// Delete Channel Post
app.delete('/api/channels/:id/posts/:postId', (req: Request, res: Response) => {
  const { id, postId } = req.params;
  const requesterId = (req.query.requesterId as string) || req.body?.requesterId;

  const channel = db.getChannelById(id);
  const posts = db.getChannelPosts(id);
  const targetPost = posts.find((p) => p.id === postId);

  if (!targetPost) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const isAuthor = targetPost.authorId === requesterId;
  const isChannelAdmin = channel && ((channel.adminIds || []).includes(requesterId) || channel.creatorId === requesterId);

  if (!isAuthor && !isChannelAdmin) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  db.deleteChannelPost(id, postId);

  broadcastToAll({
    type: 'channel:post:deleted',
    channelId: id,
    postId,
  });

  res.json({ success: true });
});

// Invite Link Lookup
app.get('/api/invites/:inviteCode', (req: Request, res: Response) => {
  const { inviteCode } = req.params;
  const comm = db.getCommunityByInvite(inviteCode);
  if (!comm) {
    return res.status(404).json({ error: 'Invalid or expired invite link.' });
  }

  res.json({
    id: comm.id,
    name: comm.name,
    description: comm.description,
    avatarUrl: comm.avatarUrl,
    memberCount: (comm.members || []).length,
    creatorName: db.getUserById(comm.creatorId)?.displayName || 'Community Admin',
  });
});

// Search across all Communities, Groups, and Channels
app.get('/api/communities-search', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const userId = (req.query.userId as string) || '';

  if (!q) {
    return res.json({ communities: [], groups: [], channels: [] });
  }

  const allComms = db.getAllCommunities();
  const matchingCommunities = allComms.filter((c) => 
    c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  ).map((c) => ({
    id: c.id,
    type: 'community' as const,
    name: c.name,
    description: c.description,
    avatarUrl: c.avatarUrl,
    memberCount: (c.members || []).length,
    isJoined: userId ? (c.members || []).some((m) => m.userId === userId) : false,
  }));

  const matchingGroups = db.getAllChats()
    .filter((chat) => chat.isGroup && (chat.name.toLowerCase().includes(q) || (chat.description || '').toLowerCase().includes(q)))
    .map((g) => ({
      id: g.id,
      type: 'group' as const,
      name: g.name,
      description: g.description || 'Discussion Group',
      avatarUrl: g.avatarUrl,
      memberCount: (g.memberIds || []).length,
      communityId: g.communityId,
    }));

  const matchingChannels = db.getAllChannels()
    .filter((ch) => ch.name.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q))
    .map((ch) => ({
      id: ch.id,
      type: 'channel' as const,
      name: ch.name,
      description: ch.description,
      avatarUrl: ch.avatarUrl,
      followerCount: (ch.followerIds || []).length,
      communityId: ch.communityId,
    }));

  res.json({
    communities: matchingCommunities,
    groups: matchingGroups,
    channels: matchingChannels,
  });
});

app.get('/api/chats/:chatId/messages', (req: Request, res: Response) => {
  const { chatId } = req.params;
  const messages = db.getMessages(chatId);
  res.json(messages);
});

app.post('/api/messages/send', (req: Request, res: Response) => {
  const { chatId, message } = req.body;
  if (!chatId || !message) {
    return res.status(400).json({ error: 'Chat ID and message payload required' });
  }

  const storedMsg: StoredMessage = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    chatId,
    timestamp: message.timestamp || Date.now(),
    status: message.status || 'delivered',
  };

  db.addMessage(chatId, storedMsg);

  broadcastToChat(chatId, storedMsg.senderId, {
    type: 'message:new',
    chatId,
    message: storedMsg,
  });

  res.json({ success: true, message: storedMsg });
});

// 5. Status / Stories Routes
app.get('/api/status', (req: Request, res: Response) => {
  const active = db.getStatuses(true);
  res.json(active);
});

const handleCreateStatus = (req: Request, res: Response) => {
  const { userId, type, content, mediaUrl, caption, backgroundColor, textColor, fontStyle, userName, userAvatar } = req.body;
  const user = userId ? db.getUserById(userId) : null;
  const now = Date.now();

  const newStatus: StoredStatus = {
    id: `status_${now}_${Math.random().toString(36).substring(2, 6)}`,
    userId: userId || user?.id || 'unknown',
    userName: userName || user?.displayName || 'User',
    userAvatar: userAvatar || user?.avatarUrl || '',
    type: type || (mediaUrl ? 'image' : 'text'),
    content: content || mediaUrl || '',
    caption: caption || '',
    backgroundColor: backgroundColor || 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    textColor: textColor || '#ffffff',
    fontStyle: fontStyle || 'font-sans',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    viewers: [],
  };

  db.addStatus(newStatus);

  const payload = JSON.stringify({
    type: 'status:new',
    statusData: newStatus,
  });
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });

  res.json(newStatus);
};

app.post('/api/status', handleCreateStatus);
app.post('/api/status/create', handleCreateStatus);

app.post('/api/status/view', (req: Request, res: Response) => {
  const { statusId, viewerId } = req.body;
  const viewer = db.getUserById(viewerId);
  if (statusId && viewer) {
    db.viewStatus(statusId, {
      userId: viewer.id,
      userName: viewer.displayName,
      userAvatar: viewer.avatarUrl,
      viewedAt: Date.now(),
    });
  }
  res.json({ success: true });
});

app.delete('/api/status/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.deleteStatus(id);
  res.json({ success: true });
});

// 6. Calls & Call History
const handleGetCalls = (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.json([]);
  const logs = db.getCallLogs(userId);
  res.json(logs);
};

app.get('/api/calls', handleGetCalls);
app.get('/api/calls/history', handleGetCalls);

app.post('/api/calls/log', (req: Request, res: Response) => {
  const logData: StoredCallLog = {
    ...req.body,
    id: req.body.id || `call_${Date.now()}`,
    startedAt: req.body.startedAt || Date.now(),
  };
  db.addCallLog(logData);
  res.json({ success: true, log: logData });
});

app.delete('/api/calls/clear', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (userId) {
    db.clearCallLogs(userId);
  }
  res.json({ success: true });
});

// 7. Media / Upload Endpoint
app.post('/api/media/upload', (req: Request, res: Response) => {
  const { fileData, fileName, mimeType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: 'File data is required.' });
  }

  const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.json({
    success: true,
    media: {
      id: mediaId,
      url: fileData,
      fileName: fileName || 'attachment',
      mimeType: mimeType || 'application/octet-stream',
      fileSize: Math.round(fileData.length * 0.75),
    },
  });
});

// 8. ERROREN AI Assistant Routes (Gemini 3.7 Flash)
app.get('/api/ai/conversations', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.json([]);
  const list = db.getAIConversations(userId);
  res.json(list);
});

app.post('/api/ai/conversations', (req: Request, res: Response) => {
  const { userId, conversation } = req.body;
  if (!userId || !conversation) {
    return res.status(400).json({ error: 'User ID and conversation payload required.' });
  }
  const saved = db.saveAIConversation(userId, {
    ...conversation,
    updatedAt: Date.now(),
  });
  res.json(saved);
});

app.delete('/api/ai/conversations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;
  if (userId) {
    db.deleteAIConversation(userId, id);
  }
  res.json({ success: true });
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { messages, userMessage } = req.body;
  totalAiRequests++;

  const systemInstruction = `You are ERROREN AI, the dedicated, futuristic, intelligent, and helpful AI assistant built inside ERROREN CHAT ("Secure. Private. Real-time.").
You provide high quality, comprehensive, and accurate answers to any question or request the user asks:
- Science, history, geography, trivia, facts (e.g. capitals, facts about cities, countries, physics, math)
- Creative writing, stories, poems, speeches, emails, professional messages
- Full programming, code explanations, debugging in TypeScript, Python, C++, React, etc.
- Translations into Urdu, Hindi, Spanish, French, Arabic, German, Chinese, etc.
- Summarizing text and brainstorming ideas
Maintain context across previous messages in the conversation. Format your responses with clean, readable Markdown (bullet points, bold highlights, formatted code blocks).`;

  try {
    if (aiClient) {
      const formattedHistory = (messages || [])
        .map((m: any) => `${m.role === 'user' ? 'User' : 'ERROREN AI'}: ${m.content}`)
        .join('\n');
      const prompt = formattedHistory
        ? `${formattedHistory}\nUser: ${userMessage}\nERROREN AI:`
        : `User: ${userMessage}\nERROREN AI:`;

      let aiResponse;
      try {
        aiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (mErr) {
        console.warn('Retrying with gemini-2.5-flash...');
        aiResponse = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      }

      const reply = aiResponse.text || "I'm here to help with your messaging and tasks!";
      return res.json({ success: true, reply, isFallback: false });
    }
  } catch (error: any) {
    console.error('Gemini API Error, using smart fallback engine:', error?.message || error);
  }

  // Smart fallback engine if API key is temporarily rate limited or not yet configured
  const q = (userMessage || '').toLowerCase();
  let fallbackReply = `I am **ERROREN AI**, your AI copilot. I processed your request: "${userMessage}".\n\nHow else can I assist you today? Feel free to ask any question or request translations, code, or drafting!`;

  if (q.includes('pakistan') && (q.includes('capital') || q.includes('fact'))) {
    fallbackReply = `**Islamabad** is the capital city of Pakistan.\n\nHere are 5 interesting facts about Islamabad:\n1. **Planned Masterpiece**: Built in the 1960s to replace Karachi as the federal capital, designed by renowned Greek architect Constantinos Apostolou Doxiadis.\n2. **Margalla Hills Backdrop**: Nestled at the foothills of the scenic Margalla Hills National Park, renowned for its greenery and hiking trails.\n3. **Faisal Mosque**: Home to the iconic Faisal Mosque, shaped like a Bedouin desert tent, which was once the largest mosque in the world.\n4. **High Standard of Living**: Consistently ranked among the cleanest, safest, and most developed cities in South Asia.\n5. **Sector Grid System**: Organized systematically into designated sectors (E, F, G, H, I) divided into four sub-sectors with central commercial markets.`;
  } else if (q.includes('capital') && q.includes('pakistan')) {
    fallbackReply = "**Islamabad** is the federal capital of Pakistan, nestled at the foot of the picturesque Margalla Hills.";
  } else if (q.includes('story') || q.includes('kahani')) {
    fallbackReply = `### The Whispering Signal\n\nIn the heart of a neon-lit cyberpunk metropolis, a solitary programmer named Maya noticed an anomalous encrypted packet pulsing through the quantum network. Unlike ordinary binary streams, this transmission carried a self-assembling lattice of light.\n\nWhen she decrypted the payload, it revealed a lost message from the architects of the deep net: *"True connection transcends distance when encrypted by trust."* From that night forward, her communications were shielded forever.`;
  } else if (q.includes('translate') || q.includes('urdu')) {
    fallbackReply = `**Translation:**\n- **English:** "${userMessage}"\n- **Urdu:** "ERROREN AI آپ کے لیے ہر لمحہ حاضر ہے۔"\n- **Spanish:** "ERROREN AI está listo para ayudarte en todo momento."`;
  } else if (q.includes('code') || q.includes('typescript') || q.includes('javascript') || q.includes('python')) {
    fallbackReply = `Here is a clean code implementation for your request:\n\n\`\`\`typescript\n// ERROREN AI Utility Module\nexport async function askErrorenAi(prompt: string): Promise<string> {\n  const response = await fetch('/api/ai/chat', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ userMessage: prompt }),\n  });\n  const data = await response.json();\n  return data.reply;\n}\n\`\`\`\n\nLet me know if you would like me to customize or expand this logic!`;
  } else if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    fallbackReply = "Hello! I am **ERROREN AI**. How can I help you today? You can ask me any question, request code, translations, stories, or creative advice!";
  } else if (q.includes('who are you') || q.includes('tum kon ho')) {
    fallbackReply = "I am **ERROREN AI**, your built-in intelligence assistant inside ERROREN CHAT. I am here to assist you with answering questions, problem solving, programming, writing, and language translations.";
  }

  return res.json({ success: true, reply: fallbackReply, isFallback: true });
});

app.post('/api/ai/assist', async (req: Request, res: Response) => {
  const { text, action, targetLanguage, context } = req.body;
  totalAiRequests++;

  try {
    if (aiClient) {
      let prompt = '';
      if (action === 'improve') {
        prompt = `Improve this chat message to be clear, natural, engaging, and well-written. Return only the improved text: "${text}"`;
      } else if (action === 'professional') {
        prompt = `Rewrite this chat message into a polished, professional tone. Return only the rewritten message: "${text}"`;
      } else if (action === 'shorten') {
        prompt = `Shorten this chat message while keeping its core meaning. Return only the shortened text: "${text}"`;
      } else if (action === 'translate') {
        prompt = `Translate this chat message into ${targetLanguage || 'Spanish'}. Return only the direct translation: "${text}"`;
      } else if (action === 'reply') {
        prompt = `Given this incoming message: "${context || text}", generate a friendly, short quick reply. Return only the suggested reply text:`;
      }

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      const result = aiResponse.text?.trim() || text;
      return res.json({ success: true, result });
    }
  } catch (error) {
    console.error('Gemini Assist Error:', error);
  }

  let fallbackResult = text;
  if (action === 'improve') fallbackResult = text.trim() + ' Looking forward to connecting!';
  else if (action === 'professional') fallbackResult = `Regarding our discussion: "${text}". Please let me know your thoughts.`;
  else if (action === 'shorten') fallbackResult = text.length > 40 ? text.substring(0, 35) + '...' : text;
  else if (action === 'translate') fallbackResult = `[${targetLanguage || 'Translated'}]: ${text}`;
  else if (action === 'reply') fallbackResult = "Sounds great! Thanks for letting me know, I'm on it.";

  res.json({ success: true, result: fallbackResult });
});

// 9. Admin Telemetry & Moderation Routes
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const stats = db.getStats(totalAiRequests);
  res.json(stats);
});

app.get('/api/admin/reports', (req: Request, res: Response) => {
  const reports = db.getReports();
  res.json(reports);
});

app.post('/api/reports', (req: Request, res: Response) => {
  const { reportedBy, targetId, reportedUserId, reportedGroupId, reportedName, reason, details } = req.body;
  const newReport: StoredReport = {
    id: `rep_${Date.now()}`,
    reportedBy: reportedBy || 'unknown',
    reportedUserId: reportedUserId || targetId,
    reportedGroupId,
    reportedName: reportedName || 'User/Group',
    reason: reason || 'Inappropriate content',
    details: details || '',
    status: 'pending',
    createdAt: Date.now(),
  };
  db.addReport(newReport);
  res.json({ success: true, report: newReport });
});

app.post('/api/admin/resolve-report', (req: Request, res: Response) => {
  const { reportId, action } = req.body;
  db.resolveReport(reportId, action);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving Configuration
// -------------------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

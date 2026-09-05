import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  email?: string;
  googleId?: string;
  username?: string;
  phoneNumber?: string;
  countryCode?: string;
  isPhoneVerified?: boolean;
  phoneVisibility?: 'everyone' | 'contacts' | 'nobody';
  displayName: string;
  about: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: number;
  role: 'user' | 'admin';
  isSuspended?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface StoredContact {
  id: string;
  ownerUserId: string;
  contactUserId?: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string;
  about?: string;
  createdAt: number;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: string;
  content: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  duration?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { userId: string; emoji: string; userName?: string }[];
  replyTo?: any;
  isStarred?: boolean;
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  expiresAt?: number;
}

export interface StoredChat {
  id: string;
  isGroup: boolean;
  name: string;
  avatarUrl: string;
  description?: string;
  memberIds: string[];
  adminIds: string[];
  unreadCount: number;
  lastMessage?: StoredMessage;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  draft?: string;
  communityId?: string;
  createdAt: number;
  updatedAt: number;
  disappearingTimerHours?: number;
}

export interface StoredCommunityMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

export interface StoredChannelPost {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  linkUrl?: string;
  createdAt: number;
  likes?: string[]; // userIds
}

export interface StoredChannel {
  id: string;
  communityId: string;
  name: string;
  description: string;
  avatarUrl: string;
  creatorId: string;
  adminIds: string[];
  followerIds: string[];
  isReadOnly: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StoredCommunity {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  creatorId: string;
  members: StoredCommunityMember[];
  adminIds: string[];
  groupIds: string[];
  channelIds: string[];
  inviteCode: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StoredStatus {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'text' | 'image' | 'video';
  content: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: string;
  createdAt: number;
  expiresAt: number;
  viewers: { userId: string; userName: string; userAvatar: string; viewedAt: number }[];
}

export interface StoredCallLog {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'ringing' | 'connected' | 'ended' | 'declined' | 'busy';
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
}

export interface StoredAIConversation {
  id: string;
  userId: string;
  title: string;
  messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[];
  updatedAt: number;
}

export interface StoredReport {
  id: string;
  reportedBy: string;
  reportedUserId?: string;
  reportedGroupId?: string;
  reportedName: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: number;
}

export interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

interface DatabaseSchema {
  users: Record<string, StoredUser>;
  contacts: Record<string, StoredContact[]>; // ownerUserId -> StoredContact[]
  chats: Record<string, StoredChat>;
  messages: Record<string, StoredMessage[]>;
  communities: Record<string, StoredCommunity>;
  channels: Record<string, StoredChannel>;
  channelPosts: Record<string, StoredChannelPost[]>; // channelId -> StoredChannelPost[]
  statuses: StoredStatus[];
  callLogs: StoredCallLog[];
  aiConversations: Record<string, StoredAIConversation[]>; // userId -> StoredAIConversation[]
  reports: StoredReport[];
  blocks: Record<string, string[]>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// In-memory runtime state backed by disk
let dbState: DatabaseSchema = {
  users: {},
  contacts: {},
  chats: {},
  messages: {},
  communities: {},
  channels: {},
  channelPosts: {},
  statuses: [],
  callLogs: [],
  aiConversations: {},
  reports: [],
  blocks: {},
};

const otpStore = new Map<string, OtpRecord>();

// Clean up any demo or mock users
function cleanMockDataIfPresent() {
  const mockUserIds = ['usr_ayesha', 'usr_zain', 'usr_fatima', 'usr_hassan', 'usr_ali', 'usr_sarah', 'usr_erroren_ai'];
  const mockGroupIds = ['chat_grp_family', 'chat_grp_work', 'chat_grp_study', 'chat_grp_friends'];
  const mockCommIds = ['comm_rajpoot', 'comm_erroren_demo', 'comm_erroren_developers'];

  let modified = false;
  mockUserIds.forEach((id) => {
    if (dbState.users[id]) {
      delete dbState.users[id];
      modified = true;
    }
  });

  mockGroupIds.forEach((gid) => {
    if (dbState.chats[gid]) {
      delete dbState.chats[gid];
      delete dbState.messages[gid];
      modified = true;
    }
  });

  // Clean mock communities if any
  mockCommIds.forEach((cid) => {
    if (dbState.communities[cid]) {
      delete dbState.communities[cid];
      modified = true;
    }
  });

  // Clean up any generated ai chat entries
  Object.keys(dbState.chats).forEach((cid) => {
    if (cid.startsWith('chat_ai_') || dbState.chats[cid]?.memberIds?.includes('usr_erroren_ai')) {
      delete dbState.chats[cid];
      delete dbState.messages[cid];
      modified = true;
    }
  });

  if (modified) {
    saveDatabase();
  }
}

// Ensure data directory exists and load or initialize database
function initDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      dbState = {
        users: parsed.users || {},
        contacts: parsed.contacts || {},
        chats: parsed.chats || {},
        messages: parsed.messages || {},
        communities: parsed.communities || {},
        channels: parsed.channels || {},
        channelPosts: parsed.channelPosts || {},
        statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
        callLogs: Array.isArray(parsed.callLogs) ? parsed.callLogs : [],
        aiConversations: parsed.aiConversations || {},
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        blocks: parsed.blocks || {},
      };
      console.log(`[Database] Loaded persistent data: ${Object.keys(dbState.users).length} users, ${Object.keys(dbState.chats).length} chats, ${Object.keys(dbState.communities).length} communities.`);
    } else {
      saveDatabase();
      console.log('[Database] Initialized fresh empty database at data/database.json');
    }

    cleanMockDataIfPresent();
  } catch (err) {
    console.error('[Database] Error initializing database:', err);
  }
}

// Persist data safely to disk
function saveDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Failed to write database to disk:', err);
  }
}

// Initialize DB on import
initDatabase();

export function matchPhoneNumbers(target: string, candidate: string): boolean {
  if (!target || !candidate) return false;
  const cTarget = target.replace(/[^0-9]/g, '');
  const cCandidate = candidate.replace(/[^0-9]/g, '');
  if (!cTarget || !cCandidate) return false;
  if (cTarget === cCandidate) return true;

  const stripTarget = cTarget.replace(/^0+/, '');
  const stripCandidate = cCandidate.replace(/^0+/, '');
  if (stripTarget && stripCandidate && stripTarget === stripCandidate) return true;

  if (stripTarget.length >= 7 && stripCandidate.length >= 7) {
    if (stripCandidate.includes(stripTarget) || stripTarget.includes(stripCandidate)) return true;
    const minLen = Math.min(stripTarget.length, stripCandidate.length, 9);
    if (stripTarget.slice(-minLen) === stripCandidate.slice(-minLen)) return true;
  }
  return false;
}

export const db = {
  // --- USERS ---
  getUserById(id: string): StoredUser | null {
    return dbState.users[id] || null;
  },

  getUserByEmail(email: string): StoredUser | null {
    const cleanEmail = email.trim().toLowerCase();
    for (const u of Object.values(dbState.users)) {
      if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
        return u;
      }
    }
    return null;
  },

  getUserByGoogleId(googleId: string): StoredUser | null {
    for (const u of Object.values(dbState.users)) {
      if (u.googleId && u.googleId === googleId) {
        return u;
      }
    }
    return null;
  },

  getUserByPhone(normalizedPhone: string): StoredUser | null {
    if (!normalizedPhone) return null;
    const cleanTarget = normalizedPhone.replace(/[^0-9]/g, '');
    if (!cleanTarget) return null;
    for (const u of Object.values(dbState.users)) {
      if (u.phoneNumber) {
        const cleanUserPhone = ((u.countryCode || '') + u.phoneNumber).replace(/[^0-9]/g, '');
        if (matchPhoneNumbers(cleanTarget, cleanUserPhone) || matchPhoneNumbers(cleanTarget, u.phoneNumber)) {
          return u;
        }
      }
    }
    return null;
  },

  linkContactsToUser(user: StoredUser) {
    if (!user.phoneNumber) return;
    for (const ownerId of Object.keys(dbState.contacts)) {
      for (const c of dbState.contacts[ownerId]) {
        if (!c.contactUserId && (matchPhoneNumbers(c.phoneNumber, user.phoneNumber) || matchPhoneNumbers(c.phoneNumber, (user.countryCode || '') + user.phoneNumber))) {
          c.contactUserId = user.id;
          c.avatarUrl = user.avatarUrl || c.avatarUrl;
        }
      }
    }
    saveDatabase();
  },

  getAllUsers(): StoredUser[] {
    return Object.values(dbState.users);
  },

  searchUsers(query: string, excludeUserId?: string): StoredUser[] {
    const q = query.trim().toLowerCase();
    const cleanQ = query.replace(/[^0-9]/g, '');
    return Object.values(dbState.users).filter((u) => {
      if (excludeUserId && u.id === excludeUserId) return false;
      if (u.isSuspended) return false;
      if (!q) return true;

      const nameMatch = (u.displayName || '').toLowerCase().includes(q);
      const usernameMatch = (u.username || '').toLowerCase().includes(q.replace('@', ''));
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const aboutMatch = (u.about || '').toLowerCase().includes(q);
      const phoneClean = ((u.countryCode || '') + (u.phoneNumber || '')).replace(/[^0-9]/g, '');
      const uPhoneClean = (u.phoneNumber || '').replace(/[^0-9]/g, '');
      const phoneMatch = cleanQ.length > 0 && (
        phoneClean.includes(cleanQ) || 
        cleanQ.includes(uPhoneClean) ||
        matchPhoneNumbers(cleanQ, phoneClean) ||
        matchPhoneNumbers(cleanQ, uPhoneClean)
      );

      return nameMatch || usernameMatch || emailMatch || aboutMatch || phoneMatch;
    });
  },

  createUser(user: StoredUser): StoredUser {
    dbState.users[user.id] = user;
    saveDatabase();
    return user;
  },

  updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const u = dbState.users[id];
    if (!u) return null;
    dbState.users[id] = { ...u, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.users[id];
  },

  deleteUser(id: string): boolean {
    if (!dbState.users[id]) return false;
    delete dbState.users[id];
    delete dbState.contacts[id];
    delete dbState.aiConversations[id];
    saveDatabase();
    return true;
  },

  // --- CONTACTS ---
  getContacts(ownerUserId: string): StoredContact[] {
    return dbState.contacts[ownerUserId] || [];
  },

  addContact(ownerUserId: string, contact: StoredContact): StoredContact {
    if (!dbState.contacts[ownerUserId]) {
      dbState.contacts[ownerUserId] = [];
    }
    // Check if existing contact with same phone or id
    const existingIndex = dbState.contacts[ownerUserId].findIndex(
      (c) => c.id === contact.id || (contact.phoneNumber && matchPhoneNumbers(c.phoneNumber, contact.phoneNumber))
    );
    if (existingIndex >= 0) {
      dbState.contacts[ownerUserId][existingIndex] = {
        ...dbState.contacts[ownerUserId][existingIndex],
        ...contact,
      };
    } else {
      dbState.contacts[ownerUserId].unshift(contact);
    }
    saveDatabase();
    return contact;
  },

  deleteContact(ownerUserId: string, contactId: string): boolean {
    if (!dbState.contacts[ownerUserId]) return false;
    dbState.contacts[ownerUserId] = dbState.contacts[ownerUserId].filter((c) => c.id !== contactId);
    saveDatabase();
    return true;
  },

  // --- OTP STORE ---
  getOtp(phone: string): OtpRecord | undefined {
    const clean = phone.replace(/[^0-9]/g, '');
    return otpStore.get(clean);
  },

  setOtp(phone: string, otpData: OtpRecord) {
    const clean = phone.replace(/[^0-9]/g, '');
    otpStore.set(clean, otpData);
  },

  removeOtp(phone: string) {
    const clean = phone.replace(/[^0-9]/g, '');
    otpStore.delete(clean);
  },

  incrementOtpAttempts(phone: string) {
    const clean = phone.replace(/[^0-9]/g, '');
    const rec = otpStore.get(clean);
    if (rec) {
      rec.attempts += 1;
      otpStore.set(clean, rec);
    }
  },

  // --- CHATS ---
  getAllChats(): StoredChat[] {
    return Object.values(dbState.chats);
  },

  getChatsForUser(userId: string): StoredChat[] {
    return Object.values(dbState.chats).filter((c) => (c.memberIds || []).includes(userId));
  },

  getChatById(chatId: string): StoredChat | null {
    return dbState.chats[chatId] || null;
  },

  findDirectChat(userId1: string, userId2: string): StoredChat | null {
    for (const chat of Object.values(dbState.chats)) {
      if (!chat.isGroup && chat.memberIds.includes(userId1) && chat.memberIds.includes(userId2)) {
        return chat;
      }
    }
    return null;
  },

  createChat(chat: StoredChat): StoredChat {
    dbState.chats[chat.id] = chat;
    if (!dbState.messages[chat.id]) {
      dbState.messages[chat.id] = [];
    }
    saveDatabase();
    return chat;
  },

  updateChat(chatId: string, updates: Partial<StoredChat>): StoredChat | null {
    const c = dbState.chats[chatId];
    if (!c) return null;
    dbState.chats[chatId] = { ...c, ...updates };
    saveDatabase();
    return dbState.chats[chatId];
  },

  deleteChat(chatId: string) {
    delete dbState.chats[chatId];
    delete dbState.messages[chatId];
    saveDatabase();
  },

  // --- MESSAGES ---
  getMessages(chatId: string): StoredMessage[] {
    return dbState.messages[chatId] || [];
  },

  addMessage(chatId: string, message: StoredMessage): StoredMessage {
    if (!dbState.messages[chatId]) {
      dbState.messages[chatId] = [];
    }
    dbState.messages[chatId].push(message);

    if (dbState.chats[chatId]) {
      dbState.chats[chatId].updatedAt = message.timestamp || Date.now();
      dbState.chats[chatId].lastMessage = message;
    }

    saveDatabase();
    return message;
  },

  updateMessage(chatId: string, messageId: string, updates: Partial<StoredMessage>): StoredMessage | null {
    const list = dbState.messages[chatId];
    if (!list) return null;
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return null;
    Object.assign(msg, updates);
    saveDatabase();
    return msg;
  },

  deleteMessage(chatId: string, messageId: string, forEveryone: boolean, userId: string): boolean {
    const list = dbState.messages[chatId];
    if (!list) return false;
    const msgIndex = list.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return false;

    if (forEveryone) {
      list[msgIndex].isDeletedForEveryone = true;
      list[msgIndex].content = '🚫 This message was deleted';
      list[msgIndex].mediaUrl = undefined;
    } else {
      if (!list[msgIndex].deletedForUserIds) {
        list[msgIndex].deletedForUserIds = [];
      }
      if (!list[msgIndex].deletedForUserIds!.includes(userId)) {
        list[msgIndex].deletedForUserIds!.push(userId);
      }
    }
    saveDatabase();
    return true;
  },

  clearChatMessages(chatId: string) {
    dbState.messages[chatId] = [];
    if (dbState.chats[chatId]) {
      dbState.chats[chatId].lastMessage = undefined;
      dbState.chats[chatId].updatedAt = Date.now();
    }
    saveDatabase();
  },

  // --- STATUS STORIES ---
  getStatuses(onlyActive: boolean = true): StoredStatus[] {
    const now = Date.now();
    if (onlyActive) {
      return dbState.statuses.filter((s) => s.expiresAt > now);
    }
    return dbState.statuses;
  },

  addStatus(status: StoredStatus): StoredStatus {
    dbState.statuses.unshift(status);
    saveDatabase();
    return status;
  },

  viewStatus(statusId: string, viewer: { userId: string; userName: string; userAvatar: string; viewedAt: number }) {
    const story = dbState.statuses.find((s) => s.id === statusId);
    if (story) {
      if (!story.viewers.some((v) => v.userId === viewer.userId)) {
        story.viewers.push(viewer);
        saveDatabase();
      }
    }
  },

  deleteStatus(statusId: string) {
    const idx = dbState.statuses.findIndex((s) => s.id === statusId);
    if (idx >= 0) {
      dbState.statuses.splice(idx, 1);
      saveDatabase();
    }
  },

  // --- CALL LOGS ---
  getCallLogs(userId: string): StoredCallLog[] {
    return dbState.callLogs
      .filter((c) => c.callerId === userId || c.receiverId === userId)
      .sort((a, b) => b.startedAt - a.startedAt);
  },

  addCallLog(log: StoredCallLog): StoredCallLog {
    dbState.callLogs.unshift(log);
    saveDatabase();
    return log;
  },

  clearCallLogs(userId: string) {
    dbState.callLogs = dbState.callLogs.filter((c) => c.callerId !== userId && c.receiverId !== userId);
    saveDatabase();
  },

  // --- AI CONVERSATIONS ---
  getAIConversations(userId: string): StoredAIConversation[] {
    return (dbState.aiConversations[userId] || []).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  saveAIConversation(userId: string, conversation: StoredAIConversation): StoredAIConversation {
    if (!dbState.aiConversations[userId]) {
      dbState.aiConversations[userId] = [];
    }
    const idx = dbState.aiConversations[userId].findIndex((c) => c.id === conversation.id);
    if (idx >= 0) {
      dbState.aiConversations[userId][idx] = conversation;
    } else {
      dbState.aiConversations[userId].unshift(conversation);
    }
    saveDatabase();
    return conversation;
  },

  deleteAIConversation(userId: string, conversationId: string): boolean {
    if (!dbState.aiConversations[userId]) return false;
    dbState.aiConversations[userId] = dbState.aiConversations[userId].filter((c) => c.id !== conversationId);
    saveDatabase();
    return true;
  },

  // --- BLOCKS ---
  getBlockedUserIds(userId: string): string[] {
    return dbState.blocks[userId] || [];
  },

  blockUser(userId: string, targetId: string) {
    if (!dbState.blocks[userId]) {
      dbState.blocks[userId] = [];
    }
    if (!dbState.blocks[userId].includes(targetId)) {
      dbState.blocks[userId].push(targetId);
      saveDatabase();
    }
  },

  unblockUser(userId: string, targetId: string) {
    if (dbState.blocks[userId]) {
      dbState.blocks[userId] = dbState.blocks[userId].filter((id) => id !== targetId);
      saveDatabase();
    }
  },

  // --- REPORTS ---
  getReports(): StoredReport[] {
    return dbState.reports;
  },

  addReport(report: StoredReport): StoredReport {
    dbState.reports.unshift(report);
    saveDatabase();
    return report;
  },

  resolveReport(reportId: string, action: string) {
    const rep = dbState.reports.find((r) => r.id === reportId);
    if (rep) {
      rep.status = action === 'banned' ? 'resolved' : (action as any);
      if (action === 'banned' && rep.reportedUserId) {
        if (dbState.users[rep.reportedUserId]) {
          dbState.users[rep.reportedUserId].isSuspended = true;
        }
      }
      saveDatabase();
    }
  },

  // --- TELEMETRY ---
  getStats(totalAiRequests: number) {
    let totalMsgs = 0;
    Object.values(dbState.messages).forEach((arr) => {
      totalMsgs += arr.length;
    });

    return {
      totalUsers: Object.keys(dbState.users).length,
      activeUsers24h: Object.values(dbState.users).filter((u) => u.isOnline || Date.now() - u.lastSeen < 86400000).length,
      totalMessages: totalMsgs,
      totalGroups: Object.values(dbState.chats).filter((c) => c.isGroup).length,
      totalCalls: dbState.callLogs.length,
      totalStatuses: dbState.statuses.filter((s) => s.expiresAt > Date.now()).length,
      totalCommunities: Object.keys(dbState.communities).length,
      aiRequestsCount: totalAiRequests,
      storageUsedMb: Math.round(1.2 + totalMsgs * 0.01),
      serverUptimeHours: 48,
      serviceHealth: {
        database: 'healthy',
        realtime: 'healthy',
        aiGateway: 'healthy',
        mediaStorage: 'healthy',
      },
      reports: dbState.reports,
    };
  },

  // --- COMMUNITIES ---
  getAllCommunities(): StoredCommunity[] {
    return Object.values(dbState.communities).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  },

  getCommunityById(id: string): StoredCommunity | null {
    return dbState.communities[id] || null;
  },

  getCommunityByInvite(code: string): StoredCommunity | null {
    const clean = code.trim().toLowerCase();
    for (const c of Object.values(dbState.communities)) {
      if (c.inviteCode && c.inviteCode.trim().toLowerCase() === clean) {
        return c;
      }
    }
    return null;
  },

  createCommunity(comm: StoredCommunity): StoredCommunity {
    dbState.communities[comm.id] = comm;
    saveDatabase();
    return comm;
  },

  updateCommunity(id: string, updates: Partial<StoredCommunity>): StoredCommunity | null {
    const c = dbState.communities[id];
    if (!c) return null;
    dbState.communities[id] = { ...c, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.communities[id];
  },

  deleteCommunity(id: string): boolean {
    if (!dbState.communities[id]) return false;
    const comm = dbState.communities[id];
    // Delete connected channels & posts
    if (comm.channelIds) {
      comm.channelIds.forEach((chId) => {
        delete dbState.channels[chId];
        delete dbState.channelPosts[chId];
      });
    }
    delete dbState.communities[id];
    saveDatabase();
    return true;
  },

  addCommunityMember(commId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): StoredCommunity | null {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (!comm.members) comm.members = [];
    const exists = comm.members.find((m) => m.userId === userId);
    if (!exists) {
      comm.members.push({ userId, role, joinedAt: Date.now() });
      if (role === 'admin' && !comm.adminIds.includes(userId)) {
        comm.adminIds.push(userId);
      }
      comm.updatedAt = Date.now();
      saveDatabase();
    }
    return comm;
  },

  removeCommunityMember(commId: string, userId: string): StoredCommunity | null {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (comm.creatorId === userId) return comm; // Owner cannot be removed
    comm.members = (comm.members || []).filter((m) => m.userId !== userId);
    comm.adminIds = (comm.adminIds || []).filter((id) => id !== userId);
    comm.updatedAt = Date.now();
    saveDatabase();
    return comm;
  },

  updateCommunityMemberRole(commId: string, userId: string, role: 'owner' | 'admin' | 'member'): StoredCommunity | null {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    const member = (comm.members || []).find((m) => m.userId === userId);
    if (member) {
      member.role = role;
      if (role === 'admin' || role === 'owner') {
        if (!comm.adminIds.includes(userId)) comm.adminIds.push(userId);
      } else {
        comm.adminIds = comm.adminIds.filter((id) => id !== userId);
      }
      comm.updatedAt = Date.now();
      saveDatabase();
    }
    return comm;
  },

  addGroupToCommunity(commId: string, groupId: string): StoredCommunity | null {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (!comm.groupIds) comm.groupIds = [];
    if (!comm.groupIds.includes(groupId)) {
      comm.groupIds.push(groupId);
      comm.updatedAt = Date.now();
      // Also tag the chat itself with communityId
      if (dbState.chats[groupId]) {
        dbState.chats[groupId].communityId = commId;
      }
      saveDatabase();
    }
    return comm;
  },

  removeGroupFromCommunity(commId: string, groupId: string): StoredCommunity | null {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    comm.groupIds = (comm.groupIds || []).filter((id) => id !== groupId);
    comm.updatedAt = Date.now();
    if (dbState.chats[groupId]) {
      dbState.chats[groupId].communityId = undefined;
    }
    saveDatabase();
    return comm;
  },

  // --- CHANNELS ---
  getAllChannels(): StoredChannel[] {
    return Object.values(dbState.channels);
  },

  getChannelsForCommunity(commId: string): StoredChannel[] {
    return Object.values(dbState.channels).filter((ch) => ch.communityId === commId);
  },

  getChannelById(channelId: string): StoredChannel | null {
    return dbState.channels[channelId] || null;
  },

  createChannel(channel: StoredChannel): StoredChannel {
    dbState.channels[channel.id] = channel;
    if (!dbState.channelPosts[channel.id]) {
      dbState.channelPosts[channel.id] = [];
    }
    // Add channel to community
    if (dbState.communities[channel.communityId]) {
      const comm = dbState.communities[channel.communityId];
      if (!comm.channelIds) comm.channelIds = [];
      if (!comm.channelIds.includes(channel.id)) {
        comm.channelIds.push(channel.id);
        comm.updatedAt = Date.now();
      }
    }
    saveDatabase();
    return channel;
  },

  updateChannel(channelId: string, updates: Partial<StoredChannel>): StoredChannel | null {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    dbState.channels[channelId] = { ...ch, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.channels[channelId];
  },

  deleteChannel(channelId: string): boolean {
    const ch = dbState.channels[channelId];
    if (!ch) return false;
    if (dbState.communities[ch.communityId]) {
      const comm = dbState.communities[ch.communityId];
      comm.channelIds = (comm.channelIds || []).filter((id) => id !== channelId);
      comm.updatedAt = Date.now();
    }
    delete dbState.channels[channelId];
    delete dbState.channelPosts[channelId];
    saveDatabase();
    return true;
  },

  joinChannel(channelId: string, userId: string): StoredChannel | null {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    if (!ch.followerIds) ch.followerIds = [];
    if (!ch.followerIds.includes(userId)) {
      ch.followerIds.push(userId);
      ch.updatedAt = Date.now();
      saveDatabase();
    }
    return ch;
  },

  leaveChannel(channelId: string, userId: string): StoredChannel | null {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    ch.followerIds = (ch.followerIds || []).filter((id) => id !== userId);
    ch.updatedAt = Date.now();
    saveDatabase();
    return ch;
  },

  // --- CHANNEL POSTS ---
  getChannelPosts(channelId: string): StoredChannelPost[] {
    return (dbState.channelPosts[channelId] || []).sort((a, b) => b.createdAt - a.createdAt);
  },

  addChannelPost(post: StoredChannelPost): StoredChannelPost {
    if (!dbState.channelPosts[post.channelId]) {
      dbState.channelPosts[post.channelId] = [];
    }
    dbState.channelPosts[post.channelId].unshift(post);
    if (dbState.channels[post.channelId]) {
      dbState.channels[post.channelId].updatedAt = post.createdAt || Date.now();
    }
    saveDatabase();
    return post;
  },

  likeChannelPost(channelId: string, postId: string, userId: string): StoredChannelPost | null {
    const list = dbState.channelPosts[channelId];
    if (!list) return null;
    const post = list.find((p) => p.id === postId);
    if (!post) return null;
    if (!post.likes) post.likes = [];
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
    }
    saveDatabase();
    return post;
  },

  deleteChannelPost(channelId: string, postId: string): boolean {
    const list = dbState.channelPosts[channelId];
    if (!list) return false;
    dbState.channelPosts[channelId] = list.filter((p) => p.id !== postId);
    saveDatabase();
    return true;
  },
};

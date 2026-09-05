/**
 * ERROREN CHAT - Global Type Definitions
 * Tagline: "Secure. Private. Real-time."
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'green' | 'cyan' | 'gold';

export interface AccentColorConfig {
  id: AccentColor;
  name: string;
  hex: string;
  hoverHex: string;
  lightBg: string;
  borderHex: string;
  ringClass: string;
}

export type WallpaperStyle = 
  | 'cyber-mesh' 
  | 'midnight-dark' 
  | 'emerald-glow' 
  | 'minimal-slate' 
  | 'deep-carbon'
  | 'doodle-pattern'
  | 'forest-emerald'
  | 'sunset-violet'
  | 'solid-navy'
  | 'solid-charcoal'
  | 'solid-emerald'
  | 'custom';

export type MainTab = 'chats' | 'status' | 'communities' | 'calls' | 'ai' | 'settings' | 'admin';

export interface User {
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

export interface Contact {
  id: string;
  ownerUserId: string;
  contactUserId?: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string;
  about?: string;
  isOnline?: boolean;
  lastSeen?: number;
  isBlocked?: boolean;
  createdAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location' | 'ai_reply';

export interface MediaAttachment {
  id: string;
  type: MessageType;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number | string;
  mimeType?: string;
  duration?: number;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  userName?: string;
}

export type Reaction = MessageReaction;

export interface ReplyToMessage {
  id: string;
  senderName: string;
  content: string;
  type: MessageType;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  media?: MediaAttachment;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  duration?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  replyTo?: ReplyToMessage;
  isStarred?: boolean;
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  expiresAt?: number;
}

export interface Chat {
  id: string;
  isGroup: boolean;
  title: string;
  name?: string;
  avatarUrl: string;
  description?: string;
  participantIds: string[];
  memberIds?: string[];
  adminIds?: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  draft?: string;
  communityId?: string;
  createdAt: number;
  updatedAt: number;
  disappearingTimerHours?: number;
}

export type CommunityRole = 'owner' | 'admin' | 'member';

export interface CommunityMember {
  userId: string;
  role: CommunityRole;
  joinedAt: number;
  user?: User;
}

export interface ChannelPost {
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
  likes?: string[];
}

export interface Channel {
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
  postsCount?: number;
  isFollowed?: boolean;
  posts?: ChannelPost[];
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  creatorId: string;
  members: CommunityMember[];
  adminIds: string[];
  groupIds: string[];
  channelIds: string[];
  inviteCode: string;
  isPublic?: boolean;
  createdAt: number;
  updatedAt: number;
  memberCount?: number;
  isJoined?: boolean;
  userRole?: CommunityRole;
  groups?: Chat[];
  channels?: Channel[];
}

export interface StatusViewer {
  userId: string;
  userName: string;
  userAvatar: string;
  viewedAt: number;
}

export interface StatusStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: string;
  createdAt: number;
  expiresAt: number;
  views?: StatusViewer[];
  viewers?: StatusViewer[];
  likesCount?: number;
}

export type CallType = 'voice' | 'audio' | 'video';
export type CallDirection = 'incoming' | 'outgoing' | 'missed';
export type CallStatus = 'ringing' | 'connected' | 'ended' | 'declined' | 'busy' | 'rejected' | 'missed';

export interface CallLog {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: CallType;
  direction: CallDirection;
  status: CallStatus;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  durationSeconds?: number;
}

export interface ActiveCall {
  callId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  type: CallType;
  isInitiator: boolean;
  status: CallStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  startTime?: number;
  channelId: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actionSource?: string;
}

export interface AIConversation {
  id: string;
  userId?: string;
  title: string;
  messages: AIMessage[];
  updatedAt: number;
}

export interface PrivacySettings {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  onlineVisibility: 'everyone' | 'same_as_last_seen';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  aboutVisibility: 'everyone' | 'contacts' | 'nobody';
  statusPrivacy: 'everyone' | 'contacts' | 'selected';
  phoneVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  disappearingMessagesDefault: number;
  blockedUserIds: string[];
}

export interface NotificationSettings {
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  previewMessage: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  fingerprintLock: boolean;
  activeSessions: {
    id: string;
    device: string;
    browser: string;
    location: string;
    lastActive: number;
    isCurrent: boolean;
  }[];
}

export interface UserSettings {
  theme: ThemeMode;
  accentColor?: AccentColor;
  wallpaper: WallpaperStyle;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  aiPreferences: {
    autoSuggestReplies: boolean;
    tone: 'concise' | 'professional' | 'creative' | 'friendly';
  };
}

export interface AdminStats {
  totalUsers: number;
  activeSockets?: number;
  activeUsers24h?: number;
  totalMessages: number;
  totalGroups?: number;
  totalCalls: number;
  totalStatuses?: number;
  aiRequestsCount?: number;
  storageUsedMb?: number;
  serverUptimeHours?: number;
  serviceHealth?: {
    database: 'healthy' | 'degraded' | 'down';
    realtime: 'healthy' | 'degraded' | 'down';
    aiGateway: 'healthy' | 'degraded' | 'down';
    mediaStorage: 'healthy' | 'degraded' | 'down';
  };
}

export interface Report {
  id: string;
  reportedBy: string;
  targetId?: string;
  reportedUserId?: string;
  reportedGroupId?: string;
  reportedName?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed' | 'banned';
  createdAt: number;
}

export type AbuseReport = Report;

// WebSocket Event Payloads
export type SocketMessageType = 
  | 'auth'
  | 'presence'
  | 'presence:initial'
  | 'message:send'
  | 'message:new'
  | 'message:status'
  | 'message:reaction'
  | 'message:edit'
  | 'message:delete'
  | 'typing'
  | 'typing:indicator'
  | 'status:new'
  | 'call:offer'
  | 'call:answer'
  | 'call:ice-candidate'
  | 'call:reject'
  | 'call:rejected'
  | 'call:end'
  | 'call:ended'
  | 'call:incoming'
  | 'ping'
  | 'pong'
  | 'error';

export interface SocketEventPayload {
  type: SocketMessageType;
  userId?: string;
  chatId?: string;
  message?: Message;
  reaction?: { messageId: string; emoji: string; userId: string; userName?: string };
  editData?: { messageId: string; content: string };
  deleteData?: { messageId: string; forEveryone: boolean; userId: string };
  statusData?: StatusStory;
  callData?: {
    callId: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar: string;
    toUserId: string;
    callType: CallType;
    sdp?: any;
    candidate?: any;
    reason?: string;
  };
  typingUser?: { userId: string; userName: string; chatId: string };
  presenceData?: { userId: string; isOnline: boolean; lastSeen: number };
  onlineUserIds?: string[];
}

/**
 * ERROREN CHAT - Supabase Realtime & Persistent Database Service
 * Provides WhatsApp-style phone lookup, permanent contact relationships,
 * offline message delivery, read receipts, and real-time subscriptions.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
export { isSupabaseConfigured };
import { User, Contact, Chat, Message, Community, StatusStory, Channel, ChannelPost } from '../types';
import { getPhoneLookupVariants, normalizePhoneNumber, isPhoneMatch } from '../utils/phoneUtils';

export interface PhoneLookupResult {
  registered: boolean;
  user?: User;
  isSelf?: boolean;
  message?: string;
  error?: string;
}

// ==============================================================================
// 1. PROFILES & PHONE LOOKUP
// ==============================================================================

/**
 * Searches Supabase for an existing registered ERROREN CHAT user with the given phone number.
 * Uses comprehensive phone variants (local 03xx, international +92, E.164, raw digits).
 */
export async function findUserByPhone(
  rawPhone: string,
  currentUserId?: string
): Promise<PhoneLookupResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { registered: false, error: 'Supabase is not configured.' };
  }

  const clean = rawPhone.trim().replace(/[^0-9]/g, '');
  if (clean.length < 7) {
    return { registered: false, error: 'Please enter a valid phone number (at least 7 digits).' };
  }

  try {
    const variants = getPhoneLookupVariants(rawPhone);

    // Search profiles by phone or phone_normalized in variants
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(
        `phone.in.(${variants.map((v) => `"${v}"`).join(',')}),phone_normalized.in.(${variants.map((v) => `"${v}"`).join(',')})`
      )
      .limit(10);

    if (error) {
      console.warn('[Supabase] Phone lookup query error:', error);
      // Fallback: try direct text matching or iterating
      const { data: allProfiles } = await client.from('profiles').select('*').limit(200);
      if (allProfiles && allProfiles.length > 0) {
        const matched = allProfiles.find(
          (p: any) =>
            (p.phone && isPhoneMatch(p.phone, rawPhone)) ||
            (p.phone_normalized && isPhoneMatch(p.phone_normalized, rawPhone))
        );
        if (matched) {
          const user = mapProfileToUser(matched);
          const isSelf = currentUserId ? matched.id === currentUserId : false;
          return {
            registered: true,
            user,
            isSelf,
            message: isSelf
              ? 'This is your own registered phone number.'
              : `ERROREN CHAT user found: ${user.displayName}`,
          };
        }
      }
      return { registered: false, message: 'This number is not registered on ERROREN CHAT.' };
    }

    if (data && data.length > 0) {
      // Pick best match
      const matched = data[0];
      const user = mapProfileToUser(matched);
      const isSelf = currentUserId ? matched.id === currentUserId : false;

      return {
        registered: true,
        user,
        isSelf,
        message: isSelf
          ? 'This is your own registered phone number.'
          : `ERROREN CHAT user found: ${user.displayName}`,
      };
    }

    return {
      registered: false,
      message: 'This number is not registered on ERROREN CHAT.',
    };
  } catch (err: any) {
    console.error('[Supabase] findUserByPhone exception:', err);
    return { registered: false, error: err.message || 'Error checking phone registration.' };
  }
}

/**
 * Upserts a user's profile record in the Supabase `profiles` table.
 * Enforces phone normalization and uniqueness.
 */
export async function upsertUserProfile(user: Partial<User>): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client || !user.id) return null;

  const rawPhone = user.phoneNumber?.trim() || null;
  const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone, user.countryCode || '+92') : null;

  const profilePayload: any = {
    id: user.id,
    email: user.email?.trim().toLowerCase() || null,
    username: user.username?.trim().toLowerCase() || null,
    phone: rawPhone,
    phone_normalized: normalizedPhone,
    country_code: user.countryCode || '+92',
    display_name: user.displayName?.trim() || 'Member',
    avatar_url: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
    bio: user.about || 'Available | Using ERROREN CHAT ⚡',
    is_online: user.isOnline ?? true,
    last_seen: new Date().toISOString(),
    role: user.role || 'user',
    is_profile_complete: user.isProfileComplete ?? (user.profileCompleted ?? true),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Profile upsert error:', error);
      return null;
    }

    return mapProfileToUser(data);
  } catch (e) {
    console.error('[Supabase] upsertUserProfile exception:', e);
    return null;
  }
}

export async function fetchProfileById(userId: string): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfileToUser(data);
  } catch (e) {
    console.warn('[Supabase] fetchProfileById error:', e);
    return null;
  }
}

export async function fetchAllRegisteredProfiles(): Promise<User[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('display_name', { ascending: true })
      .limit(200);

    if (error || !data) return [];
    return data.map(mapProfileToUser);
  } catch {
    return [];
  }
}

export async function updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    await client
      .from('profiles')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.warn('[Supabase] updateOnlineStatus error:', e);
  }
}

// ==============================================================================
// 2. WHATSAPP-STYLE CONTACT RELATIONSHIPS
// ==============================================================================

/**
 * Creates or updates a permanent contact relationship in the Supabase `contacts` table.
 * Prevents duplicates via unique constraint.
 */
export async function addContactToSupabase(
  ownerUserId: string,
  contactUser: User,
  customName?: string,
  avatarUrl?: string,
  about?: string
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (ownerUserId === contactUser.id) {
    return { success: false, error: 'You cannot add yourself as a contact.' };
  }

  try {
    const contactPayload = {
      owner_user_id: ownerUserId,
      contact_user_id: contactUser.id,
      name: customName?.trim() || contactUser.displayName,
      phone: contactUser.phoneNumber || '',
      avatar_url: avatarUrl || contactUser.avatarUrl,
      about: about || contactUser.about || 'Available | Using ERROREN CHAT ⚡',
      status: 'accepted',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('contacts')
      .upsert(contactPayload, { onConflict: 'owner_user_id,contact_user_id' })
      .select('*, profile:contact_user_id(*)')
      .single();

    if (error) {
      console.warn('[Supabase] addContact error:', error);
      return { success: false, error: error.message };
    }

    const savedContact: Contact = {
      id: data.id,
      ownerUserId: data.owner_user_id,
      contactUserId: data.contact_user_id,
      name: data.name,
      phoneNumber: data.phone,
      avatarUrl: data.avatar_url || data.profile?.avatar_url,
      about: data.about || data.profile?.bio,
      isOnline: Boolean(data.profile?.is_online),
      lastSeen: data.profile?.last_seen ? new Date(data.profile.last_seen).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
    };

    return { success: true, contact: savedContact };
  } catch (err: any) {
    console.error('[Supabase] addContact exception:', err);
    return { success: false, error: err.message || 'Failed to save contact.' };
  }
}

/**
 * Fetches all saved contacts for the specified user from Supabase.
 * Joins with `profiles` so live status, last seen, and profile pictures are always current.
 */
export async function getContactsFromSupabase(ownerUserId: string): Promise<Contact[]> {
  const client = getSupabaseClient();
  if (!client || !ownerUserId) return [];

  try {
    const { data, error } = await client
      .from('contacts')
      .select('*, profile:contact_user_id(*)')
      .eq('owner_user_id', ownerUserId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[Supabase] getContacts error:', error);
      return [];
    }

    return data.map((c: any) => ({
      id: c.id,
      ownerUserId: c.owner_user_id,
      contactUserId: c.contact_user_id,
      name: c.name,
      phoneNumber: c.phone || c.profile?.phone || '',
      avatarUrl: c.avatar_url || c.profile?.avatar_url,
      about: c.about || c.profile?.bio,
      isOnline: Boolean(c.profile?.is_online),
      lastSeen: c.profile?.last_seen ? new Date(c.profile.last_seen).getTime() : undefined,
      isBlocked: c.status === 'blocked',
      createdAt: new Date(c.created_at).getTime(),
    }));
  } catch (err) {
    console.error('[Supabase] getContacts exception:', err);
    return [];
  }
}

export async function deleteContactFromSupabase(ownerUserId: string, contactId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('contacts')
      .delete()
      .eq('owner_user_id', ownerUserId)
      .or(`id.eq.${contactId},contact_user_id.eq.${contactId}`);

    return !error;
  } catch (e) {
    console.warn('[Supabase] deleteContact error:', e);
    return false;
  }
}

// ==============================================================================
// 3. CHATS & CONVERSATIONS
// ==============================================================================

/**
 * Finds an existing direct chat between two users, or creates a new one.
 * Guarantees that only ONE direct conversation exists between userA and userB.
 */
export async function getOrCreateDirectChatInSupabase(
  userA: User,
  userB: User
): Promise<{ chat: Chat; isNew: boolean } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Check if direct chat already exists between userA and userB
    // Find chat_ids where userA is member
    const { data: userAChats, error: errA } = await client
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userA.id);

    if (!errA && userAChats && userAChats.length > 0) {
      const chatIds = userAChats.map((c) => c.chat_id);

      // Check which of these chats userB also belongs to, and is direct
      const { data: sharedChats, error: errShared } = await client
        .from('chat_members')
        .select('chat_id, chat:chat_id(*)')
        .eq('user_id', userB.id)
        .in('chat_id', chatIds);

      if (!errShared && sharedChats && sharedChats.length > 0) {
        for (const item of sharedChats) {
          const chatData = item.chat as any;
          if (chatData && chatData.type === 'direct') {
            // Found existing direct chat!
            return {
              chat: {
                id: chatData.id,
                isGroup: false,
                title: userB.displayName,
                name: userB.displayName,
                avatarUrl: userB.avatarUrl,
                participantIds: [userA.id, userB.id],
                memberIds: [userA.id, userB.id],
                unreadCount: 0,
                createdAt: new Date(chatData.created_at).getTime(),
                updatedAt: new Date(chatData.updated_at).getTime(),
              },
              isNew: false,
            };
          }
        }
      }
    }

    // 2. If no direct chat exists, create a new one!
    const { data: newChat, error: createErr } = await client
      .from('chats')
      .insert({
        type: 'direct',
        name: `${userA.displayName} & ${userB.displayName}`,
        created_by: userA.id,
      })
      .select()
      .single();

    if (createErr || !newChat) {
      console.warn('[Supabase] Failed to create direct chat:', createErr);
      return null;
    }

    // 3. Add both users to chat_members
    await client.from('chat_members').insert([
      { chat_id: newChat.id, user_id: userA.id, role: 'member' },
      { chat_id: newChat.id, user_id: userB.id, role: 'member' },
    ]);

    return {
      chat: {
        id: newChat.id,
        isGroup: false,
        title: userB.displayName,
        name: userB.displayName,
        avatarUrl: userB.avatarUrl,
        participantIds: [userA.id, userB.id],
        memberIds: [userA.id, userB.id],
        unreadCount: 0,
        createdAt: new Date(newChat.created_at).getTime(),
        updatedAt: new Date(newChat.updated_at).getTime(),
      },
      isNew: true,
    };
  } catch (err) {
    console.error('[Supabase] getOrCreateDirectChat exception:', err);
    return null;
  }
}

/**
 * Fetches all chats in which the user is a participant.
 */
export async function fetchUserChatsFromSupabase(userId: string): Promise<Chat[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];

  try {
    const { data: memberRows, error: mErr } = await client
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (mErr || !memberRows || memberRows.length === 0) return [];
    const chatIds = memberRows.map((r) => r.chat_id);

    const { data: chatData, error: cErr } = await client
      .from('chats')
      .select('*, chat_members(user_id, role, profile:user_id(*))')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (cErr || !chatData) return [];

    return chatData.map((c: any) => {
      const members = c.chat_members || [];
      const participantIds = members.map((m: any) => m.user_id);
      const otherMember = members.find((m: any) => m.user_id !== userId);
      const partnerProfile = otherMember?.profile;
      const isGroup = c.type === 'group';
      const title = isGroup ? c.name : (partnerProfile?.display_name || c.name || 'Direct Chat');
      const avatarUrl = isGroup ? c.avatar_url : (partnerProfile?.avatar_url || c.avatar_url);

      return {
        id: c.id,
        isGroup,
        title,
        name: title,
        avatarUrl,
        participantIds,
        memberIds: participantIds,
        unreadCount: 0,
        createdAt: new Date(c.created_at).getTime(),
        updatedAt: new Date(c.updated_at).getTime(),
      };
    });
  } catch (err) {
    console.error('[Supabase] fetchUserChatsFromSupabase exception:', err);
    return [];
  }
}

// ==============================================================================
// 4. MESSAGES & PERSISTENCE
// ==============================================================================

/**
 * Fetches messages for a chat from Supabase, ordered chronologically.
 */
export async function fetchChatMessagesFromSupabase(chatId: string, limit = 100): Promise<Message[]> {
  const client = getSupabaseClient();
  if (!client || !chatId) return [];

  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) {
      console.warn('[Supabase] fetchChatMessages error:', error);
      return [];
    }

    return data.map(mapRowToMessage);
  } catch (e) {
    console.error('[Supabase] fetchChatMessages exception:', e);
    return [];
  }
}

/**
 * Inserts a new message into Supabase.
 * Delivered in real-time to active listeners, and permanently saved for offline users.
 */
export async function sendMessageToSupabase(message: Message): Promise<Message | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const payload = {
      id: message.id,
      chat_id: message.chatId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar,
      content: message.content,
      type: message.type || 'text',
      media_url: message.mediaUrl,
      file_name: message.fileName,
      file_size: message.fileSize ? String(message.fileSize) : null,
      status: message.status || 'sent',
      reactions: message.reactions || [],
      reply_to: message.replyTo || null,
      created_at: new Date(message.timestamp).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] sendMessage error:', error);
      return null;
    }

    // Update chat updated_at
    await client
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.chatId);

    return mapRowToMessage(data);
  } catch (e) {
    console.error('[Supabase] sendMessage exception:', e);
    return null;
  }
}

/**
 * Marks unread messages in a chat as read by the current user.
 */
export async function markChatMessagesAsReadInSupabase(chatId: string, currentUserId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !chatId || !currentUserId) return;

  try {
    // 1. Update message status to read
    await client
      .from('messages')
      .update({ status: 'read', updated_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId)
      .neq('status', 'read');

    // 2. Update member last_read_at
    await client
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', currentUserId);
  } catch (e) {
    console.warn('[Supabase] markChatMessagesAsRead error:', e);
  }
}

// ==============================================================================
// 5. REAL-TIME SUBSCRIPTIONS
// ==============================================================================

/**
 * Subscribes to new messages and message updates in real time for a chat.
 */
export function subscribeToChatMessages(
  chatId: string,
  onNewMessage: (msg: Message) => void,
  onMessageUpdate?: (msg: Message) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !chatId) return () => {};

  const channel = client
    .channel(`chat_messages_${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(mapRowToMessage(payload.new));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.new && onMessageUpdate) {
          onMessageUpdate(mapRowToMessage(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Subscribes to profile presence changes (online / last_seen) across all users.
 */
export function subscribeToPresence(
  onPresenceChange: (userId: string, isOnline: boolean, lastSeen: number) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public_profiles_presence')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      (payload) => {
        if (payload.new) {
          const p = payload.new;
          const lastSeenTime = p.last_seen ? new Date(p.last_seen).getTime() : Date.now();
          onPresenceChange(p.id, Boolean(p.is_online), lastSeenTime);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ==============================================================================
// HELPERS & MAPPERS
// ==============================================================================

function mapProfileToUser(p: any): User {
  const isComplete = Boolean(
    p.is_profile_complete ||
    p.profile_completed ||
    (p.phone && p.email && p.username && p.display_name && p.display_name !== 'New Member')
  );

  return {
    id: p.id,
    email: p.email || '',
    username: p.username,
    displayName: p.display_name || p.username || 'Member',
    phoneNumber: p.phone,
    countryCode: p.country_code || '+92',
    avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`,
    about: p.bio || 'Available | Using ERROREN CHAT ⚡',
    isOnline: Boolean(p.is_online),
    lastSeen: p.last_seen ? new Date(p.last_seen).getTime() : Date.now(),
    role: p.role === 'admin' ? 'admin' : 'user',
    isProfileComplete: isComplete,
    profileCompleted: isComplete,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

// ==============================================================================
// 6. COMMUNITIES
// ==============================================================================

export async function createCommunityInSupabase(comm: {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  creatorId: string;
}): Promise<Community | null> {
  const client = getSupabaseClient();
  const newCommunity: Community = {
    id: comm.id,
    name: comm.name,
    description: comm.description,
    avatarUrl: comm.avatarUrl,
    creatorId: comm.creatorId,
    members: [{ userId: comm.creatorId, role: 'owner', joinedAt: Date.now() }],
    adminIds: [comm.creatorId],
    groupIds: [],
    channelIds: [],
    inviteCode: `err_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memberCount: 1,
    isJoined: true,
  };

  if (!client) return newCommunity;

  try {
    const { data, error } = await client
      .from('communities')
      .insert({
        id: comm.id,
        name: comm.name,
        description: comm.description,
        avatar_url: comm.avatarUrl,
        creator_id: comm.creatorId,
        member_count: 1,
        is_public: true,
        invite_code: newCommunity.inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      // Also add creator to community_members
      try {
        await client.from('community_members').insert({
          community_id: comm.id,
          user_id: comm.creatorId,
          role: 'owner',
        });
      } catch {
        // ignore duplicate or non-fatal insertion
      }
    }

    return newCommunity;
  } catch (e) {
    console.warn('[Supabase] createCommunity error:', e);
    return newCommunity;
  }
}

export async function fetchCommunitiesFromSupabase(userId?: string): Promise<Community[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    let userJoinedCommIds = new Set<string>();
    if (userId) {
      const { data: memberRows } = await client
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (memberRows) {
        memberRows.forEach((r: any) => userJoinedCommIds.add(r.community_id));
      }
    }

    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.name}`,
      creatorId: c.creator_id,
      members: [],
      adminIds: [c.creator_id],
      groupIds: [],
      channelIds: [],
      inviteCode: c.invite_code || c.id.substring(0, 8),
      isPublic: Boolean(c.is_public ?? true),
      createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
      updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
      memberCount: c.member_count || 1,
      isJoined: userId ? userJoinedCommIds.has(c.id) : false,
    }));
  } catch (err) {
    console.warn('[Supabase] fetchCommunities error:', err);
    return [];
  }
}

export async function joinCommunityInSupabase(communityId: string, userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('community_members').upsert({
      community_id: communityId,
      user_id: userId,
      role: 'member',
    }, { onConflict: 'community_id,user_id' });

    // increment count
    const { data } = await client.from('communities').select('member_count').eq('id', communityId).single();
    if (data) {
      await client.from('communities').update({
        member_count: (data.member_count || 1) + 1,
      }).eq('id', communityId);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] joinCommunity error:', e);
    return true;
  }
}

export async function leaveCommunityInSupabase(communityId: string, userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);

    const { data } = await client.from('communities').select('member_count').eq('id', communityId).single();
    if (data && data.member_count > 1) {
      await client.from('communities').update({
        member_count: data.member_count - 1,
      }).eq('id', communityId);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] leaveCommunity error:', e);
    return true;
  }
}

// ==============================================================================
// 7. STATUS STORIES (with 6h, 12h, 24h expiration)
// ==============================================================================

export async function saveStatusToSupabase(story: StatusStory): Promise<StatusStory> {
  const client = getSupabaseClient();
  if (!client) return story;

  try {
    const payload = {
      id: story.id,
      user_id: story.userId,
      user_name: story.userName,
      user_avatar: story.userAvatar,
      type: story.type,
      content: story.content || null,
      media_url: story.mediaUrl || null,
      background_color: story.backgroundColor || null,
      caption: story.caption || null,
      duration_hours: story.durationHours || 24,
      expires_at: new Date(story.expiresAt).toISOString(),
      created_at: new Date(story.createdAt).toISOString(),
      views: story.views || [],
    };

    await client.from('status_stories').upsert(payload, { onConflict: 'id' });
    return story;
  } catch (e) {
    console.warn('[Supabase] saveStatus error:', e);
    return story;
  }
}

export async function fetchActiveStatusesFromSupabase(): Promise<StatusStory[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('status_stories')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      userName: s.user_name,
      userAvatar: s.user_avatar,
      type: s.type || 'text',
      content: s.content,
      mediaUrl: s.media_url,
      backgroundColor: s.background_color,
      caption: s.caption,
      durationHours: s.duration_hours || 24,
      createdAt: new Date(s.created_at).getTime(),
      expiresAt: new Date(s.expires_at).getTime(),
      views: s.views || [],
    }));
  } catch (e) {
    console.warn('[Supabase] fetchActiveStatuses error:', e);
    return [];
  }
}

// ==============================================================================
// 8. USER SEARCH IN SUPABASE
// ==============================================================================

export async function searchUsersInSupabase(query: string, currentUserId?: string): Promise<User[]> {
  const client = getSupabaseClient();
  const cleanQ = query.trim().toLowerCase();
  const cleanDigits = cleanQ.replace(/[^0-9]/g, '');

  if (!client) return [];

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .limit(50);

    if (error || !data) return [];

    const matched = data.filter((p: any) => {
      if (currentUserId && p.id === currentUserId) return false;
      const nameMatch = (p.display_name || '').toLowerCase().includes(cleanQ);
      const usernameMatch = (p.username || '').toLowerCase().includes(cleanQ.replace(/^@/, ''));
      const phoneClean = (p.phone || '').replace(/[^0-9]/g, '');
      const phoneMatch = cleanDigits.length >= 4 && phoneClean.includes(cleanDigits);
      return nameMatch || usernameMatch || phoneMatch;
    });

    return matched.map(mapProfileToUser);
  } catch (err) {
    console.warn('[Supabase] searchUsers error:', err);
    return [];
  }
}

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    type: row.type || 'text',
    content: row.content,
    mediaUrl: row.media_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    status: row.status || 'sent',
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    replyTo: row.reply_to || undefined,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

// ==============================================================================
// 9. SUPABASE STORAGE (Avatars & Chat Media)
// ==============================================================================

export async function uploadFileToSupabaseStorage(
  file: File | Blob,
  bucket = 'media',
  pathPrefix = 'uploads'
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const ext = file instanceof File && file.name ? file.name.split('.').pop() : 'bin';
    const filePath = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await client.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error || !data) {
      console.warn('[Supabase Storage] upload notice:', error?.message);
      return null;
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Supabase Storage] upload exception:', err);
    return null;
  }
}

// ==============================================================================
// 10. CONTACT DELETION & PHONE UPDATE IN SUPABASE
// ==============================================================================

export async function updateUserPhoneInSupabase(
  userId: string,
  phoneNumber: string,
  countryCode = '+92'
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    const { error } = await client
      .from('profiles')
      .update({
        phone: phoneNumber.trim(),
        phone_normalized: normalized,
        country_code: countryCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.warn('[Supabase] updateUserPhone error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] updateUserPhone exception:', e);
    return true;
  }
}

// ==============================================================================
// 11. CHANNELS & CHANNEL POSTS IN SUPABASE
// ==============================================================================

export async function createChannelInSupabase(
  communityId: string,
  channel: {
    name: string;
    description?: string;
    creatorId: string;
    isReadOnly?: boolean;
    avatarUrl?: string;
  }
): Promise<Channel | null> {
  const client = getSupabaseClient();
  const channelId = `chn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const createdChannel: Channel = {
    id: channelId,
    communityId,
    name: channel.name,
    description: channel.description || '',
    creatorId: channel.creatorId,
    adminIds: [channel.creatorId],
    followerIds: [channel.creatorId],
    isReadOnly: Boolean(channel.isReadOnly),
    avatarUrl: channel.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    postsCount: 0,
    isFollowed: true,
  };

  if (!client) return createdChannel;

  try {
    const payload = {
      id: channelId,
      community_id: communityId,
      name: channel.name,
      description: channel.description || null,
      creator_id: channel.creatorId,
      is_read_only: Boolean(channel.isReadOnly),
      avatar_url: channel.avatarUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('channels').insert(payload).select().maybeSingle();
    if (error) {
      console.warn('[Supabase] createChannel error, falling back:', error.message);
    }
    return createdChannel;
  } catch (e) {
    console.warn('[Supabase] createChannel exception:', e);
    return createdChannel;
  }
}

export async function fetchChannelsFromSupabase(communityId: string): Promise<Channel[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('channels')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      communityId: c.community_id,
      name: c.name,
      description: c.description || '',
      creatorId: c.creator_id,
      adminIds: [c.creator_id],
      followerIds: [c.creator_id],
      isReadOnly: Boolean(c.is_read_only),
      avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.name)}`,
      createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
      updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
      postsCount: 0,
      isFollowed: true,
    }));
  } catch (e) {
    console.warn('[Supabase] fetchChannels exception:', e);
    return [];
  }
}

export async function createChannelPostInSupabase(
  channelId: string,
  post: {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    title?: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    linkUrl?: string;
  }
): Promise<ChannelPost> {
  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const createdPost: ChannelPost = {
    id: postId,
    channelId,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar,
    title: post.title,
    content: post.content,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    linkUrl: post.linkUrl,
    createdAt: Date.now(),
    likes: [],
  };

  const client = getSupabaseClient();
  if (!client) return createdPost;

  try {
    const payload = {
      id: postId,
      channel_id: channelId,
      author_id: post.authorId,
      author_name: post.authorName,
      author_avatar: post.authorAvatar,
      title: post.title || null,
      content: post.content,
      media_url: post.mediaUrl || null,
      media_type: post.mediaType || null,
      link_url: post.linkUrl || null,
      created_at: new Date().toISOString(),
      likes: [],
    };

    const { error } = await client.from('channel_posts').insert(payload);
    if (error) {
      console.warn('[Supabase] createChannelPost error:', error.message);
    }
  } catch (e) {
    console.warn('[Supabase] createChannelPost exception:', e);
  }

  return createdPost;
}

export async function fetchChannelPostsFromSupabase(channelId: string): Promise<ChannelPost[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('channel_posts')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      channelId: p.channel_id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar,
      title: p.title || undefined,
      content: p.content,
      mediaUrl: p.media_url || undefined,
      mediaType: p.media_type || undefined,
      linkUrl: p.link_url || undefined,
      createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
      likes: Array.isArray(p.likes) ? p.likes : [],
    }));
  } catch (e) {
    console.warn('[Supabase] fetchChannelPosts exception:', e);
    return [];
  }
}

// ==============================================================================
// 12. GLOBAL REALTIME MESSAGES (Offline delivery & Real-time across all chats)
// ==============================================================================

export function subscribeToUserIncomingMessages(
  userId: string,
  onIncomingMessage: (msg: Message) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel(`user_incoming_messages_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        if (payload.new) {
          const msg = mapRowToMessage(payload.new);
          // Only notify if sender is not current user
          if (msg.senderId !== userId) {
            onIncomingMessage(msg);
          }
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}


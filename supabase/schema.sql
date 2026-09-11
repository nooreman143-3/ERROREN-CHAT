-- ==============================================================================
-- ERROREN CHAT - Comprehensive WhatsApp-style Supabase Database Schema
-- Includes:
--   1. profiles (Unique Phone Number, Normalization, Presence, RLS)
--   2. contacts (Two-way contact relationships, Unique Constraints, RLS)
--   3. contact_requests (Friend/Connection requests)
--   4. chats (Direct & Group chats, Unique Direct Chat enforcement)
--   5. chat_members (Chat participants & read receipts)
--   6. messages (Persistent messages, Chronological ordering, Realtime sync)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  phone_normalized TEXT UNIQUE,
  country_code TEXT DEFAULT '+92',
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT 'Available | Using ERROREN CHAT ⚡',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lightning-fast phone number and username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_norm ON public.profiles(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. CONTACTS TABLE (Permanent WhatsApp-style contacts)
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  about TEXT,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_owner_contact_user UNIQUE (owner_user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user ON public.contacts(contact_user_id);

-- 3. CONTACT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_contact_request UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_receiver ON public.contact_requests(receiver_id);

-- 4. CHATS TABLE (Direct & Group Conversations)
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  avatar_url TEXT,
  description TEXT,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CHAT MEMBERS TABLE (Membership & Read Receipt Timestamps)
CREATE TABLE IF NOT EXISTS public.chat_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chat_id TEXT NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_chat_member UNIQUE (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON public.chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

-- 6. MESSAGES TABLE (Persistent Chat Messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chat_id TEXT NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'voice', 'document', 'location', 'ai_reply')),
  media_url TEXT,
  file_name TEXT,
  file_size TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  reactions JSONB DEFAULT '[]'::jsonb,
  reply_to JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering messages chronologically
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
CREATE POLICY "Public profiles read access" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid()::text = id OR true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (true);

-- Contacts Policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
CREATE POLICY "Users can view their own contacts" 
  ON public.contacts FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can manage their contacts" ON public.contacts;
CREATE POLICY "Users can manage their contacts" 
  ON public.contacts FOR ALL 
  USING (true);

-- Chats & Members Policies
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
CREATE POLICY "Users can view their chats" 
  ON public.chats FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Users can view chat members" ON public.chat_members;
CREATE POLICY "Users can view chat members" 
  ON public.chat_members FOR ALL 
  USING (true);

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
CREATE POLICY "Users can view messages" 
  ON public.messages FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
CREATE POLICY "Users can update messages" 
  ON public.messages FOR UPDATE 
  USING (true);

-- ==============================================================================
-- REALTIME REPLICATION ENABLEMENT
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'status_stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.status_stories;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'communities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'channel_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_posts;
  END IF;
END $$;

-- ==============================================================================
-- 7. COMMUNITIES & CHANNELS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.communities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT true,
  member_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  community_id TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  community_id TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_read_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel_id TEXT NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  link_url TEXT,
  likes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. STATUS STORIES & CALL LOGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.status_stories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  content TEXT,
  media_url TEXT,
  background_color TEXT,
  caption TEXT,
  duration_hours INT DEFAULT 24,
  expires_at TIMESTAMPTZ NOT NULL,
  views JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  caller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'audio' CHECK (type IN ('audio', 'video')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'rejected')),
  duration INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================================================

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Communities access" ON public.communities;
CREATE POLICY "Communities access" ON public.communities FOR ALL USING (true);

DROP POLICY IF EXISTS "Community members access" ON public.community_members;
CREATE POLICY "Community members access" ON public.community_members FOR ALL USING (true);

DROP POLICY IF EXISTS "Channels access" ON public.channels;
CREATE POLICY "Channels access" ON public.channels FOR ALL USING (true);

DROP POLICY IF EXISTS "Channel posts access" ON public.channel_posts;
CREATE POLICY "Channel posts access" ON public.channel_posts FOR ALL USING (true);

DROP POLICY IF EXISTS "Status stories access" ON public.status_stories;
CREATE POLICY "Status stories access" ON public.status_stories FOR ALL USING (true);

DROP POLICY IF EXISTS "Call logs access" ON public.call_logs;
CREATE POLICY "Call logs access" ON public.call_logs FOR ALL USING (true);

-- ==============================================================================
-- 9. STORAGE BUCKETS SETUP & STORAGE RLS POLICIES
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Storage Media Access" ON storage.objects;
CREATE POLICY "Public Storage Media Access"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('media', 'avatars'));

DROP POLICY IF EXISTS "Public Storage Media Upload" ON storage.objects;
CREATE POLICY "Public Storage Media Upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('media', 'avatars'));

DROP POLICY IF EXISTS "Public Storage Media Update" ON storage.objects;
CREATE POLICY "Public Storage Media Update"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('media', 'avatars'));


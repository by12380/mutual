-- =============================================================================
-- MUTUAL DATING APP - SUPABASE DATABASE SCHEMA
-- =============================================================================
-- This schema defines the complete database structure for the Mutual dating app
-- including tables, indexes, RLS policies, triggers, and storage buckets.
--
-- Run this in your Supabase SQL Editor to set up the database.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES TABLE
-- Stores user profile information. Linked to auth.users via id.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  location TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  -- Height fields
  height_feet INTEGER,
  height_inches INTEGER DEFAULT 0,
  height_visible BOOLEAN DEFAULT TRUE,
  -- Religion & political beliefs
  religion TEXT,
  religion_visible BOOLEAN DEFAULT TRUE,
  political_beliefs TEXT,
  political_beliefs_visible BOOLEAN DEFAULT TRUE,
  -- Prompts: array of {prompt, answer} objects
  prompts JSONB DEFAULT '[]',
  -- active_match_id enforces the "one conversation at a time" rule
  active_match_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name) WHERE name IS NOT NULL;

-- -----------------------------------------------------------------------------
-- SWIPES TABLE
-- Records all swipe actions (like/pass) between users.
-- Used to determine matches and filter already-swiped profiles.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate swipes
  UNIQUE(swiper_id, swiped_id)
);

-- Indexes for efficient swipe queries
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON public.swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON public.swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON public.swipes(direction) WHERE direction = 'like';

-- -----------------------------------------------------------------------------
-- PROFILE CARD LIKES TABLE
-- Stores likes on specific cards/sections of a profile.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_card_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_profile_card_like UNIQUE (liker_id, liked_profile_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_card_likes_liker_id ON public.profile_card_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_profile_card_likes_liked_profile_id ON public.profile_card_likes(liked_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_card_likes_created_at ON public.profile_card_likes(created_at DESC);

-- -----------------------------------------------------------------------------
-- MATCHES TABLE
-- Created when two users mutually like each other.
-- Stores the conversation state between matched users.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Status: pending (new match), active (chatting), ended (conversation closed)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure user1_id < user2_id to prevent duplicate matches
  CONSTRAINT unique_match UNIQUE(user1_id, user2_id),
  CONSTRAINT ordered_users CHECK (user1_id < user2_id)
);

-- Indexes for efficient match queries
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_updated_at ON public.matches(updated_at DESC);

-- Add foreign key for active_match_id after matches table exists
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_active_match 
  FOREIGN KEY (active_match_id) 
  REFERENCES public.matches(id) 
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- MESSAGES TABLE
-- Stores all chat messages between matched users.
-- Supports real-time updates via Supabase Realtime.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient message queries
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(match_id, sender_id) WHERE read_at IS NULL;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: Update updated_at timestamp
-- Automatically updates the updated_at column on row modification.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Function: Create profile on user signup
-- Automatically creates a profile row when a new user signs up.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, location, location_lat, location_lng,
    height_feet, height_inches, height_visible,
    religion, religion_visible,
    political_beliefs, political_beliefs_visible,
    prompts
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'location',
    (NEW.raw_user_meta_data->>'location_lat')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'location_lng')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'height_feet')::INTEGER,
    COALESCE((NEW.raw_user_meta_data->>'height_inches')::INTEGER, 0),
    COALESCE((NEW.raw_user_meta_data->>'height_visible')::BOOLEAN, TRUE),
    NEW.raw_user_meta_data->>'religion',
    COALESCE((NEW.raw_user_meta_data->>'religion_visible')::BOOLEAN, TRUE),
    NEW.raw_user_meta_data->>'political_beliefs',
    COALESCE((NEW.raw_user_meta_data->>'political_beliefs_visible')::BOOLEAN, TRUE),
    COALESCE((NEW.raw_user_meta_data->'prompts')::JSONB, '[]'::JSONB)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Create match when mutual like occurs
-- Checks for mutual likes and creates a match automatically.
-- Returns the match ID if a new match was created.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_like_exists BOOLEAN;
  new_match_id UUID;
  ordered_user1 UUID;
  ordered_user2 UUID;
BEGIN
  -- Only check for matches on 'like' swipes
  IF NEW.direction != 'like' THEN
    RETURN NEW;
  END IF;

  -- Check if the other user has already liked us
  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction = 'like'
  ) INTO mutual_like_exists;

  -- If mutual like exists, create a match
  IF mutual_like_exists THEN
    -- Order user IDs to satisfy the constraint
    IF NEW.swiper_id < NEW.swiped_id THEN
      ordered_user1 := NEW.swiper_id;
      ordered_user2 := NEW.swiped_id;
    ELSE
      ordered_user1 := NEW.swiped_id;
      ordered_user2 := NEW.swiper_id;
    END IF;

    -- Insert match (ignore if already exists)
    INSERT INTO public.matches (user1_id, user2_id, status)
    VALUES (ordered_user1, ordered_user2, 'pending')
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO new_match_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Get match ID for two users
-- Helper function to retrieve match ID given two user IDs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_match_id(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  ordered_user1 UUID;
  ordered_user2 UUID;
  match_id UUID;
BEGIN
  -- Order user IDs
  IF user_a < user_b THEN
    ordered_user1 := user_a;
    ordered_user2 := user_b;
  ELSE
    ordered_user1 := user_b;
    ordered_user2 := user_a;
  END IF;

  -- Find match
  SELECT id INTO match_id
  FROM public.matches
  WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;

  RETURN match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger: Update profiles.updated_at on change
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update matches.updated_at on change
DROP TRIGGER IF EXISTS on_matches_updated ON public.matches;
CREATE TRIGGER on_matches_updated
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Check for mutual like and create match
DROP TRIGGER IF EXISTS on_swipe_check_match ON public.swipes;
CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_card_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- Users can view all profiles (for discovery) but only edit their own.
-- -----------------------------------------------------------------------------

-- Allow users to view all profiles (needed for discovery feature)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile (handled by trigger, but backup)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- SWIPES POLICIES
-- Users can only create swipes as themselves and view their own swipes.
-- -----------------------------------------------------------------------------

-- Allow users to view their own swipes (to filter already-swiped profiles)
CREATE POLICY "Users can view their own swipes"
  ON public.swipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = swiper_id);

-- Allow users to view likes they receive on their own profile
CREATE POLICY "Users can view likes on their profile"
  ON public.swipes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = swiped_id
    AND direction = 'like'
  );

-- Allow users to create swipes as themselves
CREATE POLICY "Users can create swipes as themselves"
  ON public.swipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = swiper_id);

-- Prevent swipe updates (swipes are immutable)
-- No UPDATE policy = updates not allowed

-- Prevent swipe deletions (maintain history)
-- No DELETE policy = deletes not allowed

-- -----------------------------------------------------------------------------
-- PROFILE CARD LIKES POLICIES
-- Users can like/unlike sections as themselves and both parties can view likes.
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view their own card likes and likes on their profile"
  ON public.profile_card_likes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = liker_id OR auth.uid() = liked_profile_id);

CREATE POLICY "Users can create profile card likes as themselves"
  ON public.profile_card_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can delete their own profile card likes"
  ON public.profile_card_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = liker_id);

-- -----------------------------------------------------------------------------
-- MATCHES POLICIES
-- Users can only view matches they're part of.
-- -----------------------------------------------------------------------------

-- Allow users to view matches they're part of
CREATE POLICY "Users can view their own matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow the system to create matches (via trigger)
-- Direct inserts are handled by the trigger function with SECURITY DEFINER
CREATE POLICY "System can create matches"
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow users to update matches they're part of (to change status)
CREATE POLICY "Users can update their own matches"
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- -----------------------------------------------------------------------------
-- MESSAGES POLICIES
-- Users can only view/send messages in matches they're part of.
-- -----------------------------------------------------------------------------

-- Allow users to view messages in their matches
CREATE POLICY "Users can view messages in their matches"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Allow users to send messages in their matches
CREATE POLICY "Users can send messages in their matches"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Allow users to update messages (for read receipts) in their matches
CREATE POLICY "Users can update messages in their matches"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Create storage bucket for profile photos (avatars)
-- Run this in the Supabase Dashboard > Storage or via API
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to all avatars (they're profile photos)
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- =============================================================================
-- REALTIME SUBSCRIPTIONS
-- =============================================================================

-- Enable realtime for messages table (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for matches table (for match notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- Uncomment to insert test data
-- =============================================================================

/*
-- Insert sample profiles (replace UUIDs with actual auth.users IDs)
INSERT INTO public.profiles (id, name, age, gender, bio, interests, photos)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Alex', 28, 'female', 'Love hiking and coffee!', ARRAY['Travel', 'Coffee', 'Hiking'], ARRAY['https://picsum.photos/400/500?random=1']),
  ('00000000-0000-0000-0000-000000000002', 'Jordan', 32, 'male', 'Software engineer who loves cooking', ARRAY['Cooking', 'Gaming', 'Music'], ARRAY['https://picsum.photos/400/500?random=2']),
  ('00000000-0000-0000-0000-000000000003', 'Sam', 25, 'non-binary', 'Artist and dog lover', ARRAY['Art', 'Dogs', 'Photography'], ARRAY['https://picsum.photos/400/500?random=3']);
*/

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

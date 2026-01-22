-- ============================================
-- MUTUAL DATING APP - DATABASE SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database
-- Make sure to enable the required extensions first

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- User profiles table
-- Stores all user profile information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
  bio TEXT,
  interests TEXT[], -- Array of interest tags
  photos TEXT[], -- Array of photo URLs from Supabase Storage
  location TEXT,
  -- The currently active match (only one allowed at a time)
  active_match_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipes table
-- Records when a user likes or passes on another user
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate swipes
  UNIQUE(swiper_id, swiped_id)
);

-- Matches table
-- Created when two users mutually like each other
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Match status: pending (not yet active), active (currently chatting), ended
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure user1_id < user2_id to prevent duplicate matches
  CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Messages table
-- Stores chat messages between matched users
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for active_match_id after matches table exists
ALTER TABLE profiles 
ADD CONSTRAINT fk_active_match 
FOREIGN KEY (active_match_id) REFERENCES matches(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Speed up swipe lookups
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_swipes_direction ON swipes(direction);

-- Speed up match lookups
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Speed up message lookups
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can view profiles of potential matches (for discovery)
-- Excludes users they've already swiped on
CREATE POLICY "Users can view other profiles for discovery"
  ON profiles FOR SELECT
  USING (
    auth.uid() != id
    AND NOT EXISTS (
      SELECT 1 FROM swipes 
      WHERE swiper_id = auth.uid() AND swiped_id = profiles.id
    )
  );

-- Users can view profiles of their matches
CREATE POLICY "Users can view matched profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE (user1_id = auth.uid() AND user2_id = profiles.id)
         OR (user2_id = auth.uid() AND user1_id = profiles.id)
    )
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------
-- SWIPES POLICIES
-- ----------------------------------------

-- Users can view their own swipes
CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  USING (auth.uid() = swiper_id);

-- Users can create swipes (as the swiper)
CREATE POLICY "Users can create swipes"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

-- ----------------------------------------
-- MATCHES POLICIES
-- ----------------------------------------

-- Users can view matches they're part of
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Matches are created by a trigger (see below), but allow insert for the function
CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update matches they're part of (to change status)
CREATE POLICY "Users can update own matches"
  ON matches FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ----------------------------------------
-- MESSAGES POLICIES
-- ----------------------------------------

-- Users can view messages in their matches
CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Users can send messages in their active matches
CREATE POLICY "Users can send messages in active matches"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND matches.status = 'active'
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Users can update messages they sent (for read receipts)
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to check for mutual likes and create a match
CREATE OR REPLACE FUNCTION check_for_match()
RETURNS TRIGGER AS $$
DECLARE
  other_user_id UUID;
  new_match_id UUID;
BEGIN
  -- Only check if this is a 'like'
  IF NEW.direction = 'like' THEN
    -- Check if the other user has already liked us
    SELECT swiper_id INTO other_user_id
    FROM swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction = 'like';
    
    -- If mutual like found, create a match
    IF other_user_id IS NOT NULL THEN
      -- Ensure user1_id < user2_id for consistency
      INSERT INTO matches (user1_id, user2_id, status)
      VALUES (
        LEAST(NEW.swiper_id, NEW.swiped_id),
        GREATEST(NEW.swiper_id, NEW.swiped_id),
        'pending'
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING
      RETURNING id INTO new_match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create matches on mutual likes
CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION check_for_match();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to handle new user signup
-- Creates a profile entry when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Run this in the Supabase dashboard under Storage

-- Create a bucket for profile photos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies (run in SQL editor):
-- Allow users to upload their own photos
-- CREATE POLICY "Users can upload own photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to photos
-- CREATE POLICY "Public can view photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- Allow users to delete their own photos
-- CREATE POLICY "Users can delete own photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

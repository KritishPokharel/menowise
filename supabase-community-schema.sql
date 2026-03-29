-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- These tables power the Community feature with posts, reactions, and comments.

-- 1. Community Posts
CREATE TABLE community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL DEFAULT 'Anonymous',
  is_anonymous boolean DEFAULT true,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Community Reactions (likes)
CREATE TABLE community_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 3. Community Comments
CREATE TABLE community_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL DEFAULT 'Anonymous',
  is_anonymous boolean DEFAULT true,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Row Level Security — allow all authenticated users to read, insert their own
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, authenticated users insert their own
CREATE POLICY "Anyone can read posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users insert own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- Reactions: anyone can read, users manage their own
CREATE POLICY "Anyone can read reactions" ON community_reactions FOR SELECT USING (true);
CREATE POLICY "Users insert own reactions" ON community_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON community_reactions FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, users insert their own
CREATE POLICY "Anyone can read comments" ON community_comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comments" ON community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON community_comments FOR DELETE USING (auth.uid() = user_id);

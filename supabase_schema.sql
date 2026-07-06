-- ============================================================
-- GreenTrace Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. Profiles table (extended user info)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  country TEXT DEFAULT 'india',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Footprint entries
CREATE TABLE IF NOT EXISTS footprint_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  travel_kg DECIMAL DEFAULT 0,
  food_kg DECIMAL DEFAULT 0,
  energy_kg DECIMAL DEFAULT 0,
  shopping_kg DECIMAL DEFAULT 0,
  commute_kg DECIMAL DEFAULT 0,
  total_kg DECIMAL GENERATED ALWAYS AS (
    COALESCE(travel_kg, 0) + COALESCE(food_kg, 0) + COALESCE(energy_kg, 0) +
    COALESCE(shopping_kg, 0) + COALESCE(commute_kg, 0)
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_kg DECIMAL NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_slug TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_slug)
);

-- 6. Carbon offsets (recorded after Stripe payment)
CREATE TABLE IF NOT EXISTS carbon_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usd DECIMAL NOT NULL,
  kg_offset DECIMAL NOT NULL,
  project_id TEXT NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE footprint_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_offsets ENABLE ROW LEVEL SECURITY;

-- Profiles: user sees only their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Footprint entries
CREATE POLICY "Users can view own entries" ON footprint_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON footprint_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON footprint_entries FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- Badges
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Offsets
CREATE POLICY "Users can view own offsets" ON carbon_offsets FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 7. Insights cache
-- Stores EcoAgent results per footprint entry so the agent
-- does not re-run on every page visit for the same entry.
-- UNIQUE(user_id, entry_id) ensures one cached result per entry.
-- ============================================================

CREATE TABLE IF NOT EXISTS insights_cache (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entry_id   UUID REFERENCES footprint_entries(id) ON DELETE CASCADE NOT NULL,
  tips                      JSONB    NOT NULL DEFAULT '[]',
  action_plan               JSONB    NOT NULL DEFAULT '[]',
  trace                     JSONB    NOT NULL DEFAULT '[]',
  summary                   TEXT     NOT NULL DEFAULT '',
  total_potential_saving_kg DECIMAL  NOT NULL DEFAULT 0,
  iterations                INT      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_id)
);

ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"   ON insights_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON insights_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON insights_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON insights_cache FOR DELETE USING (auth.uid() = user_id);

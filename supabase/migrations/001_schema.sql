-- CalledIt Phase 1 Schema

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  points integer NOT NULL DEFAULT 100,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Sports Events (cached from APIs)
CREATE TABLE IF NOT EXISTS public.sports_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  sport text NOT NULL,
  league text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  commence_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  home_score integer,
  away_score integer,
  raw_data jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now()
);

-- Bets
CREATE TABLE IF NOT EXISTS public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  bet_type text NOT NULL CHECK (bet_type IN ('over_under', 'closest_guess', 'spread', 'moneyline', 'custom')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'settled', 'cancelled')),
  sports_event_id uuid REFERENCES public.sports_events(id),
  config jsonb NOT NULL DEFAULT '{}',
  correct_answer text,
  settled_at timestamptz,
  settled_by uuid REFERENCES public.profiles(id),
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wagers
CREATE TABLE IF NOT EXISTS public.wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  points_wagered integer NOT NULL CHECK (points_wagered > 0),
  prediction text NOT NULL,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('won', 'lost', 'push', 'pending')),
  points_delta integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bet_id, user_id)
);

-- Point Transactions (immutable audit ledger)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  wager_id uuid REFERENCES public.wagers(id),
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Critical indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_bets_group_id ON public.bets(group_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_wagers_bet_id ON public.wagers(bet_id);
CREATE INDEX IF NOT EXISTS idx_wagers_user_id ON public.wagers(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_group ON public.point_transactions(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_sports_events_commence_time ON public.sports_events(commence_time);
CREATE INDEX IF NOT EXISTS idx_sports_events_status ON public.sports_events(status);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone can read any profile (needed for displaying usernames)
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- ============================================================
-- GROUPS
-- ============================================================

-- Users can read groups they belong to
CREATE POLICY "groups_read_member" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id
        AND gm.user_id = (select auth.uid())
    )
  );

-- Authenticated users can create groups
CREATE POLICY "groups_insert_auth" ON public.groups
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Group admins can update their group
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id
        AND gm.user_id = (select auth.uid())
        AND gm.role = 'admin'
    )
  );

-- ============================================================
-- GROUP MEMBERS
-- ============================================================

-- Users can see members of groups they belong to
CREATE POLICY "group_members_read_member" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

-- Authenticated users can insert themselves as member (joining via invite code handled by RPC)
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Users can only delete their own membership
CREATE POLICY "group_members_delete_self" ON public.group_members
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================================
-- SPORTS EVENTS
-- ============================================================

-- Anyone authenticated can read sports events
CREATE POLICY "sports_events_read_auth" ON public.sports_events
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- Only service role can insert/update sports events (cron job)
-- (no INSERT/UPDATE policy = only service role bypasses RLS)

-- ============================================================
-- BETS
-- ============================================================

-- Users can read bets in their groups
CREATE POLICY "bets_read_member" ON public.bets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

-- Group members can create bets
CREATE POLICY "bets_insert_member" ON public.bets
  FOR INSERT WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

-- Bet creator or group admin can update bet
CREATE POLICY "bets_update_creator_or_admin" ON public.bets
  FOR UPDATE USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
        AND gm.role = 'admin'
    )
  );

-- ============================================================
-- WAGERS
-- ============================================================

-- Users can read wagers in their groups
CREATE POLICY "wagers_read_member" ON public.wagers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

-- Users can insert their own wagers (points deduction handled by RPC)
CREATE POLICY "wagers_insert_self" ON public.wagers
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- POINT TRANSACTIONS
-- ============================================================

-- Users can read their own transactions or transactions in their groups
CREATE POLICY "point_transactions_read_member" ON public.point_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
        AND gm.user_id = (select auth.uid())
    )
  );

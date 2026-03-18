-- Postgres RPC Functions with SECURITY DEFINER for atomic operations
-- All functions derive the acting user from auth.uid() — never trust caller-supplied IDs.

-- ============================================================
-- place_wager: Atomically place a wager and deduct points
-- No p_user_id param — derives identity from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_wager(
  p_bet_id uuid,
  p_points_wagered integer,
  p_prediction text
)
RETURNS TABLE (success boolean, wager_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acting_user uuid;
  v_bet bets%ROWTYPE;
  v_member group_members%ROWTYPE;
  v_wager_id uuid;
  v_balance_after integer;
BEGIN
  -- Derive user from session — never trust a caller-supplied ID
  v_acting_user := auth.uid();
  IF v_acting_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Not authenticated';
    RETURN;
  END IF;

  -- Validate points
  IF p_points_wagered <= 0 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Points wagered must be greater than zero';
    RETURN;
  END IF;

  -- Get bet
  SELECT * INTO v_bet FROM bets WHERE id = p_bet_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Bet not found';
    RETURN;
  END IF;

  -- Check bet is open
  IF v_bet.status != 'open' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Bet is not accepting wagers';
    RETURN;
  END IF;

  -- Check closes_at
  IF v_bet.closes_at IS NOT NULL AND v_bet.closes_at < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Bet is closed';
    RETURN;
  END IF;

  -- Get group member
  SELECT * INTO v_member
  FROM group_members
  WHERE group_id = v_bet.group_id AND user_id = v_acting_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'User is not a member of this group';
    RETURN;
  END IF;

  -- Check sufficient points
  IF v_member.points < p_points_wagered THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Insufficient points';
    RETURN;
  END IF;

  -- Check existing wager
  IF EXISTS (SELECT 1 FROM wagers WHERE bet_id = p_bet_id AND user_id = v_acting_user) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Already wagered on this bet';
    RETURN;
  END IF;

  -- Deduct points
  v_balance_after := v_member.points - p_points_wagered;
  UPDATE group_members
  SET points = v_balance_after
  WHERE group_id = v_bet.group_id AND user_id = v_acting_user;

  -- Insert wager
  INSERT INTO wagers (bet_id, group_id, user_id, points_wagered, prediction)
  VALUES (p_bet_id, v_bet.group_id, v_acting_user, p_points_wagered, p_prediction)
  RETURNING id INTO v_wager_id;

  -- Record transaction
  INSERT INTO point_transactions (group_id, user_id, wager_id, delta, balance_after, reason)
  VALUES (v_bet.group_id, v_acting_user, v_wager_id, -p_points_wagered, v_balance_after, 'wager_placed');

  RETURN QUERY SELECT true, v_wager_id, NULL::text;
END;
$$;

-- ============================================================
-- settle_bet: Atomically settle a bet and distribute points
-- No p_settled_by param — derives identity from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_bet(
  p_bet_id uuid,
  p_correct_answer text
)
RETURNS TABLE (success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acting_user uuid;
  v_bet bets%ROWTYPE;
  v_wager wagers%ROWTYPE;
  v_outcome text;
  v_points_delta integer;
  v_current_points integer;
  v_balance_after integer;
  v_winner_total_wagered integer := 0;
  v_loser_total_pot integer := 0;
  v_config jsonb;
  v_closest_diff numeric;
  v_min_diff numeric;
  v_actual_value numeric;
  v_first_winner_id uuid;
BEGIN
  -- Derive user from session
  v_acting_user := auth.uid();
  IF v_acting_user IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated';
    RETURN;
  END IF;

  -- Get bet with lock
  SELECT * INTO v_bet FROM bets WHERE id = p_bet_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Bet not found';
    RETURN;
  END IF;

  IF v_bet.status != 'open' AND v_bet.status != 'locked' THEN
    RETURN QUERY SELECT false, 'Bet cannot be settled in its current state';
    RETURN;
  END IF;

  -- Check settler is creator or group admin
  IF v_bet.created_by != v_acting_user AND NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_bet.group_id AND user_id = v_acting_user AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT false, 'Not authorized to settle this bet';
    RETURN;
  END IF;

  v_config := v_bet.config;

  -- No wagers: just mark settled
  IF NOT EXISTS (SELECT 1 FROM wagers WHERE bet_id = p_bet_id) THEN
    UPDATE bets
    SET status = 'settled', correct_answer = p_correct_answer,
        settled_at = now(), settled_by = v_acting_user
    WHERE id = p_bet_id;
    RETURN QUERY SELECT true, NULL::text;
    RETURN;
  END IF;

  -- Determine outcomes based on bet_type
  IF v_bet.bet_type = 'over_under' THEN
    BEGIN
      DECLARE v_line numeric := (v_config->>'line')::numeric;
      DECLARE v_actual_ou numeric := p_correct_answer::numeric;
    BEGIN
      FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
        IF v_actual_ou > v_line AND v_wager.prediction = 'over' THEN
          v_outcome := 'won';
        ELSIF v_actual_ou < v_line AND v_wager.prediction = 'under' THEN
          v_outcome := 'won';
        ELSIF v_actual_ou = v_line THEN
          v_outcome := 'push';
        ELSE
          v_outcome := 'lost';
        END IF;
        UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
      END LOOP;
    END;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RETURN QUERY SELECT false, 'Correct answer must be a valid number for over/under bets';
      RETURN;
    END;

  ELSIF v_bet.bet_type = 'moneyline' THEN
    FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
      IF v_wager.prediction = p_correct_answer THEN
        v_outcome := 'won';
      ELSE
        v_outcome := 'lost';
      END IF;
      UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
    END LOOP;

  ELSIF v_bet.bet_type = 'custom' THEN
    FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
      IF v_wager.prediction = p_correct_answer THEN
        v_outcome := 'won';
      ELSE
        v_outcome := 'lost';
      END IF;
      UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
    END LOOP;

  ELSIF v_bet.bet_type = 'closest_guess' THEN
    BEGIN
      v_actual_value := p_correct_answer::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RETURN QUERY SELECT false, 'Correct answer must be a valid number for closest guess bets';
      RETURN;
    END;

    -- Validate all predictions are numeric
    BEGIN
      PERFORM prediction::numeric FROM wagers WHERE bet_id = p_bet_id;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RETURN QUERY SELECT false, 'All predictions must be numeric for closest guess bets';
      RETURN;
    END;

    DECLARE v_tie_break text := COALESCE(v_config->>'tie_break', 'split_pot');
    BEGIN
      SELECT MIN(ABS(prediction::numeric - v_actual_value))
      INTO v_min_diff
      FROM wagers WHERE bet_id = p_bet_id;

      SELECT user_id INTO v_first_winner_id
      FROM wagers
      WHERE bet_id = p_bet_id
        AND ABS(prediction::numeric - v_actual_value) = v_min_diff
      ORDER BY created_at
      LIMIT 1;

      FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
        v_closest_diff := ABS(v_wager.prediction::numeric - v_actual_value);
        IF v_closest_diff = v_min_diff THEN
          IF v_tie_break = 'first_guess_wins' THEN
            v_outcome := CASE WHEN v_wager.user_id = v_first_winner_id THEN 'won' ELSE 'lost' END;
          ELSIF v_tie_break = 'push' THEN
            v_outcome := 'push';
          ELSE
            v_outcome := 'won';  -- split_pot
          END IF;
        ELSE
          v_outcome := 'lost';
        END IF;
        UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
      END LOOP;
    END;

  ELSIF v_bet.bet_type = 'spread' THEN
    FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
      IF v_wager.prediction = p_correct_answer THEN
        v_outcome := 'won';
      ELSE
        v_outcome := 'lost';
      END IF;
      UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
    END LOOP;
  END IF;

  -- Calculate winner pot and loser pot
  SELECT COALESCE(SUM(points_wagered), 0) INTO v_winner_total_wagered
  FROM wagers WHERE bet_id = p_bet_id AND outcome = 'won';

  SELECT COALESCE(SUM(points_wagered), 0) INTO v_loser_total_pot
  FROM wagers WHERE bet_id = p_bet_id AND outcome = 'lost';

  -- Distribute points
  FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
    IF v_wager.outcome = 'push' THEN
      v_points_delta := v_wager.points_wagered;
    ELSIF v_wager.outcome = 'won' AND v_winner_total_wagered > 0 THEN
      v_points_delta := v_wager.points_wagered +
        ROUND((v_wager.points_wagered::numeric / v_winner_total_wagered::numeric) * v_loser_total_pot);
    ELSE
      v_points_delta := 0;
    END IF;

    UPDATE wagers SET points_delta = v_points_delta WHERE id = v_wager.id;

    IF v_points_delta > 0 THEN
      UPDATE group_members
      SET points = points + v_points_delta
      WHERE group_id = v_bet.group_id AND user_id = v_wager.user_id
      RETURNING points INTO v_balance_after;

      INSERT INTO point_transactions (group_id, user_id, wager_id, delta, balance_after, reason)
      VALUES (
        v_bet.group_id, v_wager.user_id, v_wager.id, v_points_delta, v_balance_after,
        CASE v_wager.outcome WHEN 'won' THEN 'bet_won' WHEN 'push' THEN 'bet_push' ELSE 'bet_settled' END
      );
    ELSIF v_wager.outcome = 'lost' THEN
      SELECT points INTO v_balance_after
      FROM group_members
      WHERE group_id = v_bet.group_id AND user_id = v_wager.user_id;

      INSERT INTO point_transactions (group_id, user_id, wager_id, delta, balance_after, reason)
      VALUES (v_bet.group_id, v_wager.user_id, v_wager.id, 0, v_balance_after, 'bet_lost');
    END IF;
  END LOOP;

  -- Update bet status
  UPDATE bets
  SET status = 'settled',
      correct_answer = p_correct_answer,
      settled_at = now(),
      settled_by = v_acting_user
  WHERE id = p_bet_id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================
-- auto_settle_bet: Called by cron/service role — bypasses auth check
-- Only callable by service role (no RLS on service role connections)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_settle_bet(
  p_bet_id uuid,
  p_correct_answer text,
  p_settled_by uuid  -- bet creator, passed explicitly by cron service
)
RETURNS TABLE (success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet bets%ROWTYPE;
  v_wager wagers%ROWTYPE;
  v_outcome text;
  v_points_delta integer;
  v_balance_after integer;
  v_winner_total_wagered integer := 0;
  v_loser_total_pot integer := 0;
BEGIN
  SELECT * INTO v_bet FROM bets WHERE id = p_bet_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Bet not found';
    RETURN;
  END IF;

  IF v_bet.status != 'open' AND v_bet.status != 'locked' THEN
    RETURN QUERY SELECT true, NULL::text;  -- already settled, not an error
    RETURN;
  END IF;

  -- Determine outcomes (moneyline/over_under/spread only for auto-settle)
  DECLARE v_config jsonb := v_bet.config;
  BEGIN
    IF v_bet.bet_type = 'moneyline' THEN
      FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
        v_outcome := CASE WHEN v_wager.prediction = p_correct_answer THEN 'won' ELSE 'lost' END;
        UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
      END LOOP;
    ELSIF v_bet.bet_type = 'over_under' THEN
      DECLARE v_line numeric := (v_config->>'line')::numeric;
      DECLARE v_actual numeric := p_correct_answer::numeric;
      BEGIN
        FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
          IF v_actual > v_line AND v_wager.prediction = 'over' THEN v_outcome := 'won';
          ELSIF v_actual < v_line AND v_wager.prediction = 'under' THEN v_outcome := 'won';
          ELSIF v_actual = v_line THEN v_outcome := 'push';
          ELSE v_outcome := 'lost';
          END IF;
          UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
        END LOOP;
      END;
    ELSIF v_bet.bet_type = 'spread' THEN
      FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
        v_outcome := CASE WHEN v_wager.prediction = p_correct_answer THEN 'won' ELSE 'lost' END;
        UPDATE wagers SET outcome = v_outcome WHERE id = v_wager.id;
      END LOOP;
    ELSE
      RETURN QUERY SELECT false, 'Bet type not supported for auto-settlement';
      RETURN;
    END IF;
  END;

  -- Distribute points
  SELECT COALESCE(SUM(points_wagered), 0) INTO v_winner_total_wagered
  FROM wagers WHERE bet_id = p_bet_id AND outcome = 'won';
  SELECT COALESCE(SUM(points_wagered), 0) INTO v_loser_total_pot
  FROM wagers WHERE bet_id = p_bet_id AND outcome = 'lost';

  FOR v_wager IN SELECT * FROM wagers WHERE bet_id = p_bet_id LOOP
    IF v_wager.outcome = 'push' THEN
      v_points_delta := v_wager.points_wagered;
    ELSIF v_wager.outcome = 'won' AND v_winner_total_wagered > 0 THEN
      v_points_delta := v_wager.points_wagered +
        ROUND((v_wager.points_wagered::numeric / v_winner_total_wagered::numeric) * v_loser_total_pot);
    ELSE
      v_points_delta := 0;
    END IF;

    UPDATE wagers SET points_delta = v_points_delta WHERE id = v_wager.id;

    IF v_points_delta > 0 THEN
      UPDATE group_members SET points = points + v_points_delta
      WHERE group_id = v_bet.group_id AND user_id = v_wager.user_id
      RETURNING points INTO v_balance_after;

      INSERT INTO point_transactions (group_id, user_id, wager_id, delta, balance_after, reason)
      VALUES (v_bet.group_id, v_wager.user_id, v_wager.id, v_points_delta, v_balance_after,
        CASE v_wager.outcome WHEN 'won' THEN 'bet_won' WHEN 'push' THEN 'bet_push' ELSE 'bet_settled' END);
    ELSIF v_wager.outcome = 'lost' THEN
      SELECT points INTO v_balance_after FROM group_members
      WHERE group_id = v_bet.group_id AND user_id = v_wager.user_id;
      INSERT INTO point_transactions (group_id, user_id, wager_id, delta, balance_after, reason)
      VALUES (v_bet.group_id, v_wager.user_id, v_wager.id, 0, v_balance_after, 'bet_lost');
    END IF;
  END LOOP;

  UPDATE bets SET status = 'settled', correct_answer = p_correct_answer,
    settled_at = now(), settled_by = p_settled_by
  WHERE id = p_bet_id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================
-- join_group: Join a group via invite code
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_group(
  p_invite_code text
)
RETURNS TABLE (success boolean, group_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acting_user uuid;
  v_group groups%ROWTYPE;
BEGIN
  v_acting_user := auth.uid();
  IF v_acting_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Not authenticated';
    RETURN;
  END IF;

  SELECT * INTO v_group FROM groups WHERE invite_code = p_invite_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid invite code';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group.id AND user_id = v_acting_user) THEN
    RETURN QUERY SELECT true, v_group.id, NULL::text;
    RETURN;
  END IF;

  INSERT INTO group_members (group_id, user_id, role, points)
  VALUES (v_group.id, v_acting_user, 'member', 100);

  INSERT INTO point_transactions (group_id, user_id, delta, balance_after, reason)
  VALUES (v_group.id, v_acting_user, 100, 100, 'initial_grant');

  RETURN QUERY SELECT true, v_group.id, NULL::text;
END;
$$;

-- ============================================================
-- create_group: Create group and auto-add creator as admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_description text,
  p_invite_code text
)
RETURNS TABLE (success boolean, group_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acting_user uuid;
  v_group_id uuid;
BEGIN
  v_acting_user := auth.uid();
  IF v_acting_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Not authenticated';
    RETURN;
  END IF;

  INSERT INTO groups (name, description, invite_code, created_by)
  VALUES (p_name, p_description, p_invite_code, v_acting_user)
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id, role, points)
  VALUES (v_group_id, v_acting_user, 'admin', 100);

  INSERT INTO point_transactions (group_id, user_id, delta, balance_after, reason)
  VALUES (v_group_id, v_acting_user, 100, 100, 'initial_grant');

  RETURN QUERY SELECT true, v_group_id, NULL::text;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invite code already in use, please try again';
END;
$$;

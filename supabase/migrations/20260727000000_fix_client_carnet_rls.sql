-- Migration: Fix RLS policies for clients and carnets creation
-- ROOT CAUSE (definitive):
--   ALL id columns in production are character varying (stored via ::text cast in triggers).
--   auth.uid() returns UUID. Every comparison must cast auth.uid() to text.
--   Pattern used in ALL existing migrations: "WHERE id = auth.uid()::text"
--   Our previous attempt failed because:
--     1. get_current_user_role() had "WHERE id = auth.uid()::text" but
--        the function body first tried fallback returning user_role enum then
--        queried with the wrong comparison.
--     2. insert_clients/select_clients used "created_by = auth.uid()" without ::text cast.
--
-- FIX: Use auth.uid()::text for ALL comparisons — matching 20260720000002 pattern.

-- ============================================================
-- STEP 1: Fix get_current_user_role() to match existing signature
--         Uses auth.uid()::text — same as migration 20260720000002
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role_text TEXT;
BEGIN
    -- 1. Try JWT user_metadata first (fast, avoids recursion)
    v_role_text := auth.jwt() -> 'user_metadata' ->> 'role';

    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    -- 2. Fallback: direct query. id is character varying → cast uid() to text
    SELECT role::text INTO v_role_text
    FROM public.user_profiles
    WHERE id = auth.uid()::text;

    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    RETURN 'agent'::public.user_role;
EXCEPTION WHEN OTHERS THEN
    RETURN 'agent'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- STEP 2: Recreate helper boolean functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() = 'super_admin'::public.user_role;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin_principal()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() = 'admin_principal'::public.user_role;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() = 'supervisor'::public.user_role;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() = 'agent'::public.user_role;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- STEP 3: Ensure photo column exists on clients
-- ============================================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo TEXT;

-- ============================================================
-- STEP 4: Fix insert_clients RLS policy
--   clients.created_by = character varying (user_profiles.id is varchar)
--   auth.uid() = UUID → must cast to text
--   terrain_agents.id = character varying → no uuid cast needed
-- ============================================================
DROP POLICY IF EXISTS insert_clients ON public.clients;
CREATE POLICY insert_clients ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND created_by IN (
            SELECT id FROM public.terrain_agents
            WHERE supervisor_id = auth.uid()::text
        ))
        OR (public.is_agent() AND created_by = auth.uid()::text)
    );

-- ============================================================
-- STEP 5: Fix select_clients RLS policy — same cast pattern
-- ============================================================
DROP POLICY IF EXISTS select_clients ON public.clients;
CREATE POLICY select_clients ON public.clients
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND created_by IN (
            SELECT id FROM public.terrain_agents
            WHERE supervisor_id = auth.uid()::text
        ))
        OR (public.is_agent() AND created_by = auth.uid()::text)
    );

-- ============================================================
-- STEP 6: Grant EXECUTE on create_carnet_with_deposit
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_carnet_with_deposit(UUID, NUMERIC, UUID, NUMERIC, UUID) TO authenticated;

-- ============================================================
-- STEP 7: Recreate create_carnet_with_deposit
--   All id columns are character varying in production.
--   UUID params cast to ::text when comparing/inserting into varchar columns.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_carnet_with_deposit(
    p_client_id UUID,
    p_daily_mise NUMERIC,
    p_agent_id UUID,
    p_first_deposit_amount NUMERIC,
    p_created_by UUID
)
RETURNS public.savings_carnets AS $$
DECLARE
    v_carnet public.savings_carnets;
    v_supervisor_id TEXT;
    v_carnet_number VARCHAR(50);
    v_slots_count INTEGER;
    v_k NUMERIC;
BEGIN
    -- terrain_agents.id is varchar → compare p_agent_id as text
    SELECT supervisor_id INTO v_supervisor_id
    FROM public.terrain_agents
    WHERE id = p_agent_id::text;

    -- Fallback: try agents_mapping table (varchar ids)
    IF v_supervisor_id IS NULL THEN
        BEGIN
            SELECT supervisor_id INTO v_supervisor_id
            FROM public.agents_mapping
            WHERE id = p_agent_id::text
            LIMIT 1;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END IF;

    -- Fallback: first available supervisor (user_profiles.id is varchar)
    IF v_supervisor_id IS NULL THEN
        SELECT id INTO v_supervisor_id
        FROM public.user_profiles
        WHERE role = 'supervisor'::public.user_role
        LIMIT 1;
    END IF;

    -- Fallback: first admin_principal
    IF v_supervisor_id IS NULL THEN
        SELECT id INTO v_supervisor_id
        FROM public.user_profiles
        WHERE role = 'admin_principal'::public.user_role
        LIMIT 1;
    END IF;

    IF v_supervisor_id IS NULL THEN
        RAISE EXCEPTION 'Aucun superviseur ou administrateur disponible pour cet agent (ID: %).', p_agent_id;
    END IF;

    -- Auto-register supervisor in supervisors (all varchar)
    INSERT INTO public.supervisors (id, admin_id, created_by, updated_by)
    VALUES (v_supervisor_id, v_supervisor_id, p_created_by::text, p_created_by::text)
    ON CONFLICT (id) DO NOTHING;

    -- Auto-register agent in terrain_agents (all varchar)
    INSERT INTO public.terrain_agents (id, supervisor_id, created_by, updated_by)
    VALUES (p_agent_id::text, v_supervisor_id, p_created_by::text, p_created_by::text)
    ON CONFLICT (id) DO NOTHING;

    -- Validate first deposit is a multiple of daily_mise
    v_k := p_first_deposit_amount / p_daily_mise;
    IF v_k <> FLOOR(v_k) OR v_k <= 0 THEN
        RAISE EXCEPTION 'Le premier dépôt (%) doit être un multiple de la mise journalière (%).', p_first_deposit_amount, p_daily_mise;
    END IF;
    v_slots_count := v_k::INTEGER;

    -- Generate unique carnet number
    v_carnet_number := 'CB-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT || '-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT;

    -- Insert carnet
    -- savings_carnets.agent_id and supervisor_id are UUID (initial schema)
    -- v_supervisor_id is text → must cast back to UUID
    -- p_agent_id and p_client_id are already UUID params
    INSERT INTO public.savings_carnets (
        carnet_number, client_id, daily_mise, agent_id, supervisor_id,
        status, created_by, updated_by, created_at, updated_at
    )
    VALUES (
        v_carnet_number,
        p_client_id,
        p_daily_mise,
        p_agent_id,
        v_supervisor_id::uuid,
        'active',
        p_created_by,
        p_created_by,
        NOW(),
        NOW()
    )
    RETURNING * INTO v_carnet;

    -- Insert first deposit
    INSERT INTO public.carnet_deposits (
        carnet_id, amount, slots_count, created_by, updated_by, created_at, updated_at
    )
    VALUES (
        v_carnet.id, p_first_deposit_amount, v_slots_count,
        p_created_by, p_created_by, NOW(), NOW()
    );

    -- Commission entries in ledger
    INSERT INTO public.ledger (carnet_id, agent_id, type, amount, description, created_at)
    VALUES (
        v_carnet.id, p_agent_id, 'agent_gain',
        p_daily_mise * 0.5,
        'Commission agent (50%) - Carnet ' || v_carnet_number,
        NOW()
    );

    INSERT INTO public.ledger (carnet_id, agent_id, type, amount, description, created_at)
    VALUES (
        v_carnet.id, NULL, 'org_gain',
        p_daily_mise * 0.5,
        'Commission organisation (50%) - Carnet ' || v_carnet_number,
        NOW()
    );

    -- Lock carnet if first deposit fills 31 slots
    IF v_slots_count = 31 THEN
        UPDATE public.savings_carnets SET status = 'locked' WHERE id = v_carnet.id;
        v_carnet.status := 'locked';
    END IF;

    RETURN v_carnet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant after recreation
GRANT EXECUTE ON FUNCTION public.create_carnet_with_deposit(UUID, NUMERIC, UUID, NUMERIC, UUID) TO authenticated;

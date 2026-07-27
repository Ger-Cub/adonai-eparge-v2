-- Migration: Fix RLS policies for clients, savings_carnets, carnet_deposits, withdrawal_requests, ledger
-- Goal: Ensure lower hierarchy users' data (clients, carnets, deposits) are visible to higher hierarchy users (supervisors, admins) and agents can see carnets using either auth.uid() or readable_id.

-- 0. Ensure readable_id column exists on user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS readable_id character varying(50);

-- 1. Helper functions refresh
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role_text TEXT;
BEGIN
    -- Try JWT user_metadata first
    v_role_text := auth.jwt() -> 'user_metadata' ->> 'role';
    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    -- Direct query fallback with text casting on both sides
    SELECT role::text INTO v_role_text
    FROM public.user_profiles
    WHERE id::text = auth.uid()::text;

    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    RETURN 'agent'::public.user_role;
EXCEPTION WHEN OTHERS THEN
    RETURN 'agent'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- 2. CLIENTS RLS Policies
DROP POLICY IF EXISTS select_clients ON public.clients;
CREATE POLICY select_clients ON public.clients
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR (public.is_supervisor() AND (
            created_by::text IN (SELECT id::text FROM public.terrain_agents WHERE supervisor_id = auth.uid()::text)
            OR created_by::text IN (SELECT id::text FROM public.agents_mapping WHERE supervisor_id = auth.uid()::text)
            OR created_by::text IN (SELECT id::text FROM public.user_profiles WHERE created_by = auth.uid()::text)
            OR id::text IN (SELECT client_id::text FROM public.savings_carnets WHERE supervisor_id::text = auth.uid()::text)
        ))
        OR (public.is_agent() AND (
            created_by::text = auth.uid()::text
            OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
            OR id::text IN (
                SELECT client_id::text FROM public.savings_carnets 
                WHERE agent_id::text = auth.uid()::text 
                   OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
            )
        ))
    );

DROP POLICY IF EXISTS insert_clients ON public.clients;
CREATE POLICY insert_clients ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR public.is_supervisor()
        OR public.is_agent()
    );

DROP POLICY IF EXISTS update_clients ON public.clients;
CREATE POLICY update_clients ON public.clients
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR public.is_supervisor()
    );

-- 3. SAVINGS_CARNETS RLS Policies
DROP POLICY IF EXISTS select_savings_carnets ON public.savings_carnets;
CREATE POLICY select_savings_carnets ON public.savings_carnets
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR supervisor_id::text = auth.uid()::text
        OR supervisor_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR agent_id::text = auth.uid()::text
        OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR (public.is_supervisor() AND agent_id::text IN (
            SELECT id::text FROM public.terrain_agents WHERE supervisor_id = auth.uid()::text
        ))
    );

DROP POLICY IF EXISTS insert_savings_carnets ON public.savings_carnets;
CREATE POLICY insert_savings_carnets ON public.savings_carnets
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR public.is_supervisor()
        OR public.is_agent()
    );

DROP POLICY IF EXISTS update_savings_carnets ON public.savings_carnets;
CREATE POLICY update_savings_carnets ON public.savings_carnets
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR supervisor_id::text = auth.uid()::text
        OR supervisor_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR agent_id::text = auth.uid()::text
        OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
    );

-- 4. CARNET_DEPOSITS RLS Policies
DROP POLICY IF EXISTS select_carnet_deposits ON public.carnet_deposits;
CREATE POLICY select_carnet_deposits ON public.carnet_deposits
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR carnet_id::text IN (
            SELECT id::text FROM public.savings_carnets 
            WHERE supervisor_id::text = auth.uid()::text 
               OR supervisor_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
               OR agent_id::text = auth.uid()::text 
               OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
               OR created_by::text = auth.uid()::text
               OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS insert_carnet_deposits ON public.carnet_deposits;
CREATE POLICY insert_carnet_deposits ON public.carnet_deposits
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR public.is_supervisor()
        OR public.is_agent()
    );

DROP POLICY IF EXISTS delete_carnet_deposits ON public.carnet_deposits;
CREATE POLICY delete_carnet_deposits ON public.carnet_deposits
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
    );

-- 5. WITHDRAWAL_REQUESTS RLS Policies
DROP POLICY IF EXISTS select_withdrawal_requests ON public.withdrawal_requests;
CREATE POLICY select_withdrawal_requests ON public.withdrawal_requests
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        OR carnet_id::text IN (
            SELECT id::text FROM public.savings_carnets 
            WHERE supervisor_id::text = auth.uid()::text 
               OR supervisor_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
               OR agent_id::text = auth.uid()::text
               OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS insert_withdrawal_requests ON public.withdrawal_requests;
CREATE POLICY insert_withdrawal_requests ON public.withdrawal_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR public.is_supervisor()
        OR public.is_agent()
    );

DROP POLICY IF EXISTS update_withdrawal_requests ON public.withdrawal_requests;
CREATE POLICY update_withdrawal_requests ON public.withdrawal_requests
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR carnet_id::text IN (
            SELECT id::text FROM public.savings_carnets WHERE supervisor_id::text = auth.uid()::text OR supervisor_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        )
        OR created_by::text = auth.uid()::text
        OR created_by::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
    );

-- 6. LEDGER RLS Policies
DROP POLICY IF EXISTS select_ledger ON public.ledger;
CREATE POLICY select_ledger ON public.ledger
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND agent_id::text IN (
            SELECT id::text FROM public.terrain_agents WHERE supervisor_id = auth.uid()::text
        ))
        OR (public.is_agent() AND (
            agent_id::text = auth.uid()::text
            OR agent_id::text IN (SELECT readable_id FROM public.user_profiles WHERE id::text = auth.uid()::text)
        ))
    );

-- 7. USER_PROFILES RLS Policy
DROP POLICY IF EXISTS select_user_profiles ON public.user_profiles;
CREATE POLICY select_user_profiles ON public.user_profiles
    FOR SELECT TO authenticated
    USING (true);

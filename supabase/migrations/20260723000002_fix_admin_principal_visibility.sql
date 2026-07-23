-- SQL Migration: Fix Admin Principal Profile Visibility & RLS Policies
-- Target: Supabase Postgres production database

-- 1. Update get_current_user_role helper to safely resolve user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role_text TEXT;
BEGIN
    -- 1. Try to read from current JWT user metadata (fast, prevents RLS infinite recursion)
    v_role_text := auth.jwt() -> 'user_metadata' ->> 'role';
    
    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    -- 2. Direct query without triggering RLS recursion (SECURITY DEFINER + explicit schema search_path)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Ensure RLS Policy on user_profiles permits all authenticated users to view profiles list
DROP POLICY IF EXISTS select_user_profiles ON public.user_profiles;
CREATE POLICY select_user_profiles ON public.user_profiles
    FOR SELECT TO authenticated
    USING (true);

-- 3. Ensure update policy permits super_admin and admin_principal to update subordinate profiles
DROP POLICY IF EXISTS update_user_profiles ON public.user_profiles;
CREATE POLICY update_user_profiles ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND id IN (SELECT id FROM public.terrain_agents WHERE supervisor_id = auth.uid()::text))
        OR id = auth.uid()::text
    );

-- 4. Ensure insert policy permits admin_principal to create supervisors & agents
DROP POLICY IF EXISTS insert_user_profiles ON public.user_profiles;
CREATE POLICY insert_user_profiles ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND NEW.role = 'agent')
    );

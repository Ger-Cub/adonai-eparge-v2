-- Migration: Fix select_clients and insert_clients RLS policies
-- ROOT CAUSE:
--   clients.created_by is UUID (from initial schema).
--   auth.uid()::text is text.
--   "UUID = text" has no implicit operator in PostgreSQL → condition silently false → 0 rows.
--   FIX: Cast BOTH sides to text: created_by::text = auth.uid()::text
--
-- Same issue in supervisor branch: terrain_agents.id is varchar,
-- comparing to created_by (UUID) needs cast on created_by side too.

-- ── Fix SELECT policy ──
DROP POLICY IF EXISTS select_clients ON public.clients;
CREATE POLICY select_clients ON public.clients
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND created_by::text IN (
            SELECT id FROM public.terrain_agents
            WHERE supervisor_id = auth.uid()::text
        ))
        OR (public.is_agent() AND created_by::text = auth.uid()::text)
    );

-- ── Fix INSERT policy (same cast required for consistency) ──
DROP POLICY IF EXISTS insert_clients ON public.clients;
CREATE POLICY insert_clients ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR (public.is_supervisor() AND created_by::text IN (
            SELECT id FROM public.terrain_agents
            WHERE supervisor_id = auth.uid()::text
        ))
        OR (public.is_agent() AND created_by::text = auth.uid()::text)
    );

-- ── Also fix get_current_user_role() fallback query ──
-- If user_profiles.id is UUID, "id = auth.uid()::text" fails (UUID = text).
-- Use id::text instead to safely compare regardless of column type.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role_text TEXT;
BEGIN
    -- 1. Try JWT first (no DB query, no recursion risk)
    v_role_text := auth.jwt() -> 'user_metadata' ->> 'role';

    IF v_role_text IS NOT NULL THEN
        RETURN v_role_text::public.user_role;
    END IF;

    -- 2. Fallback: cast BOTH sides to text to handle UUID or varchar id column
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

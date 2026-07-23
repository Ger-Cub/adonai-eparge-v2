-- SQL Migration: Add human-readable IDs (usr-agent-001, usr-supervisor-001, etc.)
-- Target: Supabase Postgres database

-- 1. Add readable_id column to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS readable_id character varying(50);

-- 2. Create sequences for generating sequential readable IDs per role
CREATE SEQUENCE IF NOT EXISTS user_agent_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS user_supervisor_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS user_admin_seq START WITH 1;

-- 3. Function to generate sequential human-readable ID
CREATE OR REPLACE FUNCTION public.generate_readable_id(p_role public.user_role)
RETURNS TEXT AS $$
DECLARE
    v_seq INT;
    v_prefix TEXT;
BEGIN
    IF p_role = 'agent' THEN
        SELECT nextval('user_agent_seq') INTO v_seq;
        v_prefix := 'usr-agent-';
    ELSIF p_role = 'supervisor' THEN
        SELECT nextval('user_supervisor_seq') INTO v_seq;
        v_prefix := 'usr-supervisor-';
    ELSIF p_role = 'admin_principal' THEN
        SELECT nextval('user_admin_seq') INTO v_seq;
        v_prefix := 'usr-admin-';
    ELSE
        SELECT nextval('user_admin_seq') INTO v_seq;
        v_prefix := 'usr-super-';
    END IF;

    RETURN v_prefix || lpad(v_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Update trigger function handle_new_user to assign readable_id on creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_created_by TEXT;
    v_readable_id TEXT;
BEGIN
    BEGIN
        v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'agent'::public.user_role;
    END;

    IF v_role IS NULL THEN
        v_role := 'agent'::public.user_role;
    END IF;

    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Utilisateur');
    v_phone := new.raw_user_meta_data->>'phone';
    v_created_by := new.raw_user_meta_data->>'created_by';
    v_readable_id := public.generate_readable_id(v_role);

    INSERT INTO public.user_profiles (id, readable_id, role, full_name, phone, created_by, created_at, updated_at)
    VALUES (
        new.id::text,
        v_readable_id,
        v_role,
        v_full_name,
        v_phone,
        v_created_by,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        created_by = COALESCE(EXCLUDED.created_by, public.user_profiles.created_by),
        updated_at = NOW();

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backfill existing user_profiles records without readable_id
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id, role FROM public.user_profiles WHERE readable_id IS NULL ORDER BY created_at ASC LOOP
        UPDATE public.user_profiles 
        SET readable_id = public.generate_readable_id(rec.role)
        WHERE id = rec.id;
    END LOOP;
END;
$$;

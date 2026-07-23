-- SQL Migration: Fix supervisors/terrain_agents tables types (character varying) & user hierarchy trigger
-- Target: Supabase Postgres production database

-- 1. Ensure user_profiles has created_by column if missing
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_by character varying;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_by character varying;

-- 2. Update handle_new_user trigger function to populate created_by from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_created_by TEXT;
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

    INSERT INTO public.user_profiles (id, role, full_name, phone, created_by, created_at, updated_at)
    VALUES (
        new.id::text,
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

-- Rebind trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create supervisors & supervisors_mapping using character varying ID types (matching production schema)
CREATE TABLE IF NOT EXISTS public.supervisors (
    id character varying PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    admin_id character varying REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    created_by character varying,
    updated_by character varying
);

CREATE TABLE IF NOT EXISTS public.supervisors_mapping (
    id character varying PRIMARY KEY,
    admin_id character varying,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    created_by character varying
);

-- 4. Create terrain_agents & agents_mapping using character varying ID types (matching production schema)
CREATE TABLE IF NOT EXISTS public.terrain_agents (
    id character varying PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    supervisor_id character varying REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    created_by character varying,
    updated_by character varying
);

CREATE TABLE IF NOT EXISTS public.agents_mapping (
    id character varying PRIMARY KEY,
    supervisor_id character varying,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    created_by character varying
);

-- 5. Create alias view public.supervisor pointing to public.supervisors
CREATE OR REPLACE VIEW public.supervisor AS
SELECT * FROM public.supervisors;

-- 6. Enable RLS on mapping tables
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrain_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents_mapping ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies for mapping tables
DROP POLICY IF EXISTS select_supervisors ON public.supervisors;
CREATE POLICY select_supervisors ON public.supervisors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_supervisors ON public.supervisors;
CREATE POLICY insert_supervisors ON public.supervisors FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS select_supervisors_mapping ON public.supervisors_mapping;
CREATE POLICY select_supervisors_mapping ON public.supervisors_mapping FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_supervisors_mapping ON public.supervisors_mapping;
CREATE POLICY insert_supervisors_mapping ON public.supervisors_mapping FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS select_terrain_agents ON public.terrain_agents;
CREATE POLICY select_terrain_agents ON public.terrain_agents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_terrain_agents ON public.terrain_agents;
CREATE POLICY insert_terrain_agents ON public.terrain_agents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS select_agents_mapping ON public.agents_mapping;
CREATE POLICY select_agents_mapping ON public.agents_mapping FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_agents_mapping ON public.agents_mapping;
CREATE POLICY insert_agents_mapping ON public.agents_mapping FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Allow authenticated users to select user_profiles to view subordinate users on dashboard
DROP POLICY IF EXISTS select_user_profiles ON public.user_profiles;
CREATE POLICY select_user_profiles ON public.user_profiles FOR SELECT TO authenticated USING (true);

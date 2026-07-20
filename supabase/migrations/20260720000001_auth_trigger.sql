-- SQL Migration: Add Client Photo and User Profile Auto-Creation Trigger
-- Target: Supabase Postgres database

-- 1. Add photo column to clients if not exists
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo TEXT;

-- 2. Create the function to handle new auth users registration and create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
BEGIN
    -- Parse role from user metadata
    BEGIN
        v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'agent'::public.user_role;
    END;

    -- Fallback to default role if null
    IF v_role IS NULL THEN
        v_role := 'agent'::public.user_role;
    END if;

    -- Extract metadata details
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Utilisateur');
    v_phone := new.raw_user_meta_data->>'phone';

    -- Insert into public.user_profiles
    INSERT INTO public.user_profiles (id, role, full_name, phone, created_at, updated_at)
    VALUES (
        new.id,
        v_role,
        v_full_name,
        v_phone,
        NOW(),
        NOW()
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Create the transactional RPC function to create a carnet with its first deposit
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
    v_supervisor_id UUID;
    v_carnet_number VARCHAR(50);
    v_slots_count INTEGER;
    v_k NUMERIC;
BEGIN
    -- Get supervisor_id from mapping
    SELECT supervisor_id INTO v_supervisor_id
    FROM public.terrain_agents
    WHERE id = p_agent_id;

    -- Fallback to a supervisor profile if mapping is not present
    IF v_supervisor_id IS NULL THEN
        SELECT id INTO v_supervisor_id
        FROM public.user_profiles
        WHERE role = 'supervisor'
        LIMIT 1;
        
        IF v_supervisor_id IS NULL THEN
            RAISE EXCEPTION 'Aucun superviseur disponible pour assigner cet agent.';
        END IF;
    END IF;

    -- Validate first deposit amount is a multiple of daily_mise
    v_k := p_first_deposit_amount / p_daily_mise;
    IF v_k <> FLOOR(v_k) OR v_k <= 0 THEN
        RAISE EXCEPTION 'Le premier dépôt (%) doit être un multiple de la mise journalière (%).', p_first_deposit_amount, p_daily_mise;
    END IF;
    v_slots_count := v_k::INTEGER;

    -- Generate random carnet number
    v_carnet_number := 'CB-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT || '-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT;

    -- Insert carnet
    INSERT INTO public.savings_carnets (
        carnet_number, client_id, daily_mise, agent_id, supervisor_id, status, created_by, updated_by, created_at, updated_at
    )
    VALUES (
        v_carnet_number, p_client_id, p_daily_mise, p_agent_id, v_supervisor_id, 'active', p_created_by, p_created_by, NOW(), NOW()
    )
    RETURNING * INTO v_carnet;

    -- Insert first deposit
    INSERT INTO public.carnet_deposits (
        carnet_id, amount, slots_count, created_by, updated_by, created_at, updated_at
    )
    VALUES (
        v_carnet.id, p_first_deposit_amount, v_slots_count, p_created_by, p_created_by, NOW(), NOW()
    );

    -- Insert commissions into ledger (50% agent, 50% org)
    INSERT INTO public.ledger (carnet_id, agent_id, type, amount, description, created_at)
    VALUES (
        v_carnet.id, p_agent_id, 'agent_gain', p_daily_mise * 0.5, 'Commission agent de terrain (50%) - Carnet ' || v_carnet_number, NOW()
    );

    INSERT INTO public.ledger (carnet_id, agent_id, type, amount, description, created_at)
    VALUES (
        v_carnet.id, NULL, 'org_gain', p_daily_mise * 0.5, 'Commission organisation (50%) - Carnet ' || v_carnet_number, NOW()
    );

    -- Update status to locked if first deposit fills all 31 slots
    IF v_slots_count = 31 THEN
        UPDATE public.savings_carnets
        SET status = 'locked'
        WHERE id = v_carnet.id;
        v_carnet.status := 'locked';
    END IF;

    RETURN v_carnet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

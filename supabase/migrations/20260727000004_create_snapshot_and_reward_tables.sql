-- Migration: Create org_revenue_snapshots, agent_monthly_rewards, and agent_payouts tables if missing
-- Goal: Ensure Supabase schema cache has these tables defined with RLS enabled.

-- 0. Ensure readable_id column exists on user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS readable_id character varying(50);

-- 1. Org Revenue Snapshots
CREATE TABLE IF NOT EXISTS public.org_revenue_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    carnet_sales_amount NUMERIC(15,2) DEFAULT 0,
    first_deposit_commissions NUMERIC(15,2) DEFAULT 0,
    total_org_revenue NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_org_revenue_snapshots_month_year UNIQUE(year, month)
);

ALTER TABLE public.org_revenue_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_org_revenue_snapshots ON public.org_revenue_snapshots;
CREATE POLICY select_org_revenue_snapshots ON public.org_revenue_snapshots
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_admin_principal()
        OR public.is_supervisor()
    );

-- 2. Agent Monthly Rewards
CREATE TABLE IF NOT EXISTS public.agent_monthly_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    acquired_commission NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_agent_monthly_rewards UNIQUE(agent_id, year, month)
);

ALTER TABLE public.agent_monthly_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_agent_monthly_rewards ON public.agent_monthly_rewards;
CREATE POLICY select_agent_monthly_rewards ON public.agent_monthly_rewards
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

-- 3. Agent Payouts
CREATE TABLE IF NOT EXISTS public.agent_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    paid_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_agent_payouts ON public.agent_payouts;
CREATE POLICY select_agent_payouts ON public.agent_payouts
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

DROP POLICY IF EXISTS insert_agent_payouts ON public.agent_payouts;
CREATE POLICY insert_agent_payouts ON public.agent_payouts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_admin_principal()
    );

-- SQL Migration: Create agent_payouts table
-- Based on real production schema (all ids are character varying, no helper functions)
-- Production tables: user_profiles, agents_mapping, supervisors_mapping,
--   savings_carnets, carnet_deposits, ledger, withdrawal_requests, withdrawals_log, clients

-- 1. Create the agent_payouts table matching production conventions
CREATE TABLE IF NOT EXISTS public.agent_payouts (
    id          character varying PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id    character varying NOT NULL,
    amount      integer NOT NULL CHECK (amount >= 0),
    paid_by     character varying NOT NULL,
    created_at  timestamp with time zone NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.agent_payouts ENABLE ROW LEVEL SECURITY;

-- 3. RLS: SELECT — admins see all, agent sees own, supervisor sees their agents
DROP POLICY IF EXISTS select_agent_payouts ON public.agent_payouts;
CREATE POLICY select_agent_payouts ON public.agent_payouts
    FOR SELECT TO authenticated
    USING (
        -- Admin roles
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()::text
              AND role::text IN ('super_admin', 'admin_principal')
        )
        -- Agent sees their own payslips
        OR agent_id = auth.uid()::text
        -- Supervisor sees payouts of their agents
        OR agent_id IN (
            SELECT id FROM public.agents_mapping
            WHERE supervisor_id = auth.uid()::text
        )
    );

-- 4. RLS: INSERT — only admins can create payouts
DROP POLICY IF EXISTS insert_agent_payouts ON public.agent_payouts;
CREATE POLICY insert_agent_payouts ON public.agent_payouts
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()::text
              AND role::text IN ('super_admin', 'admin_principal')
        )
    );

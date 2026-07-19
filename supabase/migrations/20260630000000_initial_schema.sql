-- SQL Migration: Setup Tables, Enums, Triggers, Functions and RLS
-- Target: Supabase Postgres database for "Épargne à la Carte"

-- -------------------------------------------------------------
-- 0. Extensions & Enums
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('super_admin', 'admin_principal', 'supervisor', 'agent');
CREATE TYPE carnet_status AS ENUM ('pending', 'active', 'rejected', 'locked', 'archived');
CREATE TYPE ledger_entry_type AS ENUM ('carnet_sale', 'agent_gain', 'org_gain');
CREATE TYPE withdrawal_request_status AS ENUM ('pending', 'approved', 'rejected');

-- -------------------------------------------------------------
-- 1. Tables Creation
-- -------------------------------------------------------------

-- --- Profiles Table ---
-- Linked 1:1 to auth.users, holds role and profile info
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'agent',
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id)
);

-- --- Supervisors Relation Map ---
-- Tracks which Admin Principal created which Supervisor
CREATE TABLE supervisors (
    id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id)
);

-- --- Terrain Agents Relation Map ---
-- Tracks which Supervisor manages which Agent
CREATE TABLE terrain_agents (
    id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id)
);

-- --- Clients Table ---
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT
);

-- --- Savings Carnets Table ---
CREATE TABLE savings_carnets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carnet_number VARCHAR(50) UNIQUE NOT NULL, -- Format e.g., 'CB-XXXX-YYYY'
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    daily_mise NUMERIC(15, 2) NOT NULL CHECK (daily_mise > 0),
    agent_id UUID NOT NULL REFERENCES terrain_agents(id) ON DELETE RESTRICT,
    supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE RESTRICT,
    status carnet_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT
);

-- --- Carnet Deposits Table ---
CREATE TABLE carnet_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carnet_id UUID NOT NULL REFERENCES savings_carnets(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    slots_count INTEGER NOT NULL CHECK (slots_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT
);

-- --- Withdrawal Requests Table ---
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carnet_id UUID NOT NULL REFERENCES savings_carnets(id) ON DELETE CASCADE,
    requested_amount NUMERIC(15, 2) NOT NULL CHECK (requested_amount > 0),
    status withdrawal_request_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT
);

-- --- Withdrawals Archive Table ---
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID UNIQUE NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
    carnet_id UUID NOT NULL REFERENCES savings_carnets(id) ON DELETE RESTRICT,
    paid_amount NUMERIC(15, 2) NOT NULL CHECK (paid_amount > 0),
    fee_applied NUMERIC(15, 2) NOT NULL CHECK (fee_applied >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT -- Administrative validator
);

-- --- Financial Ledger ---
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carnet_id UUID NOT NULL REFERENCES savings_carnets(id) ON DELETE RESTRICT,
    agent_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT, -- set if type = 'agent_gain'
    type ledger_entry_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- Agent Monthly Rewards Table ---
CREATE TABLE agent_monthly_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_sales_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_commission NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, year, month)
);

-- --- Organization Revenue Snapshots ---
CREATE TABLE org_revenue_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_sales_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_commission_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (year, month)
);

-- -------------------------------------------------------------
-- 2. Helper Functions (Security, Roles & Context)
-- -------------------------------------------------------------

-- Helper: Get current user role from profiles
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM user_profiles WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper check functions for RLS
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
    SELECT get_current_user_role() = 'super_admin';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_principal() RETURNS BOOLEAN AS $$
    SELECT get_current_user_role() = 'admin_principal';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_supervisor() RETURNS BOOLEAN AS $$
    SELECT get_current_user_role() = 'supervisor';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_agent() RETURNS BOOLEAN AS $$
    SELECT get_current_user_role() = 'agent';
$$ LANGUAGE sql SECURITY DEFINER;

-- -------------------------------------------------------------
-- 3. Business Rules Triggers and Validations
-- -------------------------------------------------------------

-- --- Automatically Set Supervisor when Carnet is created ---
CREATE OR REPLACE FUNCTION set_savings_carnet_supervisor()
RETURNS TRIGGER AS $$
DECLARE
    v_supervisor_id UUID;
BEGIN
    -- Check if agent exists and get supervisor
    SELECT supervisor_id INTO v_supervisor_id
    FROM terrain_agents
    WHERE id = NEW.agent_id;

    IF v_supervisor_id IS NULL THEN
        RAISE EXCEPTION 'Agent ID % has no supervisor assigned.', NEW.agent_id;
    END IF;

    NEW.supervisor_id := v_supervisor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_savings_carnet_supervisor
BEFORE INSERT ON savings_carnets
FOR EACH ROW
EXECUTE FUNCTION set_savings_carnet_supervisor();


-- --- First Deposit Enforcer (MUST insert deposit in same transaction) ---
CREATE OR REPLACE FUNCTION verify_carnet_has_first_deposit()
RETURNS TRIGGER AS $$
DECLARE
    v_deposit_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM carnet_deposits WHERE carnet_id = NEW.id
    ) INTO v_deposit_exists;

    IF NOT v_deposit_exists THEN
        RAISE EXCEPTION 'Le premier dépôt est obligatoire lors de la création du carnet %.', NEW.carnet_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deferrable constraint trigger to run at the very end of statement/transaction
CREATE CONSTRAINT TRIGGER trg_verify_carnet_first_deposit
AFTER INSERT ON savings_carnets
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verify_carnet_has_first_deposit();


-- --- Rule: Carnet modification allowed only in the first 24 hours ---
CREATE OR REPLACE FUNCTION enforce_carnet_modification_timeframe()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow changing status, but not other fields after 24 hrs
    IF (OLD.daily_mise <> NEW.daily_mise OR OLD.client_id <> NEW.client_id OR OLD.agent_id <> NEW.agent_id) THEN
        IF (NOW() - OLD.created_at) > INTERVAL '24 hours' THEN
            RAISE EXCEPTION 'Les détails opérationnels du carnet ne peuvent plus être modifiés après 24 heures.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_carnet_modification_timeframe
BEFORE UPDATE ON savings_carnets
FOR EACH ROW
EXECUTE FUNCTION enforce_carnet_modification_timeframe();


-- --- Validate custom deposit rules ---
-- Formula: depositAmount MUST be multiple of daily_mise (amount = daily_mise * k)
-- Calculate slots_count = amount / daily_mise
-- Prevent deposit if carnet is locked or archived
-- Auto-lock carnet when total slots_count reaches 31
CREATE OR REPLACE FUNCTION process_and_validate_deposit()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_mise NUMERIC;
    v_status carnet_status;
    v_current_slots INTEGER;
    v_new_slots INTEGER;
    v_calculated_k NUMERIC;
BEGIN
    -- Fetch carnet configuration
    SELECT daily_mise, status INTO v_daily_mise, v_status
    FROM savings_carnets
    WHERE id = NEW.carnet_id;

    -- 1. Check status
    IF v_status = 'locked' THEN
        RAISE EXCEPTION 'Dépôt refusé : le carnet est verrouillé.';
    ELSIF v_status = 'archived' THEN
        RAISE EXCEPTION 'Dépôt refusé : le carnet est archivé.';
    ELSIF v_status = 'rejected' THEN
        RAISE EXCEPTION 'Dépôt refusé : le carnet a été rejeté.';
    END IF;

    -- 2. Validate multiple of daily_mise
    v_calculated_k := NEW.amount / v_daily_mise;
    IF v_calculated_k <> FLOOR(v_calculated_k) OR v_calculated_k <= 0 THEN
        RAISE EXCEPTION 'Le montant du dépôt (%) doit être un multiple exact de la mise journalière (%).', NEW.amount, v_daily_mise;
    END IF;

    NEW.slots_count := v_calculated_k::INTEGER;

    -- 3. Calculate accumulated slots
    SELECT COALESCE(SUM(slots_count), 0) INTO v_current_slots
    FROM carnet_deposits
    WHERE carnet_id = NEW.carnet_id;

    v_new_slots := v_current_slots + NEW.slots_count;

    IF v_new_slots > 31 THEN
        RAISE EXCEPTION 'Le dépôt excède la capacité maximale du carnet. Emplacements disponibles restants : %', (31 - v_current_slots);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_and_validate_deposit
BEFORE INSERT ON carnet_deposits
FOR EACH ROW
EXECUTE FUNCTION process_and_validate_deposit();


-- --- Auto-Lock carnet when filled to 31 slots ---
CREATE OR REPLACE FUNCTION autolock_carnet_on_slots_fill()
RETURNS TRIGGER AS $$
DECLARE
    v_current_slots INTEGER;
BEGIN
    SELECT COALESCE(SUM(slots_count), 0) INTO v_current_slots
    FROM carnet_deposits
    WHERE carnet_id = NEW.carnet_id;

    IF v_current_slots = 31 THEN
        UPDATE savings_carnets
        SET status = 'locked', updated_at = NOW()
        WHERE id = NEW.carnet_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_autolock_carnet_on_slots_fill
AFTER INSERT ON carnet_deposits
FOR EACH ROW
EXECUTE FUNCTION autolock_carnet_on_slots_fill();


-- --- Ledger Entry for Carnet Creation Fee (500 FC) ---
CREATE OR REPLACE FUNCTION ledger_entry_on_carnet_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ledger (carnet_id, agent_id, type, amount, description)
    VALUES (
        NEW.id,
        NEW.agent_id,
        'carnet_sale',
        500.00,
        'Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro ' || NEW.carnet_number
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_entry_on_carnet_creation
AFTER INSERT ON savings_carnets
FOR EACH ROW
EXECUTE FUNCTION ledger_entry_on_carnet_creation();


-- --- Enforce Withdrawal Request Rules ---
-- Must only be opened on LOCKED carnets
-- Requested amount must be exactly SUM(deposits) - daily_mise (1st deposit kept by org+agent)
CREATE OR REPLACE FUNCTION validate_withdrawal_request()
RETURNS TRIGGER AS $$
DECLARE
    v_status carnet_status;
    v_daily_mise NUMERIC;
    v_total_deposits NUMERIC;
    v_expected_payout NUMERIC;
BEGIN
    SELECT status, daily_mise INTO v_status, v_daily_mise
    FROM savings_carnets
    WHERE id = NEW.carnet_id;

    IF v_status <> 'locked' THEN
        RAISE EXCEPTION 'Une demande de retrait ne peut être soumise que sur un carnet verrouillé.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
    FROM carnet_deposits
    WHERE carnet_id = NEW.carnet_id;

    v_expected_payout := v_total_deposits - v_daily_mise;

    IF NEW.requested_amount <> v_expected_payout THEN
        RAISE EXCEPTION 'Le montant demandé (%) est incorrect. Le montant disponible après déduction du premier dépôt est de %.', NEW.requested_amount, v_expected_payout;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_withdrawal_request
BEFORE INSERT ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION validate_withdrawal_request();


-- --- Withdrawal Validation Trigger ---
-- When request status is updated to 'approved':
-- 1. Create a corresponding entry in withdrawals
-- 2. Archive the carnet (status = 'archived')
-- 3. Calculate and record the agent/org commissions from the keeping fee (which is the daily_mise)
--    Rules: 50% agent_gain, 50% org_gain
CREATE OR REPLACE FUNCTION process_approved_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_mise NUMERIC;
    v_agent_id UUID;
BEGIN
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
        -- Get carnet parameters
        SELECT daily_mise, agent_id INTO v_daily_mise, v_agent_id
        FROM savings_carnets
        WHERE id = NEW.carnet_id;

        -- 1. Insert into withdrawals
        INSERT INTO withdrawals (request_id, carnet_id, paid_amount, fee_applied, created_by)
        VALUES (
            NEW.id,
            NEW.carnet_id,
            NEW.requested_amount,
            v_daily_mise,
            NEW.updated_by
        );

        -- 2. Set Carnet status to archived
        UPDATE savings_carnets
        SET status = 'archived', updated_at = NOW()
        WHERE id = NEW.carnet_id;

        -- 3. Distribute the fee (daily_mise) 50% agent / 50% organization
        -- Store in Ledger
        INSERT INTO ledger (carnet_id, agent_id, type, amount, description)
        VALUES (
            NEW.carnet_id,
            v_agent_id,
            'agent_gain',
            v_daily_mise * 0.5,
            'Commission agent de terrain (50%) - Carnet ' || NEW.carnet_id
        );

        INSERT INTO ledger (carnet_id, agent_id, type, amount, description)
        VALUES (
            NEW.carnet_id,
            NULL,
            'org_gain',
            v_daily_mise * 0.5,
            'Commission organisation (50%) - Carnet ' || NEW.carnet_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_approved_withdrawal
AFTER UPDATE OF status ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION process_approved_withdrawal();

-- -------------------------------------------------------------
-- 4. Row Level Security (RLS) Configuration
-- -------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_carnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE carnet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_monthly_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_revenue_snapshots ENABLE ROW LEVEL SECURITY;

-- --- RLS policies for: user_profiles ---
CREATE POLICY select_user_profiles ON user_profiles
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR id = auth.uid()
        OR id IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid())
        OR id IN (SELECT supervisor_id FROM terrain_agents WHERE id = auth.uid())
    );

CREATE POLICY insert_user_profiles ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        is_super_admin()
        OR (is_admin_principal() AND NEW.role = 'supervisor')
        -- Supervisor creates agent
        OR (is_supervisor() AND NEW.role = 'agent')
    );

CREATE POLICY update_user_profiles ON user_profiles
    FOR UPDATE TO authenticated
    USING (
        is_super_admin()
        OR (is_admin_principal() AND role = 'supervisor')
        OR (is_supervisor() AND id IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
        OR id = auth.uid()
    );

CREATE POLICY delete_user_profiles ON user_profiles
    FOR DELETE TO authenticated
    USING (
        is_super_admin()
        OR (is_admin_principal() AND role = 'supervisor')
        OR (is_supervisor() AND id IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
    );


-- --- RLS policies for: supervisors ---
CREATE POLICY select_supervisors ON supervisors
    FOR SELECT TO authenticated
    USING (is_super_admin() OR is_admin_principal() OR id = auth.uid());

CREATE POLICY insert_supervisors ON supervisors
    FOR INSERT TO authenticated
    WITH CHECK (is_super_admin() OR is_admin_principal());

CREATE POLICY delete_supervisors ON supervisors
    FOR DELETE TO authenticated
    USING (is_super_admin() OR is_admin_principal());


-- --- RLS policies for: terrain_agents ---
CREATE POLICY select_terrain_agents ON terrain_agents
    FOR SELECT TO authenticated
    USING (is_super_admin() OR is_admin_principal() OR supervisor_id = auth.uid() OR id = auth.uid());

CREATE POLICY insert_terrain_agents ON terrain_agents
    FOR INSERT TO authenticated
    WITH CHECK (is_super_admin() OR is_admin_principal() OR supervisor_id = auth.uid());

CREATE POLICY delete_terrain_agents ON terrain_agents
    FOR DELETE TO authenticated
    USING (is_super_admin() OR is_admin_principal() OR supervisor_id = auth.uid());


-- --- RLS policies for: clients ---
CREATE POLICY select_clients ON clients
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_supervisor() AND created_by IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
        OR (is_agent() AND created_by = auth.uid())
    );

CREATE POLICY insert_clients ON clients
    FOR INSERT TO authenticated
    WITH CHECK (
        is_super_admin() OR is_admin_principal()
        -- Supervisor can insert clients for their team or agents can insert clients directly
        OR (is_supervisor() AND created_by IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
        OR (is_agent() AND created_by = auth.uid())
    );

CREATE POLICY update_clients ON clients
    FOR UPDATE TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_supervisor() AND created_by IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
        OR (is_agent() AND created_by = auth.uid())
    );

CREATE POLICY delete_clients ON clients
    FOR DELETE TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_supervisor() AND created_by IN (SELECT id FROM terrain_agents WHERE supervisor_id = auth.uid()))
    );


-- --- RLS policies for: savings_carnets ---
CREATE POLICY select_savings_carnets ON savings_carnets
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_supervisor() AND supervisor_id = auth.uid())
        OR (is_agent() AND agent_id = auth.uid())
    );

CREATE POLICY insert_savings_carnets ON savings_carnets
    FOR INSERT TO authenticated
    WITH CHECK (
        is_super_admin() OR is_admin_principal()
        OR (is_agent() AND agent_id = auth.uid())
    );

CREATE POLICY update_savings_carnets ON savings_carnets
    FOR UPDATE TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_supervisor() AND supervisor_id = auth.uid())
        -- Agent can update their carnets
        OR (is_agent() AND agent_id = auth.uid())
    );

CREATE POLICY delete_savings_carnets ON savings_carnets
    FOR DELETE TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
    );


-- --- RLS policies for: carnet_deposits ---
CREATE POLICY select_carnet_deposits ON carnet_deposits
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            SELECT id FROM savings_carnets WHERE supervisor_id = auth.uid() OR agent_id = auth.uid()
        )
    );

CREATE POLICY insert_carnet_deposits ON carnet_deposits
    FOR INSERT TO authenticated
    WITH CHECK (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            SELECT id FROM savings_carnets WHERE agent_id = auth.uid()
        )
    );

CREATE POLICY update_carnet_deposits ON carnet_deposits
    FOR UPDATE TO authenticated
    USING (is_super_admin() OR is_admin_principal());


-- --- RLS policies for: withdrawal_requests ---
CREATE POLICY select_withdrawal_requests ON withdrawal_requests
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            SELECT id FROM savings_carnets WHERE supervisor_id = auth.uid() OR agent_id = auth.uid()
        )
    );

CREATE POLICY insert_withdrawal_requests ON withdrawal_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            SELECT id FROM savings_carnets WHERE agent_id = auth.uid()
        )
    );

CREATE POLICY update_withdrawal_requests ON withdrawal_requests
    FOR UPDATE TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            -- supervisor review
            SELECT id FROM savings_carnets WHERE supervisor_id = auth.uid()
        )
    );


-- --- RLS policies for: withdrawals ---
CREATE POLICY select_withdrawals ON withdrawals
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR carnet_id IN (
            SELECT id FROM savings_carnets WHERE supervisor_id = auth.uid() OR agent_id = auth.uid()
        )
    );

CREATE POLICY insert_withdrawals ON withdrawals
    FOR INSERT TO authenticated
    WITH CHECK (is_super_admin() OR is_admin_principal());


-- --- RLS policies for: ledger ---
-- Visible to Super Admin, Admin Principal, and Agents can only see their own gains.
CREATE POLICY select_ledger ON ledger
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR is_admin_principal()
        OR (is_agent() AND agent_id = auth.uid() AND type = 'agent_gain')
    );


-- -------------------------------------------------------------
-- 5. Cron Job Calculation simulating monthly rewards & snapshots
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION run_monthly_financial_evaluation()
RETURNS VOID AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM NOW() - INTERVAL '1 month')::INTEGER;
    v_month INTEGER := EXTRACT(MONTH FROM NOW() - INTERVAL '1 month')::INTEGER;
    r RECORD;
    v_total_sales_rev NUMERIC(15, 2) := 0;
    v_total_comm_rev NUMERIC(15, 2) := 0;
BEGIN
    -- A. Calculate and populate agent_monthly_rewards
    FOR r IN (
        SELECT
            agent_id,
            SUM(CASE WHEN type = 'carnet_sale' THEN amount ELSE 0 END) as sales_fee,
            SUM(CASE WHEN type = 'agent_gain' THEN amount ELSE 0 END) as agent_comm
        FROM ledger
        WHERE EXTRACT(YEAR FROM created_at) = v_year AND EXTRACT(MONTH FROM created_at) = v_month
        GROUP BY agent_id
    ) LOOP
        INSERT INTO agent_monthly_rewards (agent_id, year, month, total_sales_fee, total_commission)
        VALUES (r.agent_id, v_year, v_month, r.sales_fee, r.agent_comm)
        ON CONFLICT (agent_id, year, month) DO UPDATE
        SET total_sales_fee = EXCLUDED.total_sales_fee,
            total_commission = EXCLUDED.total_commission;
    END LOOP;

    -- B. Calculate and populate organization snaps
    SELECT
        COALESCE(SUM(CASE WHEN type = 'carnet_sale' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'org_gain' THEN amount ELSE 0 END), 0)
    INTO v_total_sales_rev, v_total_comm_rev
    FROM ledger
    WHERE EXTRACT(YEAR FROM created_at) = v_year AND EXTRACT(MONTH FROM created_at) = v_month;

    INSERT INTO org_revenue_snapshots (year, month, total_sales_revenue, total_commission_revenue)
    VALUES (v_year, v_month, v_total_sales_rev, v_total_comm_rev)
    ON CONFLICT (year, month) DO UPDATE
    SET total_sales_revenue = EXCLUDED.total_sales_revenue,
        total_commission_revenue = EXCLUDED.total_commission_revenue;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

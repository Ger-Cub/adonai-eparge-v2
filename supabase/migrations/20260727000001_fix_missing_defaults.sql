-- Migration: Fix missing DEFAULT values on id columns
-- ROOT CAUSE:
--   In production, the clients table (and possibly savings_carnets) was created
--   without the DEFAULT gen_random_uuid() on the id column.
--   Insert fails with: null value in column "id" violates not-null constraint
--
-- FIX: Detect column type at runtime and set appropriate DEFAULT.

DO $$
DECLARE
    col_type TEXT;
BEGIN

    -- ── clients.id ──
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clients'
      AND column_name  = 'id';

    IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.clients ALTER COLUMN id SET DEFAULT gen_random_uuid()';
        RAISE NOTICE 'clients.id DEFAULT set to gen_random_uuid() [uuid]';
    ELSIF col_type IN ('character varying', 'text', 'character') THEN
        EXECUTE 'ALTER TABLE public.clients ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
        RAISE NOTICE 'clients.id DEFAULT set to gen_random_uuid()::text [varchar]';
    ELSE
        RAISE NOTICE 'clients.id type is: % — skipped', col_type;
    END IF;

    -- ── savings_carnets.id ──
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'savings_carnets'
      AND column_name  = 'id';

    IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.savings_carnets ALTER COLUMN id SET DEFAULT gen_random_uuid()';
        RAISE NOTICE 'savings_carnets.id DEFAULT set to gen_random_uuid() [uuid]';
    ELSIF col_type IN ('character varying', 'text', 'character') THEN
        EXECUTE 'ALTER TABLE public.savings_carnets ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
        RAISE NOTICE 'savings_carnets.id DEFAULT set to gen_random_uuid()::text [varchar]';
    ELSE
        RAISE NOTICE 'savings_carnets.id type is: % — skipped', col_type;
    END IF;

    -- ── carnet_deposits.id ──
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'carnet_deposits'
      AND column_name  = 'id';

    IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.carnet_deposits ALTER COLUMN id SET DEFAULT gen_random_uuid()';
        RAISE NOTICE 'carnet_deposits.id DEFAULT set [uuid]';
    ELSIF col_type IN ('character varying', 'text', 'character') THEN
        EXECUTE 'ALTER TABLE public.carnet_deposits ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
        RAISE NOTICE 'carnet_deposits.id DEFAULT set [varchar]';
    END IF;

    -- ── ledger.id ──
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ledger'
      AND column_name  = 'id';

    IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.ledger ALTER COLUMN id SET DEFAULT gen_random_uuid()';
        RAISE NOTICE 'ledger.id DEFAULT set [uuid]';
    ELSIF col_type IN ('character varying', 'text', 'character') THEN
        EXECUTE 'ALTER TABLE public.ledger ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
        RAISE NOTICE 'ledger.id DEFAULT set [varchar]';
    END IF;

    -- ── withdrawal_requests.id ──
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'withdrawal_requests'
      AND column_name  = 'id';

    IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.withdrawal_requests ALTER COLUMN id SET DEFAULT gen_random_uuid()';
        RAISE NOTICE 'withdrawal_requests.id DEFAULT set [uuid]';
    ELSIF col_type IN ('character varying', 'text', 'character') THEN
        EXECUTE 'ALTER TABLE public.withdrawal_requests ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
        RAISE NOTICE 'withdrawal_requests.id DEFAULT set [varchar]';
    END IF;

END;
$$;

import type { UserProfile, Client, SavingsCarnet, CarnetDeposit, WithdrawalRequest, LedgerEntry } from './types';

// Standard layout of Mock Users
export const MOCK_PROFILES: UserProfile[] = [
    {
        id: 'usr-superadmin-001',
        role: 'super_admin',
        full_name: 'Gérard Cubaka IT (Super Admin)',
        phone: '+243 991 1024 448',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'usr-admin-001',
        role: 'admin_principal',
        full_name: 'Moise Mweze (Admin Principal)',
        phone: '+243 998 765 432',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-superadmin-001',
    },
    {
        id: 'usr-supervisor-001',
        role: 'supervisor',
        full_name: 'Patient Kalalu (Superviseur Bukavu)',
        phone: '+243 905 111 222',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-admin-001',
    },
    {
        id: 'usr-supervisor-002',
        role: 'supervisor',
        full_name: 'Clara Mutombo (Superviseur Bukavu)',
        phone: '+243 899 333 444',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-admin-001',
    },
    {
        id: 'usr-agent-001',
        role: 'agent',
        full_name: 'Dieudonné Muguzi (Agent de terrain Kadutu)',
        phone: '+243 821 555 666',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-supervisor-001',
    },
    {
        id: 'usr-agent-002',
        role: 'agent',
        full_name: 'Sarah Furaha (Agent de terrain Ibanda)',
        phone: '+243 854 777 888',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-supervisor-001',
    },
    {
        id: 'usr-agent-003',
        role: 'agent',
        full_name: 'Michel Lopoko (Agent de terrain Bagira)',
        phone: '+243 888 999 000',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-supervisor-002',
    }
];

export const MOCK_SUPERVISORS = [
    { id: 'usr-supervisor-001', admin_id: 'usr-admin-001', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'usr-supervisor-002', admin_id: 'usr-admin-001', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() }
];

export const MOCK_TERRAIN_AGENTS = [
    { id: 'usr-agent-001', supervisor_id: 'usr-supervisor-001', created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'usr-agent-002', supervisor_id: 'usr-supervisor-001', created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'usr-agent-003', supervisor_id: 'usr-supervisor-002', created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
];

export const MOCK_CLIENTS: Client[] = [
    // Dieudonné's clients (Agent 001)
    {
        id: 'cli-001',
        name: 'Alphonse Mweze',
        phone: '+243 811 000 111',
        address: 'Av. de la Cathédrale, Bukavu',
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    {
        id: 'cli-002',
        name: 'Merveille Nabintu',
        phone: '+243 822 000 222',
        address: 'Q. Ndendere, Bukavu',
        created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    // Sarah's clients (Agent 002)
    {
        id: 'cli-003',
        name: 'Bahati Shamavu',
        phone: '+243 903 000 333',
        address: 'Q. Cahi, Bukavu',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-002',
        updated_by: 'usr-agent-002',
    },
    // Michel's clients (Agent 003)
    {
        id: 'cli-004',
        name: 'Lucien Bolamba',
        phone: '+243 844 000 444',
        address: 'Q. Matanda, Bukavu',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-003',
        updated_by: 'usr-agent-003',
    }
];

export const MOCK_CARNETS: SavingsCarnet[] = [
    // Alphonse Mweze - carnet active with 15 depôts
    {
        id: 'car-001',
        carnet_number: 'CB-1004-9844',
        client_id: 'cli-001',
        daily_mise: 1000, // FC
        agent_id: 'usr-agent-001',
        supervisor_id: 'usr-supervisor-001',
        status: 'active',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    // Merveille Nabintu - carnet locked with 31 depôts, ready to withdraw
    {
        id: 'car-002',
        carnet_number: 'CB-2311-4509',
        client_id: 'cli-002',
        daily_mise: 2000, // FC
        agent_id: 'usr-agent-001',
        supervisor_id: 'usr-supervisor-001',
        status: 'locked',
        created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    // Bahati Shamavu - newly created carnet, only 1 depot (first deposit)
    {
        id: 'car-003',
        carnet_number: 'CB-8898-1002',
        client_id: 'cli-003',
        daily_mise: 5000, // FC
        agent_id: 'usr-agent-002',
        supervisor_id: 'usr-supervisor-001',
        status: 'pending',
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // Created 10 hours ago (< 24h)
        updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-002',
        updated_by: 'usr-agent-002',
    },
    // Lucien Bolamba - archived/withdrawn carnet
    {
        id: 'car-004',
        carnet_number: 'CB-5601-2099',
        client_id: 'cli-004',
        daily_mise: 1000,
        agent_id: 'usr-agent-003',
        supervisor_id: 'usr-supervisor-002',
        status: 'archived',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-003',
        updated_by: 'usr-agent-003',
    }
];

export const MOCK_DEPOSITS: CarnetDeposit[] = [
    // Deposits for car-001 (Alphonse Mweze, daily_mise = 1000 FC)
    // Total deposited = 15,000 FC, total slots = 15
    {
        id: 'dep-001',
        carnet_id: 'car-001',
        amount: 1000,
        slots_count: 1,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    {
        id: 'dep-002',
        carnet_id: 'car-001',
        amount: 4000, // Multiple deposit (4 slots)
        slots_count: 4,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    {
        id: 'dep-003',
        carnet_id: 'car-001',
        amount: 10000, // Multiple deposit (10 slots)
        slots_count: 10,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },

    // Deposits for car-002 (Merveille Nabintu, daily_mise = 2000 FC)
    // Total slots: 31, total deposited = 62,000 FC (Locked status)
    {
        id: 'dep-004',
        carnet_id: 'car-002',
        amount: 2000, // First deposit
        slots_count: 1,
        created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    {
        id: 'dep-005',
        carnet_id: 'car-002',
        amount: 30000, // 15 slots
        slots_count: 15,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    {
        id: 'dep-006',
        carnet_id: 'car-002',
        amount: 30000, // 15 slots -> Total 31 slots
        slots_count: 15,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },

    // Deposits for car-003 (Bahati Shamavu, daily_mise = 5000 FC)
    // 1 deposit (first deposit)
    {
        id: 'dep-007',
        carnet_id: 'car-003',
        amount: 5000,
        slots_count: 1,
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-002',
        updated_by: 'usr-agent-002',
    },

    // Deposits for car-004 (Lucien Bolamba, daily_mise = 1000 FC, archived)
    // 31 slots = 31,000 FC deposited.
    {
        id: 'dep-008',
        carnet_id: 'car-004',
        amount: 1000, // First
        slots_count: 1,
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-003',
        updated_by: 'usr-agent-003',
    },
    {
        id: 'dep-009',
        carnet_id: 'car-004',
        amount: 30000, // 30 slots -> Total 31 slots
        slots_count: 30,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-003',
        updated_by: 'usr-agent-003',
    }
];

export const MOCK_REQUESTS: WithdrawalRequest[] = [
    // Request for Merveille Nabintu's locked carnet (car-002) - Pending
    // Total deposits = 62,000 FC. First deposit = 2000 FC. Net = 60,000 FC.
    {
        id: 'req-001',
        carnet_id: 'car-002',
        requested_amount: 60000,
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-001',
        updated_by: 'usr-agent-001',
    },
    // Request for Lucien Bolamba's carnet (car-004) - Approved
    // Total deposits = 31,000 FC. First deposit = 1000 FC. Net = 30,000 FC.
    {
        id: 'req-002',
        carnet_id: 'car-004',
        requested_amount: 30000,
        status: 'approved',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-agent-003',
        updated_by: 'usr-admin-001',
    }
];

export const MOCK_WITHDRAWALS = [
    {
        id: 'wth-001',
        request_id: 'req-002',
        carnet_id: 'car-004',
        paid_amount: 30000,
        fee_applied: 1000, // equal to daily_mise
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'usr-admin-001'
    }
];

export const MOCK_LEDGER: LedgerEntry[] = [
    // Carnet creation fees (500 FC)
    {
        id: 'led-001',
        carnet_id: 'car-001',
        agent_id: 'usr-agent-001',
        type: 'carnet_sale',
        amount: 500,
        description: 'Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro CB-1004-9844',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'led-002',
        carnet_id: 'car-002',
        agent_id: 'usr-agent-001',
        type: 'carnet_sale',
        amount: 500,
        description: 'Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro CB-2311-4509',
        created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'led-003',
        carnet_id: 'car-003',
        agent_id: 'usr-agent-002',
        type: 'carnet_sale',
        amount: 500,
        description: 'Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro CB-8898-1002',
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'led-004',
        carnet_id: 'car-004',
        agent_id: 'usr-agent-003',
        type: 'carnet_sale',
        amount: 500,
        description: 'Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro CB-5601-2099',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    },

    // Withdrawal divisions of car-004 (Lucien Bolamba, daily_mise = 1000 FC)
    // Split: 50% agent (500 FC), 50% organisation (500 FC)
    {
        id: 'led-005',
        carnet_id: 'car-004',
        agent_id: 'usr-agent-003',
        type: 'agent_gain',
        amount: 500,
        description: 'Commission agent de terrain (50%) - Carnet car-004',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'led-006',
        carnet_id: 'car-004',
        agent_id: undefined,
        type: 'org_gain',
        amount: 500,
        description: 'Commission organisation (50%) - Carnet car-004',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
];

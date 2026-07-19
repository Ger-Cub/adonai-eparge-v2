import { createClient } from '@supabase/supabase-js';
import type {
    UserProfile, Client, SavingsCarnet, CarnetDeposit,
    WithdrawalRequest, LedgerEntry, AgentMonthlyReward, OrgRevenueSnapshot
} from './types';
import {
    MOCK_PROFILES, MOCK_CLIENTS, MOCK_CARNETS,
    MOCK_DEPOSITS, MOCK_REQUESTS, MOCK_LEDGER,
    MOCK_SUPERVISORS, MOCK_TERRAIN_AGENTS, MOCK_WITHDRAWALS
} from './seedData';

// --- Supabase Client Setup ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const LOCAL_STORAGE_SEED_VERSION = '2026-07-01';

// --- LocalStorage Simulation Database ---
// Utilized if Supabase is not configured yet. Keeps the dashboard fully functional out-of-the-box.
class SimulatedDB {
    constructor() {
        this.ensureSeedDataVersion();
    }

    private ensureSeedDataVersion(): void {
        const storedVersion = localStorage.getItem('adonai_seed_version');
        if (storedVersion !== LOCAL_STORAGE_SEED_VERSION) {
            const keysToReset = [
                'user_profiles',
                'clients',
                'savings_carnets',
                'carnet_deposits',
                'withdrawal_requests',
                'ledger',
                'supervisors',
                'terrain_agents',
                'withdrawals'
            ];
            keysToReset.forEach(key => localStorage.removeItem(`adonai_${key}`));
            localStorage.setItem('adonai_seed_version', LOCAL_STORAGE_SEED_VERSION);
        }
    }

    private getStorage<T>(key: string, defaults: T[]): T[] {
        const data = localStorage.getItem(`adonai_${key}`);
        if (!data) {
            localStorage.setItem(`adonai_${key}`, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(data);
    }

    private setStorage<T>(key: string, value: T[]): void {
        localStorage.setItem(`adonai_${key}`, JSON.stringify(value));
    }

    // --- Auth Session ---
    getCurrentUser(): UserProfile {
        const session = localStorage.getItem('adonai_session');
        if (!session) {
            // Default to Super Admin for demo purposes if no user is signed in
            const defaultUser = MOCK_PROFILES[0];
            localStorage.setItem('adonai_session', JSON.stringify(defaultUser));
            return defaultUser;
        }
        return JSON.parse(session);
    }

    setCurrentUser(profile: UserProfile | null) {
        if (profile === null) {
            localStorage.removeItem('adonai_session');
        } else {
            localStorage.setItem('adonai_session', JSON.stringify(profile));
        }
    }

    // --- Core Lists ---
    getProfiles(): UserProfile[] {
        return this.getStorage<UserProfile>('user_profiles', MOCK_PROFILES);
    }

    getClients(): Client[] {
        return this.getStorage<Client>('clients', MOCK_CLIENTS);
    }

    getCarnets(): SavingsCarnet[] {
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const deposits = this.getDeposits();
        const clients = this.getClients();
        const profiles = this.getProfiles();

        // Map Join Data
        return carnets.map(car => {
            const client = clients.find(c => c.id === car.client_id);
            const agent = profiles.find(p => p.id === car.agent_id);
            const supervisor = profiles.find(p => p.id === car.supervisor_id);
            const carnetDeps = deposits.filter(d => d.carnet_id === car.id);

            const total_slots = carnetDeps.reduce((sum, d) => sum + d.slots_count, 0);
            const total_deposited = carnetDeps.reduce((sum, d) => sum + d.amount, 0);

            return {
                ...car,
                client_name: client ? client.name : 'Inconnu',
                client_phone: client ? client.phone : 'Inconnu',
                agent_name: agent ? agent.full_name : 'Inconnu',
                supervisor_name: supervisor ? supervisor.full_name : 'Inconnu',
                total_slots,
                total_deposited
            };
        });
    }

    getDeposits(): CarnetDeposit[] {
        const deposits = this.getStorage<CarnetDeposit>('carnet_deposits', MOCK_DEPOSITS);
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const clients = this.getClients();

        return deposits.map(dep => {
            const carnet = carnets.find(c => c.id === dep.carnet_id);
            const client = carnet ? clients.find(c => c.id === carnet.client_id) : null;

            return {
                ...dep,
                carnet_number: carnet ? carnet.carnet_number : 'Inconnu',
                client_name: client ? client.name : 'Inconnu'
            };
        });
    }

    getRequests(): WithdrawalRequest[] {
        const requests = this.getStorage<WithdrawalRequest>('withdrawal_requests', MOCK_REQUESTS);
        const carnets = this.getCarnets();
        const profiles = this.getProfiles();

        return requests.map(req => {
            const carnet = carnets.find(c => c.id === req.carnet_id);
            const agent = carnet ? profiles.find(p => p.id === carnet.agent_id) : null;

            return {
                ...req,
                carnet_number: carnet ? carnet.carnet_number : 'Inconnu',
                client_name: carnet ? carnet.client_name : 'Inconnu',
                daily_mise: carnet ? carnet.daily_mise : 0,
                agent_name: agent ? agent.full_name : 'Inconnu'
            };
        });
    }

    getLedger(): LedgerEntry[] {
        const ledger = this.getStorage<LedgerEntry>('ledger', MOCK_LEDGER);
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const profiles = this.getProfiles();

        return ledger.map(led => {
            const carnet = carnets.find(c => c.id === led.carnet_id);
            const agent = led.agent_id ? profiles.find(p => p.id === led.agent_id) : null;

            return {
                ...led,
                carnet_number: carnet ? carnet.carnet_number : 'Inconnu',
                agent_name: agent ? agent.full_name : undefined
            };
        });
    }

    // --- Transactions / Triggers Enforced in JS ---

    // 1. Create a User Profile (hierarchy limits checked in UI)
    createProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>, supervisorOrAdminId?: string): UserProfile {
        const profiles = this.getProfiles();
        const newId = `usr-${profile.role}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newProfile: UserProfile = {
            ...profile,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        profiles.push(newProfile);
        this.setStorage('user_profiles', profiles);

        // Save mapping depending on role
        if (profile.role === 'supervisor' && supervisorOrAdminId) {
            const mappings = this.getStorage<any>('supervisors', MOCK_SUPERVISORS);
            mappings.push({ id: newId, admin_id: supervisorOrAdminId, created_at: new Date().toISOString() });
            this.setStorage('supervisors', mappings);
        } else if (profile.role === 'agent' && supervisorOrAdminId) {
            const mappings = this.getStorage<any>('terrain_agents', MOCK_TERRAIN_AGENTS);
            mappings.push({ id: newId, supervisor_id: supervisorOrAdminId, created_at: new Date().toISOString() });
            this.setStorage('terrain_agents', mappings);
        }

        return newProfile;
    }

    deleteProfile(id: string): void {
        const profiles = this.getProfiles().filter(p => p.id !== id);
        this.setStorage('user_profiles', profiles);
    }

    // 2. Create Client
    createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
        const clients = this.getClients();
        const newClient: Client = {
            ...client,
            id: `cli-${Math.floor(1000 + Math.random() * 9000)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        clients.push(newClient);
        this.setStorage('clients', clients);
        return newClient;
    }

    // 3. Create Savings Carnet (First Deposit compulsory)
    createCarnet(carnet: Omit<SavingsCarnet, 'id' | 'carnet_number' | 'supervisor_id' | 'status' | 'created_at' | 'updated_at'>, firstDepositAmount: number): SavingsCarnet {
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const agents = this.getStorage<any>('terrain_agents', MOCK_TERRAIN_AGENTS);

        // Automatically set supervisor_id of this agent
        const mapping = agents.find((a: any) => a.id === carnet.agent_id);
        const supervisorId = mapping ? mapping.supervisor_id : 'usr-supervisor-001';

        // Generate CB-XXXX-YYYY number
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const carnetNumber = `CB-${p1}-${p2}`;

        const newId = `car-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCarnet: SavingsCarnet = {
            ...carnet,
            id: newId,
            carnet_number: carnetNumber,
            supervisor_id: supervisorId,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // First deposit validation (amount = daily_mise * k)
        const k = firstDepositAmount / carnet.daily_mise;
        if (k !== Math.floor(k) || k <= 0) {
            throw new Error(`Le premier dépôt (${firstDepositAmount} FC) doit être un multiple de la mise journalière (${carnet.daily_mise} FC).`);
        }

        // Insert carnet
        carnets.push(newCarnet);
        this.setStorage('savings_carnets', carnets);

        // Enter first deposit
        const deposits = this.getStorage<CarnetDeposit>('carnet_deposits', MOCK_DEPOSITS);
        const firstDeposit: CarnetDeposit = {
            id: `dep-${Math.floor(10000 + Math.random() * 90000)}`,
            carnet_id: newId,
            amount: firstDepositAmount,
            slots_count: k,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: carnet.agent_id,
            updated_by: carnet.agent_id
        };
        deposits.push(firstDeposit);
        this.setStorage('carnet_deposits', deposits);

        // Ledger Entry (500 FC fixed fee)
        const ledger = this.getStorage<LedgerEntry>('ledger', MOCK_LEDGER);
        ledger.push({
            id: `led-${Math.floor(10000 + Math.random() * 90000)}`,
            carnet_id: newId,
            agent_id: carnet.agent_id,
            type: 'carnet_sale',
            amount: 500,
            description: `Frais de vente de carnet (Fixe 500 FC) - Carnet Numéro ${carnetNumber}`,
            created_at: new Date().toISOString()
        });

        // Split commission immediately on carnet creation (first client registered)
        const commissionAmount = carnet.daily_mise;
        const agentPart = commissionAmount * 0.5;
        const orgPart = commissionAmount * 0.5;

        // Save Agent Gain immediately
        ledger.push({
            id: `led-${Math.floor(10000 + Math.random() * 90000)}`,
            carnet_id: newId,
            agent_id: carnet.agent_id,
            type: 'agent_gain',
            amount: agentPart,
            description: `Commission agent de terrain (50%) - Carnet ${carnetNumber}`,
            created_at: new Date().toISOString()
        });

        // Save Organisation Gain immediately
        ledger.push({
            id: `led-${Math.floor(10000 + Math.random() * 90000)}`,
            carnet_id: newId,
            agent_id: undefined,
            type: 'org_gain',
            amount: orgPart,
            description: `Commission organisation (50%) - Carnet ${carnetNumber}`,
            created_at: new Date().toISOString()
        });

        this.setStorage('ledger', ledger);

        // Check if first deposit filled all slots (k===31) -> auto lock
        if (k === 31) {
            newCarnet.status = 'locked';
            this.setStorage('savings_carnets', carnets);
        } else {
            // Auto-validate for demo
            newCarnet.status = 'active';
            this.setStorage('savings_carnets', carnets);
        }

        return newCarnet;
    }

    // 4. Update Savings Carnet (Restricted status or 24-hr check)
    updateCarnetDailyMise(carnetId: string, newMise: number, userId: string): void {
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const idx = carnets.findIndex(c => c.id === carnetId);

        if (idx === -1) throw new Error('Carnet introuvable.');

        const carnet = carnets[idx];

        // Check 24 hour limit in JS
        const createdTime = new Date(carnet.created_at).getTime();
        const nowTime = Date.now();
        if (nowTime - createdTime > 24 * 60 * 60 * 1000) {
            throw new Error('Les détails opérationnels du carnet ne peuvent plus être modifiés après 24 heures.');
        }

        // Get all deposits for this carnet to check the new total slots
        const deposits = this.getStorage<CarnetDeposit>('carnet_deposits', MOCK_DEPOSITS);
        const carnetDeps = deposits.filter(d => d.carnet_id === carnetId);
        
        let newSlotsTotal = 0;
        carnetDeps.forEach(d => {
            newSlotsTotal += d.amount / newMise;
        });

        if (newSlotsTotal > 31) {
            throw new Error(`La modification est refusée car le montant cumulé de ${(carnet.total_deposited || 0).toLocaleString()} FC équivaudrait à ${newSlotsTotal.toFixed(1)} dépôts, ce qui dépasse la limite maximale de 31 dépôts autorisés.`);
        }

        carnet.daily_mise = newMise;
        carnet.updated_at = new Date().toISOString();
        carnet.updated_by = userId;

        // Auto-Lock or Unlock based on the new slots total
        if (newSlotsTotal === 31) {
            carnet.status = 'locked';
        } else if (carnet.status === 'locked' && newSlotsTotal < 31) {
            carnet.status = 'active';
        }

        this.setStorage('savings_carnets', carnets);

        // Update slots_count of all deposits belonging to this carnet
        const updatedDeposits = deposits.map(d => {
            if (d.carnet_id === carnetId) {
                return {
                    ...d,
                    slots_count: d.amount / newMise,
                    updated_at: new Date().toISOString()
                };
            }
            return d;
        });
        this.setStorage('carnet_deposits', updatedDeposits);
    }

    updateCarnetStatus(carnetId: string, status: 'active' | 'rejected' | 'locked' | 'archived', userId: string): void {
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const idx = carnets.findIndex(c => c.id === carnetId);

        if (idx === -1) throw new Error('Carnet introuvable.');

        carnets[idx].status = status;
        carnets[idx].updated_at = new Date().toISOString();
        carnets[idx].updated_by = userId;

        this.setStorage('savings_carnets', carnets);
    }

    // 5. Add Deposit
    addDeposit(deposit: Omit<CarnetDeposit, 'id' | 'slots_count' | 'created_at' | 'updated_at'>): CarnetDeposit {
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const carnetIdx = carnets.findIndex(c => c.id === deposit.carnet_id);

        if (carnetIdx === -1) throw new Error('Carnet introuvable.');

        const carnet = carnets[carnetIdx];

        // Trigger check: verify status
        if (carnet.status === 'locked') throw new Error('Dépôt refusé : le carnet est verrouillé.');
        if (carnet.status === 'archived') throw new Error('Dépôt refusé : le carnet est archivé.');
        if (carnet.status === 'rejected') throw new Error('Dépôt refusé : le carnet a été rejeté.');

        // Trigger check: multiple of daily_mise
        const k = deposit.amount / carnet.daily_mise;
        if (k !== Math.floor(k) || k <= 0) {
            throw new Error(`Le montant du dépôt (${deposit.amount} FC) doit être un multiple exact de la mise journalière (${carnet.daily_mise} FC).`);
        }

        // Trigger check: capacity check (max 31 slots)
        const deposits = this.getStorage<CarnetDeposit>('carnet_deposits', MOCK_DEPOSITS);
        const currentSlots = deposits
            .filter(d => d.carnet_id === deposit.carnet_id)
            .reduce((sum, d) => sum + d.slots_count, 0);

        const newSlotsTotal = currentSlots + k;

        if (newSlotsTotal > 31) {
            throw new Error(`Le dépôt excède la capacité maximale du carnet. Emplacements disponibles restants : ${31 - currentSlots}`);
        }

        const newDeposit: CarnetDeposit = {
            ...deposit,
            id: `dep-${Math.floor(10000 + Math.random() * 90000)}`,
            slots_count: k,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        deposits.push(newDeposit);
        this.setStorage('carnet_deposits', deposits);

        // Auto-Lock if slots count = 31
        if (newSlotsTotal === 31) {
            carnet.status = 'locked';
            carnet.updated_at = new Date().toISOString();
            this.setStorage('savings_carnets', carnets);
        }

        return newDeposit;
    }

    // Undo / Cancel Deposit
    deleteDeposit(depositId: string): void {
        const deposits = this.getStorage<CarnetDeposit>('carnet_deposits', MOCK_DEPOSITS);
        const depIdx = deposits.findIndex(d => d.id === depositId);
        if (depIdx === -1) return;

        const deposit = deposits[depIdx];
        const carnetId = deposit.carnet_id;

        // Remove the deposit
        const updatedDeposits = deposits.filter(d => d.id !== depositId);
        this.setStorage('carnet_deposits', updatedDeposits);

        // If the carnet was locked because of this deposit, change status back to active
        const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
        const carnetIdx = carnets.findIndex(c => c.id === carnetId);
        if (carnetIdx !== -1) {
            const carnet = carnets[carnetIdx];
            if (carnet.status === 'locked') {
                const currentSlots = updatedDeposits
                    .filter(d => d.carnet_id === carnetId)
                    .reduce((sum, d) => sum + d.slots_count, 0);
                if (currentSlots < 31) {
                    carnet.status = 'active';
                    carnet.updated_at = new Date().toISOString();
                    this.setStorage('savings_carnets', carnets);
                }
            }
        }
    }

    // 6. Withdrawal Request
    createRequest(request: Omit<WithdrawalRequest, 'id' | 'status' | 'created_at' | 'updated_at'>): WithdrawalRequest {
        const carnets = this.getCarnets();
        const carnet = carnets.find(c => c.id === request.carnet_id);

        if (!carnet) throw new Error('Carnet introuvable.');

        // Allow if locked, or if active with at least 2 deposits (slots)
        const totalSlots = carnet.total_slots || 0;
        if (carnet.status !== 'locked' && !(carnet.status === 'active' && totalSlots >= 2)) {
            throw new Error('Une demande de retrait ne peut être soumise que sur un carnet verrouillé ou un carnet actif contenant au moins 2 dépôts.');
        }

        // Verify expected amount
        // Montant retirable = Total des Dépôts - Premier Dépôt (which corresponds to daily_mise * 30 slots)
        const expected = (carnet.total_deposited || 0) - carnet.daily_mise;
        if (request.requested_amount !== expected) {
            throw new Error(`Le montant demandé est incorrect. Le montant retirable après déduction du premier dépôt est de ${expected} FC.`);
        }

        const requests = this.getStorage<WithdrawalRequest>('withdrawal_requests', MOCK_REQUESTS);
        const newRequest: WithdrawalRequest = {
            ...request,
            id: `req-${Math.floor(10000 + Math.random() * 90000)}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        requests.push(newRequest);
        this.setStorage('withdrawal_requests', requests);
        return newRequest;
    }

    // 7. Approve / Reject Request
    reviewRequest(requestId: string, status: 'approved' | 'rejected', validatorId: string, reason?: string): void {
        const requests = this.getStorage<WithdrawalRequest>('withdrawal_requests', MOCK_REQUESTS);
        const reqIdx = requests.findIndex(r => r.id === requestId);

        if (reqIdx === -1) throw new Error('Demande introuvable.');
        const req = requests[reqIdx];

        if (req.status !== 'pending') throw new Error('Cette demande a déjà été traitée.');

        req.status = status;
        req.rejection_reason = reason;
        req.updated_at = new Date().toISOString();
        req.updated_by = validatorId;

        this.setStorage('withdrawal_requests', requests);

        // If approved, complete the transaction triggers in JS
        if (status === 'approved') {
            const carnets = this.getStorage<SavingsCarnet>('savings_carnets', MOCK_CARNETS);
            const carnetIdx = carnets.findIndex(c => c.id === req.carnet_id);

            if (carnetIdx !== -1) {
                const carnet = carnets[carnetIdx];
                carnet.status = 'archived';
                carnet.updated_at = new Date().toISOString();
                carnet.updated_by = validatorId;
                this.setStorage('savings_carnets', carnets);

                // Add to withdrawals log
                const withdrawals = this.getStorage<any>('withdrawals', MOCK_WITHDRAWALS);
                withdrawals.push({
                    id: `wth-${Math.floor(10000 + Math.random() * 90000)}`,
                    request_id: requestId,
                    carnet_id: carnet.id,
                    paid_amount: req.requested_amount,
                    fee_applied: carnet.daily_mise,
                    created_at: new Date().toISOString(),
                    created_by: validatorId
                });
                this.setStorage('withdrawals', withdrawals);
            }
        }
    }

    cancelRequest(requestId: string): void {
        const requests = this.getStorage<WithdrawalRequest>('withdrawal_requests', MOCK_REQUESTS);
        const req = requests.find(r => r.id === requestId);
        if (!req) throw new Error('Demande introuvable.');
        if (req.status !== 'pending') {
            throw new Error('Seules les demandes de retrait en cours peuvent être annulées.');
        }
        const updatedRequests = requests.filter(r => r.id !== requestId);
        this.setStorage('withdrawal_requests', updatedRequests);
    }

    // Calculate Monthly Evaluation Report
    getMonthlySnapshots(): OrgRevenueSnapshot[] {
        const ledger = this.getLedger();
        const data: { [key: string]: { sales: number; commission: number } } = {};

        ledger.forEach(entry => {
            const date = new Date(entry.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!data[key]) {
                data[key] = { sales: 0, commission: 0 };
            }

            if (entry.type === 'carnet_sale') {
                data[key].sales += entry.amount;
            } else if (entry.type === 'org_gain') {
                data[key].commission += entry.amount;
            }
        });

        return Object.entries(data).map(([key, val]) => {
            const [year, month] = key.split('-');
            return {
                id: `snap-${year}-${month}`,
                year: parseInt(year),
                month: parseInt(month),
                total_sales_revenue: val.sales,
                total_commission_revenue: val.commission,
                created_at: new Date().toISOString()
            };
        });
    }

    getAgentMonthlyRewards(): AgentMonthlyReward[] {
        const ledger = this.getLedger();
        const profiles = this.getProfiles();
        const data: { [key: string]: { sales: number; commission: number } } = {};

        ledger.forEach(entry => {
            if (!entry.agent_id) return;
            const date = new Date(entry.created_at);
            const key = `${entry.agent_id}_${date.getFullYear()}_${date.getMonth() + 1}`;
            if (!data[key]) {
                data[key] = { sales: 0, commission: 0 };
            }

            if (entry.type === 'carnet_sale') {
                data[key].sales += entry.amount;
            } else if (entry.type === 'agent_gain') {
                data[key].commission += entry.amount;
            }
        });

        return Object.entries(data).map(([key, val]) => {
            const [agent_id, yearStr, monthStr] = key.split('_');
            const agent = profiles.find(p => p.id === agent_id);
            return {
                id: `rew-${agent_id}-${yearStr}-${monthStr}`,
                agent_id,
                year: parseInt(yearStr),
                month: parseInt(monthStr),
                total_sales_fee: val.sales,
                total_commission: val.commission,
                created_at: new Date().toISOString(),
                agent_name: agent ? agent.full_name : 'Agent de terrain'
            };
        });
    }
}

export const dbSimulated = new SimulatedDB();

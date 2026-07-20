export type UserRole = 'super_admin' | 'admin_principal' | 'supervisor' | 'agent';
export type CarnetStatus = 'pending' | 'active' | 'rejected' | 'locked' | 'archived';
export type LedgerEntryType = 'carnet_sale' | 'agent_gain' | 'org_gain';
export type WithdrawalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
    id: string;
    role: UserRole;
    full_name: string;
    phone: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

export interface SupervisorMapping {
    id: string; // supervisor id
    admin_id: string;
    created_at: string;
}

export interface AgentMapping {
    id: string; // agent id
    supervisor_id: string;
    created_at: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    address: string;
    photo?: string; // Base64 client photo
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}

export interface SavingsCarnet {
    id: string;
    carnet_number: string;
    client_id: string;
    daily_mise: number;
    agent_id: string;
    supervisor_id: string;
    status: CarnetStatus;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    // Join fields for UI helper
    client_name?: string;
    client_phone?: string;
    agent_name?: string;
    supervisor_name?: string;
    total_slots?: number;
    total_deposited?: number;
}

export interface CarnetDeposit {
    id: string;
    carnet_id: string;
    amount: number;
    slots_count: number;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    // Join fields
    carnet_number?: string;
    client_name?: string;
}

export interface WithdrawalRequest {
    id: string;
    carnet_id: string;
    requested_amount: number;
    status: WithdrawalRequestStatus;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    // Join fields
    carnet_number?: string;
    client_name?: string;
    daily_mise?: number;
    agent_name?: string;
}

export interface Withdrawal {
    id: string;
    request_id: string;
    carnet_id: string;
    paid_amount: number;
    fee_applied: number;
    created_at: string;
    created_by: string;
}

export interface LedgerEntry {
    id: string;
    carnet_id?: string;
    agent_id?: string;
    type: LedgerEntryType;
    amount: number;
    description: string;
    created_at: string;
    // Join helper
    carnet_number?: string;
    agent_name?: string;
}

export interface AgentMonthlyReward {
    id: string;
    agent_id: string;
    year: number;
    month: number;
    total_sales_fee: number;
    total_commission: number;
    created_at: string;
    agent_name?: string;
}

export interface OrgRevenueSnapshot {
    id: string;
    year: number;
    month: number;
    total_sales_revenue: number;
    total_commission_revenue: number;
    created_at: string;
}

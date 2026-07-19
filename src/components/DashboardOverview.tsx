import React from 'react';
import type { SavingsCarnet, UserProfile, LedgerEntry, CarnetDeposit } from '../lib/types';
import {
    FolderCheck, Lock, Archive,
    TrendingUp, Award, CalendarDays
} from 'lucide-react';

interface StatsProps {
    carnets: SavingsCarnet[];
    ledger: LedgerEntry[];
    currentUser: UserProfile;
    deposits?: CarnetDeposit[];
}

export const DashboardOverview: React.FC<StatsProps> = ({ 
    carnets, 
    ledger, 
    currentUser,
    deposits = []
}) => {
    // Terminology translations:
    // "Carnets Verrouillés" -> "Carnets remplis"
    // "Carnets archivés" -> "Carnets vidés (retrait)"
    const activeCarnets = carnets.filter(c => c.status === 'active' || c.status === 'pending');
    const lockedCarnets = carnets.filter(c => c.status === 'locked');
    const archivedCarnets = carnets.filter(c => c.status === 'archived');

    // Calculate daily collected amount (made today)
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyCollected = deposits
        .filter(d => {
            // Check if deposit date matches today's date
            const matchesDate = d.created_at && d.created_at.startsWith(todayStr);
            // If agent role, only show their own collections. Others show aggregate.
            const matchesAgent = currentUser.role !== 'agent' || d.created_by === currentUser.id;
            return matchesDate && matchesAgent;
        })
        .reduce((sum, d) => sum + d.amount, 0);

    // Vente de carnets (500 FC per carnet)
    const salesRevenue = ledger
        .filter(l => l.type === 'carnet_sale')
        .reduce((sum, l) => sum + l.amount, 0);

    // Agent Commissions (Calculated immediately on registration of first client/carnet)
    const agentCommissions = ledger
        .filter(l => l.type === 'agent_gain' && (currentUser.role !== 'agent' || l.agent_id === currentUser.id))
        .reduce((sum, l) => sum + l.amount, 0);

    // Org Revenues (Commission on 1st deposit + carnet sales)
    const orgCommission = ledger
        .filter(l => l.type === 'org_gain')
        .reduce((sum, l) => sum + l.amount, 0);

    const totalOrgRevenue = salesRevenue + orgCommission;

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Carnets Actifs</span>
                        <span className="stat-value">{activeCarnets.length}</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-color)' }}>
                        <FolderCheck />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        {/* Renamed term: "Carnets Verrouillés" -> "Carnets remplis" */}
                        <span className="stat-label">Carnets Remplis</span>
                        <span className="stat-value">{lockedCarnets.length}</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--locked-bg)', color: 'var(--locked-color)' }}>
                        <Lock />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        {/* Renamed term: "Carnets archivés" -> "Carnets vidés (retrait)" */}
                        <span className="stat-label">Carnets Vidés (Retrait)</span>
                        <span className="stat-value">{archivedCarnets.length}</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--archived-bg)', color: 'var(--archived-color)' }}>
                        <Archive />
                    </div>
                </div>

                {/* Changed metric: "Total Collecté" -> "Montant journalier collecté" */}
                <div className="stat-card" style={{ borderBottom: '3px solid var(--primary)' }}>
                    <div className="stat-info">
                        <span className="stat-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>Montant Journalier Collecté</span>
                        <span className="stat-value">{dailyCollected.toLocaleString()} FC</span>
                        <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                            {currentUser.role === 'agent' 
                                ? "Vos versements enregistrés aujourd'hui." 
                                : "Versements de tous les agents aujourd'hui."}
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <CalendarDays />
                    </div>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {/* Agent Commissions (Visible to agents, supervisors or administrators) */}
                {(currentUser.role === 'agent' || currentUser.role === 'super_admin' || currentUser.role === 'admin_principal' || currentUser.role === 'supervisor') && (
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                        <div className="stat-info">
                            <span className="stat-label">
                                {currentUser.role === 'agent' ? 'Mes Commissions Acquises' : 'Commissions Agents (Cumulé)'}
                            </span>
                            <span className="stat-value" style={{ color: 'var(--secondary)' }}>
                                {agentCommissions.toLocaleString()} FC
                            </span>
                            <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                                Commissions (50% de la mise) acquises immédiatement dès l'enregistrement du premier dépôt.
                            </span>
                        </div>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: 'var(--secondary)' }}>
                            <Award />
                        </div>
                    </div>
                )}

                {/* Organisation Revenues (Only visible to admin and super admin, and supervisor) */}
                {(currentUser.role === 'super_admin' || currentUser.role === 'admin_principal' || currentUser.role === 'supervisor') && (
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <div className="stat-info">
                            <span className="stat-label">Revenus Organisation</span>
                            <span className="stat-value" style={{ color: 'var(--primary)' }}>
                                {totalOrgRevenue.toLocaleString()} FC
                            </span>
                            <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                                Frais fixes (500 FC/carnet : {salesRevenue.toLocaleString()} FC) + Commissions d'ouverture (50% : {orgCommission.toLocaleString()} FC).
                            </span>
                        </div>
                        <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <TrendingUp />
                        </div>
                    </div>
                )}
            </div>

            <div className="panel" style={{ marginTop: '24px' }}>
                <div className="panel-header">
                    <h3 className="panel-title">Règles Métiers et Formules</h3>
                </div>
                <div className="panel-body" style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-medium)' }}>
                    <p style={{ marginBottom: '10px' }}>
                        💼 <strong>Frais d'Adhésion :</strong> Chaque carnet facturé <strong>500 FC</strong> fixe. Enregistré immédiatement dans le grand livre.
                    </p>
                    <p style={{ marginBottom: '10px' }}>
                        📅 <strong>Premier Dépôt Obligatoire :</strong> Aucun carnet ne peut être créé sans enregistrer le premier dépôt sur-le-champ.
                    </p>
                    <p style={{ marginBottom: '10px' }}>
                        🔒 <strong>Dépôts de Capacité :</strong> Le montant de chaque versement doit respecter exactitude de <code>Montant = daily_mise × k</code>. Le carnet est complet à <strong>31 slots (dépôts)</strong>.
                    </p>
                    <p style={{ marginBottom: '10px' }}>
                        💸 <strong>Montant Disponible au Retrait :</strong> Égal à <code>Somme des dépôts - Premier Dépôt</code>. Le premier dépôt est retenu comme frais opérationnels à la clôture.
                    </p>
                    <p>
                        ⚖️ <strong>Calcul des Récompenses :</strong> Le premier dépôt est redistribué à <strong>50% pour l'Agent de terrain</strong> (commission directe acquise immédiatement à la création) et <strong>50% pour l'Organisation</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
};

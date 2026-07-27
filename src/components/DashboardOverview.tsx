import React from 'react';
import type { SavingsCarnet, UserProfile, LedgerEntry, CarnetDeposit, Client, UserRole } from '../lib/types';
import {
    FolderCheck, Lock, Archive,
    TrendingUp, Award, CalendarDays, Users, UserCheck
} from 'lucide-react';

interface StatsProps {
    carnets: SavingsCarnet[];
    ledger: LedgerEntry[];
    currentUser: UserProfile;
    deposits?: CarnetDeposit[];
    profiles?: UserProfile[];
    clients?: Client[];
}

export const DashboardOverview: React.FC<StatsProps> = ({ 
    carnets, 
    ledger, 
    currentUser,
    deposits = [],
    profiles = [],
    clients = []
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

    // Filter lower hierarchy subordinates to display on higher hierarchy user dashboards
    const getSubordinateProfiles = (): UserProfile[] => {
        if (currentUser.role === 'super_admin') {
            return profiles.filter(p => p.id !== currentUser.id && p.role !== 'super_admin');
        } else if (currentUser.role === 'admin_principal') {
            return profiles.filter(p => p.id !== currentUser.id && (p.role === 'supervisor' || p.role === 'agent'));
        } else if (currentUser.role === 'supervisor') {
            return profiles.filter(p => p.id !== currentUser.id && p.role === 'agent' && (
                p.created_by === currentUser.id || 
                (currentUser.readable_id && p.created_by === currentUser.readable_id) ||
                carnets.some(c => c.supervisor_id === currentUser.id && c.agent_id === p.id)
            ));
        }
        return [];
    };

    const subordinates = getSubordinateProfiles();

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case 'super_admin': return 'Super Admin';
            case 'admin_principal': return 'Admin Principal';
            case 'supervisor': return 'Superviseur';
            case 'agent': return 'Agent de Terrain';
        }
    };

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

            {/* ── Table des Utilisateurs de Hiérarchie Inférieure (Visuelle pour Superviseur et Admin) ── */}
            {currentUser.role !== 'agent' && (
                <div className="panel" style={{ marginTop: '24px' }}>
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} style={{ color: 'var(--primary)' }} />
                            {currentUser.role === 'supervisor' ? "Agents sous votre Supervision" : "Équipe & Subordonnés Hiérarchiques"}
                        </h3>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '12px' }}>
                            {subordinates.length} membre{subordinates.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                        {subordinates.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
                                Aucun utilisateur de hiérarchie inférieure trouvé.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="responsive-table">
                                    <thead>
                                        <tr>
                                            <th>Membre</th>
                                            <th>Rôle</th>
                                            <th>Téléphone</th>
                                            <th>Clients Créés</th>
                                            <th>Carnets Gérés</th>
                                            <th>Collecte Totale</th>
                                            <th>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subordinates.map(sub => {
                                            const subClients = clients.filter(c => c.created_by === sub.id || (sub.readable_id && c.created_by === sub.readable_id));
                                            const subCarnets = carnets.filter(c => c.agent_id === sub.id || c.supervisor_id === sub.id || c.created_by === sub.id);
                                            const subDeposits = deposits.filter(d => d.created_by === sub.id || subCarnets.some(c => c.id === d.carnet_id));
                                            const totalCollected = subDeposits.reduce((sum, d) => sum + d.amount, 0);

                                            return (
                                                <tr key={sub.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', margin: 0, backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                                                                {sub.full_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{sub.full_name}</div>
                                                                <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>{sub.readable_id || sub.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${sub.role === 'admin_principal' ? 'badge-primary' : sub.role === 'supervisor' ? 'badge-locked' : 'badge-active'}`}>
                                                            {getRoleLabel(sub.role)}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '13px' }}>{sub.phone || 'N/A'}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{subClients.length}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{subCarnets.length}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--success-color)' }}>{totalCollected.toLocaleString()} FC</td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#047857', fontWeight: 600, backgroundColor: 'var(--success-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                                                            <UserCheck size={12} /> Actif
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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


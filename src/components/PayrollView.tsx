import React, { useState, useMemo } from 'react';
import type { LedgerEntry, UserProfile, AgentPayout } from '../lib/types';
import { Banknote, Printer, CheckCircle, AlertCircle, CreditCard, Calendar } from 'lucide-react';

interface PayrollViewProps {
    ledger: LedgerEntry[];
    profiles: UserProfile[];
    payouts: AgentPayout[];
    currentUser: UserProfile;
    onPayAgent: (agentId: string, amount: number) => Promise<void>;
}

interface AgentPayrollRow {
    agent_id: string;
    agent_name: string;
    total_earned: number;     // all-time agent_gain from ledger
    total_paid: number;       // sum of past payouts
    balance: number;          // pending to pay
    carnets_count: number;    // nb of commissions earned
}

export const PayrollView: React.FC<PayrollViewProps> = ({
    ledger,
    profiles,
    payouts,
    currentUser,
    onPayAgent,
}) => {
    const [paying, setPaying] = useState<string | null>(null);
    const [printingAgent, setPrintingAgent] = useState<AgentPayrollRow | null>(null);
    const [confirmAgent, setConfirmAgent] = useState<AgentPayrollRow | null>(null);

    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin_principal';

    // Build payroll rows per agent
    const agentRows = useMemo<AgentPayrollRow[]>(() => {
        // All agents from profiles
        const agents = profiles.filter(p => p.role === 'agent');

        return agents.map(agent => {
            // Sum all agent_gain entries for this agent
            const earned = ledger
                .filter(l => l.type === 'agent_gain' && l.agent_id === agent.id)
                .reduce((sum, l) => sum + l.amount, 0);

            // Sum all previous payouts for this agent
            const paid = payouts
                .filter(p => p.agent_id === agent.id)
                .reduce((sum, p) => sum + p.amount, 0);

            // Count distinct carnet commissions
            const carnetIds = new Set(
                ledger
                    .filter(l => l.type === 'agent_gain' && l.agent_id === agent.id && l.carnet_id)
                    .map(l => l.carnet_id)
            );

            return {
                agent_id: agent.id,
                agent_name: agent.full_name,
                total_earned: earned,
                total_paid: paid,
                balance: Math.max(0, earned - paid),
                carnets_count: carnetIds.size,
            };
        }).sort((a, b) => b.balance - a.balance);
    }, [ledger, profiles, payouts]);

    const totalPending = agentRows.reduce((sum, r) => sum + r.balance, 0);
    const totalPaid = agentRows.reduce((sum, r) => sum + r.total_paid, 0);

    const handlePayClick = (row: AgentPayrollRow) => {
        if (row.balance <= 0) return;
        setConfirmAgent(row);
    };

    const handleConfirmPay = async () => {
        if (!confirmAgent) return;
        setPaying(confirmAgent.agent_id);
        try {
            await onPayAgent(confirmAgent.agent_id, confirmAgent.balance);
            // After paying, trigger print of payslip
            setPrintingAgent({ ...confirmAgent });
            setConfirmAgent(null);
            setTimeout(() => {
                window.print();
                setPrintingAgent(null);
            }, 300);
        } catch {
            // error handled by parent
        } finally {
            setPaying(null);
        }
    };

    const handlePrintSlip = (row: AgentPayrollRow) => {
        setPrintingAgent(row);
        setTimeout(() => {
            window.print();
            setPrintingAgent(null);
        }, 300);
    };

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (!isAdmin) {
        return (
            <div className="panel" style={{ textAlign: 'center', padding: '48px' }}>
                <AlertCircle size={40} style={{ color: 'var(--pending-color)', margin: '0 auto 16px' }} />
                <h3>Accès restreint</h3>
                <p style={{ color: 'var(--text-medium)', marginTop: '8px' }}>
                    La gestion de la paie est réservée aux administrateurs.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* ── Print Area (hidden until print triggered) ── */}
            {printingAgent && (
                <div id="payslip-print-area" className="print-only" style={{ display: 'none' }}>
                    <div style={{
                        maxWidth: '680px',
                        margin: '0 auto',
                        fontFamily: 'Arial, sans-serif',
                        border: '2px solid #0f172a',
                        padding: '40px',
                        borderRadius: '8px'
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '22px', margin: 0, color: '#0f172a' }}>Association Adonaï — Service Épargne</h1>
                            <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>FICHE DE PAIE JOURNALIÈRE</p>
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{today}</p>
                        </div>

                        {/* Agent Info */}
                        <div style={{ marginBottom: '28px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '6px 0', fontWeight: 'bold', width: '40%', color: '#475569', fontSize: '13px' }}>Bénéficiaire :</td>
                                        <td style={{ padding: '6px 0', fontSize: '14px', fontWeight: '700' }}>{printingAgent.agent_name}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '6px 0', fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>Rôle :</td>
                                        <td style={{ padding: '6px 0', fontSize: '13px' }}>Agent de Terrain</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '6px 0', fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>Date de paiement :</td>
                                        <td style={{ padding: '6px 0', fontSize: '13px' }}>{today}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '6px 0', fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>Payé par :</td>
                                        <td style={{ padding: '6px 0', fontSize: '13px' }}>{currentUser.full_name}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Commission Details */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                Détail des Rémunérations
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', border: '1px solid #e2e8f0' }}>Rubrique</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: '600', border: '1px solid #e2e8f0' }}>Montant (FC)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                                            Commissions carnets ({printingAgent.carnets_count} carnet{printingAgent.carnets_count > 1 ? 's' : ''} @ 50% de la mise)
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                                            {printingAgent.total_earned.toLocaleString('fr-FR')} FC
                                        </td>
                                    </tr>
                                    <tr style={{ backgroundColor: '#fef2f2' }}>
                                        <td style={{ padding: '8px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                                            Paiements antérieurs déjà versés
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px', border: '1px solid #e2e8f0', color: '#dc2626' }}>
                                            - {printingAgent.total_paid.toLocaleString('fr-FR')} FC
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                                        <td style={{ padding: '10px 8px', fontSize: '14px', fontWeight: '700', border: '2px solid #0f172a' }}>
                                            NET À PAYER
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '16px', fontWeight: '700', border: '2px solid #0f172a', color: '#16a34a' }}>
                                            {printingAgent.balance.toLocaleString('fr-FR')} FC
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signature Block */}
                        <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '60px', borderBottom: '1px solid #0f172a' }} />
                                <p style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>Signature de l'Agent</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8' }}>{printingAgent.agent_name}</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '60px', borderBottom: '1px solid #0f172a' }} />
                                <p style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>Visa Administratif</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8' }}>{currentUser.full_name}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            Association Adonaï RDC — Document édité automatiquement par le Système de Gestion Épargne
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirmation Modal ── */}
            {confirmAgent && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '24px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', borderRadius: '12px',
                        padding: '32px', maxWidth: '440px', width: '100%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                backgroundColor: 'var(--success-bg)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <CreditCard size={20} style={{ color: 'var(--success-color)' }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Confirmer le paiement</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>Cette action est irréversible</p>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'var(--bg-app)', borderRadius: '8px',
                            padding: '16px', marginBottom: '20px'
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-medium)' }}>Bénéficiaire</p>
                            <p style={{ margin: '4px 0 12px', fontSize: '15px', fontWeight: '700' }}>{confirmAgent.agent_name}</p>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-medium)' }}>Montant net à verser</p>
                            <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '800', color: 'var(--success-color)' }}>
                                {confirmAgent.balance.toLocaleString('fr-FR')} FC
                            </p>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '20px', lineHeight: '1.5' }}>
                            Après confirmation, le compte de commission de l'agent sera remis à zéro et une fiche de paie sera imprimée automatiquement.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setConfirmAgent(null)}
                                disabled={!!paying}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1, backgroundColor: 'var(--success-color)', borderColor: 'var(--success-color)' }}
                                onClick={handleConfirmPay}
                                disabled={!!paying}
                            >
                                {paying === confirmAgent.agent_id ? 'Traitement…' : '✓ Confirmer & Imprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Page Header ── */}
            <div className="section-header no-print">
                <div>
                    <h2 className="section-title">Gestion de la Paie</h2>
                    <p className="section-desc">
                        Rémunérez les agents selon leurs commissions accumulées. Après paiement, leur compte est remis à zéro et une fiche de paie est imprimée.
                    </p>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="stats-grid no-print" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--pending-color)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Commissions en attente</span>
                        <span className="stat-value" style={{ color: 'var(--pending-color)' }}>
                            {totalPending.toLocaleString('fr-FR')} FC
                        </span>
                        <span className="stat-desc">Total dû à l'ensemble des agents</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--pending-bg)', color: 'var(--pending-color)' }}>
                        <Banknote />
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--success-color)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Total déjà rémunéré</span>
                        <span className="stat-value" style={{ color: 'var(--success-color)' }}>
                            {totalPaid.toLocaleString('fr-FR')} FC
                        </span>
                        <span className="stat-desc">Cumul des paiements effectués</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-color)' }}>
                        <CheckCircle />
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Agents à payer aujourd'hui</span>
                        <span className="stat-value" style={{ color: 'var(--primary)' }}>
                            {agentRows.filter(r => r.balance > 0).length}
                        </span>
                        <span className="stat-desc" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} /> {today}
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <CreditCard />
                    </div>
                </div>
            </div>

            {/* ── Agent Payroll Table ── */}
            <div className="panel no-print">
                <div className="panel-header">
                    <h3 className="panel-title">Tableau de Rémunération des Agents</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        {agentRows.length} agent{agentRows.length > 1 ? 's' : ''}
                    </span>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                    {agentRows.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                            <Banknote size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                            <p>Aucun agent enregistré.</p>
                        </div>
                    ) : (
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th style={{ textAlign: 'right' }}>Commissions gagnées</th>
                                    <th style={{ textAlign: 'right' }}>Déjà payé</th>
                                    <th style={{ textAlign: 'right' }}>Solde à payer</th>
                                    <th style={{ textAlign: 'center' }}>Carnets</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agentRows.map(row => (
                                    <tr key={row.agent_id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                    backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '14px', fontWeight: '700', flexShrink: 0
                                                }}>
                                                    {row.agent_name.charAt(0)}
                                                </div>
                                                <span style={{ fontWeight: '600', fontSize: '13px' }}>{row.agent_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: '13px' }}>
                                            {row.total_earned.toLocaleString('fr-FR')} FC
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-medium)' }}>
                                            {row.total_paid > 0
                                                ? `- ${row.total_paid.toLocaleString('fr-FR')} FC`
                                                : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Aucun</span>
                                            }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {row.balance > 0 ? (
                                                <span style={{
                                                    fontSize: '14px', fontWeight: '700',
                                                    color: 'var(--success-color)',
                                                    backgroundColor: 'var(--success-bg)',
                                                    padding: '4px 10px', borderRadius: '20px'
                                                }}>
                                                    {row.balance.toLocaleString('fr-FR')} FC
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '12px', color: 'var(--text-light)',
                                                    fontStyle: 'italic'
                                                }}>
                                                    Soldé ✓
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="badge badge-active">
                                                {row.carnets_count} carnet{row.carnets_count > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                                    onClick={() => handlePrintSlip(row)}
                                                    title="Imprimer fiche de paie"
                                                >
                                                    <Printer size={13} />
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{
                                                        padding: '6px 14px', fontSize: '12px',
                                                        backgroundColor: row.balance <= 0 ? undefined : 'var(--success-color)',
                                                        borderColor: row.balance <= 0 ? undefined : 'var(--success-color)',
                                                        opacity: row.balance <= 0 ? 0.5 : 1,
                                                        cursor: row.balance <= 0 ? 'not-allowed' : 'pointer'
                                                    }}
                                                    disabled={row.balance <= 0 || paying === row.agent_id}
                                                    onClick={() => handlePayClick(row)}
                                                >
                                                    {paying === row.agent_id ? 'En cours…' : (
                                                        <><Banknote size={13} /> Payer</>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Payouts History ── */}
            {payouts.length > 0 && (
                <div className="panel no-print" style={{ marginTop: '24px' }}>
                    <div className="panel-header">
                        <h3 className="panel-title">Historique des Paiements</h3>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Agent</th>
                                    <th style={{ textAlign: 'right' }}>Montant versé</th>
                                    <th>Payé par</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                                            {new Date(p.created_at).toLocaleString('fr-FR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td style={{ fontWeight: '600', fontSize: '13px' }}>{p.agent_name}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--success-color)' }}>
                                            {p.amount.toLocaleString('fr-FR')} FC
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-medium)' }}>{p.paid_by_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

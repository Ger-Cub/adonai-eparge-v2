import React, { useState } from 'react';
import type { LedgerEntry, UserProfile, AgentMonthlyReward, OrgRevenueSnapshot } from '../lib/types';
import { Download, Printer, TrendingUp, DollarSign } from 'lucide-react';

interface LedgerViewProps {
    ledger: LedgerEntry[];
    currentUser: UserProfile;
    rewards: AgentMonthlyReward[];
    snapshots: OrgRevenueSnapshot[];
}

export const LedgerView: React.FC<LedgerViewProps> = ({
    ledger,
    currentUser,
    rewards,
    snapshots
}) => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'monthly' | 'reports'>('transactions');
    const [reportType, setReportType] = useState<'client' | 'agent' | 'organisation'>('organisation');
    const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin_principal';

    // Export CSV
    const handleExportCSV = () => {
        if (!isAdmin) {
            alert('Seuls les administrateurs peuvent exporter les données.');
            return;
        }

        const headers = ['ID', 'Carnet', 'Type', 'Montant (FC)', 'Destinataire', 'Date', 'Description'];
        const rows = ledger.map(l => [
            l.id,
            l.carnet_number,
            l.type === 'carnet_sale' ? 'Vente de Carnet' : l.type === 'agent_gain' ? 'Commission Agent' : 'Gain Organisation',
            l.amount,
            l.agent_name || 'Organisation',
            new Date(l.created_at).toLocaleDateString(),
            l.description
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `comptabilite_adonai_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const getEntryLabel = (type: LedgerEntry['type']) => {
        switch (type) {
            case 'carnet_sale': return <span className="badge badge-active" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#0284c7', borderColor: 'rgba(56, 189, 248, 0.2)' }}>Vente Carnet (+500 FC)</span>;
            case 'agent_gain': return <span className="badge badge-locked">Part Agent (50%)</span>;
            case 'org_gain': return <span className="badge badge-active">Part Organisation (50%)</span>;
        }
    };

    return (
        <div>
            {/* 
        Print specific wrapper. 
        Only visible when printing. Uses CSS print rule media to overlay everything.
      */}
            <div id="print-area" style={{ display: 'none' }} className="print-only">
                <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #0f172a', paddingBottom: '16px' }}>
                    <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0 }}>Association Adonaï - Service Épargne</h1>
                    <p style={{ fontSize: '14px', color: '#475569', marginTop: '6px' }}>Rapport {reportType.toUpperCase()} ({reportPeriod === 'daily' ? 'Journalier' : reportPeriod === 'weekly' ? 'Hebdomadaire' : 'Mensuel'})</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8' }}>Édité le : {new Date().toLocaleString()}</p>
                </div>

                {reportType === 'organisation' && (
                    <div>
                        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Synthèse Budgétaire Organisation</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Période</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Frais Vente Carnets (500 FC)</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Commissions Épargne (50%)</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Total Revenus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snapshots.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px' }}>Mois {s.month}/{s.year}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{s.total_sales_revenue.toLocaleString()} FC</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{s.total_commission_revenue.toLocaleString()} FC</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{(s.total_sales_revenue + s.total_commission_revenue).toLocaleString()} FC</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportType === 'agent' && (
                    <div>
                        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Rapport Performance et Rémunérations Agents</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Agent de terrain</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Mois / Année</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Frais d'ouverture récoltés</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Commissions perçues (50%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewards.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.agent_name}</td>
                                        <td style={{ padding: '8px' }}>Mois {r.month}/{r.year}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{r.total_sales_fee.toLocaleString()} FC</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#0d9488' }}>{r.total_commission.toLocaleString()} FC</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportType === 'client' && (
                    <div>
                        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Journal des Transactions & Comptes Épargne</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Opération</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Carnet impliqué</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.slice(0, 15).map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '8px' }}>
                                            {l.type === 'carnet_sale' ? 'Vente Carnet' : l.type === 'org_gain' ? 'Fret Org' : 'Com Agent'}
                                        </td>
                                        <td style={{ padding: '8px' }}>{l.carnet_number}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{l.amount.toLocaleString()} FC</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: '48px', textAlign: 'right', fontSize: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <p>Visa du Responsable Administratif et Financier</p>
                    <div style={{ height: '60px' }}></div>
                    <p style={{ fontWeight: 'bold' }}>Association Adonaï RDC</p>
                </div>
            </div>

            <div className="section-header no-print">
                <div>
                    <h2 className="section-title">Comptabilité & Rapports Financiers</h2>
                    <p className="section-desc">Consultez l'audit du grand livre, suivez les commissions et générez les fichiers d'exports.</p>
                </div>

                {isAdmin && activeTab === 'transactions' && (
                    <button className="btn btn-primary" onClick={handleExportCSV}>
                        <Download size={16} /> Exporter au format CSV
                    </button>
                )}
            </div>

            {/* Tabs Menu */}
            <div className="filters-bar no-print" style={{ justifyContent: 'flex-start', padding: '6px' }}>
                <button
                    className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setActiveTab('transactions')}
                >
                    Grand Livre Audit ({ledger.length})
                </button>
                {isAdmin && (
                    <>
                        <button
                            className={`btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            onClick={() => setActiveTab('monthly')}
                        >
                            Commissions & Évaluations Mensuelles
                        </button>
                        <button
                            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            onClick={() => setActiveTab('reports')}
                        >
                            Imprimer / PDF Rapports
                        </button>
                    </>
                )}
            </div>

            {/* Tab Content 1: Ledger Account Statement */}
            {activeTab === 'transactions' && (
                <div className="panel no-print">
                    <div className="panel-body" style={{ padding: 0 }}>
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>ID Transaction</th>
                                    <th>Carnet No</th>
                                    <th>Type d'écriture</th>
                                    <th>Bénéficiaire</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map(l => (
                                    <tr key={l.id}>
                                        <td>{new Date(l.created_at).toLocaleDateString()}</td>
                                        <td><code style={{ fontSize: '10px' }}>{l.id}</code></td>
                                        <td><code style={{ fontWeight: 600 }}>{l.carnet_number}</code></td>
                                        <td>{getEntryLabel(l.type)}</td>
                                        <td>{l.agent_name || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Organisation</span>}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-medium)' }}>{l.description}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.amount.toLocaleString()} FC</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content 2: Monthly evaluate tables */}
            {activeTab === 'monthly' && isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="no-print">

                    {/* Org profits */}
                    <div className="panel">
                        <div className="panel-header">
                            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={18} />
                                Snapshot Organisation
                            </h3>
                        </div>
                        <div className="panel-body" style={{ padding: 0 }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Période</th>
                                        <th>Ventes (500 FC)</th>
                                        <th>Commissions (50%)</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snapshots.map(s => (
                                        <tr key={s.id}>
                                            <td>Mois {s.month}/{s.year}</td>
                                            <td>{s.total_sales_revenue.toLocaleString()} FC</td>
                                            <td>{s.total_commission_revenue.toLocaleString()} FC</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                                                {(s.total_sales_revenue + s.total_commission_revenue).toLocaleString()} FC
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Agent Rewards */}
                    <div className="panel">
                        <div className="panel-header">
                            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={18} />
                                Récapitulatif Commissions Agents
                            </h3>
                        </div>
                        <div className="panel-body" style={{ padding: 0 }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Période</th>
                                        <th>Ventes Carnets</th>
                                        <th style={{ textAlign: 'right' }}>Commissions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rewards.map(r => (
                                        <tr key={r.id}>
                                            <td><strong>{r.agent_name}</strong></td>
                                            <td>{r.month}/{r.year}</td>
                                            <td>{r.total_sales_fee.toLocaleString()} FC</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>
                                                {r.total_commission.toLocaleString()} FC
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content 3: Printed reports builder */}
            {activeTab === 'reports' && isAdmin && (
                <div className="panel no-print">
                    <div className="panel-header">
                        <h3 className="panel-title">Générer un rapport PDF / Imprimé</h3>
                    </div>
                    <div className="panel-body">
                        <div className="form-row" style={{ marginBottom: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Type de Rapport</label>
                                <select
                                    className="form-control"
                                    value={reportType}
                                    onChange={e => setReportType(e.target.value as any)}
                                >
                                    <option value="organisation">Rapport Budgétaire Organisation</option>
                                    <option value="agent">Rapport Rémunérations Agents</option>
                                    <option value="client">Journal Général des Opérations</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Périodicité</label>
                                <select
                                    className="form-control"
                                    value={reportPeriod}
                                    onChange={e => setReportPeriod(e.target.value as any)}
                                >
                                    <option value="daily">Planification Journalière</option>
                                    <option value="weekly">Planification Hebdomadaire</option>
                                    <option value="monthly">Planification Mensuelle</option>
                                </select>
                            </div>
                        </div>

                        <div style={{
                            border: '1px dashed var(--border)',
                            backgroundColor: 'var(--bg-app)',
                            padding: '24px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            marginBottom: '24px'
                        }}>
                            <Printer size={32} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
                            <h4>Prêt à l'impression</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-medium)', marginTop: '4px', maxWidth: '400px', marginInline: 'auto' }}>
                                Cliquez sur le bouton ci-dessous pour ouvrir l'interface système d'impression. Vous pourrez directement enregistrer le document sous format <strong>PDF</strong> ou <strong>DOCX</strong>.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                <Printer size={16} /> Lancer l'impression / Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

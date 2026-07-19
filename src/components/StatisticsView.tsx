import React, { useMemo } from 'react';
import type { SavingsCarnet, UserProfile, LedgerEntry, CarnetDeposit } from '../lib/types';
import { BarChart3, Landmark, Sparkles, Award, Wallet, Percent } from 'lucide-react';

interface StatisticsProps {
    carnets: SavingsCarnet[];
    ledger: LedgerEntry[];
    currentUser: UserProfile;
    deposits: CarnetDeposit[];
    profiles: UserProfile[];
}

export const StatisticsView: React.FC<StatisticsProps> = ({
    carnets,
    ledger,
    deposits,
    profiles
}) => {
    // 1. KPI Calculations
    const totalCollected = useMemo(() => {
        return deposits.reduce((sum, d) => sum + d.amount, 0);
    }, [deposits]);

    const agentGains = useMemo(() => {
        return ledger
            .filter(l => l.type === 'agent_gain')
            .reduce((sum, l) => sum + l.amount, 0);
    }, [ledger]);

    const fixedSales = useMemo(() => {
        return ledger
            .filter(l => l.type === 'carnet_sale')
            .reduce((sum, l) => sum + l.amount, 0);
    }, [ledger]);

    const orgGains = useMemo(() => {
        return ledger
            .filter(l => l.type === 'org_gain')
            .reduce((sum, l) => sum + l.amount, 0);
    }, [ledger]);

    const netOrgRevenue = useMemo(() => {
        return fixedSales + orgGains;
    }, [fixedSales, orgGains]);

    const lockedCount = useMemo(() => {
        return carnets.filter(c => c.status === 'locked').length;
    }, [carnets]);

    // 2. Weekly Daily Collected (SVG Chart Data)
    const weeklyData = useMemo(() => {
        const totals = [0, 0, 0, 0, 0, 0, 0];

        // Sum deposits of the past 7 days
        deposits.forEach(d => {
            try {
                const date = new Date(d.created_at);
                const dayIdx = date.getDay();
                totals[dayIdx] += d.amount;
            } catch (e) {
                console.error(e);
            }
        });

        // Re-order so week starts on Monday
        const orderedDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const orderedTotals = [totals[1], totals[2], totals[3], totals[4], totals[5], totals[6], totals[0]];

        const maxVal = Math.max(...orderedTotals, 10000);

        return orderedDays.map((day, i) => {
            const val = orderedTotals[i];
            const percent = (val / maxVal) * 100;
            return { day, value: val, percent };
        });
    }, [deposits]);

    // 3. Agent Performance Rankings
    const agentLeaderboard = useMemo(() => {
        const agents = profiles.filter(p => p.role === 'agent');
        
        const rankList = agents.map(ag => {
            // Sum all ledger commissions earned by this agent
            const totalEarned = ledger
                .filter(l => l.type === 'agent_gain' && l.agent_id === ag.id)
                .reduce((sum, l) => sum + l.amount, 0);

            // Count client creations
            const activeCarnetsCount = carnets.filter(c => c.agent_id === ag.id).length;

            return {
                name: ag.full_name,
                id: ag.id,
                earned: totalEarned,
                carnets: activeCarnetsCount
            };
        });

        // Sort descending
        return rankList.sort((a, b) => b.earned - a.earned);
    }, [profiles, ledger, carnets]);

    // 4. Organization split calculations
    const totalRevenueSplit = fixedSales + orgGains || 1;
    const fixedSalesPercent = Math.round((fixedSales / totalRevenueSplit) * 100);
    const orgCommissionsPercent = Math.round((orgGains / totalRevenueSplit) * 100);

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Tableau de Performance & Statistiques</h2>
                    <p className="section-desc">Analyse en temps réel de la collecte, des commissions et des performances d'Adonaï Épargne.</p>
                </div>
            </div>

            {/* ── Visual KPI Block ── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderBottom: '3px solid var(--primary)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Épargne brute collectée</span>
                        <span className="stat-value">{totalCollected.toLocaleString()} FC</span>
                        <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                            Cumul absolu de tous les versements validés.
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <Landmark />
                    </div>
                </div>

                <div className="stat-card" style={{ borderBottom: '3px solid var(--secondary)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Commissions Agents versées</span>
                        <span className="stat-value">{agentGains.toLocaleString()} FC</span>
                        <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                            Distribué aux agents (50% de la 1ère mise).
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: 'var(--secondary)' }}>
                        <Award />
                    </div>
                </div>

                <div className="stat-card" style={{ borderBottom: '3px solid var(--success-color)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Bénéfices Nets Organisation</span>
                        <span className="stat-value">{netOrgRevenue.toLocaleString()} FC</span>
                        <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                            Frais fixes d'ouverture + commissions.
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-color)' }}>
                        <Wallet />
                    </div>
                </div>

                <div className="stat-card" style={{ borderBottom: '3px solid var(--locked-color)' }}>
                    <div className="stat-info">
                        <span className="stat-label">Carnets de cycle complet</span>
                        <span className="stat-value">{lockedCount}</span>
                        <span className="stat-desc" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                            {lockedCount} carnets remplis (31/31 dépôts).
                        </span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--locked-bg)', color: 'var(--locked-color)' }}>
                        <Sparkles />
                    </div>
                </div>
            </div>

            {/* ── Core Charts Bento Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                
                {/* 1. Evolution of Collections Custom Bar Chart */}
                <div className="panel" style={{ padding: '20px' }}>
                    <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '20px' }}>
                        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                            Volume de Collecte Hebdomadaire
                        </h3>
                    </div>
                    
                    {/* SVG Graph container */}
                    <div style={{ position: 'relative', height: '240px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
                        {weeklyData.map((d, idx) => (
                            <div key={idx} style={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                                {/* Label Value */}
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '4px' }}>
                                    {d.value > 0 ? `${(d.value / 1000).toFixed(1)}k` : '0'}
                                </span>

                                {/* Bar shape */}
                                <div 
                                    style={{
                                        width: '100%',
                                        maxWidth: '28px',
                                        height: `${Math.max(5, d.percent)}%`,
                                        backgroundColor: 'var(--primary)',
                                        borderTopLeftRadius: '6px',
                                        borderTopRightRadius: '6px',
                                        transition: 'height 0.6s ease-out',
                                        position: 'relative',
                                        boxShadow: '0 4px 12px rgba(92, 59, 254, 0.25)'
                                    }}
                                    className="graph-bar-hover"
                                >
                                    {/* Tooltip */}
                                    <div className="slot-tooltip" style={{ bottom: '105%', transform: 'translateX(-30%)', whiteSpace: 'nowrap' }}>
                                        {d.day}: {d.value.toLocaleString()} FC
                                    </div>
                                </div>

                                {/* X Label */}
                                <span style={{ position: 'absolute', bottom: '-24px', fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>
                                    {d.day.substring(0, 3)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Organization Revenue Breakdown */}
                <div className="panel" style={{ padding: '20px' }}>
                    <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '20px' }}>
                        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Percent size={18} style={{ color: 'var(--secondary)' }} />
                            Ventilation des Revenus Adonaï
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', minHeight: '220px' }}>
                        {/* Progress row 1: Fixed sales */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-medium)' }}>Vente Fixe de Carnets (500 FC / carnet)</span>
                                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{fixedSales.toLocaleString()} FC ({fixedSalesPercent}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${fixedSalesPercent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '5px' }} />
                            </div>
                        </div>

                        {/* Progress row 2: Commissions */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-medium)' }}>Commissions d'Ouverture (50% de la mise)</span>
                                <span style={{ fontWeight: 800, color: 'var(--secondary)' }}>{orgGains.toLocaleString()} FC ({orgCommissionsPercent}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${orgCommissionsPercent}%`, height: '100%', backgroundColor: 'var(--secondary)', borderRadius: '5px' }} />
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-light)', lineHeight: '1.5' }}>
                            💡 <strong>Frugalité et Croissance :</strong> Les bénéfices nets cumulés s'élèvent à <strong>{netOrgRevenue.toLocaleString()} FC</strong>. 
                            Ces fonds sont investis pour l'autonomie financière et les charges structurelles de l'organisation.
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Agent Performance Leaderboard panel ── */}
            <div className="panel" style={{ padding: '20px' }}>
                <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '20px' }}>
                    <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} style={{ color: 'var(--success-color)' }} />
                        Palmarès d'Évaluation des Agents de Terrain
                    </h3>
                </div>

                <div className="panel-body" style={{ padding: 0 }}>
                    {agentLeaderboard.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)' }}>
                            Aucun agent de terrain enregistré.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {agentLeaderboard.map((ag, index) => {
                                // Find highest earned for percentage representation
                                const highestEarned = Math.max(...agentLeaderboard.map(a => a.earned), 1000);
                                const progressWidth = (ag.earned / highestEarned) * 100;
                                return (
                                    <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-app)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        {/* Rank Badge */}
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#E2E8F0' : 'transparent',
                                            color: index === 0 ? '#B45309' : index === 1 ? '#475569' : 'var(--text-light)',
                                            border: index > 1 ? '1px solid var(--border)' : 'none',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '13px',
                                            flexShrink: 0
                                        }}>
                                            {index + 1}
                                        </div>

                                        {/* Name & details */}
                                        <div style={{ flexGrow: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{ag.name}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                                                    {ag.earned.toLocaleString()} FC acquis ({ag.carnets} carnets)
                                                </span>
                                            </div>

                                            {/* Progress bar visual indicator */}
                                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${progressWidth}%`, height: '100%', backgroundColor: 'var(--secondary)', borderRadius: '4px' }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

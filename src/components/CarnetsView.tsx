import React, { useState, useEffect } from 'react';
import type { SavingsCarnet, Client, UserProfile, CarnetDeposit, WithdrawalRequest } from '../lib/types';
import { Plus, CheckCircle, Lock, FileText, ArrowLeft, ArrowRight, Edit2, Users, FolderHeart, Trash2, AlertTriangle, X } from 'lucide-react';

interface CarnetsViewProps {
    carnets: SavingsCarnet[];
    clients: Client[];
    deposits: CarnetDeposit[];
    currentUser: UserProfile;
    profiles?: UserProfile[];
    onCreateCarnet: (carnet: Omit<SavingsCarnet, 'id' | 'carnet_number' | 'supervisor_id' | 'status' | 'created_at' | 'updated_at'>, firstDeposit: number) => void;
    onAddDeposit: (deposit: Omit<CarnetDeposit, 'id' | 'slots_count' | 'created_at' | 'updated_at'>) => void;
    onUpdateDailyMise: (carnetId: string, newMise: number) => void;
    onRequestWithdrawal: (carnetId: string, amount: number) => void;
    onDeleteDeposit?: (depositId: string) => void;
    requests?: WithdrawalRequest[];
    onCancelWithdrawalRequest?: (requestId: string) => void;
    selectedClientFromQuickLink: Client | null;
    clearQuickLinkClient: () => void;
}

export const CarnetsView: React.FC<CarnetsViewProps> = ({
    carnets,
    clients,
    deposits: _deposits,
    currentUser,
    profiles = [],
    onCreateCarnet,
    onAddDeposit,
    onUpdateDailyMise,
    onRequestWithdrawal,
    onDeleteDeposit,
    requests = [],
    onCancelWithdrawalRequest,
    selectedClientFromQuickLink,
    clearQuickLinkClient
}) => {
    // Main sub-navigation tab structure
    const [activeSubTab, setActiveSubTab] = useState<'list' | 'details'>('list');

    // Creation Modal state
    const [creationModalOpen, setCreationModalOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [dailyMise, setDailyMise] = useState(1000);
    const [firstDeposit, setFirstDeposit] = useState(1000);

    // Active carnet details state
    const [activeCarnetId, setActiveCarnetId] = useState<string | null>(null);

    // Form inputs
    const [depositAmount, setDepositAmount] = useState(1000);
    const [isEditingMise, setIsEditingMise] = useState(false);
    const [editMiseAmount, setEditMiseAmount] = useState(1000);
    const [msg, setMsg] = useState({ text: '', type: '' });
    
    // State for canceling a deposit from the grid
    const [selectedCancelDeposit, setSelectedCancelDeposit] = useState<CarnetDeposit | null>(null);

    // HIERARCHICAL FILTERS
    // 1. For Supervisor: filter by Agent
    const [supervisorAgentFilter, setSupervisorAgentFilter] = useState('all');

    // 2. For Admin Principal / Super Admin: filter by Supervisor, then by Agent
    const [adminSupervisorFilter, setAdminSupervisorFilter] = useState('all');
    const [adminAgentFilter, setAdminAgentFilter] = useState('all');

    // Handle Quick Link from Client profile
    useEffect(() => {
        if (selectedClientFromQuickLink) {
            setSelectedClientId(selectedClientFromQuickLink.id);
            setDailyMise(1000);
            setFirstDeposit(1000);
            setCreationModalOpen(true); // Open the modal automatically!
        }
    }, [selectedClientFromQuickLink]);

    const activeCarnetDetails = carnets.find(c => c.id === activeCarnetId);

    // Sync default form inputs on carnet detail changes
    useEffect(() => {
        if (activeCarnetDetails) {
            setDepositAmount(activeCarnetDetails.daily_mise);
            setEditMiseAmount(activeCarnetDetails.daily_mise);
            setIsEditingMise(false);
        }
    }, [activeCarnetId, activeCarnetDetails]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) {
            setMsg({ text: 'Veuillez sélectionner un client.', type: 'error' });
            return;
        }

        try {
            onCreateCarnet({
                client_id: selectedClientId,
                daily_mise: dailyMise,
                agent_id: currentUser.id,
                created_by: currentUser.id,
                updated_by: currentUser.id
            }, firstDeposit);

            setSelectedClientId('');
            setDailyMise(1000);
            setFirstDeposit(1000);
            clearQuickLinkClient();
            setCreationModalOpen(false); // Close modal

            setMsg({ text: 'Carnet d\'épargne initié avec succès (Frais de création de 500 FC enregistrés).', type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err: any) {
            setMsg({ text: err.message || 'Erreur lors de la création.', type: 'error' });
        }
    };

    const handleDepositSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCarnetDetails) return;

        try {
            onAddDeposit({
                carnet_id: activeCarnetDetails.id,
                amount: depositAmount,
                created_by: currentUser.id,
                updated_by: currentUser.id
            });

            setMsg({ text: `Versement de ${depositAmount} FC validé avec succès.`, type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);

            // Reset deposit input field
            setDepositAmount(activeCarnetDetails.daily_mise);
        } catch (err: any) {
            setMsg({ text: err.message || 'Erreur versement.', type: 'error' });
        }
    };

    const handleMiseEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCarnetDetails) return;

        try {
            onUpdateDailyMise(activeCarnetDetails.id, editMiseAmount);
            setIsEditingMise(false);
            setMsg({ text: `Mise journalière modifiée à ${editMiseAmount} FC.`, type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err: any) {
            setMsg({ text: err.message || 'Erreur mise.', type: 'error' });
        }
    };

    const handleRequestWithdrawal = () => {
        if (!activeCarnetDetails) return;
        try {
            const netAmount = (activeCarnetDetails.total_deposited || 0) - activeCarnetDetails.daily_mise;
            onRequestWithdrawal(activeCarnetDetails.id, netAmount);
            setMsg({ text: `Demande de retrait de ${netAmount} FC transmise pour validation.`, type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err: any) {
            setMsg({ text: err.message || 'Erreur retrait.', type: 'error' });
        }
    };

    const canEditParam = (createdTime: string) => {
        const elapsed = Date.now() - new Date(createdTime).getTime();
        return elapsed < 24 * 60 * 60 * 1000;
    };

    // Filter Helper: get clients matching the carnet for photo display
    const getClientForCarnet = (clientId: string) => {
        return clients.find(cl => cl.id === clientId);
    };

    // HIERARCHY MAPPINGS FROM PROFILES
    const supervisorsList = profiles.filter(p => p.role === 'supervisor');
    
    // Get agents depending on who is supervisor
    const getAgentsForSupervisor = (supId: string) => {
        if (supId === 'all') return profiles.filter(p => p.role === 'agent');
        // Retrieve agent IDs where supervisor_id is supId
        return profiles.filter(p => p.role === 'agent' && p.created_by === supId);
    };

    const agentsListForAdmin = getAgentsForSupervisor(adminSupervisorFilter);
    const agentsListForSupervisor = profiles.filter(p => p.role === 'agent' && p.created_by === currentUser.id);

    // DYNAMIC CARNET FILTERING BASED ON ROLES
    const filteredCarnets = carnets.filter(car => {
        if (currentUser.role === 'supervisor') {
            // Supervisor filtering
            const matchesAgent = supervisorAgentFilter === 'all' || car.agent_id === supervisorAgentFilter;
            return matchesAgent;
        } else if (currentUser.role === 'admin_principal' || currentUser.role === 'super_admin') {
            // Admin filtering
            const matchesSupervisor = adminSupervisorFilter === 'all' || car.supervisor_id === adminSupervisorFilter;
            const matchesAgent = adminAgentFilter === 'all' || car.agent_id === adminAgentFilter;
            return matchesSupervisor && matchesAgent;
        }
        // Agent role (already pre-filtered in App.tsx but let's keep standard)
        return true;
    });

    return (
        <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)' }}>
            
            {/* ── Sub Header with Tab Switcher ── */}
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 className="section-title">Gestion des Carnets d'Épargne</h2>
                    <p className="section-desc">Gérez et suivez les versements sur les grilles des membres.</p>
                </div>

                {/* Sub Tab Navigation Switcher */}
                <div style={{ display: 'flex', backgroundColor: 'var(--border)', padding: '4px', borderRadius: '8px', gap: '4px' }} className="no-print">
                    <button 
                        className={`btn ${activeSubTab === 'list' ? 'btn-primary' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: activeSubTab === 'list' ? 'var(--primary)' : 'transparent', color: activeSubTab === 'list' ? 'white' : 'var(--text-medium)', boxShadow: activeSubTab === 'list' ? 'var(--shadow)' : 'none' }}
                        onClick={() => setActiveSubTab('list')}
                    >
                        Liste des Carnets ({filteredCarnets.length})
                    </button>
                    <button 
                        className={`btn ${activeSubTab === 'details' ? 'btn-primary' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: activeSubTab === 'details' ? 'var(--primary)' : 'transparent', color: activeSubTab === 'details' ? 'white' : 'var(--text-medium)', boxShadow: activeSubTab === 'details' ? 'var(--shadow)' : 'none' }}
                        onClick={() => {
                            if (!activeCarnetId && filteredCarnets.length > 0) {
                                setActiveCarnetId(filteredCarnets[0].id);
                            }
                            setActiveSubTab('details');
                        }}
                    >
                        Détails du Carnet
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {msg.text && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: msg.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: msg.type === 'success' ? '#047857' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
                    fontWeight: 600,
                    fontSize: '13px'
                }}>
                    {msg.text}
                </div>
            )}

            {/* ── 1. CARNET LIST SUB TAB ── */}
            {activeSubTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* HIERARCHICAL FILTER PANELS FOR ADMIN AND SUPERVISOR */}
                    <div className="panel no-print" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Users size={16} style={{ color: 'var(--primary)' }} />
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>Filtres Hiérarchiques de recherche</h4>
                        </div>
                        
                        {/* 1. Supervisor filters */}
                        {currentUser.role === 'supervisor' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1, minWidth: '200px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)' }}>Filtrer par Agent géré :</label>
                                    <select 
                                        className="form-control" 
                                        value={supervisorAgentFilter}
                                        onChange={e => setSupervisorAgentFilter(e.target.value)}
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                    >
                                        <option value="all">Tous mes agents de terrain</option>
                                        {agentsListForSupervisor.map(ag => (
                                            <option key={ag.id} value={ag.id}>{ag.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* 2. Admin Principal / Super Admin filters */}
                        {(currentUser.role === 'admin_principal' || currentUser.role === 'super_admin') && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                {/* Filter by Supervisor */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)' }}>1. Choisir le Superviseur :</label>
                                    <select 
                                        className="form-control" 
                                        value={adminSupervisorFilter}
                                        onChange={e => {
                                            setAdminSupervisorFilter(e.target.value);
                                            setAdminAgentFilter('all'); // reset sub-agent filter
                                        }}
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                    >
                                        <option value="all">Tous les Superviseurs</option>
                                        {supervisorsList.map(sup => (
                                            <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filter by Agent */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)' }}>2. Cliquer sur l'Agent de terrain :</label>
                                    <select 
                                        className="form-control" 
                                        value={adminAgentFilter}
                                        onChange={e => setAdminAgentFilter(e.target.value)}
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                    >
                                        <option value="all">Tous les Agents gérés</option>
                                        {agentsListForAdmin.map(ag => (
                                            <option key={ag.id} value={ag.id}>{ag.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CARNETS GRID TRACKER */}
                    <div className="panel">
                        <div className="panel-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderHeart size={18} style={{ color: 'var(--primary)' }} />
                                Suivi des carnets ({filteredCarnets.length})
                            </h3>
                        </div>

                        <div className="panel-body" style={{ padding: 0 }}>
                            {filteredCarnets.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Aucun carnet en service trouvé pour ces critères de recherche.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '20px' }}>
                                    {filteredCarnets.map(c => {
                                        const progress = ((c.total_slots || 0) / 31) * 100;
                                        const cl = getClientForCarnet(c.client_id);
                                        return (
                                            <div
                                                key={c.id}
                                                style={{
                                                    backgroundColor: 'var(--bg-app)',
                                                    borderRadius: '12px',
                                                    border: activeCarnetId === c.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}
                                                onClick={() => {
                                                    setActiveCarnetId(c.id);
                                                    setActiveSubTab('details'); // shift immediately
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                        {cl?.photo ? (
                                                            <img src={cl.photo} alt={cl.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '13px', margin: 0 }}>
                                                                {c.client_name?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>{c.carnet_number}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-medium)', fontWeight: 500 }}>{c.client_name}</div>
                                                        </div>
                                                    </div>

                                                    <span className={`badge ${c.status === 'pending' ? 'badge-pending' :
                                                        c.status === 'active' ? 'badge-active' :
                                                            c.status === 'locked' ? 'badge-locked' : 'badge-archived'
                                                        }`}>
                                                        {c.status === 'pending' && 'En attente'}
                                                        {c.status === 'active' && 'En cours'}
                                                        {c.status === 'locked' && 'Rempli 🔒'}
                                                        {c.status === 'archived' && 'Vidé (Retrait) ✅'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-medium)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                                    <span>Mise: <strong>{c.daily_mise.toLocaleString()} FC</strong></span>
                                                    <span>Total: <strong>{(c.total_deposited || 0).toLocaleString()} FC</strong></span>
                                                    <span>Slots: <strong>{c.total_slots} / 31</strong></span>
                                                </div>

                                                <div style={{ width: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-light)', marginBottom: '4px' }}>
                                                        <span>Progression</span>
                                                        <span>{Math.round(progress)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${progress}%`,
                                                                height: '100%',
                                                                backgroundColor: c.status === 'locked' ? 'var(--locked-color)' : c.status === 'archived' ? 'var(--archived-color)' : 'var(--success-color)'
                                                            }}
                                                        />
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
            )}

            {/* ── 2. CARNET DETAILS SUB TAB ── */}
            {activeSubTab === 'details' && (
                <div>
                    
                    {/* Back to list button */}
                    <button 
                        className="btn btn-secondary no-print" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 14px' }}
                        onClick={() => setActiveSubTab('list')}
                    >
                        <ArrowLeft size={16} /> Retour à la liste
                    </button>

                    {activeCarnetDetails ? (
                        <div className="panel">
                            {/* Detailed Header Card */}
                            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    
                                    {/* Display client photo inside Carnet details */}
                                    {getClientForCarnet(activeCarnetDetails.client_id)?.photo ? (
                                        <img 
                                            src={getClientForCarnet(activeCarnetDetails.client_id)?.photo} 
                                            alt={activeCarnetDetails.client_name} 
                                            style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                                        />
                                    ) : (
                                        <div className="user-avatar" style={{ width: '60px', height: '60px', borderRadius: '12px', fontSize: '20px', margin: 0 }}>
                                            {activeCarnetDetails.client_name?.charAt(0)}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="panel-title" style={{ fontSize: '20px', fontWeight: 800 }}>
                                            Carnet {activeCarnetDetails.carnet_number}
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                                                Titulaire : <strong>{activeCarnetDetails.client_name}</strong>
                                            </span>
                                            <span style={{ color: 'var(--text-light)' }}>|</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                                Tél : {activeCarnetDetails.client_phone}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                    <span className={`badge ${activeCarnetDetails.status === 'pending' ? 'badge-pending' :
                                        activeCarnetDetails.status === 'active' ? 'badge-active' :
                                            activeCarnetDetails.status === 'locked' ? 'badge-locked' : 'badge-archived'
                                        }`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '20px' }}>
                                        {activeCarnetDetails.status === 'pending' && 'En attente de dépôt'}
                                        {activeCarnetDetails.status === 'active' && 'Validé (En cours)'}
                                        {activeCarnetDetails.status === 'locked' && 'Rempli (Clôturable) 🔒'}
                                        {activeCarnetDetails.status === 'archived' && 'Vidé (Archivé) ✅'}
                                    </span>
                                    {currentUser.role === 'agent' && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                                            {canEditParam(activeCarnetDetails.created_at) ? 'Modifiable (Sous 24h)' : 'Lecture seule'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="panel-body">
                                
                                {/* Financial Stats Summary Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Mise Journalière</span>
                                        <strong style={{ fontSize: '20px', color: 'var(--text-dark)' }}>{activeCarnetDetails.daily_mise.toLocaleString()} FC</strong>
                                    </div>

                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Solde Total Déposé</span>
                                        <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>{(activeCarnetDetails.total_deposited || 0).toLocaleString()} FC</strong>
                                    </div>

                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Frais d'Adhésion (Retenu)</span>
                                        <strong style={{ fontSize: '16px', color: 'var(--error-color)' }}>{activeCarnetDetails.daily_mise.toLocaleString()} FC</strong>
                                    </div>

                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Montant Net Retirable</span>
                                        <strong style={{ fontSize: '18px', color: 'var(--success-color)' }}>
                                            {Math.max(0, (activeCarnetDetails.total_deposited || 0) - activeCarnetDetails.daily_mise).toLocaleString()} FC
                                        </strong>
                                    </div>
                                </div>

                                {/* Dynamic Grid of 31 Slots */}
                                <div className="slots-container" style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', width: '100%' }}>
                                        <div>
                                            <span className="form-label" style={{ fontWeight: 700, margin: 0 }}>Quadrillage des 31 Dépôts du Carnet</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginTop: '2px' }}>
                                                💡 Cliquez sur une case remplie pour voir les détails ou annuler le dépôt (sous 24h)
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                                            {Number(activeCarnetDetails.total_slots || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 31 slots remplis ({Math.round(((activeCarnetDetails.total_slots || 0) / 31) * 100)}%)
                                        </span>
                                    </div>

                                    {(() => {
                                        const activeCarnetDeposits = _deposits
                                            .filter(d => d.carnet_id === activeCarnetDetails?.id)
                                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                                        const dailyMise = activeCarnetDetails.daily_mise;
                                        let cumulativeAmount = 0;
                                        const slotToDepMap: { [key: number]: CarnetDeposit } = {};

                                        activeCarnetDeposits.forEach(dep => {
                                            const startAmount = cumulativeAmount;
                                            const endAmount = cumulativeAmount + dep.amount;
                                            cumulativeAmount = endAmount;

                                            for (let index = 0; index < 31; index++) {
                                                const slotStart = index * dailyMise;
                                                const slotEnd = (index + 1) * dailyMise;
                                                
                                                const overlapStart = Math.max(startAmount, slotStart);
                                                const overlapEnd = Math.min(endAmount, slotEnd);
                                                
                                                if (overlapStart < overlapEnd) {
                                                    slotToDepMap[index] = dep;
                                                }
                                            }
                                        });

                                        return (
                                            <div className="slots-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px' }}>
                                                {Array.from({ length: 31 }).map((_, index) => {
                                                    const isFilled = index < Math.floor(activeCarnetDetails.total_slots || 0);
                                                    const dep = slotToDepMap[index];
                                                    const isDeletable = dep && canEditParam(dep.created_at);

                                                    return (
                                                         <div
                                                             key={index}
                                                             className={`slot-item ${isFilled ? 'filled' : 'empty'} ${isDeletable ? 'deletable' : ''}`}
                                                             style={{
                                                                 height: '44px',
                                                                 borderRadius: '8px',
                                                                 fontSize: '12px',
                                                                 fontWeight: 'bold',
                                                                 display: 'flex',
                                                                 alignItems: 'center',
                                                                 justifyContent: 'center',
                                                                 cursor: isFilled ? 'pointer' : 'default',
                                                                 transition: 'all 0.2s ease',
                                                                 border: isDeletable ? '1px dashed var(--error-color)' : undefined
                                                             }}
                                                             onClick={() => {
                                                                 if (isFilled && dep) {
                                                                     setSelectedCancelDeposit(dep);
                                                                 }
                                                             }}
                                                         >
                                                             {index + 1}
                                                             <div className="slot-tooltip">
                                                                 {isFilled ? (
                                                                     dep ? (
                                                                         `Case ${index + 1} : ${activeCarnetDetails.daily_mise.toLocaleString()} FC (Dépôt du ${new Date(dep.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}) ${isDeletable ? ' - Cliquez pour annuler' : ' - Plus de 24h (non annulable)'}`
                                                                     ) : `Case ${index + 1} : ${activeCarnetDetails.daily_mise.toLocaleString()} FC (Validé)`
                                                                 ) : `Case ${index + 1} : Vide`}
                                                             </div>
                                                         </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* EDIT DAILY MISE FORM (restricted to under 24 hours of creation for agents) */}
                                {currentUser.role === 'agent' && canEditParam(activeCarnetDetails.created_at) && activeCarnetDetails.status === 'active' && (
                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: '10px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                                        {!isEditingMise ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-medium)' }}>
                                                    ⚙️ Une erreur de saisie de la mise ? Modifiez-la avant la limite de 24h.
                                                </span>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '12px', padding: '6px 12px' }}
                                                    onClick={() => {
                                                        setIsEditingMise(true);
                                                        setEditMiseAmount(activeCarnetDetails.daily_mise);
                                                    }}
                                                >
                                                    <Edit2 size={12} /> Modifier la mise
                                                </button>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleMiseEdit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-medium)' }}>Nouvelle mise :</label>
                                                <select
                                                    className="form-control"
                                                    style={{ flexGrow: 1, maxWidth: '200px', padding: '6px 12px', height: 'auto' }}
                                                    value={editMiseAmount}
                                                    onChange={e => setEditMiseAmount(parseInt(e.target.value))}
                                                >
                                                    <option value={500}>500 FC</option>
                                                    <option value={1000}>1 000 FC</option>
                                                    <option value={2000}>2 000 FC</option>
                                                    <option value={3000}>3 000 FC</option>
                                                    <option value={5000}>5 000 FC</option>
                                                    <option value={10000}>10 000 FC</option>
                                                </select>
                                                <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>Confirmer</button>
                                                <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setIsEditingMise(false)}>Annuler</button>
                                            </form>
                                        )}
                                    </div>
                                )}

                                {/* ACTION: ADD DEPOSIT (Visible to the agent if carnet is active/ongoing) */}
                                {currentUser.role === 'agent' && activeCarnetDetails.status === 'active' && (
                                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-medium)', marginBottom: '14px' }}>
                                            📥 Enregistrer un versement (Dépôt)
                                        </h4>

                                        <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '12px' }}>Montant à verser (FC)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    step={activeCarnetDetails.daily_mise}
                                                    min={activeCarnetDetails.daily_mise}
                                                    max={activeCarnetDetails.daily_mise * (31 - (activeCarnetDetails.total_slots || 0))}
                                                    value={depositAmount}
                                                    onChange={e => setDepositAmount(parseInt(e.target.value))}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
                                                    Le dépôt doit être un multiple exact de {activeCarnetDetails.daily_mise} FC. Max restant possible : {activeCarnetDetails.daily_mise * (31 - (activeCarnetDetails.total_slots || 0))} FC
                                                </span>
                                            </div>

                                            {/* Quick fill buttons */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {[1, 2, 5, 10, 31].map(k => {
                                                    const amt = activeCarnetDetails.daily_mise * k;
                                                    const possibleSlots = 31 - (activeCarnetDetails.total_slots || 0);
                                                    if (k > possibleSlots) return null;
                                                    return (
                                                        <button
                                                            key={k}
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '12px', flexGrow: 1 }}
                                                            onClick={() => setDepositAmount(amt)}
                                                        >
                                                            x{k} ({amt.toLocaleString()} FC)
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '10px' }}>
                                                Valider le versement
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* ACTION: REQUEST WITHDRAWAL (Visible to agent when filled/locked OR when active with at least 2 deposits) */}
                                {currentUser.role === 'agent' && (activeCarnetDetails.status === 'locked' || (activeCarnetDetails.status === 'active' && (activeCarnetDetails.total_slots || 0) >= 2)) && (
                                    (() => {
                                        const carnetRequests = requests.filter(r => r.carnet_id === activeCarnetDetails?.id);
                                        const activeWithdrawalRequest = carnetRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                                        if (activeWithdrawalRequest && activeWithdrawalRequest.status === 'pending') {
                                            return (
                                                <div style={{
                                                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                                                    border: '1px dashed rgba(245, 158, 11, 0.4)',
                                                    padding: '24px',
                                                    borderRadius: '12px',
                                                    textAlign: 'center',
                                                    marginBottom: '16px'
                                                }}>
                                                    <div style={{
                                                        color: 'rgba(245, 158, 11, 1)',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <AlertTriangle size={36} className="animate-pulse" />
                                                    </div>
                                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                                                        Demande de Retrait en Cours
                                                    </h4>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-medium)', maxWidth: '420px', margin: '0 auto 18px' }}>
                                                        Une demande de liquidation de <strong>{activeWithdrawalRequest.requested_amount.toLocaleString()} FC</strong> a été initiée le {new Date(activeWithdrawalRequest.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}.
                                                        <br />
                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(245, 158, 11, 1)', display: 'block', marginTop: '6px' }}>
                                                            Statut : ⏳ En attente de validation par l'administrateur
                                                        </span>
                                                    </p>

                                                    <button
                                                        type="button"
                                                        className="btn btn-danger"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '10px 24px',
                                                            fontSize: '14px',
                                                            backgroundColor: 'var(--error-color)',
                                                            borderColor: 'var(--error-color)',
                                                            color: 'white'
                                                        }}
                                                        onClick={() => {
                                                            if (onCancelWithdrawalRequest) {
                                                                onCancelWithdrawalRequest(activeWithdrawalRequest.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={16} /> Annuler la demande de retrait
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // If there is a rejected request, show information banner but STILL allow creating a new request
                                        const showRejectedBanner = activeWithdrawalRequest && activeWithdrawalRequest.status === 'rejected';

                                        return (
                                            <>
                                                {showRejectedBanner && (
                                                    <div style={{
                                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                        border: '1px solid rgba(239, 68, 68, 0.15)',
                                                        padding: '16px',
                                                        borderRadius: '12px',
                                                        marginBottom: '16px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error-color)', fontWeight: 700, fontSize: '14px' }}>
                                                            <AlertTriangle size={18} />
                                                            Dernière demande de retrait refusée
                                                        </div>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-medium)', margin: 0 }}>
                                                            La demande de <strong>{activeWithdrawalRequest.requested_amount.toLocaleString()} FC</strong> du {new Date(activeWithdrawalRequest.created_at).toLocaleDateString('fr-FR')} a été rejetée par l'administrateur.
                                                        </p>
                                                        {activeWithdrawalRequest.rejection_reason && (
                                                            <div style={{ fontSize: '12px', color: 'var(--error-color)', backgroundColor: 'rgba(239, 68, 68, 0.04)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--error-color)', marginTop: '4px' }}>
                                                                <strong>Motif :</strong> {activeWithdrawalRequest.rejection_reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div style={{
                                                    backgroundColor: activeCarnetDetails.status === 'locked' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                                                    border: activeCarnetDetails.status === 'locked' ? '1px dashed var(--locked-border)' : '1px dashed rgba(245, 158, 11, 0.4)',
                                                    padding: '24px',
                                                    borderRadius: '12px',
                                                    textAlign: 'center',
                                                    marginBottom: '16px'
                                                }}>
                                                    <div style={{
                                                        color: activeCarnetDetails.status === 'locked' ? 'var(--locked-color)' : 'rgba(245, 158, 11, 1)',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        marginBottom: '12px'
                                                    }}>
                                                        {activeCarnetDetails.status === 'locked' ? <Lock size={36} /> : <AlertTriangle size={36} />}
                                                    </div>
                                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                                                        {activeCarnetDetails.status === 'locked' ? 'Félicitations ! Carnet rempli' : 'Demande de Retrait Anticipé'}
                                                    </h4>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-medium)', maxWidth: '420px', margin: '0 auto 18px' }}>
                                                        {activeCarnetDetails.status === 'locked' ? (
                                                            `Les 31 slots d'épargne ont été complétés. Le solde total de ${(activeCarnetDetails.total_deposited || 0).toLocaleString()} FC est verrouillé.`
                                                        ) : (
                                                            `Vous avez actuellement ${activeCarnetDetails.total_slots} dépôts enregistrés (solde de ${(activeCarnetDetails.total_deposited || 0).toLocaleString()} FC). Vous pouvez soumettre une demande de retrait anticipé.`
                                                        )}
                                                        <br />
                                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginTop: '6px' }}>
                                                            Frais d'adhésion déduits : {activeCarnetDetails.daily_mise.toLocaleString()} FC. Montant net remboursé : <strong>{Math.max(0, (activeCarnetDetails.total_deposited || 0) - activeCarnetDetails.daily_mise).toLocaleString()} FC</strong>.
                                                        </span>
                                                    </p>

                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '10px 24px',
                                                            fontSize: '14px',
                                                            backgroundColor: activeCarnetDetails.status === 'locked' ? 'var(--primary)' : 'rgba(245, 158, 11, 1)',
                                                            borderColor: activeCarnetDetails.status === 'locked' ? 'var(--primary)' : 'rgba(245, 158, 11, 1)'
                                                        }}
                                                        onClick={handleRequestWithdrawal}
                                                    >
                                                        Demander le retrait de {Math.max(0, (activeCarnetDetails.total_deposited || 0) - activeCarnetDetails.daily_mise).toLocaleString()} FC <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()
                                )}

                                {/* ARCHIVED STATUS COMPLETED CARD */}
                                {activeCarnetDetails.status === 'archived' && (
                                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed var(--success-border)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--success-color)', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                            <CheckCircle size={36} />
                                        </div>
                                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                                            Carnet Clôturé & Vidé
                                        </h4>
                                        <p style={{ fontSize: '13px', color: 'var(--text-medium)', maxWidth: '380px', margin: '0 auto' }}>
                                            Le solde net a été payé en mains propres de l'adhérent. La grille est officiellement archivée dans le système d'Épargne à la Carte d'Adonaï.
                                        </p>
                                    </div>
                                )}

                                {/* PENDING STATUS CARD */}
                                {activeCarnetDetails.status === 'pending' && (
                                    <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.05)', border: '1px dashed var(--pending-border)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                                            En attente de validation
                                        </h4>
                                        <p style={{ fontSize: '13px', color: 'var(--text-medium)', maxWidth: '380px', margin: '0 auto' }}>
                                            Le carnet a été initié et requiert la confirmation du premier dépôt par le superviseur ou l'administrateur.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="panel" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
                            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                            <h3>Aucun carnet sélectionné</h3>
                            <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '360px' }}>
                                Veuillez d'abord retourner sur la liste des carnets pour en sélectionner un et consulter son quadrillage.
                            </p>
                            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveSubTab('list')}>
                                Voir la liste
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── 3. FLOATING ACTION BUTTON FOR AGENTS (Opens Opening Modal) ── */}
            {currentUser.role === 'agent' && (
                <button
                    className="no-print"
                    style={{
                        position: 'fixed',
                        bottom: '80px',
                        right: '24px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 30px rgba(92, 59, 254, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50,
                        transition: 'transform 0.2s',
                    }}
                    onClick={() => {
                        setSelectedClientId('');
                        setDailyMise(1000);
                        setFirstDeposit(1000);
                        setCreationModalOpen(true);
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Ouvrir un nouveau carnet d'épargne"
                >
                    <Plus size={32} />
                </button>
            )}

            {/* ── 4. DETACHED CREATION FORM MODAL (Agent ONLY) ── */}
            {creationModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 110,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }} onClick={() => setCreationModalOpen(false)}>
                    
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '480px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderHeart size={20} style={{ color: 'var(--primary)' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>Nouveau carnet d'épargne</h3>
                            </div>
                            <button onClick={() => setCreationModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateSubmit} style={{ padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label className="form-label">Sélectionner le Client titulaire</label>
                                <select
                                    className="form-control"
                                    value={selectedClientId}
                                    onChange={e => setSelectedClientId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choisir un client titulaire --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label">Mise journalière (FC)</label>
                                    <select
                                        className="form-control"
                                        value={dailyMise}
                                        onChange={e => {
                                            const v = parseInt(e.target.value);
                                            setDailyMise(v);
                                            setFirstDeposit(v);
                                        }}
                                    >
                                        <option value={1000}>1 000 FC</option>
                                        <option value={2000}>2 000 FC</option>
                                        <option value={5000}>5 000 FC</option>
                                        <option value={10000}>10 000 FC</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Premier versement (FC)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={firstDeposit}
                                        min={dailyMise}
                                        step={dailyMise}
                                        onChange={e => setFirstDeposit(parseInt(e.target.value))}
                                        required
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px', display: 'block' }}>
                                        Multiple exact de {dailyMise} FC
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: 'var(--bg-app)',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '11px',
                                color: 'var(--text-medium)',
                                marginBottom: '20px'
                            }}>
                                ⚖️ <strong>Frais d'ouverture :</strong> Une commission fixe de <strong>500 FC</strong> est prélevée. Le solde du 1er dépôt (minimum {dailyMise} FC) est retenu comme frais opérationnels à la liquidation du carnet.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setCreationModalOpen(false)}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    Créer et valider premier dépôt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── 5. CANCEL DEPOSIT MODAL ── */}
            {selectedCancelDeposit && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 110,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }} onClick={() => setSelectedCancelDeposit(null)}>
                    
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--error-color)' }} />
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                                    Détails & Annulation du Dépôt
                                </h3>
                            </div>
                            <button onClick={() => setSelectedCancelDeposit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Montant déposé:</span>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                                        {selectedCancelDeposit.amount.toLocaleString()} FC
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Slots d'épargne:</span>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                                        {selectedCancelDeposit.slots_count} {selectedCancelDeposit.slots_count > 1 ? 'slots' : 'slot'}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Date & heure:</span>
                                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
                                        {new Date(selectedCancelDeposit.created_at).toLocaleString('fr-FR')}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Statut d'annulation:</span>
                                    {canEditParam(selectedCancelDeposit.created_at) ? (
                                        <span style={{ fontSize: '11px', color: 'var(--success-color)', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            Annulable (Moins de 24h)
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--error-color)', fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            Non-annulable (+ de 24h)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {canEditParam(selectedCancelDeposit.created_at) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--error-color)' }}>
                                        ⚠️ L'annulation supprimera définitivement ce versement de la grille du carnet. Le solde sera mis à jour en conséquence.
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedCancelDeposit(null)}>
                                            Fermer
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            style={{ backgroundColor: 'var(--error-color)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => {
                                                if (onDeleteDeposit) {
                                                    onDeleteDeposit(selectedCancelDeposit.id);
                                                }
                                                setSelectedCancelDeposit(null);
                                            }}
                                        >
                                            <Trash2 size={14} /> Annuler ce dépôt
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-medium)' }}>
                                        ℹ️ Conformément aux règles de sécurité, un versement ne peut plus être annulé par un agent de terrain après une période de 24 heures. Veuillez contacter un administrateur principal pour toute correction exceptionnelle.
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedCancelDeposit(null)}>
                                            Fermer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

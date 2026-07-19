import React, { useState, useEffect } from 'react';
import type { Client, UserProfile, SavingsCarnet } from '../lib/types';
import { UserPlus, Search, Phone, MapPin, Plus, X, ChevronUp, Download, Camera } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ClientsViewProps {
    clients: Client[];
    currentUser: UserProfile;
    profiles?: UserProfile[];
    onCreateClient: (
        client: Omit<Client, 'id' | 'created_at' | 'updated_at'>,
        carnetData?: { daily_mise: number; first_deposit: number }
    ) => void;
    onSelectClientForCarnet?: (client: Client) => void;
    onCreateCarnet?: (
        carnet: Omit<SavingsCarnet, 'id' | 'carnet_number' | 'supervisor_id' | 'status' | 'created_at' | 'updated_at'>,
        firstDeposit: number
    ) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
    clients,
    currentUser,
    profiles = [],
    onCreateClient,
    onSelectClientForCarnet: _onSelectClientForCarnet,
    onCreateCarnet
}) => {
    // Basic Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [photo, setPhoto] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [msg, setMsg] = useState('');
    const [mobileFormOpen, setMobileFormOpen] = useState(false);

    // Combined Carnet fields
    const [createCarnetToo, setCreateCarnetToo] = useState(false);
    const [dailyMise, setDailyMise] = useState('1000');
    const [firstDeposit, setFirstDeposit] = useState('1000');

    // Local Modal for +Nv Carnet
    const [selectedClientForModal, setSelectedClientForModal] = useState<Client | null>(null);
    const [modalDailyMise, setModalDailyMise] = useState('1000');
    const [modalFirstDeposit, setModalFirstDeposit] = useState('1000');
    const [modalError, setModalError] = useState('');

    // Supervisor filter
    const [selectedAgentId, setSelectedAgentId] = useState('all');

    // Lock body scroll when mobile form sheet is open
    useEffect(() => {
        if (mobileFormOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileFormOpen]);

    // Handle photo file selection and read as base64
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !address) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        let carnetDataOpt = undefined;
        if (createCarnetToo) {
            const m = Number(dailyMise);
            const d = Number(firstDeposit);
            if (m <= 0 || d <= 0) {
                alert('La mise et le premier dépôt doivent être supérieurs à 0.');
                return;
            }
            const k = d / m;
            if (k !== Math.floor(k)) {
                alert(`Le premier dépôt (${d} FC) doit être un multiple de la mise journalière (${m} FC).`);
                return;
            }
            carnetDataOpt = { daily_mise: m, first_deposit: d };
        }

        onCreateClient({
            name,
            phone,
            address,
            photo,
            created_by: currentUser.id,
            updated_by: currentUser.id
        }, carnetDataOpt);

        setName('');
        setPhone('');
        setAddress('');
        setPhoto(undefined);
        setCreateCarnetToo(false);
        setDailyMise('1000');
        setFirstDeposit('1000');
        setMsg(createCarnetToo ? 'Client enregistré et carnet ouvert avec succès.' : 'Client enregistré avec succès.');
        setMobileFormOpen(false);
        setTimeout(() => setMsg(''), 4000);
    };

    const handleLocalCarnetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientForModal || !onCreateCarnet) return;

        const m = Number(modalDailyMise);
        const d = Number(modalFirstDeposit);

        if (m <= 0 || d <= 0) {
            setModalError('La mise et le dépôt doivent être supérieurs à 0.');
            return;
        }

        const k = d / m;
        if (k !== Math.floor(k)) {
            setModalError(`Le dépôt (${d} FC) doit être un multiple de la mise (${m} FC).`);
            return;
        }

        try {
            onCreateCarnet({
                client_id: selectedClientForModal.id,
                daily_mise: m,
                agent_id: currentUser.id,
                created_by: currentUser.id,
                updated_by: currentUser.id
            }, d);

            setMsg(`Carnet ouvert pour ${selectedClientForModal.name}.`);
            setSelectedClientForModal(null);
            setModalError('');
            setTimeout(() => setMsg(''), 4000);
        } catch (err: any) {
            setModalError(err.message || 'Une erreur est survenue.');
        }
    };

    // Filter agents for supervisor filter UI
    const agents = profiles.filter(p => p.role === 'agent');

    // Searching and Agent Filtering
    const filteredClients = clients.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery);
        
        const matchesAgent = selectedAgentId === 'all' || c.created_by === selectedAgentId;
        return matchesSearch && matchesAgent;
    });

    // Premium PDF Export
    const handleDownloadPDF = (client: Client) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Background card layout style
        doc.setFillColor(92, 59, 254); // Primary Indigo color
        doc.rect(0, 0, 210, 45, 'F');

        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(24);
        doc.text("ADONAI EPARGNE", 15, 20);

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.text("FICHE OFFICIELLE D'IDENTIFICATION CLIENT", 15, 28);
        doc.text(`Identifiant Unique : ${client.id}`, 15, 34);

        // Date of Export
        doc.text(`Date d'export : ${new Date().toLocaleDateString()}`, 145, 20);

        // Main Profile details
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(16);
        doc.setFont('Helvetica', 'bold');
        doc.text("DONNÉES DU MEMBRE", 15, 62);

        // Divider
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(15, 65, 195, 65);

        // Draw Profile Image if available
        if (client.photo) {
            try {
                doc.addImage(client.photo, 'JPEG', 145, 75, 45, 45);
                // Draw elegant frame around image
                doc.setDrawColor(92, 59, 254);
                doc.setLineWidth(0.5);
                doc.rect(145, 75, 45, 45);
            } catch (err) {
                console.error("Impossible de dessiner l'image dans le PDF", err);
            }
        } else {
            // Draw dummy photo placeholder box
            doc.setFillColor(241, 245, 249);
            doc.rect(145, 75, 45, 45, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.rect(145, 75, 45, 45);
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(10);
            doc.text("[ Sans Photo ]", 155, 98);
        }

        // Details labels & values
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'normal');
        
        let y = 78;
        const drawField = (label: string, value: string) => {
            doc.setTextColor(100, 116, 139);
            doc.setFont('Helvetica', 'normal');
            doc.text(label, 15, y);
            doc.setTextColor(15, 23, 42);
            doc.setFont('Helvetica', 'bold');
            doc.text(value, 55, y);
            y += 11;
        };

        drawField("Nom Complet :", client.name);
        drawField("Téléphone :", client.phone);
        drawField("Adresse :", client.address);
        drawField("Enregistré Le :", new Date(client.created_at).toLocaleDateString());

        // Agent Name / Creator info mapping
        const creator = profiles.find(p => p.id === client.created_by);
        drawField("Enregistré Par :", creator ? `${creator.full_name} (${creator.role === 'agent' ? 'Agent' : creator.role})` : "Adonaï Admin");

        // Footer block
        doc.setFillColor(248, 250, 252); // slate 50
        doc.rect(15, 140, 180, 42, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 140, 180, 42);

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text("POLITIQUE DE PROTECTION DES DONNÉES & CRÉDIBILITÉ", 20, 148);
        
        doc.setFont('Helvetica', 'italic');
        doc.text("Ce document certifie l'inscription officielle du membre de l'organisation Adonaï Épargne.", 20, 156);
        doc.text("Le titulaire s'engage à respecter les consignes opérationnelles d'Épargne à la Carte.", 20, 162);
        doc.text("Toutes ses transactions financières sont enregistrées de façon immuable dans le Grand Livre.", 20, 168);

        // Save PDF
        doc.save(`fiche_client_${client.name.replace(/\s+/g, '_')}.pdf`);
    };

    /* ── Shared form UI ── */
    const formContent = (
        <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Nom Complet <span style={{ color: 'var(--error-color)' }}>*</span></label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Nom du client"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Numéro de Téléphone <span style={{ color: 'var(--error-color)' }}>*</span></label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: +243 ..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Adresse Domicile/Travail <span style={{ color: 'var(--error-color)' }}>*</span></label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Quartier, Avenue, Références..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={14} /> Photo d'identité du client
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="file"
                        accept="image/*"
                        id="client-photo-input"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="client-photo-input" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, padding: '8px 12px', fontSize: '13px' }}>
                        Choisir une Photo
                    </label>
                    {photo ? (
                        <div style={{ position: 'relative' }}>
                            <img src={photo} alt="Aperçu client" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                            <button type="button" onClick={() => setPhoto(undefined)} style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--error-color)', color: 'white', border: 'none', width: '16px', height: '16px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                    ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Aucun fichier choisi</span>
                    )}
                </div>
            </div>

            {/* Combined Carnet fields */}
            <div style={{
                backgroundColor: 'rgba(92, 59, 254, 0.04)',
                border: '1px dashed rgba(92, 59, 254, 0.25)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
            }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--primary)' }}>
                    <input
                        type="checkbox"
                        checked={createCarnetToo}
                        onChange={e => setCreateCarnetToo(e.target.checked)}
                    />
                    Ouvrir un carnet d'épargne immédiatement
                </label>
                
                {createCarnetToo && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px' }}>Mise Journalière (FC)</label>
                            <select className="form-control" value={dailyMise} onChange={e => { setDailyMise(e.target.value); setFirstDeposit(e.target.value); }}>
                                <option value="1000">1 000 FC</option>
                                <option value="2000">2 000 FC</option>
                                <option value="5000">5 000 FC</option>
                                <option value="10000">10 000 FC</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px' }}>Premier Dépôt Obligatoire (FC)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={firstDeposit}
                                onChange={e => setFirstDeposit(e.target.value)}
                                min={dailyMise}
                                step={dailyMise}
                            />
                            <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                                Doit être un multiple de la mise (ex: {Number(dailyMise).toLocaleString()} FC, {(Number(dailyMise)*2).toLocaleString()} FC, etc.)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Enregistrer Client {createCarnetToo && '& Ouvrir Carnet'}
            </button>
        </form>
    );

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Gestion des Clients</h2>
                    <p className="section-desc">Enregistrez et consultez les fiches des clients de l'organisation.</p>
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: 'var(--success-bg)',
                    color: '#047857',
                    border: '1px solid var(--success-border)',
                    fontWeight: 600,
                    fontSize: '13px'
                }}>
                    {msg}
                </div>
            )}

            {/* ── DESKTOP layout: side by side ── */}
            <div className="clients-desktop-grid">

                {/* Clients List panel */}
                <div className="panel clients-list-panel">
                    <div className="panel-header" style={{ flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="panel-title">Fiches clients</h3>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>
                                {filteredClients.length} clients trouvés
                            </span>
                        </div>

                        {/* Supervisor role agent filtering */}
                        {(currentUser.role === 'supervisor' || currentUser.role === 'admin_principal' || currentUser.role === 'super_admin') && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-medium)', whiteSpace: 'nowrap' }}>Agent :</label>
                                <select 
                                    className="form-control" 
                                    style={{ padding: '4px 8px', fontSize: '12px', height: 'auto', width: 'auto', flexGrow: 1 }}
                                    value={selectedAgentId}
                                    onChange={e => setSelectedAgentId(e.target.value)}
                                >
                                    <option value="all">Tous les Agents de terrain</option>
                                    {agents.map(ag => (
                                        <option key={ag.id} value={ag.id}>{ag.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', width: '16px', height: '16px' }} />
                            <input
                                type="text"
                                className="form-control"
                                style={{ paddingLeft: '38px', width: '100%' }}
                                placeholder="Rechercher par nom ou numéro..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="panel-body" style={{ padding: 0 }}>
                        {filteredClients.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
                                Aucun client enregistré ou correspondant à la recherche.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="responsive-table">
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>Coordonnées</th>
                                            <th>Adhésion</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {c.photo ? (
                                                            <img 
                                                                src={c.photo} 
                                                                alt={c.name} 
                                                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} 
                                                            />
                                                        ) : (
                                                            <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '13px', margin: 0 }}>
                                                                {c.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.name}</div>
                                                            <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>ID: {c.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                        <Phone size={12} style={{ color: 'var(--text-light)' }} />
                                                        <span>{c.phone}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginTop: '2px' }}>
                                                        <MapPin size={12} style={{ color: 'var(--text-light)' }} />
                                                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                                            {c.address}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={() => handleDownloadPDF(c)}
                                                            title="Télécharger la fiche en PDF"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                        {currentUser.role === 'agent' && onCreateCarnet && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                onClick={() => {
                                                                    setSelectedClientForModal(c);
                                                                    setModalDailyMise('1000');
                                                                    setModalFirstDeposit('1000');
                                                                    setModalError('');
                                                                }}
                                                            >
                                                                <Plus size={12} /> Nv Carnet
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DESKTOP Creation panel ── */}
                {currentUser.role === 'agent' && (
                    <div className="panel clients-form-panel">
                        <div className="panel-header">
                            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserPlus size={18} />
                                Nouveau Client
                            </h3>
                        </div>
                        <div className="panel-body">
                            {formContent}
                        </div>
                    </div>
                )}
            </div>

            {/* ── MOBILE FAB: open bottom sheet form ── */}
            {currentUser.role === 'agent' && (
                <button
                    className="mobile-fab-add no-print"
                    onClick={() => setMobileFormOpen(true)}
                    aria-label="Ajouter un client"
                >
                    <UserPlus size={22} />
                    <span>Nouveau client</span>
                </button>
            )}

            {/* ── MOBILE Bottom Sheet Form ── */}
            {currentUser.role === 'agent' && (
                <>
                    {/* Sheet backdrop */}
                    <div
                        className={`mobile-sheet-backdrop ${mobileFormOpen ? 'open' : ''}`}
                        onClick={() => setMobileFormOpen(false)}
                    />
                    {/* Sheet panel */}
                    <div className={`mobile-bottom-sheet ${mobileFormOpen ? 'open' : ''} no-print`}>
                        {/* Handle + header */}
                        <div className="mobile-sheet-handle-row">
                            <div className="mobile-sheet-handle" />
                        </div>
                        <div className="mobile-sheet-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserPlus size={20} style={{ color: 'var(--primary)' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>Nouveau Client</h3>
                            </div>
                            <button
                                className="mobile-sheet-close"
                                onClick={() => setMobileFormOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mobile-sheet-body">
                            {formContent}
                        </div>
                        {/* Scroll hint */}
                        <div className="mobile-sheet-scroll-hint">
                            <ChevronUp size={14} style={{ opacity: 0.4 }} />
                        </div>
                    </div>
                </>
            )}

            {/* ── LOCAL MODAL: NEW CARNET FORM (Instead of redirecting) ── */}
            {selectedClientForModal && (
                <>
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }} onClick={() => setSelectedClientForModal(null)}>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '460px',
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
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>Ouvrir un Carnet</h3>
                                <button onClick={() => setSelectedClientForModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleLocalCarnetSubmit} style={{ padding: '20px' }}>
                                {modalError && (
                                    <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: '1px solid var(--error-border)', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
                                        {modalError}
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Client Titulaire</label>
                                    <input type="text" className="form-control" value={selectedClientForModal.name} disabled style={{ backgroundColor: 'var(--bg-app)', fontWeight: 600 }} />
                                </div>

                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label className="form-label">Mise Journalière (FC)</label>
                                    <select className="form-control" value={modalDailyMise} onChange={e => { setModalDailyMise(e.target.value); setModalFirstDeposit(e.target.value); }}>
                                        <option value="1000">1 000 FC</option>
                                        <option value="2000">2 000 FC</option>
                                        <option value="5000">5 000 FC</option>
                                        <option value="10000">10 000 FC</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Premier Dépôt Obligatoire (FC)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={modalFirstDeposit}
                                        onChange={e => setModalFirstDeposit(e.target.value)}
                                        min={modalDailyMise}
                                        step={modalDailyMise}
                                        required
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                                        Doit être un multiple de la mise (ex: {Number(modalDailyMise).toLocaleString()} FC, {(Number(modalDailyMise)*2).toLocaleString()} FC, etc.)
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedClientForModal(null)}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Créer le Carnet
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

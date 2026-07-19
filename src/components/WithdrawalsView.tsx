import React, { useState } from 'react';
import type { WithdrawalRequest, UserProfile } from '../lib/types';
import { Check, X, AlertCircle } from 'lucide-react';

interface WithdrawalsProps {
    requests: WithdrawalRequest[];
    currentUser: UserProfile;
    onReviewRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
}

export const WithdrawalsView: React.FC<WithdrawalsProps> = ({
    requests,
    currentUser,
    onReviewRequest
}) => {
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [msg, setMsg] = useState('');

    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin_principal';

    const handleApprove = (id: string) => {
        if (window.confirm('Voulez-vous valider et approuver ce retrait ? Cette action est irréversible, archivera le carnet et distribuera les fonds.')) {
            try {
                onReviewRequest(id, 'approved');
                setMsg('Retrait approuvé et archivé.');
                setTimeout(() => setMsg(''), 4000);
            } catch (err: any) {
                alert(err.message || 'Erreur lors de la validation.');
            }
        }
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !rejectId) {
            alert('Veuillez spécifier la raison du rejet.');
            return;
        }

        try {
            onReviewRequest(rejectId, 'rejected', reason);
            setRejectId(null);
            setReason('');
            setMsg('Retrait rejeté avec justification.');
            setTimeout(() => setMsg(''), 4000);
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la modification.');
        }
    };

    const getStatusBadge = (status: WithdrawalRequest['status']) => {
        switch (status) {
            case 'pending': return <span className="badge badge-pending">En attente</span>;
            case 'approved': return <span className="badge badge-active">Approuvé & Payé</span>;
            case 'rejected': return <span className="badge badge-rejected">Rejeté</span>;
        }
    };

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Demandes de Retrait</h2>
                    <p className="section-desc">
                        {isAdmin
                            ? 'Validez les dossiers de retrait remplis pour libérer les fonds.'
                            : 'Suivez le statut de vos demandes de retrait soumises.'}
                    </p>
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

            {/* Rejection Form Modal-Panel */}
            {rejectId && (
                <div className="panel animate-fade-in" style={{ borderColor: 'var(--error-color)' }}>
                    <div className="panel-header" style={{ backgroundColor: 'var(--error-bg)' }}>
                        <h3 className="panel-title" style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} />
                            Rejeter la demande de retrait
                        </h3>
                    </div>
                    <div className="panel-body">
                        <form onSubmit={handleRejectSubmit}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label">Raison du rejet / Pièces manquantes</label>
                                <textarea
                                    className="form-control"
                                    placeholder="Justifiez la décision (ex: Signature client manquante, erreur slots...)"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setRejectId(null)}>Annuler</button>
                                <button type="submit" className="btn btn-danger">Confirmer Rejet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main requests table */}
            <div className="panel">
                <div className="panel-header">
                    <h3 className="panel-title">Toutes les demandes</h3>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                    {requests.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
                            Aucune demande de retrait enregistrée.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Carnet</th>
                                        <th>Client</th>
                                        <th>Agent / Émetteur</th>
                                        <th>Mise / Retrait Brut</th>
                                        <th>Montant Net (-1er)</th>
                                        <th>Statut</th>
                                        <th>Date demande</th>
                                        {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(r => {
                                        const isPending = r.status === 'pending';
                                        const amountNet = r.requested_amount; // already has first deposit deducted
                                        const gross = amountNet + (r.daily_mise || 0);

                                        return (
                                            <tr key={r.id}>
                                                <td>
                                                    <code style={{ fontWeight: 700 }}>{r.carnet_number}</code>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{r.client_name}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '13px' }}>{r.agent_name}</span>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '13px' }}>Brut: {gross.toLocaleString()} FC</div>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Mise: {r.daily_mise?.toLocaleString()} FC</span>
                                                </td>
                                                <td>
                                                    <strong style={{ color: 'var(--success-color)' }}>{amountNet.toLocaleString()} FC</strong>
                                                </td>
                                                <td>
                                                    {getStatusBadge(r.status)}
                                                    {r.status === 'rejected' && r.rejection_reason && (
                                                        <div style={{ fontSize: '10px', color: 'var(--error-color)', maxWidth: '200px', marginTop: '4px', fontStyle: 'italic' }}>
                                                            Réf: {r.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                                {isAdmin && (
                                                    <td style={{ textAlign: 'right' }}>
                                                        {isPending ? (
                                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    className="btn btn-success"
                                                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                                                    onClick={() => handleApprove(r.id)}
                                                                    title="Approuver le retrait"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger"
                                                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                                                    onClick={() => setRejectId(r.id)}
                                                                    title="Rejeter la demande"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>Validé</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

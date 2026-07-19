import React, { useState } from 'react';
import type { UserProfile, UserRole } from '../lib/types';
import { UserPlus, Trash } from 'lucide-react';

interface ProfilesViewProps {
    profiles: UserProfile[];
    currentUser: UserProfile;
    onCreateProfile: (profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>, supervisorOrAdminIdName?: string) => void;
    onDeleteProfile: (id: string) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
    profiles,
    currentUser,
    onCreateProfile,
    onDeleteProfile
}) => {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [targetRole, setTargetRole] = useState<UserRole>('agent');
    const [msg, setMsg] = useState({ text: '', type: '' });

    // Determine which roles current user can create
    const allowedRoles = React.useMemo<UserRole[]>(() => {
        if (currentUser.role === 'super_admin') {
            return ['admin_principal'];
        } else if (currentUser.role === 'admin_principal') {
            return ['supervisor'];
        } else if (currentUser.role === 'supervisor') {
            return ['agent'];
        }
        return [];
    }, [currentUser.role]);

    // Pre-load default role selection
    React.useEffect(() => {
        if (allowedRoles.length > 0) {
            setTargetRole(allowedRoles[0]);
        }
    }, [currentUser, allowedRoles]);

    // Filters profiles depending on hierarchical rules
    const visibleProfiles = profiles.filter(p => {
        if (currentUser.role === 'super_admin' || currentUser.role === 'admin_principal') {
            return true; // Sees all
        }
        if (currentUser.role === 'supervisor') {
            // Sees themselves, and agents created by them or supervised by them
            return p.id === currentUser.id || p.created_by === currentUser.id || p.role === 'agent';
        }
        // Agent sees themselves, and their supervisor
        return p.id === currentUser.id || p.id === currentUser.created_by;
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !phone) {
            setMsg({ text: 'Veuillez remplir tous les champs.', type: 'error' });
            return;
        }

        try {
            const associatedParentId =
                currentUser.role === 'super_admin' ? currentUser.id // Admin principal created by Superadmin
                    : currentUser.role === 'admin_principal' ? currentUser.id // Supervisor created by Admin
                        : currentUser.role === 'supervisor' ? currentUser.id // Agent created by Supervisor
                            : undefined;

            onCreateProfile({
                role: targetRole,
                full_name: fullName,
                phone: phone,
                created_by: currentUser.id
            }, associatedParentId);

            setFullName('');
            setPhone('');
            setMsg({ text: 'Compte utilisateur créé avec succès.', type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err: any) {
            setMsg({ text: err.message || 'Erreur lors de la création.', type: 'error' });
        }
    };

    const handleDelete = (id: string, roleToDelete: UserRole) => {
        // Role limitation check
        if (currentUser.role === 'super_admin' && roleToDelete !== 'admin_principal') {
            alert('Un Super Admin ne peut supprimer que les Admins Principaux.');
            return;
        }
        if (currentUser.role === 'admin_principal' && roleToDelete !== 'supervisor') {
            alert('Un Admin Principal ne peut supprimer que les Superviseurs.');
            return;
        }
        if (currentUser.role === 'supervisor' && roleToDelete !== 'agent') {
            alert('Un Superviseur ne peut supprimer que les Agents de terrain.');
            return;
        }

        if (window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
            onDeleteProfile(id);
            setMsg({ text: 'Compte supprimé.', type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        }
    };

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
            <div className="section-header">
                <div>
                    <h2 className="section-title">Comptes & Hiérarchie</h2>
                    <p className="section-desc">Gérez les profils et les permissions d'accès conformément aux règles hiérarchiques.</p>
                </div>
            </div>

            {msg.text && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8.px',
                    marginBottom: '20px',
                    backgroundColor: msg.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: msg.type === 'success' ? '#047857' : '#b91c1c',
                    border: `1.px solid ${msg.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
                    fontWeight: 600,
                    fontSize: '13px'
                }}>
                    {msg.text}
                </div>
            )}

            {/* Creation form based on role limitations */}
            {allowedRoles.length > 0 && (
                <div className="panel animate-fade-in">
                    <div className="panel-header">
                        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserPlus size={18} />
                            Créer un compte subordonné
                        </h3>
                    </div>
                    <div className="panel-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Nom Complet</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ex: Dieudonné Muguzi"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Téléphone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ex: +243 ..."
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Rôle attribué</label>
                                    <select
                                        className="form-control"
                                        value={targetRole}
                                        onChange={e => setTargetRole(e.target.value as UserRole)}
                                    >
                                        {allowedRoles.map(role => (
                                            <option key={role} value={role}>{getRoleLabel(role)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="submit" className="btn btn-primary">
                                    Créer l'utilisateur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Full users table */}
            <div className="panel">
                <div className="panel-header">
                    <h3 className="panel-title">Membres de l'organisation</h3>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Nom Complet</th>
                                    <th>Téléphone</th>
                                    <th>Rôle</th>
                                    <th>ID Unique</th>
                                    <th>Créé Le</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleProfiles.map(p => {
                                    const isSelf = p.id === currentUser.id;
                                    const canDelete = !isSelf && (
                                        (currentUser.role === 'super_admin' && p.role === 'admin_principal') ||
                                        (currentUser.role === 'admin_principal' && p.role === 'supervisor') ||
                                        (currentUser.role === 'supervisor' && p.role === 'agent')
                                    );

                                    return (
                                        <tr key={p.id} style={{ opacity: isSelf ? 0.95 : 1 }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        backgroundColor: p.role === 'super_admin' ? 'var(--error-bg)' : p.role === 'admin_principal' ? 'var(--primary-light)' : 'var(--border)',
                                                        color: p.role === 'super_admin' ? 'var(--error-color)' : p.role === 'admin_principal' ? 'var(--primary)' : 'var(--text-dark)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 700
                                                    }}>
                                                        {p.full_name.charAt(0)}
                                                    </span>
                                                    <div>
                                                        <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                                                        {isSelf && <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>VOUS</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{p.phone}</td>
                                            <td>
                                                <span className={`badge ${p.role === 'super_admin' ? 'badge-rejected' :
                                                    p.role === 'admin_principal' ? 'badge-primary' :
                                                        p.role === 'supervisor' ? 'badge-locked' : 'badge-active'
                                                    }`} style={{
                                                        backgroundColor: p.role === 'super_admin' ? 'rgba(239, 68, 68, 0.1)' : p.role === 'admin_principal' ? 'var(--primary-light)' : undefined,
                                                        color: p.role === 'super_admin' ? '#ef4444' : p.role === 'admin_principal' ? 'var(--primary)' : undefined,
                                                        borderColor: p.role === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' : p.role === 'admin_principal' ? 'rgba(92, 59, 254, 0.2)' : undefined,
                                                    }}>
                                                    {getRoleLabel(p.role)}
                                                </span>
                                            </td>
                                            <td><code style={{ fontSize: '11px' }}>{p.id}</code></td>
                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {canDelete ? (
                                                    <button
                                                        className="btn btn-link"
                                                        style={{ color: 'var(--error-color)' }}
                                                        onClick={() => handleDelete(p.id, p.role)}
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>Aucune</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};

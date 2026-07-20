import React, { useState } from 'react';
import logoAdonai from '../assets/logo-adonai.jpg';
import { Mail, Lock, Sparkles, Database } from 'lucide-react';
import type { UserRole } from '../lib/types';

interface AuthScreenProps {
    isSupabaseConfigured: boolean;
    onLogin: (email: string, password: string) => Promise<void>;
    onSignup: (email: string, password: string, fullName: string, phone: string, role: UserRole) => Promise<void>;
    onSimulationLogin: (role: UserRole) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
    isSupabaseConfigured,
    onLogin,
    onSimulationLogin,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!email || !password) {
            setErrorMsg('Veuillez renseigner votre email et votre mot de passe.');
            return;
        }
        setLoading(true);
        try {
            await onLogin(email, password);
        } catch (err: any) {
            setErrorMsg(err.message || 'Email ou mot de passe incorrect.');
        } finally {
            setLoading(false);
        }
    };

    const handleSimulationClick = async (selectedRole: UserRole) => {
        setErrorMsg('');
        setLoading(true);
        try {
            await onSimulationLogin(selectedRole);
        } catch (err: any) {
            setErrorMsg(err.message || 'Impossible de se connecter en mode simulation.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '11px 14px 11px 40px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: '#f8fafc',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    };

    const simButtonStyle = (_roleColor: string): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        color: '#f8fafc',
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
    });

    const simulationRoles: { role: UserRole; label: string; desc: string; color: string }[] = [
        { role: 'super_admin', label: 'Super Administrateur', desc: 'Accès total à toute la configuration', color: '#818cf8' },
        { role: 'admin_principal', label: 'Administrateur Principal', desc: 'Gestion financière et validation globale', color: '#38bdf8' },
        { role: 'supervisor', label: 'Superviseur', desc: 'Gestion et validation des agents de terrain', color: '#34d399' },
        { role: 'agent', label: 'Agent de Terrain', desc: 'Enregistrement de clients et collecte d\'épargne', color: '#fbbf24' }
    ];

    return (
        <div style={{
            display: 'flex',
            width: '100%',
            flex: 1,
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            padding: '24px',
        }}>
            {/* Decorative blobs */}
            <div style={{
                position: 'fixed', top: '-10%', right: '-5%',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'fixed', bottom: '-10%', left: '-5%',
                width: '350px', height: '350px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(20,184,166,0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Header */}
                <div style={{
                    padding: '36px 36px 24px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                    <img
                        src={logoAdonai}
                        alt="Logo Adonaï"
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '18px',
                            objectFit: 'cover',
                            marginBottom: '16px',
                            border: '2px solid rgba(99, 102, 241, 0.5)',
                            boxShadow: '0 0 24px rgba(99, 102, 241, 0.25)',
                        }}
                    />
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                        Adonaï Épargne
                    </h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
                        {isSupabaseConfigured
                            ? 'Connectez-vous à votre espace de gestion'
                            : 'Mode Démo / Simulation'}
                    </p>
                </div>

                {/* Form or Simulation body */}
                <div style={{ padding: '32px 36px 36px' }}>
                    {errorMsg && (
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#fca5a5',
                            fontSize: '13px',
                            marginBottom: '20px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{ fontSize: '16px' }}>⚠</span>
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#a7f3d0',
                            fontSize: '13px',
                            marginBottom: '20px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{ fontSize: '16px' }}>✓</span>
                            {successMsg}
                        </div>
                    )}

                    {!isSupabaseConfigured ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                fontSize: '12.5px',
                                lineHeight: 1.4,
                                fontWeight: 500,
                            }}>
                                <Sparkles size={20} style={{ flexShrink: 0 }} />
                                <span>
                                    <strong>Base locale active.</strong> Choisissez un profil ci-dessous pour tester l'interface :
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {simulationRoles.map(({ role: r, label, desc, color }) => (
                                    <button
                                        key={r}
                                        onClick={() => handleSimulationClick(r)}
                                        disabled={loading}
                                        style={simButtonStyle(color)}
                                        onMouseOver={e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
                                            e.currentTarget.style.borderColor = color;
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                            e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.2), 0 0 8px ${color}1a`;
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: color,
                                            boxShadow: `0 0 8px ${color}`,
                                            flexShrink: 0,
                                        }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{label}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>{desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                            {/* Email */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}>
                                    Adresse Email
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#475569',
                                        display: 'flex', alignItems: 'center',
                                    }}>
                                        <Mail size={16} />
                                    </span>
                                    <input
                                        id="auth-email"
                                        type="email"
                                        placeholder="votre.email@adonai.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}>
                                    Mot de passe
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#475569',
                                        display: 'flex', alignItems: 'center',
                                    }}>
                                        <Lock size={16} />
                                    </span>
                                    <input
                                        id="auth-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                id="auth-submit"
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    borderRadius: '10px',
                                    background: loading
                                        ? 'rgba(99,102,241,0.5)'
                                        : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    marginTop: '8px',
                                    transition: 'all 0.2s',
                                    boxShadow: loading ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.35)',
                                    letterSpacing: '0.01em',
                                }}
                                onMouseOver={e => {
                                    if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span style={{
                                            width: '16px', height: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            animation: 'spin 0.7s linear infinite',
                                        }} />
                                        Connexion...
                                    </span>
                                ) : "Se connecter"}
                            </button>
                        </form>
                    )}

                    {/* Footer note */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '24px',
                        color: isSupabaseConfigured ? '#34d399' : '#f59e0b',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}>
                        {isSupabaseConfigured ? (
                            <>
                                <Database size={12} />
                                <span>Base Supabase de Production active</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} />
                                <span>Base Simulation Locale active</span>
                            </>
                        )}
                    </div>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '20px',
                        lineHeight: 1.5,
                        fontWeight: 500,
                    }}>
                        Accès réservé aux membres autorisés de l'organisation Adonaï.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

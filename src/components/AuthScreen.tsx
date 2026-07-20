import React, { useState } from 'react';
import logoAdonai from '../assets/logo-adonai.jpg';
import { Mail, Lock } from 'lucide-react';

interface AuthScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

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
                        Connectez-vous à votre espace de gestion
                    </p>
                </div>

                {/* Form body */}
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
                                    Connexion en cours...
                                </span>
                            ) : 'Se connecter'}
                        </button>
                    </form>

                    {/* Footer note */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#334155',
                        marginTop: '24px',
                        lineHeight: 1.5,
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

import { useState, useEffect, useRef } from 'react';
import {
  dbSimulated,
  isSupabaseConfigured
} from './lib/supabase';
import type {
  UserProfile, Client, SavingsCarnet,
  CarnetDeposit, WithdrawalRequest, LedgerEntry,
  AgentMonthlyReward, OrgRevenueSnapshot, UserRole
} from './lib/types';
import { DashboardOverview } from './components/DashboardOverview';
import { ProfilesView } from './components/ProfilesView';
import { ClientsView } from './components/ClientsView';
import { CarnetsView } from './components/CarnetsView';
import { WithdrawalsView } from './components/WithdrawalsView';
import { LedgerView } from './components/LedgerView';
import { StatisticsView } from './components/StatisticsView';
import logoAdonai from './assets/logo-adonai.jpg';

// Icons
import {
  LayoutDashboard, Users, FolderHeart,
  ArrowUpDown, BookOpen, LogOut,
  Database, Shield, Sparkles, Moon, Sun, X, TrendingUp, Bell
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Database States
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [carnets, setCarnets] = useState<SavingsCarnet[]>([]);
  const [deposits, setDeposits] = useState<CarnetDeposit[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewards, setRewards] = useState<AgentMonthlyReward[]>([]);
  const [snapshots, setSnapshots] = useState<OrgRevenueSnapshot[]>([]);

  // Navigation helpers
  const [selectedClientForNewCarnet, setSelectedClientForNewCarnet] = useState<Client | null>(null);

  // In-app Push Notification State
  interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    created_at: string;
    read: boolean;
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      title: 'Plateforme Active',
      message: 'Bienvenue sur la plateforme Adonai Épargne ! Les modules sont connectés et opérationnels.',
      type: 'success',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      read: false
    },
    {
      id: 'notif-2',
      title: 'Grand Livre',
      message: 'Le grand livre est actif et calcule les commissions automatiquement.',
      type: 'info',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      read: true
    }
  ]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<{ 
    title: string; 
    message: string; 
    type: string; 
    onUndo?: () => void; 
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const closeToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(null);
  };

  const showNotification = (
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' = 'info',
    options?: { onUndo?: () => void }
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      type,
      created_at: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    setActiveToast({ title, message, type, onUndo: options?.onUndo });

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 18000); // 18 seconds auto-close to give time for undo action
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationsOpen(false);
  };

  const renderNotificationBell = (isMobile: boolean) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    return (
      <div className="notification-container">
        <button 
          className="notification-bell-btn" 
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          style={isMobile ? { padding: '6px' } : undefined}
        >
          <Bell size={isMobile ? 18 : 16} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>
        {notificationsOpen && (
          <div className="notification-dropdown" style={isMobile ? { right: '-50px', width: '300px' } : undefined}>
            <div className="notification-dropdown-header">
              <span className="notification-dropdown-title">Notifications Push</span>
              {unreadCount > 0 && (
                <button className="notification-mark-all-btn" onClick={markAllAsRead}>
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">Aucune notification.</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.read ? '' : 'unread'}`}
                    onClick={() => {
                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                    }}
                  >
                    <div 
                      className="notification-item-icon"
                      style={{
                        backgroundColor: notif.type === 'success' ? 'var(--success-bg)' : notif.type === 'warning' ? 'var(--pending-bg)' : 'var(--primary-light)',
                        color: notif.type === 'success' ? 'var(--success-color)' : notif.type === 'warning' ? 'var(--pending-color)' : 'var(--primary)',
                      }}
                    >
                      {notif.type === 'success' ? '✓' : notif.type === 'warning' ? '!' : 'i'}
                    </div>
                    <div className="notification-item-content">
                      <span className="notification-item-title">{notif.title}</span>
                      <span className="notification-item-msg">{notif.message}</span>
                      <span className="notification-item-time">
                        {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Load Database Values
  const refreshData = () => {
    const loadedProfiles = dbSimulated.getProfiles();
    const loadedClients = dbSimulated.getClients();
    const loadedCarnets = dbSimulated.getCarnets();
    const loadedDeposits = dbSimulated.getDeposits();
    const loadedRequests = dbSimulated.getRequests();
    const loadedLedger = dbSimulated.getLedger();
    const loadedRewards = dbSimulated.getAgentMonthlyRewards();
    const loadedSnapshots = dbSimulated.getMonthlySnapshots();

    // RLS Enforcement Simulation
    const user = dbSimulated.getCurrentUser();
    setCurrentUser(user);

    if (user.role === 'super_admin' || user.role === 'admin_principal') {
      setProfiles(loadedProfiles);
      setClients(loadedClients);
      setCarnets(loadedCarnets);
      setRequests(loadedRequests);
      setLedger(loadedLedger);
    } else if (user.role === 'supervisor') {
      const subAgents = loadedProfiles
        .filter(p => p.role === 'agent' && p.created_by === user.id)
        .map(p => p.id);

      const agentIds = [user.id, ...subAgents];

      setProfiles(loadedProfiles.filter(p => p.id === user.id || p.created_by === user.id || p.role === 'agent'));
      setClients(loadedClients.filter(c => agentIds.includes(c.created_by)));
      setCarnets(loadedCarnets.filter(c => c.supervisor_id === user.id || agentIds.includes(c.agent_id)));
      setRequests(loadedRequests.filter(r => {
        const car = loadedCarnets.find(c => c.id === r.carnet_id);
        return car && (car.supervisor_id === user.id || agentIds.includes(car.agent_id));
      }));
      setLedger(loadedLedger.filter(l => l.type !== 'org_gain'));
    } else if (user.role === 'agent') {
      setProfiles(loadedProfiles.filter(p => p.id === user.id || p.id === user.created_by));
      setClients(loadedClients.filter(c => c.created_by === user.id));
      setCarnets(loadedCarnets.filter(c => c.agent_id === user.id));
      setRequests(loadedRequests.filter(r => {
        const car = loadedCarnets.find(c => c.id === r.carnet_id);
        return car && car.agent_id === user.id;
      }));
      setLedger(loadedLedger.filter(l => l.agent_id === user.id));
    }

    setDeposits(loadedDeposits);
    setRewards(loadedRewards);
    setSnapshots(loadedSnapshots);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update HTML theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  // Auth Operations
  const handleRoleChange = (role: UserRole) => {
    const loadedProfiles = dbSimulated.getProfiles();
    const targetUser = loadedProfiles.find(p => p.role === role) || loadedProfiles[0];
    dbSimulated.setCurrentUser(targetUser);
    refreshData();
  };

  const handleLogout = () => {
    dbSimulated.setCurrentUser(null);
    window.location.reload();
  };

  // Creation Operations
  const handleCreateProfile = (profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>, parentId?: string) => {
    dbSimulated.createProfile(profile, parentId);
    showNotification('Nouveau Profil', `Profil de ${profile.full_name} créé avec succès.`, 'info');
    refreshData();
  };

  const handleDeleteProfile = (id: string) => {
    dbSimulated.deleteProfile(id);
    showNotification('Profil Supprimé', `Profil supprimé de l'organisation.`, 'warning');
    refreshData();
  };

  const handleCreateClient = (
    client: Omit<Client, 'id' | 'created_at' | 'updated_at'>,
    carnetData?: { daily_mise: number; first_deposit: number }
  ) => {
    const newClient = dbSimulated.createClient(client);
    showNotification('Nouveau Client', `Membre ${newClient.name} enregistré avec succès.`, 'success');
    if (carnetData && currentUser) {
      dbSimulated.createCarnet({
        client_id: newClient.id,
        daily_mise: carnetData.daily_mise,
        agent_id: currentUser.id,
        created_by: currentUser.id,
        updated_by: currentUser.id
      }, carnetData.first_deposit);
      showNotification('Carnet Ouvert', `Carnet d'épargne d'ouverture créé pour ${newClient.name}.`, 'success');
    }
    refreshData();
  };

  const handleCreateCarnet = (carnet: Omit<SavingsCarnet, 'id' | 'carnet_number' | 'supervisor_id' | 'status' | 'created_at' | 'updated_at'>, firstDeposit: number) => {
    dbSimulated.createCarnet(carnet, firstDeposit);
    showNotification('Carnet Ouvert', `Nouveau carnet ouvert avec premier dépôt de ${firstDeposit} FC.`, 'success');
    refreshData();
  };

  const handleAddDeposit = (deposit: Omit<CarnetDeposit, 'id' | 'slots_count' | 'created_at' | 'updated_at'>) => {
    const newDep = dbSimulated.addDeposit(deposit);
    showNotification('Versement Validé', `Dépôt de ${deposit.amount} FC enregistré.`, 'success', {
      onUndo: () => {
        dbSimulated.deleteDeposit(newDep.id);
        showNotification('Versement Annulé', `Le versement de ${deposit.amount} FC a été annulé.`, 'warning');
        refreshData();
      }
    });
    refreshData();
  };
  
  const handleDeleteDeposit = (depositId: string) => {
    if (!currentUser) return;
    try {
      dbSimulated.deleteDeposit(depositId);
      showNotification('Dépôt Supprimé', `Le versement a été annulé avec succès.`, 'warning');
      refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de supprimer ce versement.', 'warning');
    }
  };

  const handleUpdateDailyMise = (carnetId: string, newMise: number) => {
    if (!currentUser) return;
    dbSimulated.updateCarnetDailyMise(carnetId, newMise, currentUser.id);
    showNotification('Mise Journalière', `Mise journalière mise à jour à ${newMise} FC.`, 'info');
    refreshData();
  };

  const handleRequestWithdrawal = (carnetId: string, amount: number) => {
    if (!currentUser) return;
    dbSimulated.createRequest({
      carnet_id: carnetId,
      requested_amount: amount,
      created_by: currentUser.id,
      updated_by: currentUser.id
    });
    showNotification('Retrait Initié', `Demande de liquidation de ${amount} FC soumise pour validation.`, 'warning');
    refreshData();
  };

  const handleCancelWithdrawalRequest = (requestId: string) => {
    if (!currentUser) return;
    try {
      dbSimulated.cancelRequest(requestId);
      showNotification('Retrait Annulé', 'La demande de retrait a été annulée.', 'info');
      refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible d\'annuler la demande.', 'warning');
    }
  };

  const handleReviewRequest = (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!currentUser) return;
    dbSimulated.reviewRequest(requestId, status, currentUser.id, reason);
    showNotification(
      status === 'approved' ? 'Retrait Approuvé' : 'Retrait Rejeté',
      status === 'approved' ? `La demande de retrait a été liquidée avec succès.` : `La demande a été rejetée.`,
      status === 'approved' ? 'success' : 'warning'
    );
    refreshData();
  };

  const handleQuickLinkNewCarnet = (client: Client) => {
    setSelectedClientForNewCarnet(client);
    setActiveTab('carnets');
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin_principal': return 'Admin Principal';
      case 'supervisor': return 'Superviseur';
      case 'agent': return 'Agent de Terrain';
    }
  };

  if (!currentUser) {
    return (
      <div className="auth-wrapper">
        <div style={{ color: 'white', textAlign: 'center' }}>Chargement de l'environnement...</div>
      </div>
    );
  }

  // Bottom nav: 4 main items
  const bottomNavItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'Bord' },
    { id: 'clients', icon: <Users size={22} />, label: 'Clients' },
    { id: 'carnets', icon: <FolderHeart size={22} />, label: 'Carnets' },
    { id: 'withdrawals', icon: <ArrowUpDown size={22} />, label: 'Retraits' },
  ];

  // Sidebar-only items (2 extras)
  const sidebarExtraItems = [
    { id: 'profiles', icon: <Users size={18} />, label: 'Profils & Hiérarchie' },
    { id: 'ledger', icon: <BookOpen size={18} />, label: 'Grand Livre & Exports' },
  ];

  if (currentUser.role === 'admin_principal' || currentUser.role === 'super_admin') {
    sidebarExtraItems.push({ id: 'stats', icon: <TrendingUp size={18} />, label: 'Statistiques' });
  }

  const navigateTo = (id: string) => {
    setActiveTab(id);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* ── 1. DESKTOP Sidebar ── */}
      <aside className="sidebar no-print">
        <div className="sidebar-logo">
          <img src={logoAdonai} alt="Logo Adonaï" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">Adona&iuml; Épargne</span>
        </div>

        <nav className="sidebar-nav">
          {[...bottomNavItems, ...sidebarExtraItems].map(item => (
            <button
              key={item.id}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">{currentUser.full_name.charAt(0)}</div>
            <div className="user-details">
              <span className="user-name">{currentUser.full_name}</span>
              <span className="user-role-badge">{getRoleLabel(currentUser.role)}</span>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', gap: '8px', color: 'var(--sb-logout-color)', backgroundColor: 'transparent', border: '1px solid var(--sb-logout-border)' }} onClick={handleLogout}>
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── 2. MOBILE Sidebar Drawer ── */}
      {/* Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      {/* Drawer panel */}
      <aside className={`mobile-drawer ${mobileSidebarOpen ? 'open' : ''} no-print`}>
        {/* Drawer header */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-logo">
            <img src={logoAdonai} alt="Logo Adonaï" className="mobile-drawer-logo-img" />
            <span className="sidebar-logo-text" style={{ fontSize: '16px' }}>Adona&iuml; Épargne</span>
          </div>
          <button className="mobile-drawer-close" onClick={() => setMobileSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Status indicator inside drawer */}
        <div className="mobile-drawer-status">
          {isSupabaseConfigured ? (
            <div className="status-indicator live" style={{ fontSize: '11px' }}>
              <Database size={12} /> Connecté à Supabase
            </div>
          ) : (
            <div className="status-indicator simulation" style={{ fontSize: '11px' }}>
              <Sparkles size={12} /> Mode Simulation
            </div>
          )}
        </div>

        {/* Drawer nav: all 6 items */}
        <nav className="mobile-drawer-nav">
          <p className="mobile-drawer-section-label">Navigation</p>
          {[...bottomNavItems, ...sidebarExtraItems].map(item => (
            <button
              key={item.id}
              className={`mobile-drawer-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              <span className="mobile-drawer-link-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Drawer footer: user profile */}
        <div className="mobile-drawer-footer">
          <div className="mobile-drawer-user">
            <div className="user-avatar" style={{ width: '44px', height: '44px', fontSize: '18px' }}>
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{currentUser.full_name}</span>
              <span className="user-role-badge">{getRoleLabel(currentUser.role)}</span>
            </div>
          </div>

          {/* Role switcher inside drawer */}
          <div className="mobile-drawer-role-row">
            <Shield size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <select
              value={currentUser.role}
              onChange={e => handleRoleChange(e.target.value as UserRole)}
              className="mobile-drawer-role-select"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin_principal">Admin Principal</option>
              <option value="supervisor">Superviseur</option>
              <option value="agent">Agent de Terrain</option>
            </select>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', gap: '8px', color: 'var(--sb-logout-color)', backgroundColor: 'transparent', border: '1px solid var(--sb-logout-border)', marginTop: '4px' }}
            onClick={handleLogout}
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── 3. Main Viewport ── */}
      <main className="main-wrapper">

        {/* Desktop Top Navbar */}
        <header className="top-bar no-print">
          <div>
            {isSupabaseConfigured ? (
              <div className="status-indicator live">
                <Database size={14} /> Connecté à Supabase Production
              </div>
            ) : (
              <div className="status-indicator simulation">
                <Sparkles size={14} /> Mode Simulation local (Persistant)
              </div>
            )}
          </div>
          <div className="top-bar-actions">
            <div className="top-bar-role-selector">
              <Shield size={14} style={{ color: 'var(--primary)' }} />
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', marginRight: '4px' }}>Tester comme :</label>
              <select value={currentUser.role} onChange={e => handleRoleChange(e.target.value as UserRole)}>
                <option value="super_admin">Super Admin</option>
                <option value="admin_principal">Admin Principal</option>
                <option value="supervisor">Superviseur Bukavu</option>
                <option value="agent">Agent terrain Bukavu</option>
              </select>
            </div>
            {renderNotificationBell(false)}
            <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="mobile-header no-print">
          {/* Logo button → opens drawer */}
          <button className="mobile-header-logo-btn" onClick={() => setMobileSidebarOpen(true)}>
            <img src={logoAdonai} alt="Logo Adonaï" className="mobile-header-logo-img" />
            <span className="mobile-header-title">Adona&iuml; Épargne</span>
          </button>

          <div className="mobile-header-actions">
            <div className="mobile-role-select">
              <Shield size={12} style={{ color: 'var(--primary)' }} />
              <select value={currentUser.role} onChange={e => handleRoleChange(e.target.value as UserRole)}>
                <option value="super_admin">Super Admin</option>
                <option value="admin_principal">Admin Principal</option>
                <option value="supervisor">Superviseur</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            {renderNotificationBell(true)}
            <button className="mobile-theme-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Tab View router */}
        <div className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardOverview carnets={carnets} ledger={ledger} currentUser={currentUser} deposits={deposits} />
          )}
          {activeTab === 'profiles' && (
            <ProfilesView profiles={profiles} currentUser={currentUser} onCreateProfile={handleCreateProfile} onDeleteProfile={handleDeleteProfile} />
          )}
          {activeTab === 'clients' && (
            <ClientsView 
              clients={clients} 
              currentUser={currentUser} 
              profiles={profiles}
              onCreateClient={handleCreateClient} 
              onSelectClientForCarnet={handleQuickLinkNewCarnet} 
              onCreateCarnet={handleCreateCarnet}
            />
          )}
          {activeTab === 'carnets' && (
            <CarnetsView
              carnets={carnets} clients={clients} deposits={deposits} currentUser={currentUser}
              profiles={profiles}
              onCreateCarnet={handleCreateCarnet} onAddDeposit={handleAddDeposit}
              onUpdateDailyMise={handleUpdateDailyMise} onRequestWithdrawal={handleRequestWithdrawal}
              onDeleteDeposit={handleDeleteDeposit}
              requests={requests}
              onCancelWithdrawalRequest={handleCancelWithdrawalRequest}
              selectedClientFromQuickLink={selectedClientForNewCarnet}
              clearQuickLinkClient={() => setSelectedClientForNewCarnet(null)}
            />
          )}
          {activeTab === 'withdrawals' && (
            <WithdrawalsView requests={requests} currentUser={currentUser} onReviewRequest={handleReviewRequest} />
          )}
          {activeTab === 'ledger' && (
            <LedgerView ledger={ledger} currentUser={currentUser} rewards={rewards} snapshots={snapshots} />
          )}
          {activeTab === 'stats' && (
            <StatisticsView carnets={carnets} ledger={ledger} currentUser={currentUser} deposits={deposits} profiles={profiles} />
          )}
        </div>
      </main>

      {/* ── 4. Mobile Bottom Navigation Bar (4 items) ── */}
      <nav className="mobile-bottom-nav no-print">
        {bottomNavItems.map(item => (
          <button
            key={item.id}
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating Push-Style Toaster */}
      {activeToast && (
        <div className="toast-container">
          <div className={`notification-toast ${activeToast.type}`}>
            {/* Close button at outside top-right */}
            <button className="toast-close-btn" onClick={closeToast} title="Fermer">
              <X size={12} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-dark)' }}>{activeToast.title}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-medium)' }}>{activeToast.message}</span>
              
              {activeToast.onUndo && (
                <button
                  onClick={() => {
                    activeToast.onUndo?.();
                    closeToast();
                  }}
                  className="btn-toast-undo"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

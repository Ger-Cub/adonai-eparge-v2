import { useState, useEffect, useRef } from 'react';
import {
  dbSimulated,
  isSupabaseConfigured,
  supabase
} from './lib/supabase';
import type {
  UserProfile, Client, SavingsCarnet,
  CarnetDeposit, WithdrawalRequest, LedgerEntry,
  AgentMonthlyReward, OrgRevenueSnapshot, UserRole, AgentPayout
} from './lib/types';
import { DashboardOverview } from './components/DashboardOverview';
import { ProfilesView } from './components/ProfilesView';
import { ClientsView } from './components/ClientsView';
import { AuthScreen } from './components/AuthScreen';
import { CarnetsView } from './components/CarnetsView';
import { WithdrawalsView } from './components/WithdrawalsView';
import { LedgerView } from './components/LedgerView';
import { HistoryView } from './components/HistoryView';
import { StatisticsView } from './components/StatisticsView';
import { PayrollView } from './components/PayrollView';
import logoAdonai from './assets/logo-adonai.jpg';
import NotificationContext from './lib/notificationContext';

// Icons
import {
  LayoutDashboard, Users, FolderHeart,
  ArrowUpDown, BookOpen, LogOut,
  Moon, Sun, X, TrendingUp, Bell, Database, Banknote,
  UserCheck, ArrowLeftRight, CheckCircle
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<UserProfile | null>(null);
  const effectiveUser = (impersonatedUser ?? currentUser) as UserProfile;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Deposit Success Center Overlay Modal state
  const [depositSuccessModalData, setDepositSuccessModalData] = useState<{
    carnetNumber: string;
    clientName: string;
    amount: number;
    slotsCount: number;
    newDepId?: string;
  } | null>(null);
  const depositModalTimerRef = useRef<any>(null);

  // Database States
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [carnets, setCarnets] = useState<SavingsCarnet[]>([]);
  const [deposits, setDeposits] = useState<CarnetDeposit[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewards, setRewards] = useState<AgentMonthlyReward[]>([]);
  const [snapshots, setSnapshots] = useState<OrgRevenueSnapshot[]>([]);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);

  // Navigation helpers
  const [selectedClientForNewCarnet, setSelectedClientForNewCarnet] = useState<Client | null>(null);

  // In-app Push Notification State with 30-day auto-purge
  interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    created_at: string;
    read: boolean;
  }

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('adonai_push_notifications');
      if (saved) {
        const parsed: AppNotification[] = JSON.parse(saved);
        return parsed.filter(n => (Date.now() - new Date(n.created_at).getTime()) <= THIRTY_DAYS_MS);
      }
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
    return [
      {
        id: 'notif-1',
        title: 'Plateforme Active',
        message: 'Bienvenue sur Adonai Épargne ! Système de notifications (30 jours max) et impersonation prêts.',
        type: 'success',
        created_at: new Date().toISOString(),
        read: false
      }
    ];
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Auto-save notifications to localStorage with 30-day purge
  useEffect(() => {
    try {
      const fresh = notifications.filter(n => (Date.now() - new Date(n.created_at).getTime()) <= THIRTY_DAYS_MS);
      localStorage.setItem('adonai_push_notifications', JSON.stringify(fresh));
    } catch (err) {
      console.error("Erreur sauvegarde notifications:", err);
    }
  }, [notifications]);

  // Close notifications dropdown when clicking outside anywhere on document
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('.notification-container')) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [notificationsOpen]);

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
    }, 18000);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationsOpen(false);
  };

  const handleImpersonate = async (targetUser: UserProfile | null) => {
    setImpersonatedUser(targetUser);
    if (targetUser) {
      showNotification('Mode Impersonation', `Vue basculée sous l'identité de : ${targetUser.full_name} (${getRoleLabel(targetUser.role)})`, 'warning');
    } else {
      showNotification('Mode Impersonation', 'Retour à votre vue Super Admin réelle.', 'info');
    }
    await refreshData(targetUser ?? currentUser);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="notification-dropdown-title">Notifications Push</span>
                <span className="notification-retention-badge">30 Jours</span>
              </div>
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
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
  const refreshData = async (userOverride?: UserProfile | null) => {
    try {
      const user = userOverride !== undefined ? userOverride : effectiveUser;
      if (!user) return;

      const [
        loadedProfiles,
        loadedClients,
        loadedCarnets,
        loadedDeposits,
        loadedRequests,
        loadedLedger,
        loadedRewards,
        loadedSnapshots,
        loadedPayouts
      ] = await Promise.all([
        dbSimulated.getProfiles().catch(err => { console.warn("getProfiles error:", err?.message); return []; }),
        dbSimulated.getClients().catch(err => { console.warn("getClients error:", err?.message); return []; }),
        dbSimulated.getCarnets().catch(err => { console.warn("getCarnets error:", err?.message); return []; }),
        dbSimulated.getDeposits().catch(err => { console.warn("getDeposits error:", err?.message); return []; }),
        dbSimulated.getRequests().catch(err => { console.warn("getRequests error:", err?.message); return []; }),
        dbSimulated.getLedger().catch(err => { console.warn("getLedger error:", err?.message); return []; }),
        dbSimulated.getAgentMonthlyRewards().catch(err => { console.warn("getAgentMonthlyRewards error:", err?.message); return []; }),
        dbSimulated.getMonthlySnapshots().catch(err => { console.warn("getMonthlySnapshots error:", err?.message); return []; }),
        dbSimulated.getAgentPayouts().catch(err => { console.warn("getAgentPayouts error:", err?.message); return []; })
      ]);

      // Payouts always fully loaded for admin (payout records are filtered server-side by RLS)
      setPayouts(loadedPayouts);

      // Ensure current user is present in allProfiles
      let allProfiles = loadedProfiles || [];
      if (user && !allProfiles.some(p => p.id === user.id)) {
        allProfiles = [user, ...allProfiles];
      }

      // RLS Enforcement Simulation / Display Filtering
      if (user.role === 'super_admin') {
        setProfiles(allProfiles);
        setClients(loadedClients);
        setCarnets(loadedCarnets);
        setRequests(loadedRequests);
        setLedger(loadedLedger);
      } else if (user.role === 'admin_principal') {
        // Admin Principal sees everyone EXCEPT super_admin
        setProfiles(allProfiles.filter(p => p.role !== 'super_admin'));
        setClients(loadedClients);
        setCarnets(loadedCarnets);
        setRequests(loadedRequests);
        setLedger(loadedLedger);
      } else if (user.role === 'supervisor') {
        // Supervisor sees themselves and agents created/supervised by them
        const subAgents = allProfiles
          .filter(p => p.role === 'agent' && (
            p.created_by === user.id || 
            (user.readable_id && p.created_by === user.readable_id) ||
            loadedCarnets.some(c => c.supervisor_id === user.id && (c.agent_id === p.id || (p.readable_id && c.agent_id === p.readable_id)))
          ))
          .map(p => p.id);

        const agentIds = Array.from(new Set([user.id, ...(user.readable_id ? [user.readable_id] : []), ...subAgents]));
        const filteredProfiles = allProfiles.filter(p => p.id === user.id || subAgents.includes(p.id));

        setProfiles(filteredProfiles.length > 0 ? filteredProfiles : [user]);
        
        // Supervisor sees clients created by themselves, their agents, or with carnets supervised by them
        setClients(loadedClients.filter(c => 
          agentIds.includes(c.created_by) || 
          c.created_by === user.id || 
          (user.readable_id && c.created_by === user.readable_id) ||
          loadedCarnets.some(car => car.client_id === c.id && (car.supervisor_id === user.id || agentIds.includes(car.agent_id)))
        ));

        // Supervisor sees carnets supervised by them or managed by their agents
        setCarnets(loadedCarnets.filter(c => 
          c.supervisor_id === user.id || 
          (user.readable_id && c.supervisor_id === user.readable_id) ||
          agentIds.includes(c.agent_id) ||
          c.created_by === user.id
        ));

        setRequests(loadedRequests.filter(r => {
          const car = loadedCarnets.find(c => c.id === r.carnet_id);
          return car && (car.supervisor_id === user.id || agentIds.includes(car.agent_id));
        }));
        setLedger(loadedLedger.filter(l => l.type !== 'org_gain'));
      } else if (user.role === 'agent') {
        const agentIdentifiers = [user.id, ...(user.readable_id ? [user.readable_id] : [])];
        const filteredProfiles = allProfiles.filter(p => agentIdentifiers.includes(p.id) || agentIdentifiers.includes(p.created_by || ''));
        setProfiles(filteredProfiles.length > 0 ? filteredProfiles : [user]);
        setClients(loadedClients.filter(c => 
          agentIdentifiers.includes(c.created_by) ||
          loadedCarnets.some(car => car.client_id === c.id && (agentIdentifiers.includes(car.agent_id) || agentIdentifiers.includes(car.created_by)))
        ));
        setCarnets(loadedCarnets.filter(c => agentIdentifiers.includes(c.agent_id) || agentIdentifiers.includes(c.created_by)));
        setRequests(loadedRequests.filter(r => {
          const car = loadedCarnets.find(c => c.id === r.carnet_id);
          return car && (agentIdentifiers.includes(car.agent_id) || agentIdentifiers.includes(car.created_by));
        }));
        setLedger(loadedLedger.filter(l => agentIdentifiers.includes(l.agent_id ?? '')));
      }

      setDeposits(loadedDeposits);
      setRewards(loadedRewards);
      setSnapshots(loadedSnapshots);
    } catch (err: any) {
      console.error("Error refreshing data:", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        // Real Supabase Auth state check
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await dbSimulated.getCurrentUser();
          if (profile) {
            setCurrentUser(profile);
            await refreshData(profile);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            const profile = await dbSimulated.getCurrentUser();
            if (profile) {
              setCurrentUser(profile);
              await refreshData(profile);
            } else {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        // Supabase non configuré : afficher l'écran de connexion, ne pas auto-connecter
        setCurrentUser(null);
      }
    };

    initAuth();
  }, []);

  // Realtime Subscriptions for Supabase database changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentUser) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carnet_deposits' }, async (payload) => {
        await refreshData();
        if (payload.eventType === 'INSERT') {
          const newDep = payload.new as CarnetDeposit;
          showNotification(
            'Nouveau Versement',
            `Un dépôt de ${newDep.amount.toLocaleString()} FC a été enregistré en temps réel.`,
            'success'
          );
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, async (payload) => {
        await refreshData();
        if (payload.eventType === 'INSERT') {
          const newReq = payload.new as WithdrawalRequest;
          showNotification(
            'Demande de Retrait',
            `Une demande de liquidation de ${newReq.requested_amount.toLocaleString()} FC a été soumise.`,
            'warning'
          );
        } else if (payload.eventType === 'UPDATE') {
          const oldReq = payload.old as WithdrawalRequest;
          const newReq = payload.new as WithdrawalRequest;
          if (oldReq.status !== newReq.status) {
            showNotification(
              newReq.status === 'approved' ? 'Retrait Approuvé' : 'Retrait Rejeté',
              newReq.status === 'approved' 
                ? 'Une demande de retrait a été validée.' 
                : `Une demande de retrait a été rejetée: ${newReq.rejection_reason || ''}`,
              newReq.status === 'approved' ? 'success' : 'warning'
            );
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_carnets' }, async () => {
        await refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async () => {
        await refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, async () => {
        await refreshData();
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [isSupabaseConfigured, currentUser]);

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

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        await dbSimulated.setCurrentUser(null);
      }
      setCurrentUser(null);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Creation Operations
  const handleCreateProfile = async (
    profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & { email?: string; password?: string },
    parentId?: string
  ) => {
    try {
      await dbSimulated.createProfile(profile, parentId);
      showNotification('Nouveau Profil', `Profil de ${profile.full_name} créé avec succès.`, 'info');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur de création', err.message || 'Impossible de créer le profil.', 'warning');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      // If deleting an agent, cascade delete their clients and carnets first
      const target = profiles.find(p => p.id === id);
      if (target && target.role === 'agent') {
        const agentClients = clients.filter(c => c.created_by === id);
        for (const cl of agentClients) {
          await (dbSimulated as any).deleteClient(cl.id);
        }
      }

      await dbSimulated.deleteProfile(id);
      showNotification('Profil Supprimé', `Profil supprimé de l'organisation.`, 'warning');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de supprimer.', 'warning');
    }
  };

  const handleCreateClient = async (
    client: Omit<Client, 'id' | 'created_at' | 'updated_at'>,
    carnetData?: { daily_mise: number; first_deposit: number }
  ) => {
    try {
      const newClient = await dbSimulated.createClient(client);
      showNotification('Nouveau Client', `Membre ${newClient.name} enregistré avec succès.`, 'success');
      if (carnetData && currentUser) {
        await dbSimulated.createCarnet({
          client_id: newClient.id,
          daily_mise: carnetData.daily_mise,
          agent_id: currentUser.id,
          created_by: currentUser.id,
          updated_by: currentUser.id
        }, carnetData.first_deposit);
        showNotification('Carnet Ouvert', `Carnet d'épargne d'ouverture créé pour ${newClient.name}.`, 'success');
      }
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de créer le client.', 'warning');
      throw err; // Re-throw so ClientsView can catch it and show inline error
    }
  };

  const handleCreateCarnet = async (
    carnet: Omit<SavingsCarnet, 'id' | 'carnet_number' | 'supervisor_id' | 'status' | 'created_at' | 'updated_at'>,
    firstDeposit: number
  ) => {
    try {
      await dbSimulated.createCarnet(carnet, firstDeposit);
      showNotification('Carnet Ouvert', `Nouveau carnet ouvert avec premier dépôt de ${firstDeposit} FC.`, 'success');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible d\'ouvrir le carnet.', 'warning');
      throw err; // Re-throw so ClientsView can catch it and show inline error
    }
  };

  const dismissDepositModal = (amount?: number, newDepId?: string) => {
    if (depositModalTimerRef.current) clearTimeout(depositModalTimerRef.current);
    if (depositSuccessModalData || amount) {
      const amt = amount ?? depositSuccessModalData?.amount ?? 0;
      const depId = newDepId ?? depositSuccessModalData?.newDepId;
      showNotification('Versement Validé', `Dépôt de ${amt.toLocaleString()} FC validé avec succès.`, 'success', {
        onUndo: depId ? async () => {
          try {
            await dbSimulated.deleteDeposit(depId);
            showNotification('Versement Annulé', `Le versement de ${amt.toLocaleString()} FC a été annulé.`, 'warning');
            await refreshData(effectiveUser);
          } catch (undoErr: any) {
            showNotification('Erreur d\'annulation', undoErr.message || 'Impossible d\'annuler le versement.', 'warning');
          }
        } : undefined
      });
    }
    setDepositSuccessModalData(null);
  };

  const handleAddDeposit = async (deposit: Omit<CarnetDeposit, 'id' | 'slots_count' | 'created_at' | 'updated_at'>) => {
    try {
      const newDep = await dbSimulated.addDeposit(deposit);
      const targetCarnet = carnets.find(c => c.id === deposit.carnet_id);
      const targetClient = clients.find(c => c.id === targetCarnet?.client_id);
      const slotsCount = newDep.slots_count || Math.max(1, Math.floor(deposit.amount / (targetCarnet?.daily_mise || deposit.amount)));

      // 1. Display center page deposit modal
      setDepositSuccessModalData({
        carnetNumber: targetCarnet?.carnet_number || `CARNET-${deposit.carnet_id.substring(0, 4)}`,
        clientName: targetClient?.name || 'Client Titulaire',
        amount: deposit.amount,
        slotsCount: slotsCount,
        newDepId: newDep.id
      });

      // 2. Auto-close after 2.5s and trigger toast notification
      if (depositModalTimerRef.current) clearTimeout(depositModalTimerRef.current);
      depositModalTimerRef.current = setTimeout(() => {
        dismissDepositModal(deposit.amount, newDep.id);
      }, 2500);

      await refreshData(effectiveUser);
    } catch (err: any) {
      showNotification('Erreur de dépôt', err.message || 'Impossible d\'ajouter le versement.', 'warning');
    }
  };
  
  const handleDeleteDeposit = async (depositId: string) => {
    if (!currentUser) return;
    try {
      await dbSimulated.deleteDeposit(depositId);
      showNotification('Dépôt Supprimé', `Le versement a été annulé avec succès.`, 'warning');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de supprimer ce versement.', 'warning');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!currentUser) return;
    try {
      await (dbSimulated as any).deleteClient(clientId);
      showNotification('Client Supprimé', `Client et ses carnets supprimés.`, 'warning');
      await refreshData(effectiveUser);
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de supprimer le client.', 'warning');
    }
  };

  const handleDeleteCarnet = async (carnetId: string) => {
    if (!currentUser) return;
    try {
      await (dbSimulated as any).deleteCarnet(carnetId);
      showNotification('Carnet Supprimé', `Le carnet et ses données associées ont été supprimés.`, 'warning');
      await refreshData(effectiveUser);
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de supprimer le carnet.', 'warning');
    }
  };

  const handleUpdateDailyMise = async (carnetId: string, newMise: number) => {
    if (!currentUser) return;
    try {
      await dbSimulated.updateCarnetDailyMise(carnetId, newMise, currentUser.id);
      showNotification('Mise Journalière', `Mise journalière mise à jour à ${newMise} FC.`, 'info');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de modifier la mise.', 'warning');
    }
  };

  const handleRequestWithdrawal = async (carnetId: string, amount: number) => {
    if (!currentUser) return;
    try {
      await dbSimulated.createRequest({
        carnet_id: carnetId,
        requested_amount: amount,
        created_by: currentUser.id,
        updated_by: currentUser.id
      });
      showNotification('Retrait Initié', `Demande de liquidation de ${amount} FC soumise pour validation.`, 'warning');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de soumettre le retrait.', 'warning');
    }
  };

  const handleCancelWithdrawalRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await dbSimulated.cancelRequest(requestId);
      showNotification('Retrait Annulé', 'La demande de retrait a été annulée.', 'info');
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible d\'annuler la demande.', 'warning');
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!currentUser) return;
    try {
      await dbSimulated.reviewRequest(requestId, status, currentUser.id, reason);
      showNotification(
        status === 'approved' ? 'Retrait Approuvé' : 'Retrait Rejeté',
        status === 'approved' ? `La demande de retrait a été liquidée avec succès.` : `La demande a été rejetée.`,
        status === 'approved' ? 'success' : 'warning'
      );
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de traiter la demande.', 'warning');
    }
  };

  const handlePayAgent = async (agentId: string, amount: number) => {
    if (!currentUser) return;
    const agent = profiles.find(p => p.id === agentId);
    try {
      await dbSimulated.createAgentPayout(agentId, amount, currentUser.id);
      showNotification(
        'Paie Effectuée ✓',
        `${agent?.full_name || 'Agent'} a été rémunéré(e) de ${amount.toLocaleString('fr-FR')} FC. Fiche de paie en cours d'impression.`,
        'success'
      );
      await refreshData();
    } catch (err: any) {
      showNotification('Erreur de paiement', err.message || 'Impossible d\'effectuer le paiement.', 'warning');
      throw err; // rethrow so PayrollView can handle the loading state
    }
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

  const handleLogin = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const handleSignup = async (email: string, password: string, fullName: string, phone: string, role: UserRole) => {
    if (!supabase) return;
    const siteUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
      ? window.location.origin
      : 'https://adonai-eparge-v2.vercel.app';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: siteUrl,
        data: {
          full_name: fullName,
          phone: phone,
          role: role
        }
      }
    });
    if (error) throw error;
  };

  const handleSimulationLogin = async (role: UserRole) => {
    try {
      const loadedProfiles = await dbSimulated.getProfiles();
      const targetUser = loadedProfiles.find(p => p.role === role) || loadedProfiles[0];
      await dbSimulated.setCurrentUser(targetUser);
      setCurrentUser(targetUser);
      await refreshData(targetUser);
    } catch (err: any) {
      showNotification('Erreur', err.message || 'Impossible de se connecter.', 'warning');
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        isSupabaseConfigured={isSupabaseConfigured}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onSimulationLogin={handleSimulationLogin}
      />
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
    { id: 'history', icon: <CheckCircle size={18} />, label: 'Historique' },
  ];

  if (effectiveUser.role === 'admin_principal' || effectiveUser.role === 'super_admin') {
    sidebarExtraItems.push({ id: 'stats', icon: <TrendingUp size={18} />, label: 'Statistiques' });
    sidebarExtraItems.push({ id: 'payroll', icon: <Banknote size={18} />, label: 'Gestion de la Paie' });
  }

  const navigateTo = (id: string) => {
    setActiveTab(id);
    setMobileSidebarOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
    <div className="app-root">
      {/* ── SUPER ADMIN IMPERSONATION BANNER ── */}
      {impersonatedUser && (
        <div className="impersonation-banner no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} />
            <span>
              <strong>Mode impersonation actif</strong> — Session active sous l'identité de <strong>{impersonatedUser.full_name}</strong> ({getRoleLabel(impersonatedUser.role)})
            </span>
          </div>
          <button className="btn-exit-impersonation" onClick={() => handleImpersonate(null)}>
            Quitter l'impersonation
          </button>
        </div>
      )}

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

        {/* Super Admin Impersonation Selector Box */}
        {currentUser?.role === 'super_admin' && (
          <div className="impersonate-sidebar-box">
            <label className="impersonate-sidebar-label">
              <UserCheck size={12} /> Se connecter en tant que
            </label>
            <select
              className="impersonate-sidebar-select"
              value={impersonatedUser?.id || ''}
              onChange={e => {
                const val = e.target.value;
                if (!val) {
                  handleImpersonate(null);
                } else {
                  const target = profiles.find(p => p.id === val);
                  if (target) handleImpersonate(target);
                }
              }}
            >
              <option value="">-- Mode Admin Réel --</option>
              {profiles.filter(p => p.id !== currentUser.id).map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({getRoleLabel(p.role)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar" style={impersonatedUser ? { backgroundColor: 'var(--amber-600, #d97706)', color: 'white' } : undefined}>
              {effectiveUser.full_name.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{effectiveUser.full_name}</span>
              <span className="user-role-badge">{getRoleLabel(effectiveUser.role)}</span>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', gap: '8px', color: 'var(--sb-logout-color)', backgroundColor: 'transparent', border: '1px solid var(--sb-logout-border)' }} onClick={handleLogout}>
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── 2. MOBILE Sidebar Drawer ── */}
      <div
        className={`mobile-drawer-backdrop ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside className={`mobile-drawer ${mobileSidebarOpen ? 'open' : ''} no-print`}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-logo">
            <img src={logoAdonai} alt="Logo Adonaï" className="mobile-drawer-logo-img" />
            <span className="sidebar-logo-text" style={{ fontSize: '16px' }}>Adona&iuml; Épargne</span>
          </div>
          <button className="mobile-drawer-close" onClick={() => setMobileSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="mobile-drawer-status">
          <div className="status-indicator live" style={{ fontSize: '11px' }}>
            <Database size={12} /> Connecté à Supabase
          </div>
        </div>

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

        {currentUser?.role === 'super_admin' && (
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <div className="impersonate-sidebar-box">
              <label className="impersonate-sidebar-label">
                <UserCheck size={12} /> Se connecter en tant que
              </label>
              <select
                className="impersonate-sidebar-select"
                value={impersonatedUser?.id || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    handleImpersonate(null);
                  } else {
                    const target = profiles.find(p => p.id === val);
                    if (target) handleImpersonate(target);
                  }
                  setMobileSidebarOpen(false);
                }}
              >
                <option value="">-- Mode Admin Réel --</option>
                {profiles.filter(p => p.id !== currentUser.id).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({getRoleLabel(p.role)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mobile-drawer-footer">
          <div className="mobile-drawer-user">
            <div className="user-avatar" style={{ width: '44px', height: '44px', fontSize: '18px', backgroundColor: impersonatedUser ? 'var(--amber-600, #d97706)' : undefined }}>
              {effectiveUser.full_name.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{effectiveUser.full_name}</span>
              <span className="user-role-badge">{getRoleLabel(effectiveUser.role)}</span>
            </div>
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
          <div className="top-bar-user-info">
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '13px', flexShrink: 0, backgroundColor: impersonatedUser ? 'var(--amber-600, #d97706)' : undefined }}>
              {effectiveUser.full_name.charAt(0)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{effectiveUser.full_name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{getRoleLabel(effectiveUser.role)}</span>
            </div>
          </div>
          <div className="top-bar-actions">
            {currentUser?.role === 'super_admin' && (
              <div className="impersonate-topbar-wrapper" title="Mode impersonation super admin">
                <ArrowLeftRight size={14} style={{ color: '#d97706' }} />
                <select
                  className="impersonate-topbar-select"
                  value={impersonatedUser?.id || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) {
                      handleImpersonate(null);
                    } else {
                      const target = profiles.find(p => p.id === val);
                      if (target) handleImpersonate(target);
                    }
                  }}
                >
                  <option value="">Admin réel ({currentUser.full_name})</option>
                  {profiles.filter(p => p.id !== currentUser.id).map(p => (
                    <option key={p.id} value={p.id}>
                      ⇄ {p.full_name} ({getRoleLabel(p.role)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {renderNotificationBell(false)}
            <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="mobile-header no-print">
          <button className="mobile-header-logo-btn" onClick={() => setMobileSidebarOpen(true)}>
            <img src={logoAdonai} alt="Logo Adonaï" className="mobile-header-logo-img" />
            <span className="mobile-header-title">Adona&iuml; Épargne</span>
          </button>

          <div className="mobile-header-actions">
            {renderNotificationBell(true)}
            <button className="mobile-theme-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Tab View router */}
        <div className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardOverview carnets={carnets} ledger={ledger} currentUser={effectiveUser} deposits={deposits} profiles={profiles} clients={clients} />
          )}
          {activeTab === 'profiles' && (
            <ProfilesView 
              profiles={profiles} 
              currentUser={effectiveUser} 
              onCreateProfile={handleCreateProfile} 
              onDeleteProfile={handleDeleteProfile} 
              isSupabaseConfigured={isSupabaseConfigured}
            />
          )}
          {activeTab === 'clients' && (
            <ClientsView 
              clients={clients} 
              currentUser={effectiveUser} 
              profiles={profiles}
              onCreateClient={handleCreateClient} 
              onSelectClientForCarnet={handleQuickLinkNewCarnet} 
              onCreateCarnet={handleCreateCarnet}
              onDeleteClient={handleDeleteClient}
            />
          )}
          {activeTab === 'carnets' && (
            <CarnetsView
              carnets={carnets} clients={clients} deposits={deposits} currentUser={effectiveUser}
              profiles={profiles}
              onCreateCarnet={handleCreateCarnet} onAddDeposit={handleAddDeposit}
              onUpdateDailyMise={handleUpdateDailyMise} onRequestWithdrawal={handleRequestWithdrawal}
              onDeleteDeposit={handleDeleteDeposit}
              onDeleteCarnet={handleDeleteCarnet}
              requests={requests}
              onCancelWithdrawalRequest={handleCancelWithdrawalRequest}
              selectedClientFromQuickLink={selectedClientForNewCarnet}
              clearQuickLinkClient={() => setSelectedClientForNewCarnet(null)}
            />
          )}
          {activeTab === 'withdrawals' && (
            <WithdrawalsView requests={requests} currentUser={effectiveUser} onReviewRequest={handleReviewRequest} />
          )}
          {activeTab === 'ledger' && (
            <LedgerView ledger={ledger} currentUser={effectiveUser} rewards={rewards} snapshots={snapshots} />
          )}
          {activeTab === 'history' && (
            <HistoryView
              deposits={deposits}
              requests={requests}
              ledger={ledger}
              payouts={payouts}
              profiles={profiles}
              clients={clients}
            />
          )}
          {activeTab === 'stats' && (
            <StatisticsView carnets={carnets} ledger={ledger} currentUser={effectiveUser} deposits={deposits} profiles={profiles} />
          )}
          {activeTab === 'payroll' && (
            <PayrollView
              ledger={ledger}
              profiles={profiles}
              payouts={payouts}
              currentUser={effectiveUser}
              onPayAgent={handlePayAgent}
            />
          )}
        </div>
      </main>

      {/* Center Overlay Deposit Success Modal */}
      {depositSuccessModalData && (
        <div className="deposit-center-modal-backdrop" onClick={() => dismissDepositModal()}>
          <div className="deposit-center-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--success-bg)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px', border: '2px solid var(--success-border)' }}>
              ✓
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Transaction de Dépôt Réussie !
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-medium)', marginBottom: '20px' }}>
              Le versement a été validé et enregistré dans le Grand Livre.
            </p>

            <div style={{ backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-light)' }}>Client Titulaire :</span>
                <strong style={{ color: 'var(--text-dark)' }}>{depositSuccessModalData.clientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-light)' }}>N° Carnet :</span>
                <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{depositSuccessModalData.carnetNumber}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-light)' }}>Montant Déposé :</span>
                <strong style={{ color: 'var(--success-color)', fontSize: '16px' }}>{depositSuccessModalData.amount.toLocaleString()} FC</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-light)' }}>Slots Validés :</span>
                <span className="badge badge-active">+{depositSuccessModalData.slotsCount} Slot(s)</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '10px', fontWeight: 700 }} onClick={() => dismissDepositModal()}>
              Continuer (Fermer)
            </button>
          </div>
        </div>
      )}


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
    </div>
    </NotificationContext.Provider>
  );
}

export default App;

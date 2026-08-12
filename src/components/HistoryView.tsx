import React, { useMemo, useState } from 'react';
import type { CarnetDeposit, WithdrawalRequest, LedgerEntry, AgentPayout, UserProfile, Client } from '../lib/types';

type Props = {
  deposits: CarnetDeposit[];
  requests: WithdrawalRequest[];
  ledger: LedgerEntry[];
  payouts: AgentPayout[];
  profiles: UserProfile[];
  clients: Client[];
  currentUser: UserProfile;
};

type HistoryEvent = {
  id: string;
  kind: string;
  date: string;
  amount?: number;
  carnet_number?: string;
  client_name?: string;
  agent_name?: string;
  created_by?: string;
  description?: string;
};

export const HistoryView = ({
  deposits,
  requests,
  ledger,
  payouts,
  profiles,
  clients,
  currentUser
}: Props) => {
  const [filterType, setFilterType] = useState('all');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentListView, setCurrentListView] = useState<'combined' | 'deposits' | 'requests' | 'ledger' | 'payouts'>('combined');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build combined events list
  const allEvents = useMemo<HistoryEvent[]>(() => {
    // Helper to support both snake_case (DB) and camelCase (frontend) fields
    const get = (obj: any, ...keys: string[]) => {
      for (const k of keys) {
        if (obj == null) return undefined;
        if (k in obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return undefined;
    };

    const formatDateForEvent = (d: any) => {
      if (!d) return undefined;
      // support Date, ISO string, unix seconds, unix ms
      if (d instanceof Date) return d.toISOString();
      if (typeof d === 'number') {
        // if seconds (10 digits) convert to ms
        if (String(d).length === 10) return new Date(d * 1000).toISOString();
        return new Date(d).toISOString();
      }
      const s = String(d);
      // If it's numeric string
      if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString();
      if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString();
      const parsed = new Date(s);
      if (isNaN(parsed.getTime())) return undefined;
      return parsed.toISOString();
    };

    const events: HistoryEvent[] = [];

    // Deposits
    deposits.forEach(d => {
      const clientId = get(d, 'clientId', 'client_id');
      const agentId = get(d, 'agentId', 'agent_id', 'created_by');
      const client = clients.find(c => c.id === clientId);
      const agent = profiles.find(p => p.id === agentId);
      const carnetNum = get(d, 'carnetNumber', 'carnet_number', 'carnet_id');
      events.push({
        id: `deposit-${get(d, 'id', 'ID')}`,
        kind: 'Dépôt',
        date: formatDateForEvent(get(d, 'createdAt', 'created_at')) || '',
        amount: get(d, 'amount', 'Amount') as any,
        carnet_number: carnetNum,
        client_name: client?.name || clientId,
        agent_name: agent?.full_name || agent?.full_name || agentId,
        created_by: agent?.full_name || agent?.full_name,
        description: `Dépôt carnet ${carnetNum ?? ''}`
      });
    });

    // Withdrawal Requests
    requests.forEach(r => {
      const clientId = get(r, 'clientId', 'client_id');
      const agentId = get(r, 'agentId', 'agent_id', 'created_by');
      const client = clients.find(c => c.id === clientId);
      const agent = profiles.find(p => p.id === agentId);
      const carnetNum = get(r, 'carnetNumber', 'carnet_number', 'carnet_id');
      events.push({
        id: `request-${get(r, 'id', 'ID')}`,
        kind: 'Demande de retrait',
        date: formatDateForEvent(get(r, 'createdAt', 'created_at')) || '',
        amount: get(r, 'amount', 'requested_amount', 'requestedAmount') as any,
        carnet_number: carnetNum,
        client_name: client?.name || clientId,
        agent_name: agent?.full_name || agent?.full_name || agentId,
        created_by: agent?.full_name || agent?.full_name,
        description: `Demande de retrait - ${get(r, 'status') ?? ''}`
      });
    });

    // Ledger entries
    ledger.forEach(l => {
      const agentId = get(l, 'agentId', 'agent_id');
      const agent = profiles.find(p => p.id === agentId);
      const carnetNum = get(l, 'carnetNumber', 'carnet_number', 'carnet_id');
      events.push({
        id: `ledger-${get(l, 'id', 'ID')}`,
        kind: (get(l, 'type') === 'agent_gain' || get(l, 'type') === 'commission') ? 'Commission Agent' : 'Grand Livre',
        date: formatDateForEvent(get(l, 'createdAt', 'created_at')) || '',
        amount: get(l, 'amount') as any,
        carnet_number: carnetNum,
        agent_name: agent?.full_name || agent?.full_name || agentId,
        created_by: agent?.full_name || agent?.full_name || get(l, 'created_by') || get(l, 'initiator_name'),
        description: get(l, 'description') || `Entrée ${get(l, 'type')}`
      });
    });

    // Payouts
    payouts.forEach(p => {
      const agentId = get(p, 'agentId', 'agent_id');
      const agent = profiles.find(prof => prof.id === agentId);
      const payoutDate = get(p, 'payoutDate', 'payout_date');
      const payoutDateStr = payoutDate ? (new Date(payoutDate).toLocaleDateString('fr-FR')) : '';
      events.push({
        id: `payout-${get(p, 'id', 'ID')}`,
        kind: 'Paie Agent',
        date: formatDateForEvent(get(p, 'createdAt', 'created_at')) || '',
        amount: get(p, 'amount') as any,
        agent_name: agent?.full_name || agent?.full_name || agentId,
        created_by: agent?.full_name || agent?.full_name || get(p, 'paid_by'),
        description: `Paie du ${payoutDateStr}`
      });
    });

    const ts = (e: HistoryEvent) => {
      const t = Date.parse(e.date || '');
      return isNaN(t) ? 0 : t;
    };
    return events.sort((a, b) => ts(b) - ts(a));
  }, [deposits, requests, ledger, payouts, clients, profiles]);

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

    // View filter
    if (currentListView === 'deposits') {
      filtered = filtered.filter(e => e.kind === 'Dépôt');
    } else if (currentListView === 'requests') {
      filtered = filtered.filter(e => e.kind === 'Demande de retrait');
    } else if (currentListView === 'ledger') {
      filtered = filtered.filter(e => e.kind.includes('Grand Livre') || e.kind.includes('Commission'));
    } else if (currentListView === 'payouts') {
      filtered = filtered.filter(e => e.kind === 'Paie Agent');
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.kind.toLowerCase().includes(filterType.replace('_', ' ')));
    }

    // Search filter
    if (q.trim()) {
      const search = q.toLowerCase().trim();
      filtered = filtered.filter(e => 
        (e.client_name?.toLowerCase().includes(search)) ||
        (e.carnet_number?.toLowerCase().includes(search)) ||
        (e.agent_name?.toLowerCase().includes(search)) ||
        (e.description?.toLowerCase().includes(search)) ||
        (e.kind?.toLowerCase().includes(search))
      );
    }

    // Date filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= end);
    }

    return filtered;
  }, [allEvents, currentListView, filterType, q, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const visible = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredEvents.slice(start, end);
  }, [filteredEvents, page, pageSize]);

  // Export CSV function
  const exportCsv = (events: HistoryEvent[]) => {
    const rows = events.map(ev => ({
      date: ev.date ? (isNaN(Date.parse(ev.date)) ? '' : new Date(ev.date).toISOString()) : '',
      type: ev.kind,
      amount: ev.amount ?? '',
      carnet: ev.carnet_number ?? '',
      client: ev.client_name ?? '',
      agent: ev.agent_name ?? ev.created_by ?? '',
      details: ev.description ?? ''
    }));

    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const header = ['date', 'type', 'amount', 'carnet', 'client', 'agent', 'details'];
    const csv = [header.join(',')].concat(rows.map(r => header.map(h => escape((r as any)[h])).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="section-header no-print">
        <div>
          <h2 className="section-title">Historique Général</h2>
          <p className="section-desc">Consultez l'audit du grand livre, suivez les commissions et générez les fichiers d'exports.</p>
        </div>
      </div>

      <div className="filters-bar no-print">
        <div className="filters-group">
          <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Tous les types</option>
            <option value="deposit">Dépôts</option>
            <option value="withdrawal_request">Demandes de retrait</option>
            <option value="withdrawal">Retraits</option>
            <option value="agent_payout">Paies Agents</option>
            <option value="agent_gain">Commissions Agents</option>
            <option value="carnet_sale">Ventes Carnet</option>
          </select>

          <input 
            className="form-control" 
            placeholder="Rechercher client, carnet, agent..." 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            style={{ minWidth: 220 }} 
          />

          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Du</span>
            <input className="form-control" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Au</span>
            <input className="form-control" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>

          <button 
            className="btn btn-secondary" 
            onClick={() => { 
              setStartDate(''); 
              setEndDate(''); 
              setQ(''); 
              setFilterType('all'); 
            }} 
            title="Réinitialiser filtres"
          >
            Réinitialiser
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => exportCsv(filteredEvents)}>
            Export CSV (vue actuelle)
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className={`btn ${currentListView === 'combined' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setCurrentListView('combined'); setPage(1); }}
              >
                Tous
              </button>
              <button 
                className={`btn ${currentListView === 'deposits' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setCurrentListView('deposits'); setPage(1); }}
              >
                Dépôts
              </button>
              <button 
                className={`btn ${currentListView === 'requests' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setCurrentListView('requests'); setPage(1); }}
              >
                Demandes
              </button>
              <button 
                className={`btn ${currentListView === 'ledger' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setCurrentListView('ledger'); setPage(1); }}
              >
                Grand Livre
              </button>
              <button 
                className={`btn ${currentListView === 'payouts' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setCurrentListView('payouts'); setPage(1); }}
              >
                Paies
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setPage(1)} disabled={page === 1}>⏮</button>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Préc</button>
                <span style={{ minWidth: 80, textAlign: 'center' }}>Page {page} / {totalPages}</span>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suiv</button>
                <button className="btn btn-secondary" onClick={() => setPage(totalPages)} disabled={page === totalPages}>⏭</button>
              </div>

              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>Lignes</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
          </div>

          <table className="responsive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Carnet / Client</th>
                <th>Agent / Initiateur</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(ev => (
                <tr key={ev.id}>
                      <td>{ev.date && !isNaN(Date.parse(ev.date)) ? new Date(ev.date).toLocaleString('fr-FR') : '-'}</td>
                  <td>{ev.kind}</td>
                  <td style={{ textAlign: 'right' }}>{ev.amount ? ev.amount.toLocaleString() + ' FC' : '-'}</td>
                  <td>
                    {ev.carnet_number ? (
                      <>
                        <strong>{ev.carnet_number}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{ev.client_name}</div>
                      </>
                    ) : ev.client_name || '-'}
                  </td>
                  <td>{ev.agent_name || ev.created_by || '-'}</td>
                  <td>{ev.description}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)' }}>
                    Aucun enregistrement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
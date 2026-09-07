import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../socket/socket.jsx';
import SimulatorModal from '../../components/SimulatorModal.jsx';
import { Avatar, EmptyState, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { timeAgo, PLATFORM_LABELS } from '../../utils/format';

export default function ManagerNew() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState({});
  const [simOpen, setSimOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, e] = await Promise.all([
        api.get('/customers?filter=unassigned&limit=50'),
        api.get('/users?role=EMPLOYEE'),
      ]);
      setItems(u.data.items);
      setEmployees(e.data.items.filter((x) => x.status === 'ACTIVE'));
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('notification:new', () => load());
  useSocketEvent('customer:assigned', () => load());

  const assign = async (customerId) => {
    const employeeId = picked[customerId];
    if (!employeeId) {
      toast('Choose an employee first.', 'error');
      return;
    }
    try {
      await api.post(`/customers/${customerId}/assign`, { employeeId });
      toast('Customer assigned.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHead
        title="New / Unassigned"
        sub="Fresh customers waiting for their first assignment — reply personally or hand them to your team."
        actions={
          <button className="btn" type="button" onClick={() => setSimOpen(true)}>
            <Icon name="zap" size={14} />
            Simulate new customer
          </button>
        }
      />

      {!items && <div className="card"><PageLoader text="Loading queue..." /></div>}

      {items && items.length === 0 && (
        <div className="card">
          <EmptyState icon="check" title="No new customers" sub="All incoming customers have been assigned. New messages will appear here instantly." />
        </div>
      )}

      {items && items.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {items.map((c) => (
            <div className="stat-card" key={c._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.name} color="#0EA5E9" size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-strong">{c.name}</div>
                  <div className="cell-sub">{c.username || '—'} · {PLATFORM_LABELS[c.platformKey] || c.platformKey}</div>
                </div>
                <span className="badge badge-amber">NEW</span>
              </div>
              <div className="stat-foot">Account: {c.accountId?.name || '—'} · {c.lastMessageAt ? `${timeAgo(c.lastMessageAt)} ago` : 'no activity'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="select"
                  style={{ flex: 1 }}
                  value={picked[c._id] || ''}
                  onChange={(e) => setPicked((p) => ({ ...p, [c._id]: e.target.value }))}
                >
                  <option value="">Assign to...</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
                <button className="btn btn-sm" type="button" onClick={() => assign(c._id)}>Assign</button>
                <Link className="btn btn-sm btn-ghost" to="/manager/chats">Reply</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {simOpen && <SimulatorModal onClose={() => { setSimOpen(false); load(); }} />}
    </div>
  );
}

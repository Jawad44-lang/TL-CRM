import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../socket/socket.jsx';
import { EmptyState, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { fullNameDate, timeAgo } from '../../utils/format';

export default function ManagerTempAccess() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [scope, setScope] = useState('ALL');
  const [sourceCustomers, setSourceCustomers] = useState([]);
  const [customerIds, setCustomerIds] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([api.get('/temporary-access?limit=50'), api.get('/users?role=EMPLOYEE')]);
      setItems(t.data.items);
      setEmployees(e.data.items);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('tempaccess:changed', () => load());

  const loadSourceCustomers = useCallback(async (empId) => {
    setSourceCustomers([]);
    setCustomerIds([]);
    if (!empId) return;
    try {
      const { data } = await api.get(`/customers?filter=assigned&limit=100`);
      setSourceCustomers(data.items.filter((c) => c.assignedEmployeeId && c.assignedEmployeeId._id === empId));
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    loadSourceCustomers(sourceId);
  }, [sourceId, loadSourceCustomers]);

  const toggleCustomer = (id) => {
    setCustomerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const grant = async (e) => {
    e.preventDefault();
    if (!sourceId || !targetId) {
      toast('Select both employees.', 'error');
      return;
    }
    if (sourceId === targetId) {
      toast('Source and target must be different employees.', 'error');
      return;
    }
    if (scope === 'SPECIFIC' && !customerIds.length) {
      toast('Select at least one customer.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/temporary-access', { employeeId: sourceId, grantedToUserId: targetId, scope, customerIds, note });
      toast('Temporary access granted — permanent assignment unchanged.', 'success');
      setSourceId('');
      setTargetId('');
      setScope('ALL');
      setCustomerIds([]);
      setNote('');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Remove this temporary access? Customers return to their original employee.')) return;
    try {
      await api.delete(`/temporary-access/${id}`);
      toast('Temporary access removed.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHead
        title="Temporary Customer Access"
        sub="Let one employee temporarily cover another's customers. Permanent assignment is never changed — removing access returns everything to normal."
      />

      <div className="card">
        <h3 className="card-title">Grant temporary access</h3>
        <form onSubmit={grant}>
          <div className="form-row">
            <div className="field">
              <label className="label">Customers of (source employee)</label>
              <select className="select" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">— select —</option>
                {employees.filter((e) => e.status === 'ACTIVE').map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Temporarily managed by</label>
              <select className="select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">— select —</option>
                {employees.filter((e) => e.status === 'ACTIVE' && e._id !== sourceId).map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">Scope</label>
            <div className="check-row">
              <label className={`check-pill ${scope === 'ALL' ? 'on' : ''}`}>
                <input type="radio" name="scope" checked={scope === 'ALL'} onChange={() => setScope('ALL')} />
                ALL customers of {sourceId ? employees.find((e) => e._id === sourceId)?.name || 'source' : 'source'}
              </label>
              <label className={`check-pill ${scope === 'SPECIFIC' ? 'on' : ''}`}>
                <input type="radio" name="scope" checked={scope === 'SPECIFIC'} onChange={() => setScope('SPECIFIC')} />
                Specific customers only
              </label>
            </div>
          </div>
          {scope === 'SPECIFIC' && (
            <div className="field">
              <label className="label">Select customers ({customerIds.length} selected)</label>
              {!sourceId && <p className="small muted">Select a source employee first.</p>}
              {sourceId && sourceCustomers.length === 0 && <p className="small muted">This employee has no assigned customers.</p>}
              <div className="check-row">
                {sourceCustomers.map((c) => (
                  <label key={c._id} className={`check-pill ${customerIds.includes(c._id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={customerIds.includes(c._id)} onChange={() => toggleCustomer(c._id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="field" style={{ maxWidth: 420 }}>
            <label className="label">Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Covering while on leave" />
          </div>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Granting...' : 'Grant temporary access'}</button>
        </form>
      </div>

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>Access history <span className="badge badge-gray">{(items || []).length}</span></h3>
        </div>
        {!items && <PageLoader text="Loading temporary access..." />}
        {items && items.length === 0 && (
          <EmptyState icon="lock" title="No temporary access records" sub="Grant temporary access above — full history is kept here." />
        )}
        {items && items.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Original owner</th>
                  <th>Temporary manager</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Granted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t._id}>
                    <td className="cell-strong">{t.employeeId?.name || '—'}</td>
                    <td>{t.grantedToUserId?.name || '—'}</td>
                    <td>
                      <span className="badge badge-gray">{t.scope}</span>
                      {t.scope === 'SPECIFIC' && <div className="cell-sub">{(t.customerNames || []).join(', ') || `${t.customerCount || 0} customers`}</div>}
                    </td>
                    <td><span className={`badge ${t.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{t.status}</span></td>
                    <td className="small muted">{timeAgo(t.grantedAt)} ago{t.note ? ` · ${t.note}` : ''}</td>
                    <td>
                      <div className="row-actions">
                        {t.status === 'ACTIVE' && (
                          <button className="btn btn-sm btn-danger" type="button" onClick={() => revoke(t._id)}>Remove</button>
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
  );
}


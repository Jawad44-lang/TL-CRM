import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { EmptyState, PageLoader, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';

const ACTION_LABELS = { VIEW: 'View', READ: 'Read messages', SEND: 'Send', REPLY: 'Reply', DELETE: 'Delete', EDIT: 'Edit', ASSIGN: 'Assign', REASSIGN: 'Reassign', RESOLVE: 'Resolve', MANAGE: 'Manage' };

export default function AdminPermissions() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(params.get('userId') || '');
  const [grants, setGrants] = useState(null);
  const [options, setOptions] = useState(null);
  const [scopeType, setScopeType] = useState('ACCOUNT');
  const [resourceId, setResourceId] = useState('');
  const [actions, setActions] = useState(['VIEW', 'READ', 'SEND', 'REPLY']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users').then((r) => {
      const manageable = r.data.items.filter((u) => u.role !== 'ADMIN');
      setUsers(manageable);
      if (!userId && manageable.length) setUserId(manageable[0]._id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get('/access/options').then((r) => setOptions(r.data)).catch(() => {});
  }, []);

  const loadGrants = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/access?userId=${userId}`);
      setGrants(data.items);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [userId, toast]);

  useEffect(() => {
    loadGrants();
    if (userId) setParams({ userId });
  }, [loadGrants, userId, setParams]);

  const resources = (() => {
    if (!options) return [];
    if (scopeType === 'PLATFORM') return options.platforms.map((p) => ({ _id: p._id, label: p.name }));
    if (scopeType === 'ACCOUNT') return options.accounts.map((a) => ({ _id: a._id, label: a.name }));
    if (scopeType === 'GROUP') return options.groups.map((g) => ({ _id: g._id, label: g.name }));
    return options.customers.map((c) => ({ _id: c._id, label: c.name }));
  })();

  const toggleAction = (a) => {
    setActions((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const createGrant = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { userId, scopeType, actions };
      if (scopeType === 'PLATFORM') payload.platformId = resourceId;
      if (scopeType === 'ACCOUNT') payload.accountId = resourceId;
      if (scopeType === 'GROUP') payload.groupId = resourceId;
      if (scopeType === 'CUSTOMER') payload.customerId = resourceId;
      await api.post('/access', payload);
      toast('Permission granted.', 'success');
      setResourceId('');
      loadGrants();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this permission?')) return;
    try {
      await api.delete(`/access/${id}`);
      toast('Permission revoked.', 'success');
      loadGrants();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const selectedUser = users.find((u) => u._id === userId);

  return (
    <div className="page">
      <h1 className="page-title">Permissions</h1>
      <p className="page-sub">
        Granular access control. A manager can never grant access beyond their own scope (permission ceiling enforced server-side).
      </p>

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>User</h3>
          <select className="select" style={{ width: 300 }} value={userId} onChange={(e) => setUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name} — {u.role}</option>
            ))}
          </select>
        </div>

        {!grants && userId && <PageLoader text="Loading permissions..." />}
        {grants && grants.length === 0 && (
          <EmptyState icon="key" title="No permissions yet" sub="Grant platform, account, group or customer level access below." />
        )}

        {grants && grants.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Resource</th>
                  <th>Actions</th>
                  <th>Granted By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g._id}>
                    <td><span className="badge badge-indigo">{g.scopeType}</span></td>
                    <td className="cell-strong">
                      {g.scopeType === 'PLATFORM' && g.platformId?.name}
                      {g.scopeType === 'ACCOUNT' && g.accountId?.name}
                      {g.scopeType === 'GROUP' && g.groupId?.name}
                      {g.scopeType === 'CUSTOMER' && g.customerId?.name}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {g.actions.map((a) => <span key={a} className="badge badge-gray">{ACTION_LABELS[a] || a}</span>)}
                      </div>
                    </td>
                    <td>{g.grantedBy?.name || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => revoke(g._id)}>Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && selectedUser.role !== 'ADMIN' && (
        <div className="card">
          <h3 className="card-title">Grant new permission to {selectedUser.name}</h3>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={createGrant}>
            <div className="form-row">
              <div className="field">
                <label className="label">Scope level</label>
                <select className="select" value={scopeType} onChange={(e) => { setScopeType(e.target.value); setResourceId(''); }}>
                  <option value="PLATFORM">Platform (all its accounts)</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="GROUP">Group</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Resource</label>
                <select className="select" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
                  <option value="">— choose {scopeType.toLowerCase()} —</option>
                  {resources.map((r) => <option key={r._id} value={r._id}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="label">Actions allowed</label>
              <div className="check-row">
                {Object.entries(ACTION_LABELS).map(([a, label]) => (
                  <label key={a} className={`check-pill ${actions.includes(a) ? 'on' : ''}`}>
                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggleAction(a)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn" type="submit" disabled={busy || !resourceId || !actions.length}>
              {busy ? 'Granting...' : 'Grant permission'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

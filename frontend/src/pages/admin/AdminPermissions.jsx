import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Avatar, EmptyState, PageLoader, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { useConfirm } from '../../components/ConfirmProvider.jsx';

const ACTION_LABELS = { VIEW: 'View', READ: 'Read messages', SEND: 'Send', REPLY: 'Reply', EDIT: 'Edit', DELETE: 'Delete', ASSIGN: 'Assign', REASSIGN: 'Reassign', RESOLVE: 'Resolve', MANAGE: 'Manage' };
const MESSAGING_ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY'];
const MGMT_ACTIONS = ['EDIT', 'DELETE', 'ASSIGN', 'REASSIGN', 'RESOLVE', 'MANAGE'];

const SCOPES = {
  PLATFORM: { label: 'Platform', hint: 'Is platform ke saare accounts (current + future) — sabse broad access.', icon: 'grid', badge: 'badge-sky' },
  ACCOUNT: { label: 'Account', hint: 'Sirf ek inbox/business account.', icon: 'plug', badge: 'badge-indigo' },
  GROUP: { label: 'Group', hint: 'Sirf ek group chat.', icon: 'users-round', badge: 'badge-amber' },
  CUSTOMER: { label: 'Customer', hint: 'Sirf ek customer chat — sabse limited access.', icon: 'user-round', badge: 'badge-green' },
};

const PRESETS = [
  { label: 'Read only', icon: 'lock', actions: ['VIEW', 'READ'] },
  { label: 'Standard', icon: 'messages-square', actions: ['VIEW', 'READ', 'SEND', 'REPLY'] },
  { label: 'Full access', icon: 'zap', actions: Object.keys(ACTION_LABELS) },
];

export default function AdminPermissions() {
  const toast = useToast();
  const confirm = useConfirm();
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

  const toggleGroup = (group) => {
    const allOn = group.every((a) => actions.includes(a));
    setActions((prev) => (allOn ? prev.filter((a) => !group.includes(a)) : [...new Set([...prev, ...group])]));
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
    const ok = await confirm({
      key: 'permission.revoke',
      title: 'Revoke this permission?',
      message: 'The member will immediately lose this access.',
      confirmText: 'Revoke',
    });
    if (!ok) return;
    try {
      await api.delete(`/access/${id}`);
      toast('Permission revoked.', 'success');
      loadGrants();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const selectedUser = users.find((u) => u._id === userId);

  const scopeMeta = SCOPES[scopeType] || SCOPES.ACCOUNT;
  const resourceLabel = resources.find((r) => r._id === resourceId)?.label || '';
  const summary = selectedUser && resourceLabel
    ? `${selectedUser.name} ko ${scopeMeta.label} "${resourceLabel}" par: ${actions.map((a) => ACTION_LABELS[a]).join(', ')}`
    : null;

  return (
    <div className="page">
      <h1 className="page-title">Permissions</h1>
      <p className="page-sub">
        Ek jagah se control karo — kaun kya access kar sakta hai. Managers kabhi apne scope se zyada grant nahi kar sakte (server enforce karta hai).
      </p>

      <div className="card">
        <div className="section-row">
          <div className="perm-member-head">
            {selectedUser && <Avatar name={selectedUser.name} color={selectedUser.avatarColor} size="md" />}
            <div>
              <div className="perm-item-title">{selectedUser?.name || 'Select a member'}</div>
              <div className="perm-item-sub">
                {selectedUser
                  ? `${selectedUser.role} · ${grants ? `${grants.length} active permission${grants.length === 1 ? '' : 's'}` : 'loading…'}`
                  : 'Member chuno'}
              </div>
            </div>
          </div>
          <select className="select" style={{ width: 280 }} value={userId} onChange={(e) => setUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name} — {u.role}</option>
            ))}
          </select>
        </div>

        {!grants && userId && <PageLoader text="Loading permissions..." />}
        {grants && grants.length === 0 && (
          <EmptyState icon="key" title="Koi permission nahi" sub="Is member ko naya access dene ke liye neeche 3 easy steps follow karo." />
        )}

        {grants && grants.length > 0 && (
          <div className="perm-list">
            {grants.map((g) => {
              const meta = SCOPES[g.scopeType] || {};
              const resourceName =
                (g.scopeType === 'PLATFORM' && g.platformId?.name) ||
                (g.scopeType === 'ACCOUNT' && g.accountId?.name) ||
                (g.scopeType === 'GROUP' && g.groupId?.name) ||
                (g.scopeType === 'CUSTOMER' && g.customerId?.name) || '—';
              return (
                <div className="perm-item" key={g._id}>
                  <div className="perm-item-head">
                    <div className="perm-item-icon"><Icon name={meta.icon || 'key'} size={16} /></div>
                    <div className="perm-item-main">
                      <div className="perm-item-title">
                        {resourceName} <span className={`badge ${meta.badge || 'badge-gray'}`}>{meta.label || g.scopeType}</span>
                      </div>
                      <div className="perm-item-sub">Granted by {g.grantedBy?.name || '—'}</div>
                    </div>
                    <button className="btn btn-sm btn-danger" type="button" onClick={() => revoke(g._id)}>Revoke</button>
                  </div>
                  <div className="perm-item-actions-chips">
                    {g.actions.map((a) => (
                      <span key={a} className={`perm-chip ${MESSAGING_ACTIONS.includes(a) ? '' : 'mgmt'}`}>
                        {ACTION_LABELS[a] || a}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedUser && selectedUser.role !== 'ADMIN' && (
        <div className="card">
          <h3 className="card-title">Give {selectedUser.name} access to something new</h3>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={createGrant}>
            <div className="step-label">
              <span className="step-num">1</span> Kya cheez ka access dena hai?
            </div>
            <div className="seg">
              {Object.entries(SCOPES).map(([value, s]) => (
                <button
                  key={value}
                  type="button"
                  className={`seg-btn ${scopeType === value ? 'on' : ''}`}
                  onClick={() => { setScopeType(value); setResourceId(''); }}
                  title={s.hint}
                >
                  <Icon name={s.icon} size={14} /> {s.label}
                </button>
              ))}
            </div>
            <p className="small muted" style={{ margin: '8px 2px 0' }}>{scopeMeta.hint}</p>

            <div className="step-label">
              <span className="step-num">2</span> Kaunsa {scopeMeta.label.toLowerCase()}?
            </div>
            <select className="select" style={{ maxWidth: 420 }} value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
              <option value="">— choose {scopeMeta.label.toLowerCase()} —</option>
              {resources.map((r) => <option key={r._id} value={r._id}>{r.label}</option>)}
            </select>

            <div className="step-label">
              <span className="step-num">3</span> Kitna access?
              <span className="preset-row" style={{ marginLeft: 'auto' }}>
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" className="preset-btn" onClick={() => setActions(p.actions)}>
                    <Icon name={p.icon} size={13} /> {p.label}
                  </button>
                ))}
              </span>
            </div>

            <div className="action-group">
              <div className="action-group-head">
                <span className="action-group-title">Messaging</span>
                <button type="button" className="mini-link" onClick={() => toggleGroup(MESSAGING_ACTIONS)}>
                  {MESSAGING_ACTIONS.every((a) => actions.includes(a)) ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="check-row">
                {MESSAGING_ACTIONS.map((a) => (
                  <label key={a} className={`check-pill ${actions.includes(a) ? 'on' : ''}`}>
                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggleAction(a)} />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>

            <div className="action-group">
              <div className="action-group-head">
                <span className="action-group-title">Management</span>
                <button type="button" className="mini-link" onClick={() => toggleGroup(MGMT_ACTIONS)}>
                  {MGMT_ACTIONS.every((a) => actions.includes(a)) ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="check-row">
                {MGMT_ACTIONS.map((a) => (
                  <label key={a} className={`check-pill ${actions.includes(a) ? 'on' : ''}`}>
                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggleAction(a)} />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>

            <div className="grant-summary">
              <Icon name="key" size={15} />
              <span>{summary || 'Upar resource chuno — yahan plain language mein dikhega ke exactly kya grant hoga.'}</span>
            </div>

            <button className="btn" type="submit" disabled={busy || !resourceId || !actions.length}>
              {busy ? 'Granting…' : `Grant ${actions.length} permission${actions.length === 1 ? '' : 's'}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

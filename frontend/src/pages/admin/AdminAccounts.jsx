import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, Modal, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { PLATFORM_LABELS } from '../../utils/format';
import { useConfirm } from '../../components/ConfirmProvider.jsx';

export default function AdminAccounts() {
  const toast = useToast();
  const confirm = useConfirm();
  const [platforms, setPlatforms] = useState([]);
  const [accounts, setAccounts] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ platformKey: 'TELEGRAM', name: '', username: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api.get('/platforms'), api.get('/accounts')]);
      setPlatforms(p.data.items);
      setAccounts(a.data.items);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createAccount = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/accounts', form);
      toast('Demo account created.', 'success');
      setCreating(false);
      setForm({ platformKey: 'TELEGRAM', name: '', username: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (a) => {
    try {
      await api.patch(`/accounts/${a._id}`, { status: a.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED' });
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const removeAccount = async (a) => {
    const ok = await confirm({
      key: 'account.delete',
      title: `Delete account "${a.name}"?`,
      message: 'Chats and customers linked to this account will disappear from this inbox. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/accounts/${a._id}`);
      toast('Account deleted.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHead
        title="Platforms & Accounts"
        sub="Connect demo business accounts. No real platform credentials are used."
        actions={
          <button className="btn" type="button" onClick={() => setCreating(true)}>
            <Icon name="plug" size={14} />
            Connect account
          </button>
        }
      />

      <div className="stat-grid">
        {platforms.map((p) => (
          <div className="stat-card" key={p._id}>
            <div className="stat-top">
              <div className="stat-label">{PLATFORM_LABELS[p.key] || p.name}</div>
              <span className={`badge ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>{p.status === 'ACTIVE' ? 'ACTIVE' : 'COMING SOON'}</span>
            </div>
            <div className="stat-value" style={{ fontSize: 20 }}>{p.name}</div>
            <div className="stat-foot">{p.description}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>Connected accounts <span className="badge badge-gray">{(accounts || []).length}</span></h3>
        </div>

        {!accounts && <PageLoader text="Loading accounts..." />}
        {accounts && accounts.length === 0 && <EmptyState icon="plug" title="No accounts connected" sub="Connect a demo Telegram account to start receiving messages." />}

        {accounts && accounts.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Platform</th>
                  <th>Username</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <div className="cell-strong">{a.name}</div>
                      <div className="cell-sub">ID: {a.externalId}</div>
                    </td>
                    <td><span className="badge badge-indigo">{PLATFORM_LABELS[a.platformKey] || a.platformKey}</span></td>
                    <td>{a.username || '—'}</td>
                    <td><span className="badge badge-sky">{a.mode}</span></td>
                    <td><span className={`badge ${a.status === 'CONNECTED' ? 'badge-green' : 'badge-red'}`}>{a.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleStatus(a)}>
                          {a.status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                        </button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => removeAccount(a)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <Modal title="Connect demo account" onClose={() => setCreating(false)}>
          <form onSubmit={createAccount}>
            <div className="field">
              <label className="label">Platform</label>
              <select className="select" value={form.platformKey} onChange={(e) => setForm({ ...form, platformKey: e.target.value })}>
                {platforms.filter((p) => p.status === 'ACTIVE').map((p) => (
                  <option key={p._id} value={p.key}>{p.name} (active)</option>
                ))}
              </select>
              <p className="small muted" style={{ margin: '6px 0 0' }}>Instagram & WhatsApp are COMING SOON — the architecture is already multi-platform ready.</p>
            </div>
            <div className="field">
              <label className="label">Account name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Telegram Business Main" required />
            </div>
            <div className="field">
              <label className="label">Username (demo)</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="@mybusiness_demo" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create demo account'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

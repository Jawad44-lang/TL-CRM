import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../socket/socket.jsx';
import { Avatar, EmptyState, Modal, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { useConfirm } from '../../components/ConfirmProvider.jsx';

export default function ManagerEmployees() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/users?role=EMPLOYEE');
      setItems(data.items);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('employee:updated', () => load());

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/users', { ...form, role: 'EMPLOYEE' });
      toast('Employee created.', 'success');
      setCreating(false);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (u) => {
    if (u.status === 'ACTIVE') {
      const ok = await confirm({
        key: 'employee.disable',
        title: `Disable ${u.name}?`,
        message: 'They will not be able to log in until re-enabled. Assignments remain unchanged — use Temporary Access to cover their customers.',
        confirmText: 'Disable',
      });
      if (!ok) return;
    }
    try {
      await api.patch(`/users/${u._id}`, { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      toast(u.status === 'ACTIVE'
        ? 'Employee disabled — assignments remain unchanged. Use Temporary Access to cover their customers.'
        : 'Employee enabled.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHead
        title="My Employees"
        sub="Create employees, monitor their workload and open their full profiles."
        actions={
          <button className="btn" type="button" onClick={() => setCreating(true)}>
            <Icon name="user-plus" size={14} />
            Create employee
          </button>
        }
      />

      {!items && <div className="card"><PageLoader text="Loading employees..." /></div>}

      {items && items.length === 0 && (
        <div className="card"><EmptyState icon="users" title="No employees yet" sub="Create your first employee to start assigning conversations." /></div>
      )}

      {items && items.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {items.map((u) => (
            <div className="stat-card" key={u._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={u.name} color={u.avatarColor} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="cell-strong">{u.name}</div>
                  <div className="cell-sub">{u.email}</div>
                </div>
                <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
              </div>
              <div className="stat-foot">Part of your team since {new Date(u.createdAt).toLocaleDateString()}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-sm btn-ghost" to={`/manager/employees/${u._id}`}>Open profile</Link>
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleStatus(u)}>
                  {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Create employee" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <div className="field">
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="min 6 characters" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create employee'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

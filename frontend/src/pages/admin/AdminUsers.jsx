import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../socket/socket.jsx';
import { Avatar, EmptyState, Modal, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';

export default function AdminUsers() {
  const toast = useToast();
  const [role, setRole] = useState('MANAGER');
  const [items, setItems] = useState(null);
  const [managers, setManagers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MANAGER', managerId: '', phone: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/users?role=${role}`);
      setItems(data.items);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [role, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/users?role=MANAGER').then((r) => setManagers(r.data.items)).catch(() => {});
  }, []);

  useSocketEvent('employee:updated', () => load());

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role, managerId: '', phone: '' });
    setCreating(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role: u.role, managerId: u.managerId?._id || '' });
    setEditing(u);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, phone: form.phone };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editing._id}`, payload);
        toast('User updated.', 'success');
      } else {
        await api.post('/users', form);
        toast('User created.', 'success');
      }
      setCreating(false);
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (u) => {
    try {
      const status = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      await api.patch(`/users/${u._id}`, { status });
      toast(u.role === 'EMPLOYEE' && status === 'DISABLED'
        ? 'Employee disabled — their customer assignments remain unchanged.'
        : 'User updated.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      toast('User deleted.', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHead
        title="Users"
        sub="Create managers, manage employees, control access and status."
        actions={
          <button className="btn" type="button" onClick={openCreate}>
            <Icon name="user-plus" size={14} />
            Create {role === 'MANAGER' ? 'Manager' : 'Employee'}
          </button>
        }
      />

      <div className="card">
        <div className="section-row">
          <div style={{ display: 'flex', gap: 6 }}>
            {['MANAGER', 'EMPLOYEE'].map((r) => (
              <button key={r} type="button" className={`chat-tab ${role === r ? 'active' : ''}`} style={{ background: role === r ? 'var(--brand)' : '#fff', color: role === r ? '#fff' : 'var(--muted)', borderColor: 'var(--line)' }} onClick={() => setRole(r)}>
                {r === 'MANAGER' ? 'Managers' : 'Employees'}
              </button>
            ))}
          </div>
          <span className="badge badge-gray">{(items || []).length} users</span>
        </div>

        {!items && <PageLoader text="Loading users..." />}
        {items && items.length === 0 && <EmptyState icon="users" title={`No ${role.toLowerCase()}s yet`} sub={`Create your first ${role.toLowerCase()} to get started.`} />}

        {items && items.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>{role === 'EMPLOYEE' ? 'Manager' : 'Team Size'}</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} color={u.avatarColor} size="sm" />
                        <div>
                          <div className="cell-strong">{u.name}</div>
                          <div className="cell-sub">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role === 'EMPLOYEE' ? u.managerId?.name || '—' : '—'}</td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-sm btn-ghost" to={`/admin/permissions?userId=${u._id}`}>Permissions</Link>
                        {u.role === 'EMPLOYEE' && <Link className="btn btn-sm btn-ghost" to={`/admin/employees/${u._id}`}>Profile</Link>}
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleStatus(u)}>
                          {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => removeUser(u)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <Modal title={editing ? `Edit ${editing.name}` : `Create ${form.role.toLowerCase()}`} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="field">
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="label">Phone (optional)</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">{editing ? 'New password (optional)' : 'Password'}</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} placeholder="min 6 characters" />
              </div>
            </div>
            {!editing && form.role === 'EMPLOYEE' && (
              <div className="field">
                <label className="label">Assign to manager</label>
                <select className="select" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">— no manager —</option>
                  {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
              <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create user'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

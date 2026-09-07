import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../socket/socket.jsx';
import { Avatar, EmptyState, Modal, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { timeAgo, PLATFORM_LABELS } from '../../utils/format';

export default function GroupsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [managing, setManaging] = useState(null);
  const [members, setMembers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [busy, setBusy] = useState(false);
  const canManage = user.role === 'ADMIN' || user.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      setItems(data.items);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/users?role=EMPLOYEE').then((r) => setEmployees(r.data.items)).catch(() => {});
  }, []);

  const openManage = (g) => {
    setManaging(g);
    setMembers((g.memberEmployeeIds || []).map((m) => (typeof m === 'object' ? m._id : m)));
  };

  const toggleMember = (id) => {
    setMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveMembers = async () => {
    if (!managing) return;
    setBusy(true);
    try {
      await api.post(`/groups/${managing._id}/assign`, { employeeIds: members });
      toast('Group members updated.', 'success');
      setManaging(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead title="Groups" sub="Group chats can have multiple assigned employees — everyone stays in sync." />

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>All groups <span className="badge badge-gray">{(items || []).length}</span></h3>
        </div>

        {!items && <PageLoader text="Loading groups..." />}
        {items && items.length === 0 && (
          <EmptyState icon="users-round" title="No groups yet" sub="Groups appear here when customers create them on your accounts." />
        )}

        {items && items.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Members</th>
                  <th>Last Activity</th>
                  {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((g) => (
                  <tr key={g._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={g.name} color="#7C6CF6" size="sm" />
                        <div>
                          <div className="cell-strong">{g.name}</div>
                          <div className="cell-sub">{(g.memberEmployeeIds || []).length} assigned employees</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-indigo">{PLATFORM_LABELS[g.platformKey] || g.platformKey}</span></td>
                    <td>{g.accountId?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(g.memberEmployeeIds || []).slice(0, 3).map((m) => (
                          <span key={m._id || m} className="badge badge-gray">{m.name || 'Member'}</span>
                        ))}
                        {(g.memberEmployeeIds || []).length > 3 && (
                          <span className="badge badge-gray">+{(g.memberEmployeeIds || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="muted small">{g.lastMessageAt ? `${timeAgo(g.lastMessageAt)} ago` : '—'}</td>
                    {canManage && (
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm btn-ghost" type="button" onClick={() => openManage(g)}>Manage members</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {managing && (
        <Modal title={`Manage members — ${managing.name}`} onClose={() => setManaging(null)} large>
          <p className="small muted" style={{ marginTop: -6 }}>
            All selected employees can read and reply in this group according to their permissions.
          </p>
          <div className="check-row">
            {employees.map((e) => (
              <label key={e._id} className={`check-pill ${members.includes(e._id) ? 'on' : ''}`}>
                <input type="checkbox" checked={members.includes(e._id)} onChange={() => toggleMember(e._id)} />
                {e.name} {e.status !== 'ACTIVE' && '(disabled)'}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setManaging(null)}>Cancel</button>
            <button type="button" className="btn" onClick={saveMembers} disabled={busy}>{busy ? 'Saving...' : 'Save members'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

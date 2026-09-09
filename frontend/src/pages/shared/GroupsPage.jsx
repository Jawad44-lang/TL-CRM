import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../socket/socket.jsx';
import { Avatar, EmptyState, Modal, PageHead, PageLoader, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { timeAgo, PLATFORM_LABELS } from '../../utils/format';
import { useConfirm } from '../../components/ConfirmProvider.jsx';

export default function GroupsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [managing, setManaging] = useState(null);
  const [members, setMembers] = useState([]); // desired member ids — synced on save
  const [originalCount, setOriginalCount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [empQuery, setEmpQuery] = useState('');
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

  useSocketEvent('conversation:new', () => load());

  const filtered = useMemo(() => {
    if (!items) return [];
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (g) =>
        String(g.name || '').toLowerCase().includes(s) ||
        String(g.accountId?.name || '').toLowerCase().includes(s)
    );
  }, [items, q]);

  const openManage = (g) => {
    setManaging(g);
    setMembers((g.memberEmployeeIds || []).map((m) => (typeof m === 'object' ? m._id : m)));
    setOriginalCount((g.memberEmployeeIds || []).length);
    setEmpQuery('');
  };

  /** Resolve a member id to display info (employees list first, then the group's populated data). */
  const memberInfo = (id) => {
    const emp = employees.find((e) => e._id === id);
    if (emp) return emp;
    const orig = (managing?.memberEmployeeIds || []).find((m) => (m._id || m) === id);
    return {
      _id: id,
      name: orig?.name || 'Member',
      avatarColor: orig?.avatarColor || '#7C6CF6',
      role: orig?.role || 'EMPLOYEE',
      status: orig?.status,
    };
  };

  const saveMembers = async () => {
    if (!managing) return;
    if (members.length === 0 && originalCount > 0) {
      const ok = await confirm({
        key: 'group.clear-members',
        title: `Remove everyone from "${managing.name}"?`,
        message: 'All members will lose access to this group chat. You can add them back anytime.',
        confirmText: 'Remove all',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/groups/${managing._id}/assign`, { employeeIds: members });
      toast(data.message || 'Group members updated.', 'success');
      setManaging(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addable = employees.filter((e) => !members.includes(e._id));
  const addableFiltered = addable.filter(
    (e) => !empQuery.trim() || e.name.toLowerCase().includes(empQuery.trim().toLowerCase())
  );

  return (
    <div className="page">
      <PageHead
        title="Groups"
        sub="Group chats can have multiple assigned employees — everyone stays in sync."
        actions={
          items && items.length > 0 ? (
            <input
              className="input"
              style={{ width: 230 }}
              placeholder="Search groups or accounts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          ) : null
        }
      />

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>
            All groups <span className="badge badge-gray">{filtered.length}</span>
          </h3>
        </div>

        {!items && <PageLoader text="Loading groups..." />}
        {items && items.length === 0 && (
          <EmptyState icon="users-round" title="No groups yet" sub="Groups appear here when customers create them on your accounts." />
        )}

        {items && items.length > 0 && filtered.length === 0 && (
          <EmptyState icon="search" title="No matches" sub={`No group matches "${q}".`} />
        )}

        {filtered.length > 0 && (
          <div className="groups-grid">
            {filtered.map((g, i) => {
              const all = g.memberEmployeeIds || [];
              const shown = all.slice(0, 4);
              const extra = all.length - shown.length;
              return (
                <div className="group-card" key={g._id} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                  <div className="group-card-head">
                    <Avatar name={g.name} color="#7C6CF6" size="lg" />
                    <div style={{ minWidth: 0 }}>
                      <div className="group-card-title">{g.name}</div>
                      <div className="group-card-sub">{g.accountId?.name || 'Account'}</div>
                    </div>
                  </div>

                  <div className="group-card-badges">
                    <span className="badge badge-indigo">{PLATFORM_LABELS[g.platformKey] || g.platformKey}</span>
                    <span className="badge badge-gray">{all.length} member{all.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="member-stack">
                    {shown.map((m) => (
                      <Avatar key={m._id || m} name={m.name || 'Member'} color={m.avatarColor || '#7C6CF6'} size="sm" />
                    ))}
                    {extra > 0 && <span className="member-more">+{extra}</span>}
                    {all.length === 0 && <span className="group-no-members">No members assigned yet</span>}
                  </div>

                  <div className="group-card-foot">
                    <span className="muted small">{g.lastMessageAt ? `${timeAgo(g.lastMessageAt)} ago` : 'No activity yet'}</span>
                    {canManage && (
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => openManage(g)}>
                        <Icon name="user-plus" size={13} />
                        Manage members
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {managing && (
        <Modal title={`Manage members — ${managing.name}`} onClose={() => setManaging(null)} large>
          <p className="small muted" style={{ marginTop: -6 }}>
            Members can read and reply in this group chat. Removing someone takes their access away immediately —
            you can always add them back later.
          </p>

          <div className="mm-section-label">
            Current members <span className="mm-count">{members.length}</span>
          </div>
          {members.length === 0 ? (
            <div className="mm-empty">No members selected — add employees below to give them access to this group.</div>
          ) : (
            <div className="mm-list">
              {members.map((id) => {
                const m = memberInfo(id);
                return (
                  <div className="mm-member-row" key={id}>
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <div className="mm-member-main">
                      <div className="mm-member-name">
                        {m.name}
                        {m.status && m.status !== 'ACTIVE' && <span className="badge badge-red">disabled</span>}
                      </div>
                      <div className="mm-member-sub">{m.role === 'MANAGER' ? 'Manager' : 'Employee'} · can read &amp; reply</div>
                    </div>
                    <button
                      className="mm-remove"
                      type="button"
                      title={`Remove ${m.name} from this group`}
                      onClick={() => setMembers((prev) => prev.filter((x) => x !== id))}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mm-section-label">
            Add employees <span className="mm-count">{addable.length} available</span>
          </div>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            placeholder="Search employees..."
            value={empQuery}
            onChange={(e) => setEmpQuery(e.target.value)}
          />
          {addableFiltered.length === 0 ? (
            <div className="mm-empty">
              {addable.length === 0 ? 'Everyone is already a member.' : 'No employee matches your search.'}
            </div>
          ) : (
            <div className="mm-add-grid">
              {addableFiltered.map((e) => (
                <button
                  key={e._id}
                  type="button"
                  className="mm-add-pill"
                  title={`Add ${e.name} to this group`}
                  onClick={() => setMembers((prev) => [...prev, e._id])}
                >
                  <Avatar name={e.name} color={e.avatarColor} size="xs" />
                  <span className="mm-add-name">{e.name}</span>
                  {e.status !== 'ACTIVE' && <span className="badge badge-red">disabled</span>}
                </button>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setManaging(null)}>Cancel</button>
            <button type="button" className="btn" onClick={saveMembers} disabled={busy}>
              {busy ? 'Saving...' : 'Save members'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Avatar, EmptyState, PageLoader, StatCard, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { fullNameDate, timeAgo } from '../../utils/format';

export default function EmployeeProfile() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('customers');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/users/${id}/profile`);
      setData(res.data);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="page"><div className="card"><PageLoader text="Loading profile..." /></div></div>;

  const u = data.user;
  const s = data.stats;

  return (
    <div className="page">
      <Link to="/manager/employees" className="btn btn-sm btn-ghost" style={{ marginBottom: 10 }}>
        <Icon name="arrow-left" size={13} />
        Back to employees
      </Link>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Avatar name={u.name} color={u.avatarColor} size="lg" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: 24 }}>{u.name}</h1>
          <div className="cell-sub">{u.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="badge badge-indigo">EMPLOYEE</span>
          <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <StatCard label="Assigned customers" value={s.assignedCustomers} icon={<Icon name="user-round" size={16} />} tone="accent" />
        <StatCard label="Groups" value={s.groups} icon={<Icon name="users-round" size={16} />} tone="info" />
        <StatCard label="Active conversations" value={s.activeConversations} icon={<Icon name="messages-square" size={16} />} tone="err" />
        <StatCard label="Resolved conversations" value={s.resolvedConversations} icon={<Icon name="check" size={16} />} tone="ok" />
        <StatCard label="Messages sent" value={s.messagesSent} icon={<Icon name="send" size={16} />} tone="warn" />
      </div>

      <div className="card">
        <div className="section-row" style={{ gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['customers', 'Current customers'], ['groups', 'Groups'], ['history', 'Assignment history'], ['temp', 'Temporary access'], ['activity', 'Activity']].map(([k, l]) => (
              <button key={k} type="button" className={`chat-tab ${tab === k ? 'active' : ''}`} style={{ background: tab === k ? 'var(--brand)' : '#fff', color: tab === k ? '#fff' : 'var(--muted)', borderColor: 'var(--line)' }} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {tab === 'customers' && (
          (data.currentCustomers || []).length === 0 ? (
            <EmptyState icon="user-round" title="No current customers" sub="This employee has no assigned customers right now." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Customer</th><th>Status</th><th>Last activity</th></tr></thead>
                <tbody>
                  {data.currentCustomers.map((c) => (
                    <tr key={c._id}>
                      <td className="cell-strong">{c.name} <span className="muted small">· {c.username}</span></td>
                      <td><span className="badge badge-gray">{c.status}</span></td>
                      <td className="small muted">{c.lastMessageAt ? `${timeAgo(c.lastMessageAt)} ago` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'groups' && (
          (data.currentGroups || []).length === 0 ? (
            <EmptyState icon="messages-square" title="No groups" sub="This employee is not a member of any group." />
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {data.currentGroups.map((g) => (
                <span key={g._id} className="badge badge-indigo">{g.name}</span>
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          (data.assignmentHistory || []).length === 0 ? (
            <EmptyState icon="refresh" title="No assignment history" sub="Assignments and reassignments will appear here." />
          ) : (
            <div className="timeline">
              {data.assignmentHistory.map((h) => (
                <div className="timeline-item" key={h._id}>
                  <div className="t-title">
                    {h.type === 'REASSIGNED' ? 'Reassigned' : 'Assigned'}: {h.customerId?.name || 'Customer'}
                    {h.fromUserId && h.type === 'REASSIGNED' ? ` — from ${h.fromUserId.name || '—'} to ${h.toUserId?.name || '—'}` : h.toUserId ? ` — to ${h.toUserId.name}` : ''}
                  </div>
                  <div className="t-sub">{fullNameDate(h.at)} · by {h.byUserId?.name || 'system'}</div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'temp' && (
          (data.tempAccess || []).length === 0 ? (
            <EmptyState icon="lock" title="No temporary access" sub="Temporary access granted to or by this employee appears here." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Role</th><th>Counterpart</th><th>Scope</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {data.tempAccess.map((t) => (
                    <tr key={t._id}>
                      <td className="cell-strong">{t.employeeId?._id === u._id ? 'Owner' : 'Temporary manager'}</td>
                      <td>{t.employeeId?._id === u._id ? t.grantedToUserId?.name : t.employeeId?.name}</td>
                      <td><span className="badge badge-gray">{t.scope}</span></td>
                      <td><span className={`badge ${t.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{t.status}</span></td>
                      <td className="small muted">{timeAgo(t.grantedAt)} ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'activity' && (
          (data.activity || []).length === 0 ? (
            <EmptyState icon="clock" title="No activity" sub="This employee's logged actions will appear here." />
          ) : (
            <div className="timeline">
              {data.activity.map((a) => (
                <div className="timeline-item" key={a._id}>
                  <div className="t-title">{String(a.action).replaceAll('_', ' ')}</div>
                  <div className="t-sub">{fullNameDate(a.at)}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

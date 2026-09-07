import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../socket/socket.jsx';
import { Avatar, EmptyState, Modal, PageLoader, PageHead, useToast } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { timeAgo, PLATFORM_LABELS } from '../../utils/format';

export default function CustomersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [employees, setEmployees] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      try {
        const { data } = await api.get(`/customers?filter=${filter}&q=${encodeURIComponent(q)}&limit=20&page=${p}`);
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (e) {
        toast(e.message, 'error');
      }
    },
    [filter, q, toast]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    api.get('/users?role=EMPLOYEE').then((r) => setEmployees(r.data.items)).catch(() => {});
  }, []);

  useSocketEvent('customer:assigned', () => load(page));
  useSocketEvent('customer:reassigned', () => load(page));

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assigning || !employeeId) return;
    setBusy(true);
    try {
      const isReassign = Boolean(assigning.assignedEmployeeId);
      await api.post(`/customers/${assigning._id}/${isReassign ? 'reassign' : 'assign'}`, { employeeId });
      toast(`Customer ${isReassign ? 'reassigned' : 'assigned'} successfully.`, 'success');
      setAssigning(null);
      setEmployeeId('');
      load(page);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const canManage = user.role === 'ADMIN' || user.role === 'MANAGER';

  return (
    <div className="page">
      <PageHead
        title="Customers"
        sub="People messaging your business accounts — one permanent employee per customer."
        actions={
          <div className="filters-row" style={{ marginBottom: 0 }}>
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All customers</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned / New</option>
            </select>
            <input className="input" placeholder="Search name or username..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      />

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>Customers <span className="badge badge-gray">{total}</span></h3>
        </div>

        {!items && <PageLoader text="Loading customers..." />}
        {items && items.length === 0 && (
          <EmptyState
            icon="user-round"
            title={filter === 'unassigned' ? 'No new customers' : 'No customers found'}
            sub={filter === 'unassigned' ? 'All incoming customers have been assigned.' : 'Try changing the search or filter.'}
          />
        )}

        {items && items.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Assigned Employee</th>
                  <th>Last Activity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} color="#0EA5E9" size="sm" />
                        <div>
                          <div className="cell-strong">{c.name}</div>
                          <div className="cell-sub">{c.username || c.phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-indigo">{PLATFORM_LABELS[c.platformKey] || c.platformKey}</span></td>
                    <td>{c.accountId?.name || '—'}</td>
                    <td>
                      {c.assignedEmployeeId ? (
                        <span className="badge badge-green">{c.assignedEmployeeId.name}</span>
                      ) : (
                        <span className="badge badge-amber">Unassigned</span>
                      )}
                    </td>
                    <td className="muted small">{c.lastMessageAt ? `${timeAgo(c.lastMessageAt)} ago` : '—'}</td>
                    <td>
                      <div className="row-actions">
                        {canManage && (
                          <button
                            className="btn btn-sm btn-ghost"
                            type="button"
                            onClick={() => {
                              setAssigning(c);
                              setEmployeeId(c.assignedEmployeeId?._id || '');
                            }}
                          >
                            {c.assignedEmployeeId ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items && pages > 1 && (
          <div className="pagination-row">
            <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => load(page - 1)} type="button">
              <Icon name="chevron-left" size={13} />
              Prev
            </button>
            <span className="small muted">Page {page} of {pages} · {total} customers</span>
            <button className="btn btn-sm btn-ghost" disabled={page >= pages} onClick={() => load(page + 1)} type="button">
              Next
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        )}
      </div>

      {assigning && (
        <Modal title={assigning.assignedEmployeeId ? 'Reassign customer' : 'Assign customer'} onClose={() => setAssigning(null)}>
          <div className="success-text">
            <strong>{assigning.name}</strong>{' '}
            {assigning.assignedEmployeeId
              ? `is currently assigned to ${assigning.assignedEmployeeId.name}.`
              : 'is waiting in the New / Unassigned queue.'}
          </div>
          <form onSubmit={submitAssign}>
            <div className="field">
              <label className="label">Select employee</label>
              <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">— choose —</option>
                {employees.filter((e) => e.status === 'ACTIVE').map((e) => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAssigning(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={busy || !employeeId}>{busy ? 'Saving...' : 'Confirm'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

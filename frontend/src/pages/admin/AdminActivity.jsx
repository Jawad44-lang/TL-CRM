import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, PageLoader, PageHead } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { fullNameDate } from '../../utils/format';

const ACTION_BADGES = {
  USER_CREATED: 'badge-sky', USER_DELETED: 'badge-red', USER_UPDATED: 'badge-gray',
  EMPLOYEE_DISABLED: 'badge-red', PERMISSION_GRANTED: 'badge-green', PERMISSION_REVOKED: 'badge-amber',
  CUSTOMER_ASSIGNED: 'badge-indigo', CUSTOMER_REASSIGNED: 'badge-amber', GROUP_ASSIGNED: 'badge-indigo',
  GROUP_REMOVED: 'badge-amber', GROUP_MEMBERS_UPDATED: 'badge-indigo',
  TEMP_ACCESS_GRANTED: 'badge-green', TEMP_ACCESS_REMOVED: 'badge-red', MESSAGE_SENT: 'badge-gray',
  ACCOUNT_CREATED: 'badge-sky', MESSAGE_READ: 'badge-gray',
};

export default function AdminActivity() {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [action, setAction] = useState('');

  const load = useCallback(async (p = 1) => {
    const { data } = await api.get(`/activity?limit=30&page=${p}${action ? `&action=${action}` : ''}`);
    setItems(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPages(data.pages);
  }, [action]);

  useEffect(() => {
    load(1);
  }, [load]);

  const actions = ['', 'USER_CREATED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'CUSTOMER_ASSIGNED', 'CUSTOMER_REASSIGNED', 'TEMP_ACCESS_GRANTED', 'TEMP_ACCESS_REMOVED', 'MESSAGE_SENT', 'EMPLOYEE_DISABLED'];

  return (
    <div className="page">
      <PageHead
        title="Activity / Audit Logs"
        sub="Every important action is recorded — who did what, and when."
        actions={
          <select className="select" style={{ width: 240 }} value={action} onChange={(e) => setAction(e.target.value)}>
            {actions.map((a) => (
              <option key={a} value={a}>{a ? a.replaceAll('_', ' ') : 'All actions'}</option>
            ))}
          </select>
        }
      />

      <div className="card">
        <div className="section-row">
          <h3 className="card-title" style={{ margin: 0 }}>Logs <span className="badge badge-gray">{total}</span></h3>
        </div>

        {!items && <PageLoader text="Loading activity..." />}
        {items && items.length === 0 && <EmptyState icon="clock" title="No activity found" sub="Actions will appear here as the system is used." />}

        {items && items.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>Details</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td><span className={`badge ${ACTION_BADGES[a.action] || 'badge-gray'}`}>{a.action.replaceAll('_', ' ')}</span></td>
                    <td>
                      <div className="cell-strong">{a.actorName}</div>
                      <div className="cell-sub">{a.actorRole}</div>
                    </td>
                    <td>{a.resource}{a.resourceId ? ` #${String(a.resourceId).slice(-6)}` : ''}</td>
                    <td className="small muted" style={{ maxWidth: 280 }}>
                      {a.metadata && Object.keys(a.metadata).length
                        ? Object.entries(a.metadata).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ').slice(0, 120)
                        : '—'}
                    </td>
                    <td className="small muted">{fullNameDate(a.at)}</td>
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
            <span className="small muted">Page {page} of {pages}</span>
            <button className="btn btn-sm btn-ghost" disabled={page >= pages} onClick={() => load(page + 1)} type="button">
              Next
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

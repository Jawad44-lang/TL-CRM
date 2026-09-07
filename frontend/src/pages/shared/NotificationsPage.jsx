import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useSocketEvent } from '../../socket/socket.jsx';
import { EmptyState, PageLoader, PageHead } from '../../components/ui.jsx';
import Icon from '../../components/icons.jsx';
import { timeAgo } from '../../utils/format';

const NOTIF_ICONS = {
  NEW_UNASSIGNED: 'inbox', NEW_MESSAGE: 'messages-square', GROUP_MESSAGE: 'users-round', CUSTOMER_ASSIGNED: 'user-plus',
  CUSTOMER_REASSIGNED: 'refresh', TEMP_ACCESS_GRANTED: 'lock', TEMP_ACCESS_REMOVED: 'lock',
  EMPLOYEE_DISABLED: 'alert', PERMISSION_GRANTED: 'key', PERMISSION_REVOKED: 'key', GROUP_ASSIGNED: 'users-round',
  GROUP_REMOVED: 'users-round', EMPLOYEE_ENABLED: 'check',
};

export default function NotificationsPage() {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async (p = 1) => {
    const { data } = await api.get(`/notifications?limit=20&page=${p}`);
    setItems(data.items);
    setTotal(data.total);
    setPages(data.pages);
    setPage(data.page);
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useSocketEvent('notification:new', () => load(1));

  const markAll = async () => {
    await api.post('/notifications/read-all');
    load(page);
  };

  const markOne = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="page">
      <PageHead
        title="Notifications"
        sub="Assignment changes, new messages, temporary access and more."
        actions={
          <button className="btn btn-ghost" type="button" onClick={markAll}>
            <Icon name="check" size={14} />
            Mark all as read
          </button>
        }
      />

      <div className="card">
        <div className="section-row">
          <h3 className="card-title">
            All notifications
            <span className="badge badge-gray">{total}</span>
          </h3>
        </div>

        {!items && <PageLoader text="Loading notifications..." />}
        {items && items.length === 0 && (
          <EmptyState icon="bell" title="No notifications yet" sub="You will see assignment and message alerts here." />
        )}
        {items &&
          items.map((n) => (
            <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => !n.read && markOne(n._id)}>
              <div className="notif-icon"><Icon name={NOTIF_ICONS[n.type] || 'bell'} size={16} /></div>
              <div className="notif-text">
                <div className="notif-title">{n.title}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">{timeAgo(n.createdAt)} ago</div>
              </div>
              {!n.read && <span className="notif-dot" />}
            </div>
          ))}

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

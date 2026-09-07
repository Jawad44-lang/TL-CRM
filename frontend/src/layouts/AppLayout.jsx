import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSocket, useSocketEvent } from '../socket/socket.jsx';
import { useToast } from '../components/ui.jsx';
import LogoMark from '../components/Logo.jsx';
import { useConfirm } from '../components/ConfirmProvider.jsx';
import Icon from '../components/icons.jsx';
import { timeAgo } from '../utils/format';

const NAV = {
  ADMIN: [
    {
      label: 'Workspace',
      items: [
        ['/admin/overview', 'Overview', 'grid'],
        ['/admin/chats', 'Chats', 'messages-square'],
        ['/admin/customers', 'Customers', 'user-round'],
        ['/admin/groups', 'Groups', 'users-round'],
      ],
    },
    {
      label: 'Administration',
      items: [
        ['/admin/users', 'Users', 'users'],
        ['/admin/platforms', 'Platforms', 'plug'],
        ['/admin/permissions', 'Permissions', 'key'],
        ['/admin/activity', 'Activity', 'clock'],
      ],
    },
  ],
  MANAGER: [
    {
      label: 'Workspace',
      items: [
        ['/manager/overview', 'Dashboard', 'grid'],
        ['/manager/new', 'New Messages', 'inbox'],
        ['/manager/chats', 'Chats', 'messages-square'],
        ['/manager/groups', 'Groups', 'users-round'],
        ['/manager/customers', 'Customers', 'user-round'],
      ],
    },
    {
      label: 'Team',
      items: [
        ['/manager/employees', 'Employees', 'users'],
        ['/manager/temp-access', 'Temp Access', 'lock'],
      ],
    },
  ],
  EMPLOYEE: [{ label: 'Workspace', items: [['/employee/chats', 'Chats', 'messages-square']] }],
};

const NOTIF_ICONS = {
  NEW_UNASSIGNED: 'inbox',
  NEW_MESSAGE: 'messages-square',
  GROUP_MESSAGE: 'users-round',
  CUSTOMER_ASSIGNED: 'user-plus',
  CUSTOMER_REASSIGNED: 'refresh',
  TEMP_ACCESS_GRANTED: 'lock',
  TEMP_ACCESS_REMOVED: 'lock',
  EMPLOYEE_DISABLED: 'alert',
  PERMISSION_GRANTED: 'key',
  PERMISSION_REVOKED: 'key',
  GROUP_ASSIGNED: 'users-round',
  GROUP_REMOVED: 'users-round',
  EMPLOYEE_ENABLED: 'check',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1100px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 1100px)').matches);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=15');
      setNotifs(data.items);
      setUnread(data.unreadCount);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Keep sidebar behaviour in sync when crossing the mobile/desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)');
    const onChange = (e) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches); // sensible default whenever the breakpoint changes
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Close overlays with Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setDrawerOpen(false);
      if (isMobile) setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobile]);

  useSocketEvent('notification:new', (n) => {
    setNotifs((prev) => [n, ...prev].slice(0, 15));
    setUnread((u) => u + 1);
    toast(n.title, 'info');
  });

  const openDrawer = async () => {
    setDrawerOpen(true);
    try {
      await api.post('/notifications/read-all');
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* silent */
    }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      /* silent */
    }
  };

  const nav = NAV[user.role] || [];
  const rolePath = user.role.toLowerCase();

  return (
    <div className={`app-shell ${!sidebarOpen ? 'rail-collapsed' : ''}`}>
      {/* Sleek Icon Rail Sidebar */}
      <aside className={`app-sidebar-rail ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Logo at top */}
        <div className="rail-brand" onClick={() => navigate(`/${rolePath}/overview`)} title="CRM Dashboard">
          <div className="rail-logo-badge">
            <LogoMark size={26} />
          </div>
        </div>

        {/* Navigation Items Vertical Stack */}
        <nav className="rail-nav">
          {nav.flatMap((group) => group.items).map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `rail-nav-item ${isActive ? 'active' : ''}`}
              title={label}
              onClick={() => { if (isMobile) setSidebarOpen(false); }}
            >
              <Icon name={icon} size={19} weight="bold" />
              {label === 'Chats' && unread > 0 && <span className="rail-badge-dot" />}
              <span className="rail-tooltip">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Utility Icons */}
        <div className="rail-bottom-stack">
          <button
            type="button"
            className="rail-nav-item rail-btn-item"
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={19} weight="bold" />
            <span className="rail-tooltip">{isDark ? 'Light theme' : 'Dark theme'}</span>
          </button>

          <button
            type="button"
            className="rail-nav-item rail-btn-item"
            title="Notifications"
            onClick={openDrawer}
            aria-label="Notifications"
          >
            <Icon name="bell" size={19} />
            {unread > 0 && <span className="rail-count-badge">{unread > 99 ? '99+' : unread}</span>}
            <span className="rail-tooltip">Notifications</span>
          </button>

          <NavLink
            to={`/${rolePath}/settings`}
            className={({ isActive }) => `rail-nav-item ${isActive ? 'active' : ''}`}
            title="Settings"
            onClick={() => { if (isMobile) setSidebarOpen(false); }}
          >
            <Icon name="settings" size={19} />
            <span className="rail-tooltip">Settings</span>
          </NavLink>

          <button
            type="button"
            className="rail-nav-item rail-btn-item"
            title="Help & Support"
            onClick={() => toast('Messaging CRM v2.0 · Reference Edition', 'info')}
          >
            <Icon name="help" size={19} />
            <span className="rail-tooltip">Help</span>
          </button>

          <button
            type="button"
            className="rail-nav-item rail-btn-item logout-item"
            title="Log Out"
            onClick={async () => {
              const ok = await confirm({
                key: 'logout',
                title: 'Log out?',
                message: 'You will need to sign in again to access the CRM.',
                confirmText: 'Log out',
              });
              if (ok) logout().then(() => navigate('/login'));
            }}
          >
            <Icon name="log-out" size={19} />
            <span className="rail-tooltip">Log out</span>
          </button>
        </div>
      </aside>

      {isMobile && sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-body">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="icon-btn menu-btn"
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Icon name="menu" size={18} />
            </button>
            <div className="topbar-breadcrumb">
              <span className="live-status-pill">
                <span className={`conn-dot ${connected ? 'on' : ''}`} />
                <span>{connected ? 'Live Sync' : 'Connecting…'}</span>
              </span>
            </div>
          </div>

        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-head">
              <h3 className="modal-title">Notifications</h3>
              <div className="drawer-head-actions">
                <a
                  href={`/${rolePath}/notifications`}
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => { e.preventDefault(); setDrawerOpen(false); navigate(`/${rolePath}/notifications`); }}
                >
                  View all
                </a>
                <button className="modal-close" onClick={() => setDrawerOpen(false)} type="button" aria-label="Close">
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>
            <div className="drawer-body">
              {notifs.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon"><Icon name="bell" size={26} /></div>
                  <h4>No notifications</h4>
                  <p>You are all caught up.</p>
                </div>
              )}
              {notifs.map((n) => (
                <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => markRead(n._id)}>
                  <div className="notif-icon"><Icon name={NOTIF_ICONS[n.type] || 'bell'} size={16} /></div>
                  <div className="notif-text">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)} ago</div>
                  </div>
                  {!n.read && <span className="notif-dot" />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
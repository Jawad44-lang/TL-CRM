import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSocket, useSocketEvent } from '../socket/socket.jsx';
import { Avatar, useToast } from '../components/ui.jsx';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
    <div className="app-shell">
      {/* Sleek Icon Rail Sidebar matching reference image */}
      <aside className={`app-sidebar-rail ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Logo at top */}
        <div className="rail-brand" onClick={() => navigate(`/${rolePath}/overview`)} title="CRM Dashboard">
          <div className="rail-logo-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V10C16 11.1046 15.1046 12 14 12H4V6Z" fill="white" />
              <path d="M4 14C4 12.8954 4.89543 12 6 12H11C12.1046 12 13 12.8954 13 14V18C13 19.1046 12.1046 20 11 20H6C4.89543 20 4 19.1046 4 18V14Z" fill="white" fillOpacity="0.75" />
            </svg>
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
              onClick={() => setSidebarOpen(false)}
            >
              <div className="rail-icon-wrap">
                <Icon name={icon} size={19} weight="bold" />
                {label === 'Chats' && unread > 0 && <span className="rail-badge-dot" />}
              </div>
              <span className="rail-tooltip">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Utility Icons (Settings, Help, Logout) */}
        <div className="rail-bottom-stack">
          <NavLink
            to={`/${rolePath}/settings`}
            className={({ isActive }) => `rail-nav-item ${isActive ? 'active' : ''}`}
            title="Settings"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="rail-icon-wrap">
              <Icon name="settings" size={19} />
            </div>
            <span className="rail-tooltip">Settings</span>
          </NavLink>

          <button
            type="button"
            className="rail-nav-item rail-btn-item"
            title="Help & Support"
            onClick={() => toast('Messaging CRM v2.0 · Reference Edition', 'info')}
          >
            <div className="rail-icon-wrap">
              <Icon name="help" size={19} />
            </div>
            <span className="rail-tooltip">Help</span>
          </button>

          <button
            type="button"
            className="rail-nav-item rail-btn-item logout-item"
            title="Log Out"
            onClick={() => logout().then(() => navigate('/login'))}
          >
            <div className="rail-icon-wrap">
              <Icon name="log-out" size={19} />
            </div>
            <span className="rail-tooltip">Log out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-body">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Icon name="menu" size={18} />
            </button>
            <div className="topbar-breadcrumb">
              <span className="live-status-pill">
                <span className={`conn-dot ${connected ? 'on' : ''}`} />
                <span>{connected ? 'Live Sync' : 'Connecting…'}</span>
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <button
              className="icon-btn theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              type="button"
              aria-label="Toggle theme"
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={17} weight="bold" />
            </button>
            <button className="icon-btn" onClick={openDrawer} title="Notifications" type="button" aria-label="Notifications">
              <Icon name="bell" size={17} />
              {unread > 0 && <span className="badge-dot">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <div className="user-menu-trigger" ref={menuRef}>
              <button className="user-chip" type="button" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu">
                <Avatar name={user.name} color={user.avatarColor} size="sm" />
                <span className="user-meta">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role}</span>
                </span>
                <Icon name="chevron-down" size={14} className="user-chev" />
              </button>
              {menuOpen && (
                <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="user-menu-head">
                    <div className="user-menu-name">{user.name}</div>
                    <div className="user-menu-mail">{user.email}</div>
                  </div>
                  <a href="/settings" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate(`/${rolePath}/settings`); }}>
                    <Icon name="settings" size={15} /> Settings
                  </a>
                  <a href="/notifications" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate(`/${rolePath}/notifications`); }}>
                    <Icon name="bell" size={15} /> Notifications
                  </a>
                  <button className="danger" type="button" onClick={() => logout().then(() => navigate('/login'))}>
                    <Icon name="log-out" size={15} /> Log out
                  </button>
                </div>
              )}
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
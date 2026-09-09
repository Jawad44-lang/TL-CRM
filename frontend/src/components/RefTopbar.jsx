import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './icons.jsx';
import { Avatar } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

/* Valid tabs per role — mapped to real routes.
   The active pill is highlighted based on the current route. */
const TABS = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin/overview' },
    { label: 'Team', path: '/admin/users' },
    { label: 'Attendance', path: '/admin/attendance' },
    { label: 'Reports', path: '/admin/activity' },
    { label: 'Chat', path: '/admin/chats' },
    { label: 'Company', path: '/admin/platforms' },
  ],
  MANAGER: [
    { label: 'Dashboard', path: '/manager/overview' },
    { label: 'Employees', path: '/manager/employees' },
    { label: 'Attendance', path: '/manager/attendance' },
    { label: 'Chats', path: '/manager/chats' },
    { label: 'Temp Access', path: '/manager/temp-access' },
    { label: 'Customers', path: '/manager/customers' },
  ],
  EMPLOYEE: [
    { label: 'Dashboard', path: '/employee/chats' },
    { label: 'Notifications', path: '/employee/notifications' },
  ],
};

export default function RefTopbar({ unread = 0 }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = user?.role || 'EMPLOYEE';
  const rolePath = role.toLowerCase();
  const tabs = TABS[role] || [];

  /* Profile dropdown — reveals on hover; click also toggles (touch friendly) */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClickAway = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="ref-topbar ref-topbar-page">
      <nav className="ref-nav-pills" aria-label="Main Navigation">
        {tabs.map((t) => (
          <button
            key={t.path}
            type="button"
            className={`ref-pill-tab ${pathname.startsWith(t.path) ? 'active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ref-topbar-actions">
        <button
          className="ref-icon-circle-btn"
          type="button"
          title="Search chats"
          onClick={() => navigate(`/${rolePath}/chats`)}
        >
          <Icon name="search" size={17} />
        </button>

        <button
          className="ref-icon-circle-btn theme-toggle-btn"
          type="button"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={17} weight="bold" />
        </button>

        <button
          className="ref-icon-circle-btn notif-btn"
          type="button"
          title="Notifications"
          onClick={() => navigate(`/${rolePath}/notifications`)}
        >
          <Icon name="bell" size={17} />
          {unread > 0 && <span className="ref-bell-dot" />}
        </button>

        <div
          ref={menuWrapRef}
          className={`ref-user-menu-wrap ${menuOpen ? 'open' : ''}`}
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <div
            className="ref-user-avatar-btn"
            title={`${user?.name || 'User'} — Profile menu`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar name={user?.name || '?'} color={user?.avatarColor || '#7367f0'} size="md" />
          </div>

          <div className="ref-user-menu" role="menu" aria-label="Profile menu">
            <div className="ref-user-menu-head">
              <Avatar name={user?.name || '?'} color={user?.avatarColor || '#7367f0'} size="md" />
              <div className="ref-user-menu-meta">
                <span className="ref-user-menu-name">{user?.name || 'User'}</span>
                <span className="ref-user-menu-mail">{user?.email || ''}</span>
              </div>
            </div>
            <div className="ref-user-menu-divider" />
            <button type="button" className="ref-user-menu-item" onClick={() => go(`/${rolePath}/settings`)}>
              <Icon name="user-round" size={15} />
              <span>Profile</span>
            </button>
            <button type="button" className="ref-user-menu-item" onClick={() => go(`/${rolePath}/settings`)}>
              <Icon name="settings" size={15} />
              <span>Settings</span>
            </button>
            <div className="ref-user-menu-divider" />
            <button type="button" className="ref-user-menu-item danger" onClick={handleSignOut}>
              <Icon name="log-out" size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    { label: 'Employees', path: '/admin/users' },
    { label: 'Attendance', path: '/admin/attendance' },
    { label: 'Reports', path: '/admin/activity' },
    { label: 'Schedule', path: '/admin/chats' },
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
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = user?.role || 'EMPLOYEE';
  const rolePath = role.toLowerCase();
  const tabs = TABS[role] || [];

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
          className="ref-user-avatar-btn"
          title={`${user?.name || 'User'} — Settings`}
          onClick={() => navigate(`/${rolePath}/settings`)}
        >
          <Avatar name={user?.name || '?'} color={user?.avatarColor || '#7367f0'} size="md" />
        </div>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initials } from '../utils/format';
import Icon from './icons.jsx';

/* ---------------- Avatar ---------------- */
export function Avatar({ name = '?', color = '#4c5ee0', size = 'md' }) {
  return (
    <div className={`avatar avatar-${size}`} style={{ background: color }} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

/* ---------------- Page header ---------------- */
export function PageHead({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ---------------- Stat / KPI card ---------------- */
const CHIP_TONES = {
  'chip-indigo': 'accent',
  'chip-green': 'ok',
  'chip-red': 'err',
  'chip-amber': 'warn',
  'chip-sky': 'info',
};

export function StatCard({ label, value, icon, chip = 'chip-indigo', foot, tone, iconBg }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        {icon && (
          <div
            className={`stat-chip ${tone ? `stat-chip-${tone}` : CHIP_TONES[chip] ? `stat-chip-${CHIP_TONES[chip]}` : 'stat-chip-accent'}`}
            style={iconBg ? { background: iconBg } : undefined}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, large, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={`modal ${large ? 'modal-lg' : ''}`}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon = 'info', title, sub, iconClass = '' }) {
  return (
    <div className="empty-state">
      <div className={`empty-icon ${iconClass}`}>
        {typeof icon === 'string' ? <Icon name={icon} size={26} /> : icon}
      </div>
      <h4>{title}</h4>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/* ---------------- Loaders ---------------- */
export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="center-loader">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

/* ---------------- Toast system ---------------- */
const TOAST_ICONS = { success: 'check', error: 'alert', info: 'info' };

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <Icon name={TOAST_ICONS[t.type] || 'info'} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
export const PLATFORM_LABELS = { TELEGRAM: 'Telegram', INSTAGRAM: 'Instagram', WHATSAPP: 'WhatsApp' };

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function clockTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(d) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fullNameDate(d) {
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const ROLE_COLORS = { ADMIN: '#5B5BD6', MANAGER: '#F5A524', EMPLOYEE: '#0EA5E9' };

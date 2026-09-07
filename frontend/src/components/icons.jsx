/**
 * Icon system — Phosphor Icons (MIT License)
 * https://phosphoricons.com/
 * 
 * 6000+ consistent icons with multiple weights.
 * We use 'regular' for UI elements and 'bold' for emphasis/active states.
 * 
 * All icons inherit currentColor and scale to any size.
 */

import * as Icons from '@phosphor-icons/react';

/**
 * Map our internal icon names to Phosphor components.
 * Keeps the API consistent across the app — just change the mapping here
 * to swap icon libraries without touching any components.
 */
const ICON_MAP = {
  /* navigation */
  grid: Icons.SquaresFour,
  users: Icons.Users,
  key: Icons.Key,
  plug: Icons.Plug,
  'user-round': Icons.User,
  'users-round': Icons.UsersThree,
  'messages-square': Icons.ChatCircleDots,
  clock: Icons.Clock,
  bell: Icons.Bell,
  settings: Icons.Gear,
  'log-out': Icons.SignOut,
  menu: Icons.List,
  calendar: Icons.CalendarBlank,
  chart: Icons.ChartBar,
  folder: Icons.Folder,
  document: Icons.FileText,
  help: Icons.Question,

  /* actions */
  plus: Icons.Plus,
  search: Icons.MagnifyingGlass,
  send: Icons.PaperPlaneTilt,
  paperclip: Icons.Paperclip,
  zap: Icons.Lightning,
  refresh: Icons.ArrowsClockwise,
  check: Icons.Check,
  x: Icons.X,
  filter: Icons.Funnel,
  'arrow-left': Icons.ArrowLeft,
  'arrow-up-right': Icons.ArrowUpRight,
  'trend-up': Icons.TrendUp,
  dollar: Icons.CurrencyDollar,
  sun: Icons.Sun,
  moon: Icons.Moon,

  /* status */
  alert: Icons.Warning,
  info: Icons.Info,

  /* objects */
  mail: Icons.Envelope,
  lock: Icons.Lock,
  pencil: Icons.Pencil,
  trash: Icons.Trash,
  'user-plus': Icons.UserPlus,
  inbox: Icons.Tray,
  'external-link': Icons.ArrowSquareOut,
  'land-plot': Icons.MapTrifold,
  eye: Icons.Eye,
  globe: Icons.Globe,

  /* chevrons */
  'chevron-down': Icons.CaretDown,
  'chevron-right': Icons.CaretRight,
  'chevron-left': Icons.CaretLeft,
};

/** Default icon when name not found */
const FALLBACK = Icons.Info;

/**
 * Render a Phosphor icon.
 * @param {string} name - icon key (see ICON_MAP)
 * @param {number} size - pixel size (width & height)
 * @param {'regular'|'bold'|'fill'|'duotone'} weight - visual weight
 * @param {string} className - extra classes
 */
export default function Icon({ name = 'info', size = 18, weight = 'regular', className = '', ...rest }) {
  const IconComponent = ICON_MAP[name] || FALLBACK;
  return (
    <IconComponent
      className={`icon ${className}`.trim()}
      size={size}
      weight={weight}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

/* Re-export for direct imports if needed */
export { Icons };
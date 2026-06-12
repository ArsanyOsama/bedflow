// nurse-app/constants/colors.ts
// UPDATED: Hybrid palette — Figma teal primary + MVP gold accent
// UPDATED: All status colors from Figma spec
// UPDATED: Added 'discharging' state (amber)

export const COLORS = {
  // ── BRAND ────────────────────────────────────────────────
  brand:       '#00C896',   // Figma teal — primary CTA, active states
  brandHover:  '#00A87E',   // Teal hover
  brandDark:   '#0D1B2A',   // Dark sidebar / heavy type
  primary:     '#00C896',   // FIX B-15: alias for brand — resolves TS error in 3 files
  brandGold:   '#D4A017',   // Egyptian gold accent (data callouts, highlights)
  brandGoldBg: '#FFFBF0',   // Gold background tint

  // ── STATUS COLORS (Figma spec, WCAG AA accessible) ────────
  available:   '#06D6A0',   // Bright teal-green — capacity exists
  discharging: '#FFD166',   // Amber — ~30min to free
  occupied:    '#EF233C',   // Rich red — no capacity
  cleaning:    '#4CC9F0',   // Light blue — being prepared
  reserved:    '#7B2FBE',   // Purple — committed, incoming
  maintenance: '#8D99AE',   // Grey — out of service

  // ── UI SURFACES ───────────────────────────────────────────
  background:  '#F5F4F0',   // Warm off-white (Figma spec)
  white:       '#FFFFFF',
  surface:     '#F8F9FA',
  border:      '#E4E8EE',
  borderStrong:'#C9D0DA',

  // ── TEXT ──────────────────────────────────────────────────
  textPrimary:   '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted:     '#8896AB',

  // ── ALERT / SEMANTIC ──────────────────────────────────────
  alertCritical: '#EF233C',
  alertWarning:  '#FFD166',
  alertInfo:     '#00B4D8',
  alertSuccess:  '#06D6A0',
}

// ── STATUS CONFIGURATION ──────────────────────────────────────────────────────
export interface StatusConfig {
  color:   string
  bgLight: string
  border:  string
  en:      string
  ar:      string
  emoji:   string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  available: {
    color:   COLORS.available,
    bgLight: '#F0FFF9',
    border:  '#06D6A0',
    en:      'Available',
    ar:      'متاح',
    emoji:   '✓',
  },
  discharging: {
    color:   COLORS.discharging,
    bgLight: '#FFFDF0',
    border:  '#FFD166',
    en:      'Discharging',
    ar:      'قريباً',
    emoji:   '◐',
  },
  occupied: {
    color:   COLORS.occupied,
    bgLight: '#FFF5F5',
    border:  '#EF233C',
    en:      'Occupied',
    ar:      'مشغول',
    emoji:   '●',
  },
  cleaning: {
    color:   COLORS.cleaning,
    bgLight: '#F0FAFF',
    border:  '#4CC9F0',
    en:      'Cleaning',
    ar:      'تنظيف',
    emoji:   '↻',
  },
  reserved: {
    color:   COLORS.reserved,
    bgLight: '#F8F0FF',
    border:  '#7B2FBE',
    en:      'Reserved',
    ar:      'محجوز',
    emoji:   '⊠',
  },
  maintenance: {
    color:   COLORS.maintenance,
    bgLight: '#F7F8FA',
    border:  '#8D99AE',
    en:      'Maintenance',
    ar:      'صيانة',
    emoji:   '⚙',
  },
}

// ── HELPER: get orderable statuses for Update screen ─────────────────────────
// Ordered by frequency of use: available → discharging → occupied → cleaning → maintenance → reserved
export const UPDATE_STATUSES = [
  'available',
  'discharging',
  'occupied',
  'cleaning',
  'maintenance',
  'reserved',
] as const
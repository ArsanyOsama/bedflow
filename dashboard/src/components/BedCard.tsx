// src/components/BedCard.tsx
// UPDATED: Left-border style per Figma spec (clinical, not toy-like)
// UPDATED: Added discharging status with amber (#FFD166)
// UPDATED: Roboto Mono for bed numbers

import type { BedStatus } from '../types'
import { cn } from '../lib/utils'

interface StatusConfig {
  border: string
  bg: string
  text: string
  dot: string
  label: string
  labelAr: string
}

const STATUS_CONFIG: Record<BedStatus, StatusConfig> = {
  available: {
    border: '#06D6A0',
    bg:     '#F0FFF9',
    text:   '#06D6A0',
    dot:    '#06D6A0',
    label:  'Available',
    labelAr: 'متاح',
  },
  discharging: {
    border: '#FFD166',
    bg:     '#FFFDF0',
    text:   '#B8860B',
    dot:    '#FFD166',
    label:  'Discharging',
    labelAr: 'قريباً',
  },
  occupied: {
    border: '#EF233C',
    bg:     '#FFF5F5',
    text:   '#EF233C',
    dot:    '#EF233C',
    label:  'Occupied',
    labelAr: 'مشغول',
  },
  cleaning: {
    border: '#4CC9F0',
    bg:     '#F0FAFF',
    text:   '#0077A8',
    dot:    '#4CC9F0',
    label:  'Cleaning',
    labelAr: 'تنظيف',
  },
  reserved: {
    border: '#7B2FBE',
    bg:     '#F8F0FF',
    text:   '#7B2FBE',
    dot:    '#7B2FBE',
    label:  'Reserved',
    labelAr: 'محجوز',
  },
  maintenance: {
    border: '#8D99AE',
    bg:     '#F7F8FA',
    text:   '#8D99AE',
    dot:    '#8D99AE',
    label:  'Maintenance',
    labelAr: 'صيانة',
  },
}

interface BedCardProps {
  bedNumber: string
  status: BedStatus
  onClick?: () => void
  compact?: boolean
  timeInStatus?: string
}

export function BedCard({ bedNumber, status, onClick, compact = false, timeInStatus }: BedCardProps) {
  const c = STATUS_CONFIG[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'bed-card',
        compact ? 'min-h-[64px] p-2' : 'min-h-[80px] p-3',
      )}
      style={{
        borderLeft: `4px solid ${c.border}`,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}20`,
        borderLeftWidth: '4px',
        borderLeftColor: c.border,
      }}
      title={`${bedNumber} — ${c.label}`}
    >
      {/* Bed number — Roboto Mono */}
      <span
        className={cn('font-mono font-bold text-[#0D1B2A] leading-none', compact ? 'text-[10px]' : 'text-xs')}
      >
        {bedNumber}
      </span>

      {/* Status dot + label */}
      <div className="flex items-center gap-1">
        <span
          className="rounded-full flex-shrink-0"
          style={{
            width: compact ? '5px' : '6px',
            height: compact ? '5px' : '6px',
            backgroundColor: c.dot,
          }}
        />
        <span
          className={cn('font-medium leading-none', compact ? 'text-[9px]' : 'text-[11px]')}
          style={{ color: c.text }}
        >
          {c.label}
        </span>
      </div>

      {/* Arabic label */}
      {!compact && (
        <span
          className="arabic text-[10px] leading-none"
          style={{ color: c.text }}
        >
          {c.labelAr}
        </span>
      )}

      {/* Time in status (optional) */}
      {timeInStatus && !compact && (
        <span className="text-[9px] text-[#8896AB] font-mono mt-0.5">
          {timeInStatus}
        </span>
      )}
    </button>
  )
}

// ── BED STATUS LEGEND ─────────────────────────────────────────────────────────
export function BedStatusLegend({ compact = false }: { compact?: boolean }) {
  const statuses: BedStatus[] = ['available', 'discharging', 'occupied', 'cleaning', 'reserved', 'maintenance']
  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'gap-1.5' : 'gap-2')}>
      {statuses.map(status => {
        const c = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: c.border }}
            />
            <span className={cn('text-[#4A5568]', compact ? 'text-[10px]' : 'text-xs')}>
              {c.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
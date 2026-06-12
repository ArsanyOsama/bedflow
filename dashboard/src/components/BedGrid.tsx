// src/components/BedGrid.tsx
// UPDATED: Ward capacity badges in header
// UPDATED: Slide-in detail panel when bed is clicked (bed history)
// UPDATED: New status counts (includes discharging)

import { useState, useEffect } from 'react'
import { BedCard, BedStatusLegend } from './BedCard'
import { useRealtimeBeds } from '../hooks/useRealtimeBeds'
import { supabase } from '../lib/supabase'
import type { Bed, BedStatus, BedStatusLog } from '../types'
import { cn } from '../lib/utils'

function formatTimeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

const STATUS_LABEL: Record<BedStatus, string> = {
  available:   'Available',
  discharging: 'Discharging',
  occupied:    'Occupied',
  cleaning:    'Cleaning',
  reserved:    'Reserved',
  maintenance: 'Maintenance',
}

const STATUS_COLOR: Record<BedStatus, string> = {
  available:   '#06D6A0',
  discharging: '#FFD166',
  occupied:    '#EF233C',
  cleaning:    '#4CC9F0',
  reserved:    '#7B2FBE',
  maintenance: '#8D99AE',
}

// Fix B-12: Query bed_history_with_names view and display nurse name
// Update BedDetailPanel component:

function BedDetailPanel({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const [history, setHistory] = useState<BedStatusLog[]>([])

  useEffect(() => {
    // FIX: query bed_history_with_names view instead of bed_status_logs
    supabase.from('bed_history_with_names')
      .select('id, old_status, new_status, changed_at, changed_by_name, changed_by_role')
      .eq('bed_id', bed.id)
      .order('changed_at', { ascending: false })
      .limit(7)
      .then(({ data }) => { if (data) setHistory(data as BedStatusLog[]) })
  }, [bed.id])

  return (
    <div className="animate-slide-in-right w-[320px] flex-shrink-0 card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-bold font-mono text-[#0D1B2A]">{bed.bed_number}</h4>
          <p className="text-xs text-[#8896AB] mt-0.5">
            Updated {formatTimeAgo(bed.last_updated_at)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#F5F4F0] hover:bg-[#E4E8EE] flex items-center justify-center text-[#4A5568] text-sm transition-colors"
        >
          ×
        </button>
      </div>

      {/* Current status badge */}
      <div
        className="rounded-lg px-3 py-2 mb-4"
        style={{ backgroundColor: `${STATUS_COLOR[bed.current_status]}15`, borderLeft: `3px solid ${STATUS_COLOR[bed.current_status]}` }}
      >
        <p className="text-xs text-[#4A5568]">Current status</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: STATUS_COLOR[bed.current_status] }}>
          {STATUS_LABEL[bed.current_status]}
        </p>
      </div>

{/* Status History — updated to show who changed it */}
      <h5 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
        Status History
      </h5>
      <div className="space-y-1.5">
        {history.length === 0 ? (
          <p className="text-xs text-[#8896AB]">No history recorded yet</p>
        ) : (
          history.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: STATUS_COLOR[log.new_status as BedStatus] || '#8D99AE' }}
              />
              <div>
                <p className="text-xs text-[#0D1B2A] font-medium capitalize">
                  {log.new_status}
                </p>
                {/* NEW: show nurse name */}
                {log.changed_by_name && (
                  <p className="text-[10px] text-[#4A5568] font-medium">
                    by {log.changed_by_name}
                  </p>
                )}
                <p className="text-[10px] text-[#8896AB] font-mono">
                  {new Date(log.changed_at).toLocaleTimeString('en-EG', {
                    hour: '2-digit', minute: '2-digit', hour12: false
                  })}
                  {' · '}
                  {new Date(log.changed_at).toLocaleDateString('en-EG', {
                    day: '2-digit', month: 'short',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



// ── MAIN BED GRID ─────────────────────────────────────────────────────────────
interface BedGridProps {
  wardId: string
  wardName: string
  wardNameAr?: string
  compact?: boolean
}

export function BedGrid({ wardId, wardName, wardNameAr, compact = false }: BedGridProps) {
  const { beds, loading } = useRealtimeBeds(wardId)
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)

  const stats = {
    total:       beds.length,
    available:   beds.filter(b => b.current_status === 'available').length,
    discharging: beds.filter(b => b.current_status === 'discharging').length,
    occupied:    beds.filter(b => b.current_status === 'occupied').length,
    cleaning:    beds.filter(b => b.current_status === 'cleaning').length,
    reserved:    beds.filter(b => b.current_status === 'reserved').length,
    maintenance: beds.filter(b => b.current_status === 'maintenance').length,
  }

  // ICU surge alert threshold
  const occupancyRate = stats.total > 0
    ? Math.round(((stats.occupied + stats.reserved) / stats.total) * 100)
    : 0
  const isSurging = occupancyRate >= 85

  if (loading) {
    return (
      <div className="card p-4">
        <div className="h-4 bg-[#F0F2F5] rounded w-32 mb-4 animate-pulse" />
        <div className="grid grid-cols-5 gap-2">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="h-20 bg-[#F0F2F5] rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Main grid area */}
      <div className="flex-1 card p-4">

        {/* ── WARD HEADER ─── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0D1B2A]">{wardName}</h3>
              {wardNameAr && (
                <span className="arabic text-sm text-[#4A5568]">{wardNameAr}</span>
              )}
              {/* Capacity badge */}
              <span className={cn(
                'text-xs font-mono font-medium px-2 py-0.5 rounded-pill',
                isSurging
                  ? 'bg-[#EF233C]/10 text-[#EF233C]'
                  : 'bg-[#E4E8EE] text-[#4A5568]'
              )}>
                {stats.occupied}/{stats.total}
              </span>
            </div>
            <p className="text-xs text-[#8896AB] mt-0.5">
              {stats.available} available · {stats.occupied} occupied
              {stats.discharging > 0 && ` · ${stats.discharging} discharging`}
              {stats.cleaning > 0 && ` · ${stats.cleaning} cleaning`}
            </p>
          </div>

          {/* Occupancy % badge */}
          <div className={cn(
            'text-right',
          )}>
            <p className={cn(
              'text-lg font-bold font-mono',
              isSurging ? 'text-[#EF233C]' : occupancyRate >= 70 ? 'text-[#FFD166]' : 'text-[#06D6A0]'
            )}>
              {occupancyRate}%
            </p>
            <p className="text-[10px] text-[#8896AB]">occupancy</p>
          </div>
        </div>

        {/* ── SURGE ALERT BANNER ─── */}
        {isSurging && (
          <div className="alert-banner-critical rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-base">⚠</span>
            <div>
              <p className="text-sm font-semibold">SURGE ALERT — {wardName}</p>
              <p className="text-[11px] opacity-90">
                {occupancyRate}% occupancy · {stats.available} beds remaining
                {stats.discharging > 0 && ` · ${stats.discharging} discharging soon`}
              </p>
            </div>
          </div>
        )}

        {/* ── BED GRID ─── */}
        <div className={cn(
          'grid gap-2',
          compact
            ? 'grid-cols-6 sm:grid-cols-8'
            : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
        )}>
          {beds.map(bed => (
            <BedCard
              key={bed.id}
              bedNumber={bed.bed_number}
              status={bed.current_status}
              compact={compact}
              onClick={() => setSelectedBed(selectedBed?.id === bed.id ? null : bed)}
            />
          ))}
        </div>

        {/* ── LEGEND ─── */}
        <div className="mt-4 pt-3 border-t border-[#E4E8EE]">
          <BedStatusLegend compact />
        </div>
      </div>

      {/* Slide-in detail panel */}
      {selectedBed && (
        <BedDetailPanel
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
        />
      )}
    </div>
  )
}
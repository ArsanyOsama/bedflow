// src/pages/Dashboard.tsx
// UPDATED: Fixed 240px sidebar (Figma spec)
// UPDATED: Live sync indicator (LIVE pulsing dot)
// UPDATED: Activity feed in right column
// UPDATED: Occupancy alert banner (if ICU > 85%)
// UPDATED: Ward capacity badges in ward selector tabs
// UPDATED: Stat cards with brand colors

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { BedGrid } from '../components/BedGrid'
import { ActivityFeed } from '../components/ActivityFeed'
import type { Ward, HospitalSummary } from '../types'
import { cn } from '../lib/utils'

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, progress, accentColor, trend
}: {
  label: string
  value: string
  sub: string
  progress?: number
  accentColor?: string
  trend?: string
}) {
  return (
    <div className="stat-card">
      <p className="text-xs text-[#8896AB] font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold font-mono text-[#0D1B2A]">{value}</p>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-pill',
            trend.startsWith('+') ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-[#EF233C]/10 text-[#EF233C]'
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-[#4A5568]">{sub}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 rounded-full bg-[#E4E8EE] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: accentColor || '#00C896',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [wards, setWards]   = useState<Ward[]>([])
  const [summary, setSummary] = useState<HospitalSummary | null>(null)
  const [selectedWard, setSelectedWard] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState(new Date())

  // Fetch wards
  useEffect(() => {
    if (!profile?.hospital_id) return
    supabase.from('wards')
      .select('*, beds(id, current_status)')
      .eq('hospital_id', profile.hospital_id)
      .eq('active', true)
      .then(({ data }) => {
        if (data) {
          setWards(data)
          if (data.length > 0) setSelectedWard(data[0].id)
        }
      })
  }, [profile])

  // Fetch hospital summary
  useEffect(() => {
    if (!profile?.hospital_id) return
    supabase.from('hospital_bed_summary')
      .select('*')
      .eq('hospital_id', profile.hospital_id)
      .single()
      .then(({ data }) => { if (data) setSummary(data) })
  }, [profile])

  // Track last realtime sync
  useEffect(() => {
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'beds' }, () => {
        setLastSync(new Date())
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const currentWard = wards.find(w => w.id === selectedWard)

  // Compute per-ward stats from embedded beds
  const wardStats = (ward: Ward) => {
    const beds = ward.beds || []
    const occupied = beds.filter(b => b.current_status === 'occupied').length
    const total = beds.length
    return { occupied, total }
  }

  // Network-level surge check
  const isSurging = summary && summary.total_beds > 0 &&
    ((summary.occupied_beds / summary.total_beds) * 100) >= 85

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <Sidebar profile={profile} onSignOut={signOut} />

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">

        {/* ── TOP BAR ─── */}
        <header className="bg-white border-b border-[#E4E8EE] px-6 h-16 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">Hospital Dashboard</h1>
            {summary && (
              <p className="text-xs text-[#8896AB]">
                {summary.name_en} · {summary.governorate}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Date + time */}
            <p className="text-sm text-[#4A5568]">
              {new Date().toLocaleDateString('en-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}
              {lastSync.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 bg-[#F0FFF9] px-2.5 py-1 rounded-pill">
              <span className="live-dot" />
              <span className="text-xs text-[#06D6A0] font-semibold">LIVE</span>
            </div>
          </div>
        </header>

        {/* ── SURGE ALERT BANNER (network-level) ─── */}
        {isSurging && summary && (
          <div className="alert-banner-critical mx-6 mt-4 rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠</span>
              <div>
                <p className="font-bold text-sm">
                  SURGE ALERT — {summary.name_en} at {summary.occupancy_rate}% capacity
                </p>
                <p className="text-xs opacity-90">
                  {summary.occupied_beds}/{summary.total_beds} beds occupied ·
                  {summary.available_beds} available ·
                  Nearest capacity: City Map →
                </p>
              </div>
            </div>
            <a href="/map"
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
              View City Map
            </a>
          </div>
        )}

        <main className="flex-1 px-6 py-5">

          {/* ── STAT CARDS ROW ─── */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Capacity"
                value={`${summary.occupied_beds}/${summary.total_beds}`}
                sub={`${summary.occupancy_rate}% occupied`}
                progress={summary.occupancy_rate}
                accentColor={summary.occupancy_rate >= 85 ? '#EF233C' : summary.occupancy_rate >= 70 ? '#FFD166' : '#00C896'}
                trend={`${summary.available_beds} free`}
              />
              <StatCard
                label="Available Now"
                value={`${summary.available_beds}`}
                sub={`${summary.discharging_beds || 0} discharging soon`}
                progress={Math.round((summary.available_beds / Math.max(summary.total_beds, 1)) * 100)}
                accentColor="#06D6A0"
              />
              <StatCard
                label="In Cleaning"
                value={`${summary.cleaning_beds}`}
                sub={`${summary.reserved_beds || 0} reserved`}
                progress={Math.round((summary.cleaning_beds / Math.max(summary.total_beds, 1)) * 100)}
                accentColor="#4CC9F0"
              />
              <StatCard
                label="Maintenance"
                value={`${summary.maintenance_beds}`}
                sub={`${summary.total_beds} total beds`}
                progress={Math.round((summary.maintenance_beds / Math.max(summary.total_beds, 1)) * 100)}
                accentColor="#8D99AE"
              />
            </div>
          )}

          {/* ── CONTENT GRID: bed grid + activity feed ─── */}
          <div className="flex gap-4">

            {/* Left: ward selector + bed grid */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Ward tabs with capacity badges */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {wards.map(ward => {
                  const ws = wardStats(ward)
                  const pct = ws.total > 0 ? Math.round((ws.occupied / ws.total) * 100) : 0
                  return (
                    <button
                      key={ward.id}
                      onClick={() => setSelectedWard(ward.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-pill text-sm whitespace-nowrap transition-colors border',
                        selectedWard === ward.id
                          ? 'bg-[#00C896] text-white border-[#00C896] font-medium'
                          : 'bg-white text-[#4A5568] border-[#E4E8EE] hover:border-[#00C896] hover:text-[#0D1B2A]'
                      )}
                    >
                      <span className="arabic text-xs">{ward.name_ar}</span>
                      <span>—</span>
                      <span>{ward.name_en}</span>
                      {/* Capacity badge */}
                      <span className={cn(
                        'text-[10px] font-mono font-medium px-1.5 py-0.5 rounded',
                        selectedWard === ward.id ? 'bg-white/20 text-white' :
                          pct >= 85 ? 'bg-[#EF233C]/10 text-[#EF233C]' :
                          pct >= 70 ? 'bg-[#FFD166]/20 text-[#B8860B]' :
                          'bg-[#E4E8EE] text-[#4A5568]'
                      )}>
                        {ws.occupied}/{ws.total}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Bed grid */}
              {selectedWard && currentWard && (
                <BedGrid
                  wardId={selectedWard}
                  wardName={currentWard.name_en}
                  wardNameAr={currentWard.name_ar}
                />
              )}
            </div>

            {/* Right: activity feed (280px fixed) */}
            {profile?.hospital_id && (
              <div className="w-[280px] flex-shrink-0">
                <ActivityFeed hospitalId={profile.hospital_id} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
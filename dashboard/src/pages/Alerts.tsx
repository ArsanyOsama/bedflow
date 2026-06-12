// Fix B-10: Was querying non-existent 'notifications' table.
// Now queries ems_requests + computes surge warnings from ward occupancy.

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import type { EMSRequest } from '../hooks/useEMSRequests'

interface SurgeWard {
  id: string
  name_en: string
  name_ar: string
  specialty: string
  occupancy_rate: number
  occupied: number
  total: number
}

const SEV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-[#FFF5F5]', text: 'text-[#EF233C]', dot: 'bg-[#EF233C]' },
  high:     { bg: 'bg-[#FFF8F5]', text: 'text-[#FF6B35]', dot: 'bg-[#FF6B35]' },
  medium:   { bg: 'bg-[#FFFDF0]', text: 'text-[#B8860B]', dot: 'bg-[#FFD166]' },
  low:      { bg: 'bg-[#F7F8FA]', text: 'text-[#4A5568]', dot: 'bg-[#8D99AE]' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-[#B8860B] bg-[#FFFDF0]',
  accepted:  'text-[#06D6A0] bg-[#F0FFF9]',
  rejected:  'text-[#EF233C] bg-[#FFF5F5]',
  arrived:   'text-[#7B2FBE] bg-[#F8F0FF]',
  completed: 'text-[#4A5568] bg-[#F7F8FA]',
  cancelled: 'text-[#8896AB] bg-[#F7F8FA]',
}

export default function Alerts() {
  const { profile, signOut } = useAuth()
  const hospitalId = profile?.hospital_id

  const [emsRequests, setEmsRequests] = useState<EMSRequest[]>([])
  const [surgeWards,  setSurgeWards]  = useState<SurgeWard[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<'ems' | 'surge'>('ems')

  const fetchData = useCallback(async () => {
    if (!hospitalId) return
    setLoading(true)

    // 1. EMS request history
    const { data: ems } = await supabase
      .from('ems_requests')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (ems) setEmsRequests(ems as EMSRequest[])

    // 2. Surge wards (occupancy >= 85%)
    const { data: wardsData } = await supabase
      .from('wards')
      .select(`id, name_en, name_ar, specialty, beds(id, current_status)`)
      .eq('hospital_id', hospitalId)
      .eq('active', true)

    if (wardsData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const surge = (wardsData as any[]).reduce<SurgeWard[]>((acc, ward) => {
        const beds = ward.beds || []
        const total = beds.length
        if (total === 0) return acc
        const occupied = beds.filter(
          (b: { current_status: string }) =>
            b.current_status === 'occupied' || b.current_status === 'reserved'
        ).length
        const rate = Math.round((occupied / total) * 100)
        if (rate >= 85) {
          acc.push({
            id: ward.id,
            name_en: ward.name_en,
            name_ar: ward.name_ar,
            specialty: ward.specialty,
            occupancy_rate: rate,
            occupied,
            total,
          })
        }
        return acc
      }, [])
      surge.sort((a, b) => b.occupancy_rate - a.occupancy_rate)
      setSurgeWards(surge)
    }

    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    const init = async () => { await fetchData() }
    init()

    if (!hospitalId) return
    const ch = supabase.channel('alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ems_requests',
          filter: `hospital_id=eq.${hospitalId}` }, fetchData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ems_requests',
          filter: `hospital_id=eq.${hospitalId}` }, fetchData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'beds' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [hospitalId, fetchData])

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />
      <div className="flex-1 ml-[240px]">

        <header className="bg-white border-b border-[#E4E8EE] px-8 h-16 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">System Alerts</h1>
            <p className="text-xs text-[#8896AB]">EMS requests · Surge warnings · Live</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-xs text-[#00C896] font-semibold">LIVE</span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-8 py-8">

          {/* Tab bar */}
          <div className="flex gap-2 mb-6">
            {(['ems', 'surge'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-2 rounded-pill text-sm font-medium transition-colors border',
                  activeTab === tab
                    ? 'bg-[#00C896] text-white border-[#00C896]'
                    : 'bg-white text-[#4A5568] border-[#E4E8EE] hover:border-[#00C896]'
                )}
              >
                {tab === 'ems' ? (
                  <>EMS Requests <span className="ml-1.5 bg-white/20 text-white text-[10px] px-1.5 rounded">{emsRequests.length}</span></>
                ) : (
                  <>Surge Warnings {surgeWards.length > 0 && (
                    <span className="ml-1.5 bg-[#EF233C] text-white text-[10px] px-1.5 rounded">{surgeWards.length}</span>
                  )}</>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_,i) => (
                <div key={i} className="h-20 bg-white rounded-xl border border-[#E4E8EE] animate-pulse" />
              ))}
            </div>
          ) : activeTab === 'ems' ? (
            <div className="space-y-3">
              {emsRequests.length === 0 ? (
                <div className="card p-8 text-center text-[#8896AB]">No EMS requests yet.</div>
              ) : emsRequests.map(req => {
                const sev = SEV_COLORS[req.severity] || SEV_COLORS.medium
                const sta = STATUS_COLORS[req.status] || STATUS_COLORS.pending
                return (
                  <div key={req.id} className={cn('card p-4 border-l-4', sev.bg)}
                       style={{ borderLeftColor: sev.dot.replace('bg-[','').replace(']','') }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🚑</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-[#0D1B2A]">{req.case_type}</p>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-pill', sev.text)}>
                              {req.severity.toUpperCase()}
                            </span>
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-pill', sta)}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#4A5568] mt-0.5">
                            {req.distance_km && `${req.distance_km} km · `}
                            Score: {req.composite_score ?? '—'}/100
                            {req.patient_notes && ` · ${req.patient_notes}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#8896AB] font-mono whitespace-nowrap">
                        {new Date(req.created_at).toLocaleTimeString('en-EG', {
                          hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                        {' · '}
                        {new Date(req.created_at).toLocaleDateString('en-EG', {
                          day: '2-digit', month: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {surgeWards.length === 0 ? (
                <div className="card p-8 text-center text-[#06D6A0]">
                  No wards above surge threshold. Capacity is healthy.
                </div>
              ) : surgeWards.map(ward => (
                <div key={ward.id} className="card p-4 border-l-4 border-[#EF233C] bg-[#FFF5F5]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-[#0D1B2A]">{ward.name_en}</p>
                      <p className="text-xs text-[#4A5568]">
                        {ward.specialty} · {ward.occupied}/{ward.total} beds occupied
                      </p>
                    </div>
                    <p className="text-2xl font-bold font-mono text-[#EF233C]">
                      {ward.occupancy_rate}%
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#E4E8EE] overflow-hidden">
                    <div className="h-full rounded-full bg-[#EF233C] transition-all"
                         style={{ width: `${ward.occupancy_rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
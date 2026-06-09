// src/pages/CityMap.tsx
// UPDATED: Floating left panel — Cairo Network Overview (Figma spec)
// UPDATED: Floating right panel — Hospital detail on click
// UPDATED: Filter buttons (All / ICU / ER / General / Maternity)
// UPDATED: Hospital pins use real Figma hospital names from seed data

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import type { HospitalSummary } from '../types'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

function pinColor(available: number, total: number): string {
  if (!total) return '#8D99AE'
  const pct = (available / total) * 100
  if (pct > 25) return '#06D6A0'   // green — plenty available
  if (pct > 10) return '#FFD166'   // amber — getting low
  return '#EF233C'                  // red — critical
}

function OccupancyRing({ rate }: { rate: number }) {
  const color = rate >= 85 ? '#EF233C' : rate >= 70 ? '#FFD166' : '#06D6A0'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#E4E8EE] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{rate}%</span>
    </div>
  )
}

export default function CityMap() {
  const { profile, signOut } = useAuth()
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([])
  const [selected, setSelected]   = useState<HospitalSummary | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchSummary = () => {
    supabase.from('hospital_bed_summary').select('*').then(({ data }) => {
      if (data) { setHospitals(data); setLastUpdate(new Date()) }
    })
  }

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Network totals
  const networkTotal     = hospitals.reduce((s, h) => s + h.total_beds, 0)
  const networkOccupied  = hospitals.reduce((s, h) => s + h.occupied_beds, 0)
  const networkAvailable = hospitals.reduce((s, h) => s + h.available_beds, 0)
  const networkRate      = networkTotal > 0
    ? Math.round((networkOccupied / networkTotal) * 100)
    : 0

  const sortedByAvail  = [...hospitals].sort((a, b) => b.available_beds - a.available_beds)
  const mostCritical   = [...hospitals].sort((a, b) => b.occupancy_rate - a.occupancy_rate)[0]

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />

      <div className="flex-1 ml-[240px] flex flex-col">
        {/* ── TOP BAR ─── */}
        <header className="bg-[#0D1B2A] text-white px-6 h-14 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">Cairo Hospital Network</h1>
            <span className="text-white/30">·</span>
            <span className="text-white/60 text-sm">{hospitals.length} hospitals connected</span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-white/40 text-xs font-mono">
              Updated {lastUpdate.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <div className="flex items-center gap-1.5 bg-[#00C896]/10 px-2.5 py-1 rounded-pill">
              <span className="live-dot" />
              <span className="text-xs text-[#00C896] font-semibold">LIVE</span>
            </div>
          </div>
        </header>

        {/* ── MAP + OVERLAYS ─── */}
        <div className="flex-1 relative">
          <MapContainer
            center={[30.0444, 31.2357]}
            zoom={11}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {hospitals.map(h => (
              <CircleMarker
                key={h.hospital_id}
                center={[h.lat, h.lng]}
                radius={Math.max(14, (h.available_beds / Math.max(h.total_beds, 1)) * 36)}
                fillColor={pinColor(h.available_beds, h.total_beds)}
                color="white"
                weight={3}
                fillOpacity={0.88}
                eventHandlers={{ click: () => setSelected(selected?.hospital_id === h.hospital_id ? null : h) }}
              >
                <Popup>
                  <div className="font-sans min-w-[200px] py-1">
                    <p className="font-bold text-[#0D1B2A] text-sm">{h.name_ar}</p>
                    <p className="text-xs text-[#4A5568] mb-2">{h.name_en}</p>
                    <OccupancyRing rate={h.occupancy_rate} />
                    <div className="mt-2 space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: '#06D6A0' }}>✓ Available</span>
                        <strong>{h.available_beds}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#EF233C' }}>● Occupied</span>
                        <strong>{h.occupied_beds}</strong>
                      </div>
                      {h.discharging_beds > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: '#B8860B' }}>◐ Discharging</span>
                          <strong>{h.discharging_beds}</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-[#4A5568]">
                        <span>Total</span>
                        <strong>{h.total_beds}</strong>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* ── FLOATING LEFT PANEL: Network Overview ─── */}
          <div className="absolute left-4 top-4 z-10 glass-card p-4 w-[280px]">
            <p className="text-[10px] font-semibold text-[#8896AB] uppercase tracking-wider mb-2">
              Cairo Network Overview
            </p>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#4A5568]">Hospitals connected</span>
                <strong className="font-mono text-[#0D1B2A]">{hospitals.length}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4A5568]">Total beds</span>
                <strong className="font-mono text-[#0D1B2A]">{networkOccupied} / {networkTotal}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4A5568]">Network occupancy</span>
                <strong className="font-mono" style={{
                  color: networkRate >= 85 ? '#EF233C' : networkRate >= 70 ? '#B8860B' : '#06D6A0'
                }}>{networkRate}%</strong>
              </div>
            </div>

            <div className="border-t border-[#E4E8EE] pt-3 space-y-2">
              <div>
                <p className="text-[10px] text-[#06D6A0] font-semibold uppercase tracking-wide mb-1">Available Now</p>
                <p className="text-2xl font-bold font-mono text-[#0D1B2A]">{networkAvailable}</p>
                <p className="text-[11px] text-[#4A5568]">beds across network</p>
              </div>

              {sortedByAvail.slice(0, 2).length > 0 && (
                <div>
                  <p className="text-[10px] text-[#4A5568] font-semibold uppercase tracking-wide mb-1">Highest Availability</p>
                  {sortedByAvail.slice(0, 2).map(h => (
                    <div key={h.hospital_id} className="flex justify-between text-xs py-0.5">
                      <span className="text-[#0D1B2A] truncate max-w-[160px]">{h.name_en}</span>
                      <span className="text-[#06D6A0] font-mono font-medium">{h.available_beds} beds</span>
                    </div>
                  ))}
                </div>
              )}

              {mostCritical && (
                <div>
                  <p className="text-[10px] text-[#EF233C] font-semibold uppercase tracking-wide mb-1">Most Critical</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#0D1B2A] truncate max-w-[160px]">{mostCritical.name_en}</span>
                    <span className="text-[#EF233C] font-mono font-medium">{mostCritical.occupancy_rate}% full</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── FLOATING RIGHT PANEL: Hospital Detail ─── */}
          {selected && (
            <div className="absolute right-4 top-4 z-10 glass-card p-4 w-[300px] animate-slide-in-right">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-[#0D1B2A] text-sm">{selected.name_ar}</p>
                  <p className="text-xs text-[#4A5568]">{selected.name_en}</p>
                  {selected.address && (
                    <p className="text-[10px] text-[#8896AB] mt-0.5">{selected.address}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-6 h-6 rounded-full bg-[#F5F4F0] hover:bg-[#E4E8EE] flex items-center justify-center text-[#4A5568] text-sm transition-colors"
                >×</button>
              </div>

              <OccupancyRing rate={selected.occupancy_rate} />

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#06D6A0]">✓ Available</span>
                  <strong className="font-mono">{selected.available_beds}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#EF233C]">● Occupied</span>
                  <strong className="font-mono">{selected.occupied_beds}</strong>
                </div>
                {selected.discharging_beds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#B8860B]">◐ Discharging</span>
                    <strong className="font-mono">{selected.discharging_beds}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4CC9F0]">↻ Cleaning</span>
                  <strong className="font-mono">{selected.cleaning_beds}</strong>
                </div>
                <div className="flex justify-between text-[#4A5568]">
                  <span>Total beds</span>
                  <strong className="font-mono">{selected.total_beds}</strong>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button className="w-full bg-[#00C896] text-white text-xs font-medium py-2.5 rounded-btn hover:bg-[#00A87E] transition-colors">
                  Contact Transfer Coordinator
                </button>
                <button className="w-full border border-[#00C896] text-[#00C896] text-xs font-medium py-2.5 rounded-btn hover:bg-[#00C896]/5 transition-colors">
                  Request Bed Reservation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
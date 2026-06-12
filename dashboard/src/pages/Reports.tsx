// Fix B-14: Add recharts AreaChart for occupancy timeline.
// WeeklyMetrics type updated in types/index.ts to include timeline[].

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import type { WeeklyMetrics } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Reports() {
  const { profile, signOut } = useAuth()
  const [days,    setDays]    = useState<number>(14)
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null)
  const hospitalId = profile?.hospital_id

  const fetchReport = useCallback(async () => {
    if (!hospitalId) return
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/reports/weekly/${hospitalId}?days=${days}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setMetrics(await res.json())
    } catch (err) {
      console.error('Report fetch error:', err)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [hospitalId, days])

  useEffect(() => {
    const init = async () => { await fetchReport() }
    init()
  }, [fetchReport])

  const downloadPDF = () => {
    if (!hospitalId) return
    window.open(`${API_URL}/reports/weekly/${hospitalId}?days=${days}&format=pdf`, '_blank')
  }

  const an = metrics?.analytics
  const tl = metrics?.timeline ?? []
  const currency = an?.currency ?? 'EGP'

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />
      <div className="flex-1 ml-[240px]">

        <header className="bg-white border-b border-[#E4E8EE] px-8 h-16 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">Performance Analytics</h1>
            {metrics && (
              <p className="text-xs text-[#8896AB]">
                {metrics.hospital_name_en} · Last {days} days
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <select
              className="bg-[#F5F4F0] border border-[#E4E8EE] rounded-lg px-4 py-2 text-sm text-[#0D1B2A]"
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={28}>Last 28 Days</option>
            </select>
            <button
              onClick={downloadPDF}
              disabled={!metrics}
              className="bg-[#0D1B2A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#1A2A3A] disabled:opacity-40 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-[#8896AB]">Calculating metrics...</div>
          ) : !metrics ? (
            <div className="text-center py-20 text-[#8896AB]">
              No data found. Check backend connection or hospital ID.
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Revenue Recovered',
                    value: `${currency} ${(an?.revenue_recovered ?? 0).toLocaleString()}`,
                    accent: '#00C896',
                  },
                  {
                    label: 'Beds Made Available',
                    value: String(an?.beds_made_available ?? 0),
                    accent: '#4CC9F0',
                  },
                  {
                    label: 'Avg Occupancy',
                    value: `${an?.avg_occupancy ?? 0}%`,
                    accent: '#FFD166',
                  },
                  {
                    label: 'Efficiency Score',
                    value: `${an?.efficiency_score ?? 0} / 100`,
                    accent: an && an.efficiency_score >= 70 ? '#06D6A0' : '#EF233C',
                  },
                ].map(c => (
                  <div key={c.label} className="card p-5"
                       style={{ borderLeft: `4px solid ${c.accent}` }}>
                    <p className="text-[10px] uppercase font-bold text-[#8896AB]">{c.label}</p>
                    <p className="text-2xl font-bold font-mono text-[#0D1B2A] mt-2">{c.value}</p>
                    {c.label === 'Avg Occupancy' && (
                      <div className="mt-2 h-1.5 rounded-full bg-[#E4E8EE] overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${an?.avg_occupancy ?? 0}%`, backgroundColor: c.accent }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Occupancy Timeline Chart */}
              {tl.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-sm font-semibold text-[#0D1B2A] mb-1">
                    Occupancy Rate — Last {days} Days
                  </h2>
                  <p className="text-xs text-[#8896AB] mb-4">
                    Daily average · {currency} {an?.bed_price_per_day?.toLocaleString()} / bed / day
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={tl} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00C896" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00C896" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={d => d?.slice(-5) ?? ''}
                        tick={{ fontSize: 10, fill: '#8896AB' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 10, fill: '#8896AB' }}
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [`${v}%`, 'Occupancy']}
                        labelFormatter={l => `Date: ${l}`}
                        contentStyle={{
                          fontSize: 12, borderRadius: 8,
                          border: '1px solid #E4E8EE',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="occupancy_rate"
                        stroke="#00C896"
                        strokeWidth={2}
                        fill="url(#occGrad)"
                        dot={{ r: 3, fill: '#00C896' }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Beds Available Timeline */}
              {tl.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-sm font-semibold text-[#0D1B2A] mb-4">
                    Available vs. Occupied — Last {days} Days
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={tl} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="availGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#06D6A0" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#06D6A0" stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="occpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#EF233C" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#EF233C" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                      <XAxis dataKey="date" tickFormatter={d => d?.slice(-5) ?? ''}
                             tick={{ fontSize: 10, fill: '#8896AB' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8896AB' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E8EE' }}
                      />
                      <Area type="monotone" dataKey="available_beds" name="Available"
                            stroke="#06D6A0" strokeWidth={2} fill="url(#availGrad)" dot={false} />
                      <Area type="monotone" dataKey="occupied_beds" name="Occupied"
                            stroke="#EF233C" strokeWidth={2} fill="url(#occpGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Revenue detail row */}
              <div className="card p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8896AB] font-medium uppercase tracking-wide">
                    Revenue Calculation
                  </p>
                  <p className="text-sm text-[#4A5568] mt-1">
                    {an?.beds_made_available} beds freed × {currency} {an?.bed_price_per_day?.toLocaleString()} × 30% fill rate
                  </p>
                </div>
                <p className="text-2xl font-bold font-mono text-[#00C896]">
                  {currency} {(an?.revenue_recovered ?? 0).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
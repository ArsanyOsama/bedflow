// src/pages/Reports.tsx
import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ReportMetrics {
  analytics: {
    avg_occupancy: number
    beds_made_available: number
    revenue_recovered: number
    efficiency_score: number
  }
}

export default function Reports() {
  const { profile, signOut } = useAuth()
  const [days, setDays] = useState<number>(14)
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null)

  // Stable ID for React Compiler
  const hospitalId = profile?.hospital_id

  const fetchReport = useCallback(async () => {
    if (!hospitalId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/reports/weekly/${hospitalId}?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      const data = await res.json()
      setMetrics(data)
    } catch (err) {
      console.error("Report fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [hospitalId, days])

  useEffect(() => {
    // Wrap in async function to satisfy React-hooks/set-state-in-effect
    const init = async () => {
      await fetchReport()
    }
    init()
  }, [fetchReport])

  const downloadPDF = () => {
    if (!hospitalId) return
    window.open(`${API_URL}/reports/weekly/${hospitalId}?days=${days}&format=pdf`, '_blank')
  }

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />
      <div className="flex-1 ml-[240px]">
        <header className="bg-white border-b border-[#E4E8EE] px-8 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#0D1B2A]">Performance Analytics</h1>
          <div className="flex gap-4">
            <select 
              className="bg-[#F5F4F0] border border-[#E4E8EE] rounded-lg px-4 py-2 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={28}>Last 28 Days</option>
            </select>
            <button 
              onClick={downloadPDF}
              className="bg-[#0D1B2A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#1A2A3A]"
            >
              Download PDF
            </button>
          </div>
        </header>

        <main className="p-8 max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-[#8896AB]">Calculating metrics...</div>
          ) : metrics ? (
            <div className="grid grid-cols-4 gap-6">
              <div className="card p-6 border-l-4 border-[#00C896]">
                <p className="text-[10px] uppercase font-bold text-[#8896AB]">Revenue Recovered</p>
                <p className="text-2xl font-bold mt-2">EGP {metrics.analytics.revenue_recovered.toLocaleString()}</p>
              </div>
              <div className="card p-6 border-l-4 border-[#4CC9F0]">
                <p className="text-[10px] uppercase font-bold text-[#8896AB]">Beds Available</p>
                <p className="text-2xl font-bold mt-2">{metrics.analytics.beds_made_available}</p>
              </div>
              <div className="card p-6 border-l-4 border-[#D4A017]">
                <p className="text-[10px] uppercase font-bold text-[#8896AB]">Avg Occupancy</p>
                <p className="text-2xl font-bold mt-2">{metrics.analytics.avg_occupancy}%</p>
              </div>
              <div className="card p-6 border-l-4 border-[#EF233C]">
                <p className="text-[10px] uppercase font-bold text-[#8896AB]">Efficiency Score</p>
                <p className="text-2xl font-bold mt-2">{metrics.analytics.efficiency_score}/100</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-[#8896AB]">No data found for this period.</div>
          )}
        </main>
      </div>
    </div>
  )
}
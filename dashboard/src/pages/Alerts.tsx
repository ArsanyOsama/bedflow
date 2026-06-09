// src/pages/Alerts.tsx
import { useEffect, useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface Notification {
  id: string
  message: string
  created_at: string
}

export default function Alerts() {
  const { profile, signOut } = useAuth()
  const [alerts, setAlerts] = useState<Notification[]>([])

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (data) setAlerts(data as Notification[])
    }
    fetchAlerts()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />
      <div className="flex-1 ml-[240px] p-8">
        <h1 className="text-2xl font-bold mb-6">System Alerts</h1>
        <div className="max-w-3xl space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-[#E4E8EE] text-[#8896AB] text-center">
              No new alerts at this time.
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="bg-white p-4 rounded-xl border border-[#E4E8EE] shadow-sm">
                <p className="text-sm text-[#0D1B2A]">{a.message}</p>
                <p className="text-[10px] text-[#8896AB] mt-2">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
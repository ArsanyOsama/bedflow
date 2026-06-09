import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BedStatusLog } from '../types'
import { cn } from '../lib/utils'

const STATUS_DOT: Record<string, string> = {
  available:   'bg-[#06D6A0]',
  discharging: 'bg-[#FFD166]',
  occupied:    'bg-[#EF233C]',
  cleaning:    'bg-[#4CC9F0]',
  reserved:    'bg-[#7B2FBE]',
  maintenance: 'bg-[#8D99AE]',
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-EG', {
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

interface ExtendedLog extends BedStatusLog {
  bed_number?: string
  ward_name?: string
}

export function ActivityFeed({ hospitalId }: { hospitalId: string }) {
  const [logs, setLogs] = useState<ExtendedLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('bed_status_logs')
        .select(`
          *,
          beds!inner(
            bed_number,
            wards!inner(name_en, hospital_id)
          )
        `)
        .eq('beds.wards.hospital_id', hospitalId)
        .order('changed_at', { ascending: false })
        .limit(12)

      if (data && isMounted) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: ExtendedLog[] = data.map((log: any) => ({
          ...log,
          bed_number: log.beds?.bed_number,
          ward_name: log.beds?.wards?.name_en,
        }))
        setLogs(mapped)
      }
      if (isMounted) setLoading(false)
    }

    fetchLogs()

    // Subscribe to ALL bed_status_logs changes for this hospital
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bed_status_logs',
      }, () => {
        fetchLogs()   // re-fetch on any new log entry
      })
      .subscribe()

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel) 
    }
  }, [hospitalId])

  return (
    <div className="card p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0D1B2A]">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-[11px] text-[#00C896] font-medium">LIVE</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-[#F0F2F5] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto max-h-[320px]">
          {logs.length === 0 ? (
            <p className="text-[#8896AB] text-xs text-center py-4">
              No activity yet. Status changes appear here in real time.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#F5F4F0] transition-colors group animate-fade-in"
              >
                <span
                  className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[log.new_status] || 'bg-gray-400')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0D1B2A] leading-none">
                    <span className="font-mono font-medium">{log.bed_number || 'Unknown'}</span>
                    {log.old_status && (
                      <span className="text-[#8896AB]"> {log.old_status} → </span>
                    )}
                    <span className="font-medium capitalize">{log.new_status}</span>
                  </p>
                  <p className="text-[10px] text-[#8896AB] mt-0.5">
                    {log.ward_name} · {formatTime(log.changed_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
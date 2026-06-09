import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bed } from '../types'

export function useRealtimeBeds(wardId: string) {
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wardId) return
    supabase.from('beds').select('*').eq('ward_id', wardId).order('bed_number')
      .then(({ data }) => { if (data) setBeds(data); setLoading(false) })

    // Supabase Realtime replaces a manual WebSocket server
    // This is why Celery is not needed at MVP: real-time is handled here
    const channel = supabase.channel(`beds-ward-${wardId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'beds',
        filter: `ward_id=eq.${wardId}`
      }, (payload) => {
        setBeds(prev => prev.map(b =>
          b.id === payload.new.id ? { ...b, ...(payload.new as Bed) } : b))
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [wardId])

  return { beds, loading }
}
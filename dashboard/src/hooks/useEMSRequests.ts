// src/hooks/useEMSRequests.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface EMSRequest {
  id:               string
  hospital_id:      string
  ward_id:          string | null
  bed_id:           string | null
  case_type:        string
  severity:         'critical' | 'high' | 'medium' | 'low'
  patient_notes:    string | null
  ems_lat:          number
  ems_lng:          number
  distance_km:      number
  composite_score:  number
  dispatch_mode:    'auto' | 'manual'
  status:           'pending' | 'accepted' | 'rejected' | 'active' | 'arrived' | 'completed' | 'cancelled'
  rejection_reason: string | null
  created_at:       string
  responded_at:     string | null
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useEMSRequests() {
  const { profile } = useAuth()
  const hospitalId = profile?.hospital_id
  
  const [requests, setRequests] = useState<EMSRequest[]>([])
  const [incoming, setIncoming] = useState<EMSRequest | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!hospitalId) return
    const { data } = await supabase
      .from('ems_requests')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setRequests(data)
  }, [hospitalId])

  // 1. Separate Effect for Initial Data Fetch
  useEffect(() => {
    const runFetch = async () => {
      await fetchRequests()
    }
    runFetch()
  }, [fetchRequests])

  // 2. Separate Effect for Real-time Subscription
  useEffect(() => {
    if (!hospitalId) return

    const channel = supabase.channel(`ems-hospital-${hospitalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table:  'ems_requests',
        filter: `hospital_id=eq.${hospitalId}`,
      }, (payload) => {
        const newReq = payload.new as EMSRequest
        setRequests(prev => [newReq, ...prev])
        
        if (newReq.status === 'pending' && newReq.dispatch_mode === 'manual') {
          setIncoming(newReq)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table:  'ems_requests',
        filter: `hospital_id=eq.${hospitalId}`,
      }, (payload) => {
        const upd = payload.new as EMSRequest
        setRequests(prev => prev.map(r => r.id === upd.id ? upd : r))
        
        setIncoming(prev => (prev?.id === upd.id ? null : prev))
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [hospitalId])

  const acceptRequest = async (requestId: string, bedId?: string) => {
    const res = await fetch(`${API_URL}/api/v1/ems/request/${requestId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_id: bedId || null }),
    })
    const data = await res.json()
    if (data.status === 'accepted') {
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r))
      setIncoming(null)
    }
    return data
  }

  const rejectRequest = async (requestId: string, reason: string = '') => {
    await fetch(`${API_URL}/api/v1/ems/request/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
    setIncoming(null)
  }

  const markArrived = async (requestId: string) => {
    await fetch(`${API_URL}/api/v1/ems/request/${requestId}/arrived`, { method: 'POST' })
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'arrived' } : r))
  }

  return { 
    requests, 
    incoming, 
    acceptRequest, 
    rejectRequest, 
    markArrived, 
    dismissIncoming: () => setIncoming(null) 
  }
}
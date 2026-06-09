// src/hooks/useSettings.ts
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface HospitalSettings {
  hospital_id:          string
  bed_price_per_day:    number
  currency:             string
  ems_mode:             'auto' | 'manual'
  ems_request_timeout:  number
  surge_threshold:      number
  enable_ems_alerts:    boolean
  enable_surge_alerts:  boolean
}

const DEFAULT_SETTINGS: HospitalSettings = {
  hospital_id:          '',
  bed_price_per_day:    2000,
  currency:             'EGP',
  ems_mode:             'manual',
  ems_request_timeout:  5,
  surge_threshold:      85,
  enable_ems_alerts:    true,
  enable_surge_alerts:  true,
}

export function useSettings() {
  const { profile } = useAuth()
  
  // Extract to stable constant for the React Compiler
  const hospitalId = profile?.hospital_id

  const [settings, setSettings] = useState<HospitalSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)

  // Stable callback depends only on the primitive string hospitalId
  const fetchSettings = useCallback(async () => {
    if (!hospitalId) return
    try {
      const res = await fetch(`${API_URL}/settings/${hospitalId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSettings({ ...DEFAULT_SETTINGS, ...data })
    } catch {
      // Use defaults if backend unavailable
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [hospitalId])

  // Effect to trigger fetch
  useEffect(() => {
    // FIX: Wrap the async call in a function to satisfy ESLint
    const init = async () => {
      await fetchSettings()
    }
    init()
  }, [fetchSettings])

  const updateSettings = async (patch: Partial<HospitalSettings>) => {
    if (!hospitalId) return
    setSaving(true)
    
    // Optimistic update
    const previousSettings = settings
    setSettings(prev => ({ ...prev, ...patch }))

    try {
      const res = await fetch(`${API_URL}/settings/${hospitalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data })
      } else {
        throw new Error('Update failed')
      }
    } catch {
      // Revert on error
      setSettings(previousSettings)
    } finally {
      setSaving(false)
    }
  }

  return { settings, loading, saving, updateSettings, refetch: fetchSettings }
}
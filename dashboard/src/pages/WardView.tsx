// src/pages/WardView.tsx
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Sidebar } from '../components/Sidebar'
import { cn } from '../lib/utils'

type BedStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved'

interface Bed {
  id: string
  bed_number: string
  current_status: BedStatus
  ems_locked: boolean
}

interface Ward {
  id: string
  name_en: string
  name_ar: string
  specialty: string
  beds: Bed[]
}

const STATUS_COLORS: Record<BedStatus, { bg: string; text: string; label: string }> = {
  available:   { bg: 'bg-[#F0FFF9]', text: 'text-[#00C896]', label: 'Available' },
  occupied:    { bg: 'bg-[#F0FAFF]', text: 'text-[#4CC9F0]', label: 'Occupied' },
  cleaning:    { bg: 'bg-[#FFFBF0]', text: 'text-[#D4A017]', label: 'Cleaning' },
  maintenance: { bg: 'bg-[#FFF5F5]', text: 'text-[#EF233C]', label: 'Maintenance' },
  reserved:    { bg: 'bg-[#F5F4F0]', text: 'text-[#8896AB]', label: 'EMS Reserved' },
}

export default function WardView() {
  const { profile, signOut } = useAuth()
  const hospitalId = profile?.hospital_id

  const [wards, setWards] = useState<Ward[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)

  const fetchWards = useCallback(async () => {
    if (!hospitalId) return
    
    const { data, error } = await supabase
      .from('wards')
      .select(`
        id, name_en, name_ar, specialty,
        beds ( id, bed_number, current_status, ems_locked )
      `)
      .eq('hospital_id', hospitalId)
      .eq('active', true)
      .order('name_en')

    if (data && !error) {
      // FIXED: Removed 'any' here. Using explicit Ward interface for casting.
      const sortedWards = (data as unknown as Ward[]).map((w: Ward) => ({
        ...w,
        beds: [...w.beds].sort((a: Bed, b: Bed) => a.bed_number.localeCompare(b.bed_number))
      }))
      setWards(sortedWards)
    }
    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    const init = async () => { await fetchWards() }
    init()

    if (!hospitalId) return

    const channel = supabase.channel('realtime-beds')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBed = payload.new as Bed
        setWards(prev => prev.map(ward => ({
          ...ward,
          beds: ward.beds.map(bed => bed.id === updatedBed.id ? updatedBed : bed)
        })))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [hospitalId, fetchWards])

  const handleStatusChange = async (newStatus: BedStatus) => {
    if (!selectedBed) return
    
    // SECURITY: Block all changes if bed is locked by EMS
    if (selectedBed.ems_locked) {
      alert("⚠️ Action Denied: Bed is reserved by EMS. You can only change status after patient arrival.")
      return
    }
    
    setWards(prev => prev.map(w => ({
      ...w,
      beds: w.beds.map(b => b.id === selectedBed.id ? { ...b, current_status: newStatus } : b)
    })))
    setSelectedBed(null)

    await supabase.from('beds').update({ current_status: newStatus }).eq('id', selectedBed.id)

    await supabase.from('bed_status_logs').insert({
      bed_id: selectedBed.id,
      old_status: selectedBed.current_status,
      new_status: newStatus,
      changed_at: new Date().toISOString()
    })
  }

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />
      <div className="flex-1 ml-[240px]">
        <header className="bg-white border-b border-[#E4E8EE] px-8 h-16 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">Ward Management</h1>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
          {loading ? (
            <div className="animate-pulse flex gap-4"><div className="w-full h-32 bg-[#E4E8EE] rounded-xl" /></div>
          ) : (
            wards.map(ward => (
              <div key={ward.id} className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0D1B2A]">{ward.name_en}</h2>
                </div>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {ward.beds.map(bed => {
                    const style = STATUS_COLORS[bed.current_status] || STATUS_COLORS.maintenance
                    return (
                      <button
                        key={bed.id}
                        onClick={() => setSelectedBed(bed)}
                        className={cn(
                          'relative h-20 rounded-xl border flex flex-col items-center justify-center transition-transform hover:scale-105',
                          style.bg,
                          bed.ems_locked ? 'border-[#EF233C] cursor-not-allowed opacity-90' : 'border-transparent cursor-pointer shadow-sm hover:shadow-md'
                        )}
                      >
                        {bed.ems_locked && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF233C] text-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                            🔒
                          </div>
                        )}
                        <span className="font-mono font-bold text-[#0D1B2A] text-lg">{bed.bed_number}</span>
                        <span className={cn('text-[10px] font-bold uppercase mt-1', style.text)}>
                          {bed.ems_locked ? 'Reserved' : style.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </main>

        {selectedBed && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedBed(null)}>
            <div className="bg-white p-6 rounded-2xl shadow-modal w-[320px]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-[#0D1B2A] mb-1">Bed {selectedBed.bed_number}</h3>
              {selectedBed.ems_locked && <p className="text-xs text-[#EF233C] font-bold mb-4">⚠️ Locked by EMS Dispatch</p>}
              <div className="space-y-2">
                {(['available', 'occupied', 'cleaning', 'maintenance'] as BedStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn('w-full py-3 rounded-xl text-sm font-bold uppercase', selectedBed.current_status === status ? 'border-2 border-[#0D1B2A] bg-white' : STATUS_COLORS[status].bg + ' ' + STATUS_COLORS[status].text)}
                  >
                    {STATUS_COLORS[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
// src/components/EMSRequestNotification.tsx
// Popup shown when a new EMS request arrives (manual mode)
// Appears on top of all other content

import { useState } from 'react'
import type { EMSRequest } from '../hooks/useEMSRequests'
import { cn } from '../lib/utils'

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', bg: 'bg-[#EF233C]', text: 'text-[#EF233C]', bg_light: 'bg-[#FFF5F5]' },
  high:     { label: 'HIGH',     bg: 'bg-[#FF6B35]', text: 'text-[#FF6B35]', bg_light: 'bg-[#FFF8F5]' },
  medium:   { label: 'MEDIUM',   bg: 'bg-[#FFD166]', text: 'text-[#B8860B]', bg_light: 'bg-[#FFFDF0]' },
  low:      { label: 'LOW',      bg: 'bg-[#8D99AE]', text: 'text-[#4A5568]', bg_light: 'bg-[#F7F8FA]'  },
}

interface Props {
  request:     EMSRequest
  // Fixed: Replaced Promise<any> with Promise<void> to satisfy linting rules
  onAccept:    (requestId: string, bedId?: string) => Promise<void>
  onReject:    (requestId: string, reason: string) => Promise<void>
  onDismiss:   () => void
}

export function EMSRequestNotification({ request, onAccept, onReject, onDismiss }: Props) {
  const [rejecting,    setRejecting]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [accepting,    setAccepting]    = useState(false)

  const sev = SEVERITY_CONFIG[request.severity] || SEVERITY_CONFIG.medium

  const handleAccept = async () => {
    setAccepting(true)
    await onAccept(request.id)
    setAccepting(false)
  }

  const handleReject = async () => {
    await onReject(request.id, rejectReason)
  }

  const eta = Math.round(request.distance_km / 0.6)  // ~36 km/h Cairo traffic

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-fade-in"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[440px] bg-white rounded-2xl shadow-modal animate-fade-in overflow-hidden">

        {/* Header */}
        <div className={cn('px-6 py-4 flex items-center gap-3', sev.bg_light)}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', sev.bg)}>
            🚑
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-[#0D1B2A]">Incoming EMS Request</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-pill bg-white', sev.text)}>
                {sev.label}
              </span>
            </div>
            <p className="text-xs text-[#4A5568]">
              {new Date(request.created_at).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
              {' · '}Manual mode — your decision required
            </p>
          </div>
          <button onClick={onDismiss} className="text-[#8896AB] hover:text-[#0D1B2A] text-lg">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">

          {/* Case details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5F4F0] rounded-xl p-3">
              <p className="text-[10px] text-[#8896AB] font-semibold uppercase tracking-wide">Case Type</p>
              <p className="text-base font-bold text-[#0D1B2A] mt-1">{request.case_type}</p>
            </div>
            <div className="bg-[#F5F4F0] rounded-xl p-3">
              <p className="text-[10px] text-[#8896AB] font-semibold uppercase tracking-wide">ETA</p>
              <p className="text-base font-bold text-[#0D1B2A] mt-1">~{eta} min</p>
              <p className="text-[10px] text-[#4A5568]">{request.distance_km} km away</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-[#E4E8EE] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00C896] transition-all"
                style={{ width: `${request.composite_score}%` }}
              />
            </div>
            <span className="text-sm font-mono font-bold text-[#00C896]">
              {request.composite_score}/100
            </span>
            <span className="text-xs text-[#4A5568]">match score</span>
          </div>

          {request.patient_notes && (
            <div className="bg-[#F5F4F0] rounded-xl p-3">
              <p className="text-[10px] text-[#8896AB] font-semibold uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-[#0D1B2A]">{request.patient_notes}</p>
            </div>
          )}

          {/* Reject panel */}
          {rejecting && (
            <div className="border border-[#E4E8EE] rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-[#0D1B2A]">Reason for rejection (optional)</p>
              <input
                type="text"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-[#E4E8EE] rounded-btn px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF233C]"
                placeholder="No ICU beds available / Ward at capacity"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="flex-1 bg-[#EF233C] text-white rounded-btn py-2 text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="px-4 border border-[#E4E8EE] rounded-btn text-sm text-[#4A5568] hover:bg-[#F5F4F0]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!rejecting && (
          <div className="px-6 pb-5 flex gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-[#00C896] text-white rounded-btn py-3 font-semibold text-sm hover:bg-[#00A87E] disabled:opacity-50 transition-colors"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Reserving bed...
                </span>
              ) : '✓ Accept — Reserve Bed'}
            </button>
            <button
              onClick={() => setRejecting(true)}
              className="px-5 border border-[#EF233C] text-[#EF233C] rounded-btn font-medium text-sm hover:bg-[#FFF5F5] transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </>
  )
}
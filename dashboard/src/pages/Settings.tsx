// src/pages/Settings.tsx
// Hospital settings: bed price, EMS mode, surge threshold, notifications

import { useState } from 'react'
import { useAuth }     from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { Sidebar }     from '../components/Sidebar'
import { cn }          from '../lib/utils'

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#0D1B2A]">{title}</h2>
        {sub && <p className="text-xs text-[#8896AB] mt-0.5">{sub}</p>}
      </div>
      <div className="border-t border-[#E4E8EE]" />
      {children}
    </div>
  )
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#0D1B2A]">{label}</p>
        {sub && <p className="text-xs text-[#8896AB]">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-[#00C896]' : 'bg-[#E4E8EE]'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5.5 left-0.5' : 'left-0.5'
        )} />
      </button>
    </div>
  )
}

function NumberInput({ label, sub, value, min, max, step, prefix, suffix, onChange }: {
  label: string; sub?: string; value: number; min?: number; max?: number; step?: number
  prefix?: string; suffix?: string; onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState(value.toString())

  const commit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= (min || 0)) onChange(n)
    else setDraft(value.toString())
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#0D1B2A]">{label}</label>
      {sub && <p className="text-xs text-[#8896AB]">{sub}</p>}
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-[#4A5568] font-medium">{prefix}</span>}
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step || 1}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          className="w-40 border border-[#E4E8EE] rounded-btn px-3 py-2 text-sm text-[#0D1B2A] font-mono focus:outline-none focus:ring-2 focus:ring-[#00C896]"
        />
        {suffix && <span className="text-sm text-[#4A5568]">{suffix}</span>}
      </div>
    </div>
  )
}

export default function Settings() {
  const { profile, signOut }                    = useAuth()
  const { settings, saving, updateSettings }    = useSettings()
  const [saved,     setSaved]                   = useState(false)

  const save = async (patch: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex min-h-screen bg-[#F5F4F0]">
      <Sidebar profile={profile} onSignOut={signOut} />

      <div className="flex-1 ml-[240px]">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E4E8EE] px-8 h-16 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">Settings</h1>
            <p className="text-xs text-[#8896AB]">Hospital configuration · Applies immediately</p>
          </div>
          {saving && (
            <span className="text-xs text-[#8896AB] flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-[#00C896]/40 border-t-[#00C896] rounded-full animate-spin" />
              Saving...
            </span>
          )}
          {saved && (
            <span className="text-xs text-[#06D6A0] font-medium">✓ Saved</span>
          )}
        </header>

        <main className="max-w-2xl mx-auto px-8 py-8 space-y-5">

          {/* ── REVENUE SETTINGS ─── */}
          <Section
            title="Revenue Settings"
            sub="These values are used in the weekly report to calculate recovered revenue"
          >
            <NumberInput
              label="Bed Price Per Day"
              sub="Standard rate per occupied bed per day in your hospital"
              value={settings.bed_price_per_day}
              min={0}
              step={500}
              prefix="EGP"
              suffix="/ bed / day"
              onChange={v => save({ bed_price_per_day: v })}
            />

            {/* Preview calculation */}
            <div className="bg-[#F0FFF9] border border-[#06D6A0]/30 rounded-xl px-4 py-3">
              <p className="text-xs text-[#4A5568] mb-1">Preview: if 10 beds are recovered in a week</p>
              <p className="text-lg font-bold font-mono text-[#06D6A0]">
                EGP {(settings.bed_price_per_day * 10 * 0.30 * 7).toLocaleString()}
              </p>
              <p className="text-xs text-[#4A5568]">
                = EGP {settings.bed_price_per_day.toLocaleString()} × 10 beds × 7 days × 30% recovery
              </p>
            </div>
          </Section>

          {/* ── EMS DISPATCH MODE ─── */}
          <Section
            title="EMS Dispatch Mode"
            sub="Controls how incoming ambulance dispatch requests are handled"
          >
            {/* Mode toggle */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#0D1B2A]">Dispatch Mode</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Manual */}
                <button
                  onClick={() => save({ ems_mode: 'manual' })}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    settings.ems_mode === 'manual'
                      ? 'border-[#00C896] bg-[#F0FFF9]'
                      : 'border-[#E4E8EE] bg-white hover:border-[#C9D0DA]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👤</span>
                    <p className="font-semibold text-sm text-[#0D1B2A]">Manual</p>
                    {settings.ems_mode === 'manual' && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-[#00C896] flex items-center justify-center">
                        <span className="text-white text-[9px]">✓</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4A5568]">
                    Your team reviews each request and accepts or rejects manually.
                    A notification popup appears for each incoming EMS request.
                  </p>
                </button>

                {/* Auto */}
                <button
                  onClick={() => save({ ems_mode: 'auto' })}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    settings.ems_mode === 'auto'
                      ? 'border-[#00C896] bg-[#F0FFF9]'
                      : 'border-[#E4E8EE] bg-white hover:border-[#C9D0DA]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⚡</span>
                    <p className="font-semibold text-sm text-[#0D1B2A]">Auto</p>
                    {settings.ems_mode === 'auto' && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-[#00C896] flex items-center justify-center">
                        <span className="text-white text-[9px]">✓</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4A5568]">
                    Bed is automatically reserved when a request is received.
                    The nurse app shows the bed as locked until the patient arrives.
                  </p>
                </button>
              </div>

              {settings.ems_mode === 'manual' && (
                <NumberInput
                  label="Request Timeout"
                  sub="Minutes before an unanswered request auto-rejects"
                  value={settings.ems_request_timeout}
                  min={1}
                  max={30}
                  suffix="minutes"
                  onChange={v => save({ ems_request_timeout: v })}
                />
              )}
            </div>
          </Section>

          {/* ── ALERTS ─── */}
          <Section
            title="Alert Settings"
            sub="Configure when alerts trigger in the dashboard and nurse app"
          >
            <NumberInput
              label="Surge Alert Threshold"
              sub="Show surge alert when ward occupancy exceeds this percentage"
              value={settings.surge_threshold}
              min={50}
              max={99}
              suffix="% occupancy"
              onChange={v => save({ surge_threshold: v })}
            />

            <div className="space-y-3 pt-2">
              <Toggle
                label="Enable EMS Request Alerts"
                sub="Show popup notification when an EMS dispatch request arrives"
                checked={settings.enable_ems_alerts}
                onChange={v => save({ enable_ems_alerts: v })}
              />
              <Toggle
                label="Enable Surge Alerts"
                sub="Show banner when any ward exceeds the surge threshold"
                checked={settings.enable_surge_alerts}
                onChange={v => save({ enable_surge_alerts: v })}
              />
            </div>
          </Section>

          {/* ── HOSPITAL INFO ─── */}
          <Section title="Hospital Info" sub="Read-only. Contact BedFlow support to update.">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#F5F4F0]">
                <span className="text-[#4A5568]">Hospital ID</span>
                <span className="font-mono text-[#0D1B2A]">{profile?.hospital_id?.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F5F4F0]">
                <span className="text-[#4A5568]">Your Role</span>
                <span className="capitalize text-[#0D1B2A]">{profile?.role?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#4A5568]">Plan</span>
                <span className="text-[#00C896] font-medium">BedFlow MVP · Pilot</span>
              </div>
            </div>
          </Section>

        </main>
      </div>
    </div>
  )
}
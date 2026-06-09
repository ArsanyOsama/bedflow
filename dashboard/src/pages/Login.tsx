// src/pages/Login.tsx
// UPDATED per Figma S-00 spec:
//   - Dark gradient background (#0D1B2A → #0D3B2E)
//   - Centered card (480×520px equivalent)
//   - BedFlow logomark + wordmark
//   - Removed Department/Role dropdown (role comes from DB profile)
//   - LIVE indicator in footer

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Invalid credentials. Try: ops@hospital-a.com / BedFlow2026!')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0D1B2A 0%, #0D3B2E 100%)',
      }}
    >
      {/* Background grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-[440px]">
        {/* ── CARD ─── */}
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.32)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#00C896] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="6" width="6" height="4" rx="1" fill="white"/>
                <rect x="9" y="6" width="6" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="1" y="2" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
                <rect x="1" y="12" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0D1B2A]">BedFlow</h1>
              <p className="text-xs text-[#8896AB]">Hospital Capacity Intelligence</p>
            </div>
          </div>

          <div className="border-t border-[#E4E8EE] my-5" />

          <h2 className="text-base font-semibold text-[#0D1B2A] mb-5">Sign In to Your Hospital</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-[#E4E8EE] rounded-btn px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#00C896] focus:border-transparent transition-all placeholder-[#8896AB]"
                placeholder="ops@hospital.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-[#E4E8EE] rounded-btn px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#00C896] focus:border-transparent transition-all placeholder-[#8896AB]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#FFF5F5] border border-[#EF233C]/20 rounded-btn px-3.5 py-2.5">
                <p className="text-sm text-[#EF233C]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00C896] text-white rounded-btn py-3 text-sm font-semibold hover:bg-[#00A87E] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-4 bg-[#F5F4F0] rounded-btn px-3.5 py-2.5">
            <p className="text-[11px] text-[#4A5568] font-medium">Demo credentials:</p>
            <p className="text-[11px] text-[#8896AB] font-mono mt-0.5">ops@hospital-a.com · BedFlow2026!</p>
            <p className="text-[11px] text-[#8896AB] font-mono">nurse@hospital-a.com · BedFlow2026!</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/30 mt-5">
          Powered by BedFlow · ECU — VEROW 2026
          {' · '}
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
            LIVE
          </span>
        </p>
      </div>
    </div>
  )
}
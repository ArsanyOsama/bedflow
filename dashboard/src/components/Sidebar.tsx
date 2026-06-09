// src/components/Sidebar.tsx
// NEW per Figma spec: fixed 240px dark sidebar (#0D1B2A)
// Navigation: Dashboard, Ward View, City Map, Alerts (badge), Reports, Settings

import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import type { UserProfile } from '../types'

interface NavItem {
  icon: string
  label: string
  path: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { icon: '⊞', label: 'Dashboard',  path: '/dashboard' },
  { icon: '🏥', label: 'Ward View',  path: '/wards'     },
  { icon: '🗺', label: 'City Map',   path: '/map'        },
  { icon: '🔔', label: 'Alerts',     path: '/alerts', badge: 2 },
  { icon: '📊', label: 'Reports',    path: '/reports'    },
]

const BOTTOM_ITEMS: NavItem[] = [
  { icon: '⚙', label: 'Settings',   path: '/settings'   },
]

interface SidebarProps {
  profile: UserProfile | null
  onSignOut: () => void
}

export function Sidebar({ profile, onSignOut }: SidebarProps) {
  const { pathname } = useLocation()

  return (
    <aside className="w-[240px] bg-[#0D1B2A] h-screen fixed left-0 top-0 flex flex-col z-40">

      {/* ── LOGO + HOSPITAL NAME ─────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5 mb-1">
          {/* BedFlow logo mark */}
          <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="6" width="6" height="4" rx="1" fill="white"/>
              <rect x="9" y="6" width="6" height="4" rx="1" fill="white" opacity="0.6"/>
              <rect x="1" y="2" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
              <rect x="1" y="12" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">BedFlow</p>
            <p className="text-[#00C896] text-[10px] leading-none mt-0.5">Capacity Intelligence</p>
          </div>
        </div>
        {profile?.name_en && (
          <p className="text-white/40 text-[11px] mt-2 truncate">
            {profile.name_en.split(' ')[0] && '🏥'} {profile?.name_en}
          </p>
        )}
      </div>

      {/* ── MAIN NAV ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path ||
            (item.path === '/dashboard' && pathname === '/')
          return (
            <Link key={item.path} to={item.path}
              className={cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-[#EF233C] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── BOTTOM (Settings + User) ─────────────────────────────── */}
      <div className="px-3 pb-4 border-t border-white/8 pt-3 space-y-1">
        {BOTTOM_ITEMS.map((item) => (
          <Link key={item.path} to={item.path}
            className={cn('nav-item', pathname === item.path ? 'nav-item-active' : 'nav-item-inactive')}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* User card */}
        <div className="mt-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#00C896]/20 border border-[#00C896]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#00C896] text-xs font-bold">
                {(profile?.name_en || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-none">
                {profile?.name_en || 'User'}
              </p>
              <p className="text-white/40 text-[10px] mt-0.5 capitalize">
                {profile?.role?.replace('_', ' ') || 'Staff'}
              </p>
            </div>
            <button
              onClick={onSignOut}
              className="text-white/30 hover:text-white/70 transition-colors text-xs"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
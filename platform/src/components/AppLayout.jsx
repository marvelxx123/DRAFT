import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Megaphone, CalendarDays, Mail, Video, CreditCard, Settings, LogOut, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import CreditBadge from './CreditBadge.jsx'

const NAV = [
  { to: '/dashboard',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tools/ad-copy',           icon: Megaphone,       label: 'Ad Copy' },
  { to: '/tools/content-calendar',  icon: CalendarDays,    label: 'Content Calendar' },
  { to: '/tools/email-campaign',    icon: Mail,            label: 'Email Campaign' },
  { to: '/tools/video-script',      icon: Video,           label: 'Video Script' },
]

const BOTTOM_NAV = [
  { to: '/billing',  icon: CreditCard, label: 'Billing' },
  { to: '/settings', icon: Settings,   label: 'Settings' },
]

export default function AppLayout({ profile, refreshProfile, children }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#050505]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <span className="font-display font-bold text-2xl tracking-tight gradient-text">NEXUS</span>
          <span className="text-white/20 text-xs ml-1">AI</span>
        </div>

        {/* Brand pill */}
        {profile?.brand_name && (
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold">
                {profile.brand_name[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium text-white/70 truncate">{profile.brand_name}</span>
            </div>
          </div>
        )}

        {/* Credit badge */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <CreditBadge profile={profile} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-accent/20 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-accent-light' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-white/[0.06] pt-3">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'bg-accent/20 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-accent-light' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-400/5 transition-all duration-150"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto mesh-bg">
        {children}
      </main>
    </div>
  )
}

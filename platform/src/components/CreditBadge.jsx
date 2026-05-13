import { Zap } from 'lucide-react'
import { PLAN_CREDITS } from '../lib/credits.js'

export default function CreditBadge({ profile }) {
  if (!profile) return null
  const total = PLAN_CREDITS[profile.plan] ?? 30
  const remaining = profile.credits_remaining ?? 0
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100))
  const color = pct > 50 ? '#A855F7' : pct > 20 ? '#F59E0B' : '#EF4444'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-accent-light" />
          <span className="text-xs text-white/50">Credits</span>
        </div>
        <span className="text-xs font-semibold text-white/80">{remaining}<span className="text-white/30 font-normal">/{total}</span></span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-white/30 capitalize">{profile.plan} plan</span>
    </div>
  )
}

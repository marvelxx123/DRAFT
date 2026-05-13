import { CheckCircle2, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'
import { PLANS, createCheckoutSession, createPortalSession } from '../lib/stripe.js'
import { PLAN_CREDITS } from '../lib/credits.js'

const PLAN_ORDER = ['free', 'starter', 'growth', 'pro']
const PLAN_FEATURES = {
  free:    ['30 credits / month', 'All 4 generation tools', 'Brand Memory', 'Community support'],
  starter: ['200 credits / month', 'All 4 generation tools', 'Brand Memory', 'Full generation history', 'Email support'],
  growth:  ['600 credits / month', 'All 4 generation tools', 'Brand Memory', 'Priority generation', 'Full history', 'Email support'],
  pro:     ['2,000 credits / month', 'All 4 generation tools', 'Brand Memory', 'API access', '2 team seats', 'Priority support'],
}

function PlanCard({ planKey, current, profile }) {
  const [loading, setLoading] = useState(false)
  const plan = PLANS[planKey]
  const isCurrent = current === planKey
  const isUpgrade = PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(current)

  async function handleAction() {
    if (isCurrent) return
    setLoading(true)
    try {
      if (profile?.stripe_customer_id && current !== 'free') {
        await createPortalSession(profile.stripe_customer_id)
      } else if (plan.priceId) {
        await createCheckoutSession(plan.priceId, profile.id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-2xl p-6 flex flex-col gap-5 relative transition-all ${
      isCurrent ? 'gradient-border' : ''
    }`} style={{
      background: isCurrent ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
      border: isCurrent ? undefined : '1px solid rgba(255,255,255,0.07)',
    }}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}>
          Current Plan
        </div>
      )}
      <div>
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{plan.name}</div>
        <div className="flex items-end gap-1">
          <span className="font-display font-bold text-4xl text-white">${plan.price}</span>
          {plan.price > 0 && <span className="text-white/40 mb-1">/mo</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-sm text-white/50">
          <Zap size={13} className="text-accent-light" />
          {PLAN_CREDITS[planKey].toLocaleString()} credits / month
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {PLAN_FEATURES[planKey].map(f => (
          <div key={f} className="flex items-center gap-2 text-sm text-white/60">
            <CheckCircle2 size={13} className="text-accent-light flex-shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <button onClick={handleAction} disabled={isCurrent || loading}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          isCurrent
            ? 'bg-white/5 text-white/30 cursor-default'
            : isUpgrade
              ? 'btn-primary'
              : 'border border-white/10 hover:border-white/20 text-white/60 hover:text-white hover:bg-white/[0.04]'
        }`}>
        {loading ? <Loader2 size={14} className="spin" /> :
          isCurrent ? 'Current Plan' :
          isUpgrade ? <>Upgrade <ArrowRight size={13} /></> : 'Switch Plan'}
      </button>
    </div>
  )
}

export default function Billing({ session, profile, refreshProfile }) {
  const current = profile?.plan ?? 'free'
  const total = PLAN_CREDITS[current] ?? 30
  const remaining = profile?.credits_remaining ?? 0
  const used = total - remaining
  const pct = Math.round((used / total) * 100)

  return (
    <AppLayout profile={profile} refreshProfile={refreshProfile}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-white mb-1">Billing & Credits</h1>
          <p className="text-white/40 text-sm">Manage your plan and track credit usage.</p>
        </div>

        {/* Usage summary */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-white">Credit Usage This Month</div>
              <div className="text-xs text-white/30 mt-0.5">Resets monthly on your billing date</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-2xl text-white">{remaining}</div>
              <div className="text-xs text-white/30">credits remaining</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : 'linear-gradient(90deg,#7C3AED,#A855F7)' }} />
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{used} used</span>
            <span>{total} total</span>
          </div>
        </div>

        {/* Plans */}
        <h2 className="font-display font-semibold text-lg text-white mb-5">Plans</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_ORDER.map(p => (
            <PlanCard key={p} planKey={p} current={current} profile={profile} />
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-white/20">
          All plans billed monthly. Cancel anytime. Credits reset each billing cycle.
        </div>
      </div>
    </AppLayout>
  )
}

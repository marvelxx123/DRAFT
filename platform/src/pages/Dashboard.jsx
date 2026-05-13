import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Megaphone, CalendarDays, Mail, Video, ArrowRight, Clock, Zap, TrendingUp } from 'lucide-react'
import AppLayout from '../components/AppLayout.jsx'
import { getGenerations } from '../lib/supabase.js'
import { TOOL_COSTS, PLAN_CREDITS } from '../lib/credits.js'
import { PLANS } from '../lib/stripe.js'

const TOOLS = [
  { to: '/tools/ad-copy',           icon: Megaphone,    label: 'Ad Copy',          desc: 'Facebook, Instagram, Google', cost: 5,  color: '#7C3AED' },
  { to: '/tools/content-calendar',  icon: CalendarDays, label: 'Content Calendar', desc: '30 days of post ideas',       cost: 8,  color: '#6366F1' },
  { to: '/tools/email-campaign',    icon: Mail,         label: 'Email Campaign',   desc: 'Subject + body that convert', cost: 5,  color: '#A855F7' },
  { to: '/tools/video-script',      icon: Video,        label: 'Video Script',     desc: 'Hook, body, CTA — ready',     cost: 6,  color: '#8B5CF6' },
]

const TOOL_LABELS = {
  ad_copy: 'Ad Copy', content_calendar: 'Content Calendar',
  email_campaign: 'Email Campaign', video_script: 'Video Script',
}

function ToolCard({ tool }) {
  const Icon = tool.icon
  return (
    <Link to={tool.to}
      className="glass-hover rounded-2xl p-5 flex flex-col gap-4 group cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${tool.color}20` }}>
          <Icon size={20} style={{ color: tool.color }} />
        </div>
        <span className="text-xs text-white/30 flex items-center gap-1">
          <Zap size={10} />{tool.cost} credits
        </span>
      </div>
      <div>
        <div className="font-semibold text-white mb-1">{tool.label}</div>
        <div className="text-sm text-white/40">{tool.desc}</div>
      </div>
      <div className="flex items-center gap-1 text-xs text-accent-light opacity-0 group-hover:opacity-100 transition-opacity">
        Generate now <ArrowRight size={11} />
      </div>
    </Link>
  )
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40">{label}</span>
        {Icon && <Icon size={14} className="text-white/20" />}
      </div>
      <div className="font-display font-bold text-3xl text-white mb-0.5">{value}</div>
      {sub && <div className="text-xs text-white/30">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ session, profile, refreshProfile }) {
  const [generations, setGenerations] = useState([])

  useEffect(() => {
    if (!session) return
    getGenerations(session.user.id, 5).then(setGenerations).catch(() => {})
  }, [session])

  const total = PLAN_CREDITS[profile?.plan] ?? 30
  const remaining = profile?.credits_remaining ?? 0
  const used = total - remaining

  return (
    <AppLayout profile={profile} refreshProfile={refreshProfile}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-1">
            {profile?.brand_name ? `${profile.brand_name} Studio` : 'Your Studio'}
          </h1>
          <p className="text-white/40 text-sm">
            {remaining > 0
              ? `${remaining} credits available — what are we creating today?`
              : 'You\'re out of credits — upgrade to keep generating.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Credits Left"    value={remaining} sub={`of ${total} this month`}  icon={Zap}       />
          <StatCard label="Credits Used"    value={used}      sub="this billing cycle"         icon={TrendingUp} />
          <StatCard label="Total Generated" value={generations.length} sub="all time"          icon={Megaphone} />
          <StatCard label="Current Plan"    value={PLANS[profile?.plan ?? 'free']?.name ?? 'Free'}
            sub={remaining < 30 ? <Link to="/billing" className="text-accent-light hover:underline">Upgrade →</Link> : 'Active'}
          />
        </div>

        {/* Tools */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-white">Generation Tools</h2>
            <span className="text-xs text-white/30">All tools use your brand context automatically</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOOLS.map(t => <ToolCard key={t.to} tool={t} />)}
          </div>
        </div>

        {/* Recent generations */}
        <div>
          <h2 className="font-display font-semibold text-lg text-white mb-4">Recent Generations</h2>
          {generations.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Megaphone size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No generations yet.</p>
              <p className="text-white/20 text-xs mt-1">Pick a tool above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {generations.map(g => (
                <div key={g.id} className="glass rounded-xl px-5 py-3.5 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    {g.tool === 'ad_copy' && <Megaphone size={14} className="text-accent-light" />}
                    {g.tool === 'content_calendar' && <CalendarDays size={14} className="text-accent-light" />}
                    {g.tool === 'email_campaign' && <Mail size={14} className="text-accent-light" />}
                    {g.tool === 'video_script' && <Video size={14} className="text-accent-light" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{TOOL_LABELS[g.tool] ?? g.tool}</div>
                    <div className="text-xs text-white/30 truncate">{g.inputs?.product_name || g.inputs?.topic || 'Generation'}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/30 flex-shrink-0">
                    <span className="flex items-center gap-1"><Zap size={10} />{g.credits_used}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

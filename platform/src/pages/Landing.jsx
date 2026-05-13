import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Brain, Package, BarChart3, CheckCircle2, Megaphone, CalendarDays, Mail, Video } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PLANS } from '../lib/stripe.js'

const TYPEWRITER_LINES = [
  'Facebook ad copy that converts.',
  'Email campaigns that feel personal.',
  'A month of content in 60 seconds.',
  'Video scripts. On brand. Always.',
]

function TypewriterHero() {
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = TYPEWRITER_LINES[lineIdx]
    const delay = deleting ? 30 : charIdx === current.length ? 2000 : 50

    const t = setTimeout(() => {
      if (!deleting && charIdx === current.length) {
        setDeleting(true)
      } else if (deleting && charIdx === 0) {
        setDeleting(false)
        setLineIdx(i => (i + 1) % TYPEWRITER_LINES.length)
      } else {
        setCharIdx(c => c + (deleting ? -1 : 1))
      }
    }, delay)
    return () => clearTimeout(t)
  }, [charIdx, deleting, lineIdx])

  return (
    <span className="gradient-text">
      {TYPEWRITER_LINES[lineIdx].slice(0, charIdx)}
      <span className="typing-cursor" />
    </span>
  )
}

function MockCard() {
  const [step, setStep] = useState(0)
  const OUTPUT = [
    '🎯 Headline: "Wake Up to Perfect Coffee"',
    '📝 Body: "Barista-quality at home in 30 seconds. No grinder. No mess. Just perfect."',
    '🔥 CTA: "Try LUXE Coffee — 50% Off Today"',
    '#coffeelover #morningroutine #luxelife',
  ]
  useEffect(() => {
    if (step >= OUTPUT.length) return
    const t = setTimeout(() => setStep(s => s + 1), 900)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="glass gradient-border rounded-2xl p-5 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-white/30 font-mono">Ad Copy Generator</span>
      </div>
      <div className="space-y-1 mb-4">
        <div className="text-[10px] text-white/30 uppercase tracking-widest">Brand</div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[8px] font-bold">L</div>
          <span className="text-sm font-semibold text-white">LUXE Coffee Co.</span>
        </div>
      </div>
      <div className="space-y-2">
        {OUTPUT.slice(0, step).map((line, i) => (
          <div key={i} className="slide-in text-xs text-white/70 leading-relaxed py-1.5 px-3 rounded-lg bg-white/[0.04]">
            {line}
          </div>
        ))}
        {step < OUTPUT.length && (
          <div className="h-4 flex items-center gap-1 px-3">
            {[0,1,2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-accent-light animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-white/30">5 credits used</span>
        <span className="text-[10px] text-emerald-400">✓ Generated in 2.3s</span>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: Brain,
    title: 'Brand Memory',
    desc: 'Set your brand once — voice, audience, niche. Every generation knows your context forever. You never start from zero.',
  },
  {
    icon: Package,
    title: 'Package Output',
    desc: 'One brief becomes a full content suite. Ad copy, captions, email, video script — all consistent, all on-brand.',
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    desc: 'Content in seconds, not hours. Stop spending time on a blank page. Brief it, generate it, ship it.',
  },
  {
    icon: BarChart3,
    title: 'Credit System',
    desc: 'Pay only for what you generate. No wasted budget. Scale up when you need more, cut back when you don\'t.',
  },
]

const TOOLS = [
  { icon: Megaphone, label: 'Ad Copy',          desc: 'Facebook, Instagram, Google — all formats' },
  { icon: CalendarDays, label: 'Content Calendar', desc: '30 days of post ideas in one click'       },
  { icon: Mail,         label: 'Email Campaign',   desc: 'Subject lines + body that convert'        },
  { icon: Video,        label: 'Video Script',     desc: 'Hook, body, CTA — structured and ready'   },
]

function PricingCard({ plan, highlight }) {
  const p = PLANS[plan]
  return (
    <div className={`rounded-2xl p-6 flex flex-col gap-5 relative ${highlight ? 'gradient-border' : ''}`}
      style={{ background: highlight ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)', border: highlight ? undefined : '1px solid rgba(255,255,255,0.08)' }}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}>
          Most Popular
        </div>
      )}
      <div>
        <div className="text-sm font-semibold text-white/60 mb-1">{p.name}</div>
        <div className="flex items-end gap-1">
          <span className="font-display font-bold text-4xl text-white">${p.price}</span>
          {p.price > 0 && <span className="text-white/40 mb-1">/mo</span>}
        </div>
        <div className="mt-1 text-sm text-white/40">{p.credits} credits / month</div>
      </div>
      <div className="space-y-2 flex-1">
        {[
          'All generation tools',
          'Brand Memory',
          plan === 'free' ? '3 tools included' : 'Unlimited history',
          plan === 'pro' ? 'API access' : plan === 'growth' ? 'Priority generation' : 'Community support',
          plan === 'pro' ? '2 team seats' : plan === 'growth' ? 'Email support' : null,
        ].filter(Boolean).map(f => (
          <div key={f} className="flex items-center gap-2 text-sm text-white/60">
            <CheckCircle2 size={14} className="text-accent-light flex-shrink-0" />
            {f}
          </div>
        ))}
      </div>
      <Link
        to="/register"
        className={`text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
          highlight
            ? 'btn-primary w-full justify-center'
            : 'border border-white/10 hover:border-white/20 hover:bg-white/[0.04] text-white/70 hover:text-white'
        }`}
      >
        {p.price === 0 ? 'Start Free' : 'Get Started'}
      </Link>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/80 backdrop-blur-lg">
        <span className="font-display font-bold text-xl tracking-tight gradient-text">NEXUS</span>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#tools"    className="hover:text-white transition-colors">Tools</a>
          <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="btn-ghost text-sm px-4 py-2">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">Start Free <ArrowRight size={14} /></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center mesh-bg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-accent-light border border-accent/30 bg-accent/10 mb-8">
            <Zap size={11} />
            AI Content Studio — Built for brands that move fast
          </div>
          <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight tracking-tight mb-6">
            Your brand. Any content.
            <br />
            <TypewriterHero />
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Set your brand once. Generate ads, posts, emails, and scripts that actually sound like you — in seconds, not hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to="/register" className="btn-primary text-base px-7 py-3.5 glow-accent">
              Start Creating Free <ArrowRight size={16} />
            </Link>
            <a href="#tools" className="btn-ghost text-base px-7 py-3.5">See the tools →</a>
          </div>

          {/* Mock */}
          <MockCard />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
              Why <span className="gradient-text">NEXUS</span> is different
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Every other tool is stateless. NEXUS knows your brand and keeps it consistent across everything.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-hover rounded-2xl p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Icon size={18} className="text-accent-light" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="py-24 px-6 border-y border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
              Four tools. One brief.
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Every tool pulls from your brand profile — so every output sounds like you.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOOLS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-hover rounded-2xl p-5 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))' }}>
                  <Icon size={22} className="text-accent-light" />
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">{label}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
              Simple, credit-based pricing
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Pay only for what you generate. Credits reset monthly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            <PricingCard plan="free"    highlight={false} />
            <PricingCard plan="starter" highlight={false} />
            <PricingCard plan="growth"  highlight={true}  />
            <PricingCard plan="pro"     highlight={false} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
            Ready to stop staring at a blank page?
          </h2>
          <p className="text-white/40 text-lg mb-10">
            30 free credits. No credit card. Set up your brand in 2 minutes.
          </p>
          <Link to="/register" className="btn-primary text-base px-8 py-4 glow-accent">
            Start Creating Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
        <span className="font-display font-bold gradient-text">NEXUS AI</span>
        <span>© 2026 Nexus AI. All rights reserved.</span>
        <div className="flex gap-5">
          <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  )
}

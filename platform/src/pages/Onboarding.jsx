import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from '../lib/supabase.js'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'

const NICHES = ['E-commerce', 'Fashion & Beauty', 'Food & Beverage', 'Health & Wellness', 'Tech & SaaS', 'Real Estate', 'Fitness', 'Education', 'Finance', 'Other']
const TONES  = [
  { value: 'bold',         label: '🔥 Bold',         desc: 'Direct, confident, punchy' },
  { value: 'professional', label: '💼 Professional',  desc: 'Polished, authoritative'   },
  { value: 'playful',      label: '😄 Playful',       desc: 'Fun, casual, energetic'    },
  { value: 'luxury',       label: '✨ Luxury',        desc: 'Premium, aspirational'     },
  { value: 'educational',  label: '📚 Educational',   desc: 'Clear, informative, helpful' },
]

const STEPS = ['Brand', 'Audience', 'Voice']

export default function Onboarding({ session, refreshProfile }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    brand_name: '', brand_niche: '', brand_description: '',
    brand_audience: '', brand_tone: '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function finish() {
    setLoading(true)
    await updateProfile(session.user.id, { ...form, onboarding_completed: true })
    refreshProfile()
    navigate('/dashboard')
  }

  const canNext = [
    form.brand_name && form.brand_niche,
    form.brand_audience,
    form.brand_tone,
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-black mesh-bg px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="font-display font-bold text-3xl gradient-text">NEXUS</span>
          <h1 className="font-display font-bold text-2xl text-white mt-4 mb-2">Set up your brand</h1>
          <p className="text-white/40 text-sm">This is your Brand Memory — every generation uses this context.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i < step ? 'bg-accent text-white' : i === step ? 'gradient-border bg-accent/20 text-accent-light' : 'bg-white/5 text-white/30'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-12 transition-all ${i < step ? 'bg-accent' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass gradient-border rounded-2xl p-7 space-y-5">
          {/* Step 0: Brand basics */}
          {step === 0 && (
            <div className="space-y-4 slide-in">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 font-medium">Brand Name *</label>
                <input className="input-field" placeholder="e.g. LUXE Coffee Co." value={form.brand_name}
                  onChange={e => set('brand_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 font-medium">Industry / Niche *</label>
                <div className="grid grid-cols-2 gap-2">
                  {NICHES.map(n => (
                    <button key={n} type="button" onClick={() => set('brand_niche', n)}
                      className={`text-sm px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                        form.brand_niche === n
                          ? 'border-accent/60 bg-accent/15 text-white'
                          : 'border-white/08 bg-white/[0.03] text-white/50 hover:text-white/70 hover:border-white/15'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 font-medium">What does your brand sell? (optional)</label>
                <textarea className="input-field resize-none" rows={3} placeholder="Describe your products or services in 1-2 sentences..."
                  value={form.brand_description} onChange={e => set('brand_description', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Audience */}
          {step === 1 && (
            <div className="space-y-4 slide-in">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 font-medium">Who is your target audience? *</label>
                <textarea className="input-field resize-none" rows={4}
                  placeholder="e.g. Women 25–40, interested in wellness and sustainability, typically shop on Instagram and TikTok..."
                  value={form.brand_audience} onChange={e => set('brand_audience', e.target.value)} />
              </div>
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/15 text-xs text-white/50 leading-relaxed">
                <Sparkles size={12} className="inline mr-1 text-accent-light" />
                The more specific you are, the better your content will resonate. Age range, interests, platforms, and pain points all help.
              </div>
            </div>
          )}

          {/* Step 2: Voice / tone */}
          {step === 2 && (
            <div className="space-y-4 slide-in">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 font-medium">Brand Voice *</label>
                <div className="space-y-2">
                  {TONES.map(t => (
                    <button key={t.value} type="button" onClick={() => set('brand_tone', t.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                        form.brand_tone === t.value
                          ? 'border-accent/60 bg-accent/15'
                          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                      }`}>
                      <span className="text-base">{t.label.split(' ')[0]}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{t.label.split(' ').slice(1).join(' ')}</div>
                        <div className="text-xs text-white/40">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex-1 justify-center">
                Back
              </button>
            )}
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
                className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={finish} disabled={!canNext[2] || loading}
                className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={16} className="spin" /> : <>Launch my studio <Sparkles size={14} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

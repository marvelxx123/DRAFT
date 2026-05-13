import { useState } from 'react'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import AppLayout from '../components/AppLayout.jsx'
import { updateProfile } from '../lib/supabase.js'

const TONES = ['bold', 'professional', 'playful', 'luxury', 'educational']
const NICHES = ['E-commerce', 'Fashion & Beauty', 'Food & Beverage', 'Health & Wellness', 'Tech & SaaS', 'Real Estate', 'Fitness', 'Education', 'Finance', 'Other']

export default function Settings({ session, profile, refreshProfile }) {
  const [form, setForm] = useState({
    brand_name:        profile?.brand_name || '',
    brand_niche:       profile?.brand_niche || '',
    brand_description: profile?.brand_description || '',
    brand_audience:    profile?.brand_audience || '',
    brand_tone:        profile?.brand_tone || '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile(session.user.id, form)
      refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout profile={profile} refreshProfile={refreshProfile}>
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-white mb-1">Brand Settings</h1>
          <p className="text-white/40 text-sm">Your Brand Memory — this context is injected into every generation.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="glass rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-white text-sm border-b border-white/[0.06] pb-3">Brand Identity</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Brand Name</label>
              <input className="input-field" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="LUXE Coffee Co." />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Industry / Niche</label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(n => (
                  <button key={n} type="button" onClick={() => set('brand_niche', n)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      form.brand_niche === n ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">What does your brand sell?</label>
              <textarea className="input-field resize-none" rows={3}
                value={form.brand_description} onChange={e => set('brand_description', e.target.value)}
                placeholder="Describe your products or services..." />
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-white text-sm border-b border-white/[0.06] pb-3">Audience & Voice</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Target Audience</label>
              <textarea className="input-field resize-none" rows={3}
                value={form.brand_audience} onChange={e => set('brand_audience', e.target.value)}
                placeholder="Age range, interests, platforms they use, pain points..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Brand Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} type="button" onClick={() => set('brand_tone', t)}
                    className={`text-xs px-4 py-2 rounded-lg border transition-all capitalize ${
                      form.brand_tone === t ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-3.5">
            {loading ? <Loader2 size={15} className="spin" /> :
             saved ? <><CheckCircle2 size={15} className="text-emerald-400" /> Saved</> :
             <><Save size={15} /> Save Brand Settings</>}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}

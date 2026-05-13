import { Megaphone } from 'lucide-react'
import ToolPage from '../../components/ToolPage.jsx'

const PLATFORMS = ['Facebook', 'Instagram', 'Google Search', 'TikTok', 'LinkedIn']
const GOALS     = ['Drive Sales', 'Generate Leads', 'Boost Awareness', 'Grow Following', 'Promote Event']

function parseOutputs(raw) {
  const blocks = []
  const sections = raw.split(/\n(?=#+\s|(?:HEADLINE|BODY|CTA|CAPTION|HASHTAGS?|AD COPY|PRIMARY TEXT):)/i)
  if (sections.length <= 1) {
    const parts = raw.split(/\n{2,}/)
    parts.forEach((p, i) => {
      if (p.trim()) blocks.push({ label: `Variation ${i + 1}`, content: p.trim() })
    })
  } else {
    sections.forEach(s => {
      const lines = s.trim().split('\n')
      const label = lines[0].replace(/^#+\s*/, '').replace(/:$/, '').trim()
      const content = lines.slice(1).join('\n').trim()
      if (content) blocks.push({ label, content })
    })
  }
  return blocks.length ? blocks : [{ label: 'Ad Copy', content: raw.trim() }]
}

export default function AdCopy(props) {
  return (
    <ToolPage
      toolKey="ad_copy"
      title="Ad Copy Generator"
      desc="Generate high-converting ad copy for any platform — pre-loaded with your brand voice."
      icon={Megaphone}
      cost={5}
      parseOutputs={parseOutputs}
      renderForm={({ inputs, setInput }) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Product / Service *</label>
            <input className="input-field" placeholder="e.g. Organic Coffee Subscription Box"
              value={inputs.product_name || ''} onChange={e => setInput('product_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Key Benefit or Offer *</label>
            <input className="input-field" placeholder="e.g. 50% off first month, free shipping"
              value={inputs.offer || ''} onChange={e => setInput('offer', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => setInput('platform', p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputs.platform === p ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g} type="button" onClick={() => setInput('goal', g)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputs.goal === g ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Extra context (optional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="Seasonal promotion, urgency, specific pain point..."
              value={inputs.extra || ''} onChange={e => setInput('extra', e.target.value)} />
          </div>
        </div>
      )}
      {...props}
    />
  )
}

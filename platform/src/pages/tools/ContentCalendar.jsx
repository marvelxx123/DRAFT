import { CalendarDays } from 'lucide-react'
import ToolPage from '../../components/ToolPage.jsx'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Twitter / X', 'Facebook']
const THEMES = ['Product Education', 'Behind the Scenes', 'Customer Stories', 'Promotions', 'Tips & Value', 'Mixed']

function parseOutputs(raw) {
  const days = raw.split(/\n(?=Day \d+|Week \d+)/i).filter(s => s.trim())
  if (days.length > 1) {
    return days.slice(0, 10).map((d, i) => {
      const lines = d.trim().split('\n')
      return { label: lines[0].trim(), content: lines.slice(1).join('\n').trim() || d.trim() }
    })
  }
  return [{ label: 'Content Calendar', content: raw.trim() }]
}

export default function ContentCalendar(props) {
  return (
    <ToolPage
      toolKey="content_calendar"
      title="Content Calendar"
      desc="Generate 30 days of content ideas — tailored to your brand, niche, and audience."
      icon={CalendarDays}
      cost={8}
      parseOutputs={parseOutputs}
      renderForm={({ inputs, setInput }) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Month / Period *</label>
            <input className="input-field" placeholder="e.g. June 2026, Q3 2026"
              value={inputs.period || ''} onChange={e => setInput('period', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Primary Platform</label>
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
            <label className="text-xs text-white/50 font-medium">Content Theme</label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map(t => (
                <button key={t} type="button" onClick={() => setInput('theme', t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputs.theme === t ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Upcoming promotions or events (optional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="Summer sale, product launch, holiday..."
              value={inputs.promotions || ''} onChange={e => setInput('promotions', e.target.value)} />
          </div>
        </div>
      )}
      {...props}
    />
  )
}

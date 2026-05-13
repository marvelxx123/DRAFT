import { Video } from 'lucide-react'
import ToolPage from '../../components/ToolPage.jsx'

const DURATIONS = ['15 seconds', '30 seconds', '60 seconds', '2-3 minutes']
const FORMATS   = ['Product Demo', 'Talking Head', 'Story-Based', 'Tutorial', 'Ad / Promo', 'UGC Style']

function parseOutputs(raw) {
  const sections = raw.split(/\n(?=(?:HOOK|INTRO|BODY|PROBLEM|SOLUTION|CTA|OUTRO|SCRIPT):)/i).filter(s => s.trim())
  if (sections.length > 1) {
    return sections.map(s => {
      const lines = s.split('\n')
      return { label: lines[0].replace(/:$/, '').trim(), content: lines.slice(1).join('\n').trim() }
    })
  }
  const hookIdx  = raw.search(/hook[:\s]/i)
  const ctaIdx   = raw.search(/cta[:\s]|call.to.action/i)
  if (hookIdx > -1) {
    const blocks = [{ label: 'Full Script', content: raw.trim() }]
    return blocks
  }
  return [{ label: 'Video Script', content: raw.trim() }]
}

export default function VideoScript(props) {
  return (
    <ToolPage
      toolKey="video_script"
      title="Video Script"
      desc="Structured video scripts with hook, body, and CTA — ready to film."
      icon={Video}
      cost={6}
      parseOutputs={parseOutputs}
      renderForm={({ inputs, setInput }) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Topic / Product *</label>
            <input className="input-field" placeholder="e.g. Why our coffee is worth the price"
              value={inputs.topic || ''} onChange={e => setInput('topic', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Video Length</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => setInput('duration', d)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputs.duration === d ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Format / Style</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(f => (
                <button key={f} type="button" onClick={() => setInput('format', f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inputs.format === f ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/08 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Key message or hook idea (optional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="The main point you want viewers to take away..."
              value={inputs.key_message || ''} onChange={e => setInput('key_message', e.target.value)} />
          </div>
        </div>
      )}
      {...props}
    />
  )
}

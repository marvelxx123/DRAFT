import { Mail } from 'lucide-react'
import ToolPage from '../../components/ToolPage.jsx'

const GOALS = ['Promote Sale', 'Launch Product', 'Re-engage Subscribers', 'Share Newsletter', 'Abandoned Cart', 'Welcome New Subscriber']

function parseOutputs(raw) {
  const subjectMatch = raw.match(/subject(?:\s+line)?[:\s]+(.+)/i)
  const previewMatch = raw.match(/preview(?:\s+text)?[:\s]+(.+)/i)
  const bodyStart    = raw.search(/body[:\s]/i)

  if (subjectMatch) {
    const blocks = []
    if (subjectMatch) blocks.push({ label: 'Subject Line', content: subjectMatch[1].trim() })
    if (previewMatch) blocks.push({ label: 'Preview Text', content: previewMatch[1].trim() })
    if (bodyStart > -1) {
      const body = raw.slice(bodyStart).replace(/^body[:\s]*/i, '').trim()
      if (body) blocks.push({ label: 'Email Body', content: body })
    }
    if (blocks.length) return blocks
  }
  return [{ label: 'Email Campaign', content: raw.trim() }]
}

export default function EmailCampaign(props) {
  return (
    <ToolPage
      toolKey="email_campaign"
      title="Email Campaign"
      desc="Write email campaigns that feel personal and convert — subject line, preview text, and body."
      icon={Mail}
      cost={5}
      parseOutputs={parseOutputs}
      renderForm={({ inputs, setInput }) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Campaign Goal *</label>
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
            <label className="text-xs text-white/50 font-medium">What are you promoting? *</label>
            <input className="input-field" placeholder="e.g. Summer sale — 40% off all products"
              value={inputs.offer || ''} onChange={e => setInput('offer', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Call to Action</label>
            <input className="input-field" placeholder="e.g. Shop Now, Claim Your Discount, Read More"
              value={inputs.cta || ''} onChange={e => setInput('cta', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Additional context (optional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="Deadline, urgency, specific segment..."
              value={inputs.extra || ''} onChange={e => setInput('extra', e.target.value)} />
          </div>
        </div>
      )}
      {...props}
    />
  )
}

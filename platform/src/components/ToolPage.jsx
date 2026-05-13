import { useState } from 'react'
import { Loader2, Copy, RefreshCw, Zap, CheckCircle2 } from 'lucide-react'
import AppLayout from './AppLayout.jsx'
import { generate } from '../lib/ai.js'
import { checkCredits, deductCredits, TOOL_COSTS } from '../lib/credits.js'
import { supabase } from '../lib/supabase.js'
import { Link } from 'react-router-dom'

function OutputBlock({ label, content }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-xs font-medium text-white/50">{label}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors">
          {copied ? <><CheckCircle2 size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <div className="px-4 py-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  )
}

export default function ToolPage({ toolKey, title, desc, icon: Icon, cost, session, profile, refreshProfile, renderForm, parseOutputs }) {
  const [loading, setLoading] = useState(false)
  const [outputs, setOutputs] = useState(null)
  const [error, setError] = useState('')
  const [inputs, setInputs] = useState({})

  function setInput(k, v) { setInputs(i => ({ ...i, [k]: v })) }

  async function handleGenerate() {
    setError('')
    setLoading(true)
    try {
      const check = await checkCredits(session.user.id, toolKey)
      if (!check.sufficient) {
        setError(`You need ${check.cost} credits but only have ${check.remaining}. Upgrade your plan to continue.`)
        setLoading(false)
        return
      }
      const result = await generate({ tool: toolKey, inputs, profile })
      const parsed = parseOutputs(result.output)
      setOutputs(parsed)

      await deductCredits(session.user.id, toolKey)
      await supabase.from('generations').insert({
        user_id: session.user.id,
        tool: toolKey,
        inputs,
        outputs: parsed,
        credits_used: TOOL_COSTS[toolKey] ?? 5,
      })
      refreshProfile()
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout profile={profile} refreshProfile={refreshProfile}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)' }}>
            <Icon size={22} className="text-accent-light" />
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-2xl text-white">{title}</h1>
            <p className="text-white/40 text-sm mt-1">{desc}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent-light">
            <Zap size={11} /> {cost} credits
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-white text-sm">Inputs</h2>
              {renderForm({ inputs, setInput })}
              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5 leading-relaxed">
                  {error}
                  {error.includes('Upgrade') && (
                    <Link to="/billing" className="block mt-1 text-accent-light hover:underline">Upgrade plan →</Link>
                  )}
                </div>
              )}
              <button onClick={handleGenerate} disabled={loading}
                className="btn-primary w-full justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {loading
                  ? <><Loader2 size={15} className="spin" /> Generating...</>
                  : <><Zap size={14} /> Generate</>}
              </button>
            </div>

            {/* Brand context preview */}
            {profile?.brand_name && (
              <div className="glass rounded-xl px-4 py-3.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {profile.brand_name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{profile.brand_name}</div>
                  <div className="text-[10px] text-white/30 capitalize">{profile.brand_tone} · {profile.brand_niche}</div>
                </div>
                <span className="ml-auto text-[10px] text-emerald-400 flex-shrink-0">✓ Brand loaded</span>
              </div>
            )}
          </div>

          {/* Output */}
          <div className="space-y-3">
            {outputs ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-white text-sm">Output</h2>
                  <button onClick={handleGenerate} disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
                {outputs.map((o, i) => <OutputBlock key={i} label={o.label} content={o.content} />)}
              </>
            ) : (
              <div className="glass rounded-2xl flex flex-col items-center justify-center py-20 text-center">
                {loading ? (
                  <div className="space-y-3">
                    <Loader2 size={28} className="text-accent-light spin mx-auto" />
                    <p className="text-sm text-white/40">Generating your content...</p>
                    <p className="text-xs text-white/20">Using your brand context</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Icon size={32} className="text-white/10 mx-auto" />
                    <p className="text-sm text-white/30">Fill in the form and hit Generate</p>
                    <p className="text-xs text-white/20">Your brand voice is applied automatically</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

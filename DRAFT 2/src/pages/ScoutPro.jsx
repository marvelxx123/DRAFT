import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { T, timeAgo } from '../lib/theme.js'

/* ── Radar Chart (pure SVG) ── */
function RadarChart({ cats, size = 220 }) {
  const KEYS = ['athleticism','shooting','ball_handling','court_vision','defense','physicality']
  const LBLS = ['Athletic','Shooting','Ball IQ','Vision','Defense','Physical']
  const vals = KEYS.map(k => Math.max((cats?.[k] || 0) / 10, 0.05))
  const N = 6, cx = size / 2, cy = size / 2, R = size * 0.35
  const pt = (i, r) => {
    const a = (i * 2 * Math.PI / N) - Math.PI / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const ring = (r) => KEYS.map((_, i) => { const [x, y] = pt(i, r); return `${i ? 'L' : 'M'}${x},${y}` }).join('') + 'Z'
  const data = vals.map((v, i) => { const [x, y] = pt(i, R * v); return `${i ? 'L' : 'M'}${x},${y}` }).join('') + 'Z'
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {[0.2, 0.4, 0.6, 0.8, 1].map(f => <path key={f} d={ring(R * f)} fill="none" stroke={T.border2} strokeWidth="1" />)}
      {KEYS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.border2} strokeWidth="1" /> })}
      <path d={data} fill={`${T.electric}18`} stroke={T.electric} strokeWidth="2" />
      {vals.map((v, i) => { const [x, y] = pt(i, R * v); return <circle key={i} cx={x} cy={y} r="4" fill={T.electric} /> })}
      {LBLS.map((l, i) => { const [x, y] = pt(i, R + 22); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={T.sub} fontSize="9" fontFamily="Inter,sans-serif">{l}</text> })}
    </svg>
  )
}

/* ── Single scanning frame tile ── */
function ScanFrame({ src, active }) {
  return (
    <div style={{ position: 'relative', flex: 1, aspectRatio: '9/16', overflow: 'hidden', borderRadius: 8, background: '#050505', border: `1px solid ${active ? T.electric : T.border}` }}>
      {src && <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt="" />}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${T.electric}0A 1px, transparent 1px), linear-gradient(90deg, ${T.electric}0A 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
      {active && <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.electric}, transparent)`, boxShadow: `0 0 8px ${T.electric}`, animation: 'scanSweep 1.6s ease-in-out infinite' }} />}
    </div>
  )
}

/* ── Frame extractor ── */
const captureFrames = (src) => new Promise(resolve => {
  const vid = document.createElement('video')
  vid.src = src; vid.muted = true
  const TIMES = [0.15, 0.35, 0.55, 0.75]
  const urls = []
  let i = 0
  const grab = () => {
    if (i >= TIMES.length) { resolve(urls); return }
    vid.addEventListener('seeked', () => {
      const c = document.createElement('canvas')
      c.width = 480; c.height = Math.max(1, Math.round(480 * ((vid.videoHeight || 270) / (vid.videoWidth || 480))))
      c.getContext('2d')?.drawImage(vid, 0, 0, c.width, c.height)
      urls.push(c.toDataURL('image/jpeg', 0.78))
      i++; grab()
    }, { once: true })
    vid.currentTime = vid.duration * TIMES[i]
  }
  vid.addEventListener('loadedmetadata', grab, { once: true })
  vid.addEventListener('error', () => resolve([]))
  vid.load()
})

const PHASES = ['Extracting frames…', 'Scanning frame 1…', 'Scanning frame 2…', 'Scanning frame 3…', 'Generating report…']

export default function ScoutPro({ session }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [playerName, setPN] = useState('')
  const [phase, setPhase] = useState(0)
  const [frames, setFrames] = useState([])
  const [report, setReport] = useState(null)
  const [reportPlayer, setRP] = useState('')
  const [analyses, setAnalyses] = useState([])
  const [checkoutLoading, setCO] = useState(false)
  const [activating, setActivating] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
    supabase.from('scout_analyses').select('*').eq('scout_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAnalyses(data || []))
    if (params.get('success') === 'true' && params.get('session_id')) {
      activateSubscription(params.get('session_id'))
    }
  }, [session])

  const activateSubscription = async (sessionId) => {
    setActivating(true)
    await supabase.functions.invoke('verify-payment', { body: { session_id: sessionId, user_id: session.user.id } })
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
    setActivating(false)
  }

  const handleCheckout = async () => {
    setCO(true)
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { user_id: session.user.id, return_url: window.location.origin + '/scout-pro' }
    })
    if (error || !data?.url) {
      setCO(false)
      alert('Stripe not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to Supabase edge function secrets.')
      return
    }
    window.location.href = data.url
  }

  const analyze = async () => {
    if (!file) return
    setView('scanning'); setPhase(0); setFrames([])

    const frameDataUrls = await captureFrames(preview)
    setFrames(frameDataUrls); setPhase(1)

    const storedUrls = []
    for (let fi = 0; fi < frameDataUrls.length; fi++) {
      setPhase(fi + 1)
      try {
        const blob = await fetch(frameDataUrls[fi]).then(r => r.blob())
        const path = `scout-frames/${session.user.id}/${Date.now()}_${fi}.jpg`
        const { error } = await supabase.storage.from('videos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)
          storedUrls.push(publicUrl)
        }
      } catch (e) { console.warn('Frame upload failed', e) }
    }
    setPhase(4)

    const ext = file.name.split('.').pop()
    const vidPath = `scout-videos/${session.user.id}/${Date.now()}.${ext}`
    await supabase.storage.from('videos').upload(vidPath, file, { cacheControl: '3600', upsert: false })
    const { data: { publicUrl: vidUrl } } = supabase.storage.from('videos').getPublicUrl(vidPath)

    const { data: result } = await supabase.functions.invoke('analyze-video', {
      body: { video_id: null, video_url: vidUrl, user_id: session.user.id, frame_urls: storedUrls }
    })

    if (result?.report) {
      const rep = result.report
      const name = playerName.trim() || 'Unknown Player'
      const firstFrame = storedUrls[0] || null
      await supabase.from('scout_analyses').insert({
        scout_id: session.user.id,
        player_name: name,
        video_url: vidUrl,
        frame_urls: storedUrls,
        report: rep,
        overall_score: rep.overall_score,
      })
      const newEntry = { player_name: name, overall_score: rep.overall_score, created_at: new Date().toISOString(), report: rep, frame_urls: storedUrls }
      setAnalyses(prev => [newEntry, ...prev])
      setReport(rep); setRP(name); setView('report')
    } else {
      alert('Analysis failed — check edge function logs'); setView('upload')
    }
  }

  const isPro = profile?.scout_pro || profile?.role === 'scout' || profile?.role === 'coach'

  if (!session) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 28, background: T.bg }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Sign in to access Scout Pro</div>
      <button onClick={() => navigate('/login')} style={{ background: T.electric, color: '#000', border: 'none', borderRadius: 12, padding: '13px 28px', fontWeight: 800, fontSize: 15 }}>Sign In</button>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: T.bg }}>
      <style>{`
        @keyframes scanSweep{0%{top:0%}100%{top:100%}}
        @media print{nav,#bottom-nav,[data-no-print]{display:none!important;}#print-report{padding:24px;}}
      `}</style>

      {/* Header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 4, color: T.electric, lineHeight: 1 }}>SCOUT PRO</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, letterSpacing: 3, textTransform: 'uppercase' }}>AI-Powered Analysis</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPro && <div style={{ background: `${T.gold}18`, border: `1px solid ${T.gold}55`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: T.gold }}>PRO</div>}
          {view !== 'upload' && <button onClick={() => { setView('upload'); setFile(null); setPreview(null); setReport(null); setPN('') }} data-no-print style={{ background: T.card2, border: `1px solid ${T.border2}`, borderRadius: 8, padding: '6px 12px', color: T.text2, fontSize: 12, fontWeight: 700 }}>← Back</button>}
        </div>
      </div>

      {activating && (
        <div style={{ padding: '12px 18px', background: `${T.electric}10`, borderBottom: `1px solid ${T.electric}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.electric}`, borderTopColor: 'transparent' }} />
          <span style={{ fontSize: 13, color: T.electric, fontWeight: 700 }}>Activating Scout Pro…</span>
        </div>
      )}

      {/* ── UPGRADE WALL ── */}
      {!isPro && (
        <div style={{ padding: '24px 18px' }}>
          <div style={{ background: T.card, borderRadius: 20, border: `1px solid ${T.border2}`, overflow: 'hidden' }}>
            <div style={{ padding: '28px 22px', background: `linear-gradient(135deg, ${T.electric}09, transparent)` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.electric, letterSpacing: 3, marginBottom: 8 }}>UNLOCK SCOUT PRO</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>AI Scouting Reports</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 34, fontWeight: 700, color: T.electric, marginBottom: 4 }}>$29<span style={{ fontSize: 14, color: T.sub }}>/mo</span></div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 22 }}>Cancel anytime · Unlimited analyses</div>
              {[
                ['🤖', 'Claude AI watches your footage'],
                ['📊', 'Radar chart + 6-category breakdown'],
                ['📄', 'Downloadable PDF reports'],
                ['🏆', 'NBA-style player intelligence table'],
                ['🎬', 'Unlimited video analyses'],
              ].map(([ic, txt], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{ic}</span>
                  <span style={{ fontSize: 14, color: T.text2 }}>{txt}</span>
                </div>
              ))}
              <button onClick={handleCheckout} disabled={checkoutLoading}
                style={{ width: '100%', padding: '16px', background: T.electric, color: '#000', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16, fontFamily: "'Space Grotesk',sans-serif", marginTop: 10, opacity: checkoutLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {checkoutLoading
                  ? <><div className="spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #000', borderTopColor: 'transparent' }} /> Loading…</>
                  : 'Upgrade to Scout Pro →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD ── */}
      {isPro && view === 'upload' && (
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input value={playerName} onChange={e => setPN(e.target.value)}
            placeholder="Player name (optional)"
            style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 12, padding: '14px 16px', color: T.text, fontSize: 15, outline: 'none', width: '100%' }} />

          <div onClick={() => fileRef.current.click()}
            style={{ border: `1.5px dashed ${file ? T.electric : T.border3}`, borderRadius: 16, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: file ? `${T.electric}06` : 'transparent', transition: 'all .2s' }}>
            {file ? (
              <video src={preview} muted playsInline controls style={{ width: '100%', borderRadius: 10, maxHeight: 200, background: '#000' }} />
            ) : (
              <>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Drop player footage here</div>
                <div style={{ fontSize: 13, color: T.sub }}>MP4, MOV · any basketball clip</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)) } }} style={{ display: 'none' }} />

          {file && (
            <button onClick={analyze}
              style={{ padding: '16px', background: T.electric, color: '#000', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16, fontFamily: "'Space Grotesk',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              🤖 Analyze with Claude AI
            </button>
          )}
        </div>
      )}

      {/* ── SCANNING ── */}
      {isPro && view === 'scanning' && (
        <div style={{ padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 6, color: T.electric, animation: 'pulse 1s ease infinite' }}>ANALYZING</div>

          <div style={{ display: 'flex', gap: 4, width: '100%', height: 110 }}>
            {[0, 1, 2, 3].map(i => <ScanFrame key={i} src={frames[i] || null} active={phase === i + 1} />)}
          </div>

          <div style={{ width: '100%', background: T.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.electric, letterSpacing: 3, marginBottom: 8 }}>{PHASES[phase] || 'Processing…'}</div>
            <div style={{ height: 3, background: T.border2, borderRadius: 2 }}>
              <div style={{ height: '100%', background: T.electric, borderRadius: 2, width: `${(phase / 4) * 100}%`, transition: 'width .7s ease' }} />
            </div>
          </div>

          {['MOTION TRACKING', 'FORM ANALYSIS', 'COURT AWARENESS', 'PERFORMANCE SCORE'].map((l, i) => (
            <div key={i} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: T.sub, letterSpacing: 2 }}>{l}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: phase > i ? T.electric : T.border3 }}>{phase > i ? '✓ DONE' : '···'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORT ── */}
      {isPro && view === 'report' && report && (
        <div id="print-report" style={{ padding: '18px' }}>

          {/* Score + player header */}
          <div style={{ background: T.card, borderRadius: 16, padding: '18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 70, height: 70, borderRadius: 16, background: `${T.gold}15`, border: `2px solid ${T.gold}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 26, fontWeight: 700, color: T.gold }}>{report.overall_score}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700 }}>{reportPlayer}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, letterSpacing: 2, marginTop: 2 }}>AI DRAFT SCORE</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>Powered by Claude AI · claude-opus-4-7</div>
            </div>
            <button data-no-print onClick={() => window.print()}
              style={{ background: T.card2, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '8px 14px', color: T.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              📄 PDF
            </button>
          </div>

          {/* Radar + category bars */}
          <div style={{ background: T.card, borderRadius: 16, padding: '18px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.sub, letterSpacing: 3, marginBottom: 14 }}>SKILL BREAKDOWN</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <RadarChart cats={report.categories} size={180} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {Object.entries(report.categories || {}).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: T.sub, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.text2 }}>{v}/10</span>
                    </div>
                    <div style={{ height: 3, background: T.border2, borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${v * 10}%`, background: v >= 8 ? T.electric : v >= 6 ? T.gold : T.sub, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Written report */}
          {report.scouting_report && (
            <div style={{ background: T.card, borderRadius: 14, padding: '16px', marginBottom: 14, borderLeft: `3px solid ${T.electric}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.electric, letterSpacing: 2, marginBottom: 8 }}>SCOUTING REPORT</div>
              <p style={{ fontSize: 14, color: T.text2, lineHeight: 1.75, fontStyle: 'italic' }}>{report.scouting_report}</p>
            </div>
          )}

          {/* Strengths + Work on */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {report.strengths?.length > 0 && (
              <div style={{ background: T.card, borderRadius: 14, padding: '14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.lime, letterSpacing: 2, marginBottom: 8 }}>STRENGTHS</div>
                {report.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: T.text2, marginBottom: 5 }}>✓ {s}</div>)}
              </div>
            )}
            {report.areas_to_improve?.length > 0 && (
              <div style={{ background: T.card, borderRadius: 14, padding: '14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.sub, letterSpacing: 2, marginBottom: 8 }}>WORK ON</div>
                {report.areas_to_improve.map((a, i) => <div key={i} style={{ fontSize: 12, color: T.sub, marginBottom: 5 }}>→ {a}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TABLE ── */}
      {isPro && analyses.length > 0 && view !== 'scanning' && (
        <div style={{ padding: '0 18px 80px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, paddingTop: view === 'upload' ? 8 : 0 }}>
            {view === 'upload' ? 'Recent Analyses' : ''}
          </div>
          {view === 'report' && <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>All Analyses</div>}

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 52px 70px', gap: 8, padding: '8px 14px', background: T.card2, borderRadius: '12px 12px 0 0', border: `1px solid ${T.border}`, borderBottom: 'none' }}>
            {['', 'PLAYER', 'SCORE', 'DATE'].map(h => <span key={h} style={{ fontSize: 9, fontWeight: 800, color: T.sub, letterSpacing: 2 }}>{h}</span>)}
          </div>

          {analyses.map((a, i) => (
            <div key={i} onClick={() => { setReport(a.report); setRP(a.player_name); setView('report') }}
              style={{ display: 'grid', gridTemplateColumns: '40px 1fr 52px 70px', gap: 8, padding: '11px 14px', background: T.card, border: `1px solid ${T.border}`, borderTop: 'none', borderRadius: i === analyses.length - 1 ? '0 0 12px 12px' : 0, cursor: 'pointer', alignItems: 'center' }}>
              {/* Mini thumbnail */}
              <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: T.card2, flexShrink: 0 }}>
                {a.frame_urls?.[0] && <img src={a.frame_urls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.player_name}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700, color: a.overall_score >= 80 ? T.electric : a.overall_score >= 70 ? T.gold : T.sub }}>{a.overall_score}</span>
              <span style={{ fontSize: 11, color: T.sub }}>{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {isPro && analyses.length === 0 && view === 'upload' && (
        <div style={{ padding: '20px 18px 80px', textAlign: 'center', color: T.sub }}>
          <p style={{ fontSize: 13 }}>No analyses yet — upload your first clip above</p>
        </div>
      )}
    </div>
  )
}

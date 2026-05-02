import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVideo } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', border2:'#383838', accent:'#C8FF00', muted:'#888', sub:'#555', pink:'#FF2D78', surface:'#0D0D0D' }
const CATS = ['GAME','TRAINING','HIGHLIGHT','DEFENSE','TOURNAMENT','CAMP']
const CAT_COLORS = { GAME:C.accent, HIGHLIGHT:C.pink, DEFENSE:'#00C2FF', TRAINING:'#00E676', TOURNAMENT:'#9B5CFF', CAMP:'#FF6B00' }

export default function Upload({ session }) {
  const [step, setStep]      = useState(1)
  const [file, setFile]      = useState(null)
  const [preview, setPreview]= useState(null)
  const [form, setForm]      = useState({ title:'', category:'', description:'' })
  const [progress, setProg]  = useState(0)
  const [uploading, setUpl]  = useState(false)
  const [error, setErr]      = useState('')
  const [done, setDone]      = useState(false)
  const fileRef              = useRef()
  const navigate             = useNavigate()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const pickFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('video/')) { setErr('Please select a video file'); return }
    if (f.size > 500 * 1024 * 1024) { setErr('File too large — max 500MB'); return }
    setErr('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep(2)
  }

  const submit = async () => {
    if (!form.title.trim()) { setErr('Add a title'); return }
    if (!form.category) { setErr('Select a category'); return }
    setUpl(true); setErr(''); setStep(3)

    const interval = setInterval(() => setProg(p => p < 88 ? p+2 : p), 200)

    try {
      await uploadVideo(session.user.id, file, {
        title:    form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
      })
      clearInterval(interval)
      setProg(100)
      setDone(true)
      setTimeout(() => navigate('/'), 1200)
    } catch(e) {
      clearInterval(interval)
      setErr(e.message || 'Upload failed — try again')
      setUpl(false)
      setStep(2)
    }
  }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 16px', color:'#fff', fontSize:15, outline:'none', width:'100%', WebkitAppearance:'none' }
  const focus = e => e.target.style.borderColor = C.accent
  const blur  = e => e.target.style.borderColor = C.border

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'24px 18px 32px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, letterSpacing:-.5, marginBottom:20 }}>Upload Film</div>

      {/* Progress bar */}
      <div style={{ display:'flex', gap:5, marginBottom:28 }}>
        {[1,2,3].map(n=><div key={n} style={{ flex:1, height:3, borderRadius:2, background:step>=n?C.accent:'#1E1E1E', transition:'background .3s' }}/>)}
      </div>

      {/* ── Step 1: Pick file ── */}
      {step===1 && (
        <div>
          <div onClick={() => fileRef.current.click()}
            style={{ border:`2px dashed ${C.border2}`, borderRadius:16, padding:'48px 20px', textAlign:'center', cursor:'pointer', transition:'all .2s', marginBottom:20 }}
            onTouchStart={e=>e.currentTarget.style.borderColor=C.accent}
            onTouchEnd={e=>e.currentTarget.style.borderColor=C.border2}>
            <div style={{ fontSize:52, marginBottom:14 }}>🎬</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Tap to choose video</div>
            <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>MP4, MOV, AVI  ·  up to 500MB</p>
            <button style={{ background:C.accent, color:'#000', border:'none', borderRadius:10, padding:'12px 28px', fontWeight:800, fontSize:14, pointerEvents:'none' }}>
              Choose Video
            </button>
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={pickFile} style={{ display:'none' }} capture="environment"/>
          {error && <p style={{ color:C.pink, fontSize:13, fontWeight:600, textAlign:'center', marginTop:10 }}>{error}</p>}

          {/* Tip */}
          <div style={{ background:C.card, borderRadius:12, padding:'14px 16px', border:`1px solid ${C.border}` }}>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
              💡 <strong style={{ color:'#fff' }}>Tip:</strong> Upload game film, training clips, or highlights. Scouts discover players based on real performance video.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step===2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Video preview */}
          {preview && (
            <video src={preview} muted playsInline controls
              style={{ width:'100%', borderRadius:12, maxHeight:220, background:'#111', objectFit:'cover' }}/>
          )}

          {/* File info */}
          <div style={{ background:C.card, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#ccc', marginBottom:2 }}>{file?.name}</p>
              <p style={{ fontSize:11, color:C.muted }}>{file ? (file.size/1024/1024).toFixed(1)+'MB' : ''}</p>
            </div>
            <button onClick={() => { setFile(null); setPreview(null); setStep(1) }}
              style={{ background:'#1E1E1E', border:'none', borderRadius:8, padding:'6px 12px', color:C.muted, fontSize:12, fontWeight:700 }}>
              Change
            </button>
          </div>

          {/* Title */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Title *</label>
            <input value={form.title} onChange={e=>set('title',e.target.value)}
              placeholder="e.g. Full game vs Riverside HS — 24pts" style={inp} onFocus={focus} onBlur={blur}/>
          </div>

          {/* Category */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Category *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {CATS.map(c => {
                const on = form.category === c
                return (
                  <button key={c} onClick={() => set('category',c)}
                    style={{ padding:'8px 16px', borderRadius:20, border:`1.5px solid ${on?'transparent':C.border}`, background:on?(CAT_COLORS[c]||C.accent):'transparent', color:on?'#000':C.muted, fontSize:13, fontWeight:800, transition:'all .18s' }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Description (optional)</label>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}
              placeholder="Describe the clip — what play, what situation, what to watch for…"
              style={{ ...inp, resize:'none', lineHeight:1.5 }} onFocus={focus} onBlur={blur}/>
          </div>

          {error && <p style={{ color:C.pink, fontSize:13, fontWeight:600, textAlign:'center' }}>{error}</p>}

          <button onClick={submit}
            style={{ background:(!form.title||!form.category)?C.card:C.accent, color:(!form.title||!form.category)?C.sub:'#000', border:'none', borderRadius:12, padding:'16px', fontWeight:800, fontSize:15, opacity:(!form.title||!form.category)?.5:1, transition:'all .18s', marginTop:4 }}>
            Upload to DRAFT 🏀
          </button>
        </div>
      )}

      {/* ── Step 3: Uploading ── */}
      {step===3 && (
        <div style={{ textAlign:'center', paddingTop:52 }}>
          <div style={{ fontSize:56, marginBottom:20 }}>{done?'✅':'⬆️'}</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, marginBottom:12 }}>
            {done ? 'Posted!' : 'Uploading…'}
          </div>
          <p style={{ fontSize:14, color:C.muted, marginBottom:28, lineHeight:1.6 }}>
            {done ? 'Your video is now live on DRAFT. Scouts can see it!' : 'Saving your video…'}
          </p>
          <div style={{ height:6, background:C.card, borderRadius:3, overflow:'hidden', marginBottom:8, maxWidth:300, margin:'0 auto 8px' }}>
            <div style={{ height:'100%', background:done?C.accent:C.accent, borderRadius:3, width:`${progress}%`, transition:'width .3s' }}/>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:C.muted, marginBottom:28 }}>{progress}%</div>
          {done && (
            <button onClick={() => navigate('/')}
              style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'14px 30px', fontWeight:800, fontSize:15 }}>
              View in Feed →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

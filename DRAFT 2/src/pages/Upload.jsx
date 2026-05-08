import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVideo, analyzeVideo } from '../lib/supabase.js'
import { T, CAT } from '../lib/theme.js'

const CATS = ['GAME','TRAINING','HIGHLIGHT','DEFENSE','TOURNAMENT','CAMP']

export default function Upload({ session }) {
  const [step, setStep]      = useState(1)
  const [file, setFile]      = useState(null)
  const [preview, setPreview]= useState(null)
  const [form, setForm]      = useState({ title:'', category:'', description:'' })
  const [progress, setProg]  = useState(0)
  const [done, setDone]      = useState(false)
  const [error, setErr]      = useState('')
  const fileRef              = useRef()
  const navigate             = useNavigate()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const pickFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('video/')) { setErr('Please select a video file'); return }
    if (f.size > 500 * 1024 * 1024) { setErr('Max file size is 500MB'); return }
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f)); setStep(2)
  }

  const submit = async () => {
    if (!form.title.trim()) { setErr('Add a title'); return }
    if (!form.category) { setErr('Select a category'); return }
    setStep(3)
    const interval = setInterval(() => setProg(p => p < 88 ? p+2 : p), 200)
    try {
      const video = await uploadVideo(session.user.id, file, { title:form.title.trim(), category:form.category, description:form.description||null })
      clearInterval(interval); setProg(100); setDone(true)
      // Fire-and-forget — AI analysis runs in background, no need to wait
      analyzeVideo(video.id, video.video_url, session.user.id).catch(() => {})
      setTimeout(() => navigate('/profile'), 1800)
    } catch(e) {
      clearInterval(interval); setErr(e.message); setStep(2)
    }
  }

  const inp = { width:'100%', background:'transparent', border:`1px solid ${T.border3}`, borderRadius:12, padding:'14px 16px', color:T.text, fontSize:15, outline:'none', transition:'border-color .2s' }
  const focus = e => e.target.style.borderColor = T.electric
  const blur  = e => e.target.style.borderColor = T.border3

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'24px 20px 32px', background:T.bg }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, letterSpacing:-.5, marginBottom:20 }}>Upload Film</div>

      {/* Steps */}
      <div style={{ display:'flex', gap:5, marginBottom:28 }}>
        {[1,2,3].map(n=><div key={n} style={{ flex:1, height:2, borderRadius:1, background:step>=n?T.electric:T.border2, transition:'background .3s' }}/>)}
      </div>

      {/* Step 1 — Pick file */}
      {step===1 && (
        <div>
          <div onClick={()=>fileRef.current.click()}
            style={{ border:`1.5px dashed ${T.border3}`, borderRadius:16, padding:'48px 20px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
            onTouchStart={e=>{e.currentTarget.style.borderColor=T.electric;e.currentTarget.style.background=`${T.electric}06`}}
            onTouchEnd={e=>{e.currentTarget.style.borderColor=T.border3;e.currentTarget.style.background='transparent'}}>
            <div style={{ fontSize:48, marginBottom:14 }}>🎬</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Tap to choose video</div>
            <p style={{ fontSize:14, color:T.sub, marginBottom:20 }}>MP4, MOV · up to 500MB</p>
            <div style={{ display:'inline-block', padding:'11px 26px', background:T.white, color:'#000', borderRadius:10, fontWeight:800, fontSize:14, fontFamily:"'Space Grotesk',sans-serif" }}>Choose Video</div>
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={pickFile} style={{ display:'none' }}/>
          {error && <p style={{ color:T.crimson, fontSize:13, textAlign:'center', marginTop:12, fontWeight:600 }}>{error}</p>}

          <div style={{ background:T.card, borderRadius:12, padding:'14px 16px', border:`1px solid ${T.border}`, marginTop:20 }}>
            <p style={{ fontSize:13, color:T.sub, lineHeight:1.65 }}>
              💡 <strong style={{ color:T.text }}>Pro tip:</strong> Upload MP4 for best compatibility. Game film, training clips, and highlights all work great.
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — Details */}
      {step===2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {preview && <video src={preview} muted playsInline controls style={{ width:'100%', borderRadius:12, maxHeight:220, background:'#111', objectFit:'cover' }}/>}

          <div style={{ background:T.card, borderRadius:10, padding:'12px 14px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color:T.text2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{file?.name}</p>
              <p style={{ fontSize:11, color:T.sub, marginTop:2 }}>{file ? (file.size/1024/1024).toFixed(1)+'MB' : ''}</p>
            </div>
            <button onClick={()=>{setFile(null);setPreview(null);setStep(1)}} style={{ background:T.card2, border:'none', borderRadius:8, padding:'6px 12px', color:T.sub, fontSize:12, fontWeight:700 }}>Change</button>
          </div>

          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>Title *</label>
            <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Full game vs Riverside — 24pts 8ast" style={inp} onFocus={focus} onBlur={blur}/>
          </div>

          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Category *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {CATS.map(c=>{
                const on = form.category===c
                return (
                  <button key={c} onClick={()=>set('category',c)}
                    style={{ padding:'8px 16px', borderRadius:20, border:`1px solid ${on?'transparent':T.border3}`, background:on?(CAT[c]||T.electric):'transparent', color:on?'#000':T.sub, fontSize:13, fontWeight:800, transition:'all .18s', fontFamily:"'Space Grotesk',sans-serif" }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>Description</label>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}
              placeholder="Describe the clip…"
              style={{ ...inp, resize:'none', lineHeight:1.55 }} onFocus={focus} onBlur={blur}/>
          </div>

          {error && <p style={{ color:T.crimson, fontSize:13, fontWeight:600, textAlign:'center' }}>{error}</p>}

          <button onClick={submit}
            style={{ padding:'16px', background:(!form.title||!form.category)?T.card:T.white, color:(!form.title||!form.category)?T.sub:'#000', border:'none', borderRadius:14, fontWeight:800, fontSize:15, fontFamily:"'Space Grotesk',sans-serif", opacity:(!form.title||!form.category)?0.5:1, transition:'all .18s', marginTop:4 }}>
            Upload to DRAFT
          </button>
        </div>
      )}

      {/* Step 3 — Progress */}
      {step===3 && (
        <div style={{ textAlign:'center', paddingTop:52 }}>
          <div style={{ fontSize:52, marginBottom:20 }}>{done ? '🏀' : '⬆️'}</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:700, marginBottom:12 }}>
            {done ? 'Film is live!' : 'Uploading…'}
          </div>
          <p style={{ fontSize:14, color:T.sub, marginBottom:28, lineHeight:1.65 }}>
            {done
              ? <>🤖 <strong style={{ color:T.electric }}>AI Scout is analyzing your film…</strong><br/>Check your profile in ~1 min for your score."
              : 'Saving your video…'}
          </p>
          <div style={{ height:4, background:T.card2, borderRadius:2, overflow:'hidden', marginBottom:8 }}>
            <div style={{ height:'100%', background:`linear-gradient(90deg, ${T.electric}, ${T.lime})`, borderRadius:2, width:`${progress}%`, transition:'width .3s' }}/>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:T.sub }}>{progress}%</div>
        </div>
      )}
    </div>
  )
}

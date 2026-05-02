import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVideo } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', border2:'#383838', accent:'#C8FF00', muted:'#888', sub:'#555' }
const CATS = ['GAME','TRAINING','HIGHLIGHT','DEFENSE','TOURNAMENT','CAMP']
const CAT_COLORS = { GAME:C.accent, HIGHLIGHT:'#FF2D78', DEFENSE:'#00C2FF', TRAINING:'#00E676', TOURNAMENT:'#9B5CFF', CAMP:'#FF6B00' }

export default function Upload({ session }) {
  const [step, setStep]     = useState(1)
  const [file, setFile]     = useState(null)
  const [preview, setPreview]= useState(null)
  const [form, setForm]     = useState({ title:'', category:'', description:'' })
  const [progress, setProg] = useState(0)
  const [uploading, setUpl] = useState(false)
  const [error, setErr]     = useState('')
  const fileRef             = useRef()
  const navigate            = useNavigate()
  const set = (k,v)=>setForm(f=>({...f,[k]:v}))

  const pickFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 500 * 1024 * 1024) { setErr('File too large — max 500MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep(2)
  }

  const submit = async () => {
    if (!form.title || !form.category) { setErr('Add a title and category'); return }
    setUpl(true); setErr(''); setStep(3)

    // Fake progress while uploading
    const interval = setInterval(()=>setProg(p=>p<90?p+3:p), 300)

    try {
      await uploadVideo(session.user.id, file, {
        title: form.title,
        category: form.category,
        description: form.description || null,
      })
      clearInterval(interval)
      setProg(100)
      setTimeout(()=>navigate('/'), 800)
    } catch(e) {
      clearInterval(interval)
      setErr(e.message)
      setUpl(false)
      setStep(2)
    }
  }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:15, outline:'none', width:'100%' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 18px 20px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, letterSpacing:-.5, marginBottom:20 }}>Upload Film</div>

      {/* Progress bar */}
      <div style={{ display:'flex', gap:5, marginBottom:26 }}>
        {[1,2,3].map(n=><div key={n} style={{ flex:1, height:3, borderRadius:2, background:step>=n?C.accent:'#1E1E1E', transition:'background .3s' }}/>)}
      </div>

      {/* Step 1 — pick file */}
      {step===1 && (
        <div>
          <div onClick={()=>fileRef.current.click()}
            style={{ border:`2px dashed ${C.border2}`, borderRadius:16, padding:'48px 20px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.card}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.background='transparent'}}>
            <div style={{ fontSize:48, marginBottom:14 }}>🎬</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Drop your video here</div>
            <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>MP4, MOV, AVI  ·  up to 500MB</p>
            <button style={{ background:C.accent, color:'#000', border:'none', borderRadius:10, padding:'12px 28px', fontWeight:800, fontSize:14 }}>
              Choose Video
            </button>
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={pickFile} style={{ display:'none' }}/>
          {error && <p style={{ color:'#FF2D78', fontSize:13, marginTop:12, fontWeight:600 }}>{error}</p>}
        </div>
      )}

      {/* Step 2 — details */}
      {step===2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Video preview */}
          {preview && (
            <video src={preview} muted playsInline controls
              style={{ width:'100%', borderRadius:12, maxHeight:200, background:'#111', objectFit:'cover' }}/>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:12, background:C.card, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}` }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#ccc' }}>{file?.name}</p>
              <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{file ? (file.size/1024/1024).toFixed(1)+'MB' : ''}</p>
            </div>
            <button onClick={()=>{setFile(null);setPreview(null);setStep(1)}} style={{ background:'#1E1E1E', border:'none', borderRadius:8, padding:'6px 12px', color:C.muted, fontSize:12, fontWeight:700 }}>Change</button>
          </div>

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Title *</label>
            <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Full game vs Memphis — 28pts 8ast" style={inp}
              onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Category *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>set('category',c)}
                  style={{ padding:'7px 16px', borderRadius:20, border:`1.5px solid ${form.category===c?'transparent':C.border}`, background:form.category===c?CAT_COLORS[c]:'transparent', color:form.category===c?'#000':C.muted, fontSize:13, fontWeight:700, transition:'all .18s' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Description</label>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the clip…" rows={3}
              style={{ ...inp, resize:'none' }}
              onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {error && <p style={{ color:'#FF2D78', fontSize:13, fontWeight:600 }}>{error}</p>}

          <button onClick={submit} disabled={!form.title||!form.category}
            style={{ background:(!form.title||!form.category)?C.card:C.accent, color:(!form.title||!form.category)?C.sub:'#000', border:'none', borderRadius:12, padding:'15px', fontWeight:800, fontSize:15, opacity:(!form.title||!form.category)?.5:1, transition:'all .18s' }}>
            Upload to DRAFT
          </button>
        </div>
      )}

      {/* Step 3 — uploading */}
      {step===3 && (
        <div style={{ textAlign:'center', paddingTop:48 }}>
          <div style={{ fontSize:52, marginBottom:20 }}>{progress<100?'⬆️':'✅'}</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, marginBottom:12 }}>
            {progress<100?'Uploading…':'Done!'}
          </div>
          <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>
            {progress<100?'Saving your video to DRAFT':'Redirecting to feed…'}
          </p>
          <div style={{ height:5, background:C.card, borderRadius:3, overflow:'hidden', marginBottom:8 }}>
            <div style={{ height:'100%', background:C.accent, borderRadius:3, width:`${progress}%`, transition:'width .3s' }}/>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, color:C.muted }}>{progress}%</div>
        </div>
      )}
    </div>
  )
}

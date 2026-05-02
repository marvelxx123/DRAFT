import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, updateProfile } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', accent:'#C8FF00', muted:'#888' }
const POSITIONS = ['PG','SG','SF','PF','C']

export default function Register() {
  const [step, setStep]   = useState(1)
  const [loading, setLoad]= useState(false)
  const [err, setErr]     = useState('')
  const navigate          = useNavigate()
  const [form, setForm]   = useState({
    email:'', password:'', fullName:'', role:'player',
    position:'', school:'', year:'', height:'', bio:''
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    setLoad(true); setErr('')
    try {
      const { data, error } = await signUp(form.email, form.password, form.fullName)
      if (error) throw error
      // Profile is auto-created via trigger; update extra fields
      if (data.user) {
        await updateProfile(data.user.id, {
          full_name: form.fullName,
          username: form.email.split('@')[0],
          role: form.role,
          position: form.position || null,
          school: form.school || null,
          year: form.year || null,
          height: form.height || null,
          bio: form.bio || null,
        })
      }
      navigate('/')
    } catch(e) {
      setErr(e.message)
    }
    setLoad(false)
  }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:15, outline:'none', width:'100%' }

  return (
    <div style={{ height:'100%', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-1, marginBottom:8 }}>DRAFT</div>
      <p style={{ color:C.muted, fontSize:14, marginBottom:28 }}>Create your free account</p>

      {/* Progress */}
      <div style={{ display:'flex', gap:6, width:'100%', maxWidth:380, marginBottom:28 }}>
        {[1,2].map(n=><div key={n} style={{ flex:1, height:3, borderRadius:2, background:step>=n?C.accent:'#1E1E1E', transition:'background .3s' }}/>)}
      </div>

      <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:14 }}>
        {step===1 && <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
            {['player','scout'].map(r=>(
              <button key={r} onClick={()=>set('role',r)}
                style={{ padding:'12px 0', borderRadius:12, border:`1.5px solid ${form.role===r?C.accent:'#2A2A2A'}`, background:form.role===r?C.accent:'transparent', color:form.role===r?'#000':'#888', fontWeight:800, fontSize:14, textTransform:'capitalize' }}>
                {r==='player'?'🏀 Player':'🎯 Scout / Coach'}
              </button>
            ))}
          </div>
          <input placeholder="Full Name" value={form.fullName} onChange={e=>set('fullName',e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <input type="email" placeholder="Email" value={form.email} onChange={e=>set('email',e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={e=>set('password',e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <button onClick={()=>setStep(2)} disabled={!form.fullName||!form.email||!form.password}
            style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'14px', fontWeight:800, fontSize:15, opacity:(!form.fullName||!form.email||!form.password)?.4:1 }}>
            Continue →
          </button>
        </>}

        {step===2 && <>
          {form.role==='player' && <>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#555', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Position</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {POSITIONS.map(p=>(
                  <button key={p} onClick={()=>set('position',p)}
                    style={{ padding:'7px 16px', borderRadius:20, border:`1.5px solid ${form.position===p?C.accent:'#2A2A2A'}`, background:form.position===p?C.accent:'transparent', color:form.position===p?'#000':'#888', fontSize:14, fontWeight:700 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <input placeholder="Height (e.g. 6'2)" value={form.height} onChange={e=>set('height',e.target.value)} style={inp}
              onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          </>}
          <input placeholder={form.role==='player'?'School or Team':'Organization'} value={form.school} onChange={e=>set('school',e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <input placeholder="Year (e.g. Junior, Senior (HS))" value={form.year} onChange={e=>set('year',e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <textarea placeholder="Short bio…" value={form.bio} onChange={e=>set('bio',e.target.value)} rows={3}
            style={{ ...inp, resize:'none' }}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          {err && <p style={{ color:'#FF2D78', fontSize:13, fontWeight:600 }}>{err}</p>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1, background:'transparent', border:'1.5px solid #2A2A2A', borderRadius:12, padding:'14px', fontWeight:700, fontSize:14, color:'#888' }}>← Back</button>
            <button onClick={submit} disabled={loading}
              style={{ flex:2, background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'14px', fontWeight:800, fontSize:15, opacity:loading?.6:1 }}>
              {loading?'Creating…':'Create Profile'}
            </button>
          </div>
        </>}
      </div>

      <p style={{ color:C.muted, fontSize:14, marginTop:24 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color:C.accent, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
      </p>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, updateProfile } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', accent:'#C8FF00', muted:'#888', sub:'#555', pink:'#FF2D78' }
const POSITIONS = ['PG','SG','SF','PF','C']

export default function Register() {
  const [step, setStep]    = useState(1)
  const [loading, setLoad] = useState(false)
  const [err, setErr]      = useState('')
  const navigate           = useNavigate()
  const [form, setForm]    = useState({ email:'', password:'', fullName:'', role:'player', position:'', school:'', year:'', height:'', bio:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const goStep2 = () => {
    if (!form.fullName.trim()) { setErr('Enter your full name'); return }
    if (!form.email.trim() || !form.email.includes('@') || !form.email.includes('.')) { setErr('Enter a valid email address'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setErr(''); setStep(2)
  }

  const submit = async () => {
    setLoad(true); setErr('')
    try {
      const { data, error } = await signUp(form.email.trim().toLowerCase(), form.password, form.fullName.trim())
      if (error) throw error
      if (data.user) {
        await updateProfile(data.user.id, {
          full_name: form.fullName.trim(),
          username:  form.email.split('@')[0].toLowerCase(),
          role:      form.role,
          position:  form.position || null,
          school:    form.school   || null,
          year:      form.year     || null,
          height:    form.height   || null,
          bio:       form.bio      || null,
        })
      }
      setStep(3)
    } catch(e) { setErr(e.message) }
    setLoad(false)
  }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 16px', color:'#fff', fontSize:16, outline:'none', width:'100%', WebkitAppearance:'none' }
  const focus = e => e.target.style.borderColor = C.accent
  const blur  = e => e.target.style.borderColor = C.border

  return (
    <div style={{ minHeight:'100%', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', padding:'44px 22px 44px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:38, fontWeight:700, letterSpacing:-1.5, marginBottom:6 }}>DRAFT</div>
      <p style={{ color:C.muted, fontSize:15, marginBottom:28 }}>
        {step===1?'Create your free account':step===2?'Tell us about yourself':''}
      </p>

      {/* Progress */}
      <div style={{ display:'flex', gap:6, marginBottom:32 }}>
        {[1,2].map(n=><div key={n} style={{ width:step>=n?24:8, height:8, borderRadius:4, background:step>=n?C.accent:C.border, transition:'all .3s' }}/>)}
      </div>

      <div style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:16 }}>

        {step===1 && <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['player','🏀','Player'],['scout','🎯','Scout / Coach']].map(([r,ic,lbl])=>(
              <button key={r} onClick={()=>set('role',r)}
                style={{ padding:'14px 0', borderRadius:12, border:`2px solid ${form.role===r?C.accent:C.border}`, background:form.role===r?`${C.accent}18`:'transparent', color:form.role===r?C.accent:'#888', fontWeight:800, fontSize:14, display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .18s' }}>
                <span style={{ fontSize:22 }}>{ic}</span>{lbl}
              </button>
            ))}
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Full Name</label>
            <input value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Your full name" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Email</label>
            <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@gmail.com" style={inp} onFocus={focus} onBlur={blur} autoCapitalize="none" autoCorrect="off" inputMode="email"/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Password</label>
            <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min. 6 characters" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          {err && <p style={{ color:C.pink, fontSize:13, fontWeight:600, textAlign:'center' }}>{err}</p>}
          <button onClick={goStep2} style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'16px', fontWeight:800, fontSize:16 }}>Continue →</button>
        </>}

        {step===2 && <>
          {form.role==='player' && (
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Position</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {POSITIONS.map(p=>(
                  <button key={p} onClick={()=>set('position',p)}
                    style={{ padding:'9px 18px', borderRadius:20, border:`2px solid ${form.position===p?C.accent:C.border}`, background:form.position===p?C.accent:'transparent', color:form.position===p?'#000':'#888', fontSize:14, fontWeight:800, transition:'all .18s' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>{form.role==='player'?'School / Team':'Organization'}</label>
            <input value={form.school} onChange={e=>set('school',e.target.value)} placeholder={form.role==='player'?'e.g. Yulee High School':'e.g. UCLA Basketball'} style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Year</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['Freshman','Sophomore','Junior','Senior','Senior (HS)','Junior (HS)'].map(y=>(
                <button key={y} onClick={()=>set('year',y)}
                  style={{ padding:'8px 14px', borderRadius:20, border:`1.5px solid ${form.year===y?C.accent:C.border}`, background:form.year===y?C.accent:'transparent', color:form.year===y?'#000':'#888', fontSize:12, fontWeight:700, transition:'all .18s' }}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          {form.role==='player' && (
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Height</label>
              <input value={form.height} onChange={e=>set('height',e.target.value)} placeholder="e.g. 6'4" style={inp} onFocus={focus} onBlur={blur}/>
            </div>
          )}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Bio</label>
            <textarea value={form.bio} onChange={e=>set('bio',e.target.value)} rows={3}
              placeholder="Hooping since I could walk. PG from Yulee. Built different. 🏀"
              style={{ ...inp, resize:'none', lineHeight:1.5 }} onFocus={focus} onBlur={blur}/>
          </div>
          {err && <p style={{ color:C.pink, fontSize:13, fontWeight:600, textAlign:'center' }}>{err}</p>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1, background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:12, padding:'15px', fontWeight:700, fontSize:15, color:'#888' }}>← Back</button>
            <button onClick={submit} disabled={loading} style={{ flex:2, background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'15px', fontWeight:800, fontSize:15, opacity:loading?.6:1 }}>
              {loading?'Creating…':'Create Profile 🏀'}
            </button>
          </div>
        </>}

        {step===3 && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:64, marginBottom:20 }}>📬</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, marginBottom:12 }}>Check your email!</div>
            <p style={{ fontSize:15, color:C.muted, lineHeight:1.7, marginBottom:28 }}>
              We sent a confirmation link to <strong style={{ color:'#fff' }}>{form.email}</strong>.<br/>
              Click it then come back and sign in.
            </p>
            <button onClick={()=>navigate('/login')} style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'15px 32px', fontWeight:800, fontSize:16 }}>
              Go to Sign In →
            </button>
          </div>
        )}
      </div>

      {step < 3 && (
        <p style={{ color:C.muted, fontSize:14, marginTop:28 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:C.accent, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
        </p>
      )}
    </div>
  )
}

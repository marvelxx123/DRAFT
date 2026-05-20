import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, updateProfile, signInWithGoogle } from '../lib/supabase.js'
import { T } from '../lib/theme.js'

const POSITIONS = ['PG','SG','SF','PF','C']
const YEARS = ['Freshman','Sophomore','Junior','Senior','Senior (HS)','Junior (HS)','Sophomore (HS)','Freshman (HS)']

export default function Register() {
  const [step, setStep]    = useState(1)
  const [loading, setLoad] = useState(false)
  const [err, setErr]      = useState('')
  const navigate           = useNavigate()
  const [form, setForm]    = useState({ email:'', password:'', fullName:'', role:'player', position:'', school:'', year:'', height:'', bio:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const goStep2 = () => {
    if (!form.fullName.trim()) { setErr('Enter your full name'); return }
    if (!form.email.includes('@') || !form.email.includes('.')) { setErr('Enter a valid email'); return }
    if (form.password.length < 6) { setErr('Password needs 6+ characters'); return }
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
          position:  form.position||null,
          school:    form.school||null,
          year:      form.year||null,
          height:    form.height||null,
          bio:       form.bio||null,
        })
      }
      setStep(3)
    } catch(e) { setErr(e.message) }
    setLoad(false)
  }

  const inp = { width:'100%', background:'transparent', border:`1px solid ${T.border3}`, borderRadius:14, padding:'15px 18px', color:T.text, fontSize:16, outline:'none', transition:'border-color .2s' }
  const focus = e => e.target.style.borderColor = T.electric
  const blur  = e => e.target.style.borderColor = T.border3

  return (
    <div style={{ minHeight:'100%', overflowY:'auto', display:'flex', flexDirection:'column', background:T.bg, padding:'48px 28px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:46, fontWeight:700, letterSpacing:-3, color:'#fff', lineHeight:.9, marginBottom:14 }}>DRAFT</div>
        <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:16 }}>
          <div style={{ width:24, height:2, background:T.lime }}/>
          <div style={{ width:6, height:2, background:T.electric }}/>
        </div>
        <p style={{ fontSize:14, color:T.sub }}>
          {step===1 ? 'Create your free account' : step===2 ? 'Build your profile' : ''}
        </p>
      </div>

      {/* Progress */}
      <div style={{ display:'flex', gap:5, marginBottom:32 }}>
        {[1,2].map(n=>(
          <div key={n} style={{ flex:1, height:2.5, borderRadius:2, background:step>=n?T.electric:T.border2, transition:'background .3s' }}/>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:440 }}>

        {/* Step 1 */}
        {step===1 && <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>
            {[['player','🏀','Player'],['scout','🎯','Scout / Coach']].map(([r,ic,lbl])=>(
              <button key={r} onClick={()=>set('role',r)}
                style={{ padding:'16px 0', borderRadius:14, border:`1.5px solid ${form.role===r?T.electric:T.border3}`, background:form.role===r?`${T.electric}12`:'transparent', color:form.role===r?T.electric:T.sub, fontWeight:700, fontSize:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .18s' }}>
                <span style={{ fontSize:24 }}>{ic}</span>{lbl}
              </button>
            ))}
          </div>

          <input value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Full name" style={inp} onFocus={focus} onBlur={blur}/>
          <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="Email address" autoCapitalize="none" autoCorrect="off" inputMode="email" style={inp} onFocus={focus} onBlur={blur}/>
          <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Password (min 6 chars)" style={inp} onFocus={focus} onBlur={blur}/>

          {err && <p style={{ color:T.crimson, fontSize:13, fontWeight:600, textAlign:'center' }}>{err}</p>}

          <button onClick={goStep2} style={{ padding:'17px', background:T.white, color:'#000', border:'none', borderRadius:14, fontWeight:800, fontSize:16, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:.2 }}>
            Continue →
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'4px 0' }}>
            <div style={{ flex:1, height:1, background:T.border2 }}/>
            <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>OR</span>
            <div style={{ flex:1, height:1, background:T.border2 }}/>
          </div>

          <button type="button" onClick={()=>signInWithGoogle()}
            style={{ width:'100%', padding:'15px', background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, fontWeight:700, fontSize:15, color:T.text, display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:"'Space Grotesk',sans-serif" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84z"/></svg>
            Sign up with Google
          </button>
        </>}

        {/* Step 2 */}
        {step===2 && <>
          {form.role==='player' && (
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Position</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {POSITIONS.map(pos=>(
                  <button key={pos} onClick={()=>set('position',pos)}
                    style={{ padding:'9px 18px', borderRadius:20, border:`1.5px solid ${form.position===pos?T.lime:T.border3}`, background:form.position===pos?T.lime:'transparent', color:form.position===pos?'#000':T.sub, fontSize:14, fontWeight:800, transition:'all .18s' }}>
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input value={form.school} onChange={e=>set('school',e.target.value)}
            placeholder={form.role==='player' ? 'School or Team' : 'Organization'} style={inp} onFocus={focus} onBlur={blur}/>

          <div>
            <p style={{ fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Year</p>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {YEARS.map(y=>(
                <button key={y} onClick={()=>set('year',y)}
                  style={{ padding:'7px 13px', borderRadius:18, border:`1.5px solid ${form.year===y?T.electric:T.border3}`, background:form.year===y?`${T.electric}18`:'transparent', color:form.year===y?T.electric:T.sub, fontSize:12, fontWeight:700, transition:'all .18s' }}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {form.role==='player' && (
            <input value={form.height} onChange={e=>set('height',e.target.value)} placeholder={"Height (e.g. 6'4\")"} style={inp} onFocus={focus} onBlur={blur}/>
          )}

          <textarea value={form.bio} onChange={e=>set('bio',e.target.value)} rows={3}
            placeholder="Short bio — e.g. Hooping since I could walk. PG from Yulee. Built different. 🏀"
            style={{ ...inp, resize:'none', lineHeight:1.55 }} onFocus={focus} onBlur={blur}/>

          {err && <p style={{ color:T.crimson, fontSize:13, fontWeight:600, textAlign:'center' }}>{err}</p>}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1, padding:'16px', background:'transparent', border:`1.5px solid ${T.border3}`, borderRadius:14, fontWeight:700, color:T.sub, fontSize:15 }}>← Back</button>
            <button onClick={submit} disabled={loading} style={{ flex:2, padding:'16px', background:T.white, color:'#000', border:'none', borderRadius:14, fontWeight:800, fontSize:16, fontFamily:"'Space Grotesk',sans-serif", opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating…' : 'Create Profile 🏀'}
            </button>
          </div>
        </>}

        {/* Step 3 — Check email */}
        {step===3 && (
          <div style={{ textAlign:'center', paddingTop:20 }}>
            <div style={{ fontSize:64, marginBottom:20 }}>📬</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, marginBottom:12 }}>Check your email</div>
            <p style={{ fontSize:15, color:T.sub, lineHeight:1.7, marginBottom:28 }}>
              We sent a confirmation link to{' '}
              <strong style={{ color:T.text }}>{form.email}</strong>.
              Click it then come back and sign in.
            </p>
            <button onClick={()=>navigate('/login')}
              style={{ background:T.white, color:'#000', border:'none', borderRadius:14, padding:'16px 32px', fontWeight:800, fontSize:16, fontFamily:"'Space Grotesk',sans-serif" }}>
              Go to Sign In →
            </button>
          </div>
        )}
      </div>

      {step < 3 && (
        <p style={{ color:T.sub, fontSize:14, marginTop:28 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:T.electric, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
        </p>
      )}
    </div>
  )
}

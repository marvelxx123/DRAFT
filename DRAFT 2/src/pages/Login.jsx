import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../lib/supabase.js'
import { T } from '../lib/theme.js'

export default function Login() {
  const [email, setEmail]  = useState('')
  const [pass, setPass]    = useState('')
  const [err, setErr]      = useState('')
  const [loading, setLoad] = useState(false)
  const [show, setShow]    = useState(false)
  const navigate           = useNavigate()

  useEffect(() => { setTimeout(() => setShow(true), 80) }, [])

  const submit = async e => {
    e.preventDefault()
    if (!email.trim() || !pass) { setErr('Enter your email and password'); return }
    setLoad(true); setErr('')
    const { error } = await signIn(email.trim().toLowerCase(), pass)
    if (error) { setErr('Wrong email or password'); setLoad(false) }
    else navigate('/')
  }

  const inp = { width:'100%', background:'transparent', border:`1px solid ${T.border3}`, borderRadius:14, padding:'16px 18px', color:T.text, fontSize:16, outline:'none', letterSpacing:.1, transition:'border-color .2s' }

  return (
    <div style={{ minHeight:'100%', overflowY:'auto', display:'flex', flexDirection:'column', background:T.bg, padding:'0 28px' }}>

      {/* Logo area */}
      <div style={{ paddingTop:72, paddingBottom:48, opacity:show?1:0, transform:show?'none':'translateY(22px)', transition:'all .65s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700, letterSpacing:5, color:T.sub, textTransform:'uppercase', marginBottom:14 }}>Basketball Recruitment</div>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:58, fontWeight:700, letterSpacing:-3.5, color:'#fff', lineHeight:.88, marginBottom:16 }}>DRAFT</div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <div style={{ width:28, height:2.5, background:T.lime, borderRadius:2 }}/>
          <div style={{ width:8, height:2.5, background:T.electric, borderRadius:2 }}/>
        </div>
      </div>

      {/* Form */}
      <div style={{ opacity:show?1:0, transform:show?'none':'translateY(28px)', transition:'all .7s cubic-bezier(.16,1,.3,1) .12s' }}>
        <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:T.text, marginBottom:24 }}>Sign in</p>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Email address" autoCapitalize="none" autoCorrect="off" inputMode="email" style={inp}
            onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border3}/>

          <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
            placeholder="Password" style={inp}
            onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border3}/>

          {err && <p style={{ color:T.crimson, fontSize:13, fontWeight:600, textAlign:'center', padding:'6px 0' }}>{err}</p>}

          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'17px', background:loading?T.card3:T.white, color:loading?T.sub:'#000', border:'none', borderRadius:14, fontWeight:800, fontSize:16, marginTop:8, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:.2, transition:'all .18s' }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ color:T.sub, fontSize:14, marginTop:24, textAlign:'center' }}>
          No account?{' '}
          <Link to="/register" style={{ color:T.electric, fontWeight:700, textDecoration:'none' }}>Join DRAFT free</Link>
        </p>
      </div>

      <div style={{ flex:1 }}/>
      <div style={{ paddingBottom:40, opacity:show?1:0, transition:'opacity 1.2s .5s' }}>
        <p style={{ fontSize:11, color:T.muted, letterSpacing:1, textTransform:'uppercase' }}>Free for players · Built for scouts</p>
      </div>
    </div>
  )
}

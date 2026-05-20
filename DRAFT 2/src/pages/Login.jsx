import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, signInWithGoogle } from '../lib/supabase.js'
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

        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
          <div style={{ flex:1, height:1, background:T.border2 }}/>
          <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>OR</span>
          <div style={{ flex:1, height:1, background:T.border2 }}/>
        </div>

        <button onClick={()=>signInWithGoogle()}
          style={{ width:'100%', padding:'16px', background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, fontWeight:700, fontSize:15, color:T.text, display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:"'Space Grotesk',sans-serif" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <p style={{ color:T.sub, fontSize:14, marginTop:20, textAlign:'center' }}>
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

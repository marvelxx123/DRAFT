import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', accent:'#C8FF00', muted:'#888', sub:'#555', pink:'#FF2D78' }

export default function Login() {
  const [email, setEmail]  = useState('')
  const [pass, setPass]    = useState('')
  const [err, setErr]      = useState('')
  const [loading, setLoad] = useState(false)
  const navigate           = useNavigate()

  const submit = async e => {
    e.preventDefault()
    if (!email.trim() || !pass) { setErr('Enter your email and password'); return }
    setLoad(true); setErr('')
    const { error } = await signIn(email.trim().toLowerCase(), pass)
    if (error) {
      setErr(error.message.includes('Invalid') ? 'Wrong email or password' : error.message)
      setLoad(false)
    } else {
      navigate('/')
    }
  }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 16px', color:'#fff', fontSize:16, outline:'none', width:'100%', WebkitAppearance:'none' }

  return (
    <div style={{ minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 22px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:38, fontWeight:700, letterSpacing:-1.5, marginBottom:6 }}>DRAFT</div>
      <p style={{ color:C.muted, fontSize:15, marginBottom:36 }}>Sign in to your account</p>

      <form onSubmit={submit} style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#555', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gmail.com" style={inp} autoCapitalize="none" autoCorrect="off" inputMode="email"
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#555', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Password</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Your password" style={inp}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        {err && <p style={{ color:C.pink, fontSize:13, fontWeight:600, textAlign:'center' }}>{err}</p>}
        <button type="submit" disabled={loading}
          style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'16px', fontWeight:800, fontSize:16, opacity:loading?.6:1, marginTop:4 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ color:C.muted, fontSize:14, marginTop:28 }}>
        No account?{' '}
        <Link to="/register" style={{ color:C.accent, fontWeight:700, textDecoration:'none' }}>Create one free</Link>
      </p>
    </div>
  )
}

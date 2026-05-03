import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', border2:'#383838', accent:'#C8FF00', muted:'#888', sub:'#555' }

export default function Login() {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [err, setErr]       = useState('')
  const [loading, setLoad]  = useState(false)
  const navigate            = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoad(true); setErr('')
    const { error } = await signIn(email, pass)
    if (error) { setErr(error.message); setLoad(false) }
    else navigate('/')
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-1, marginBottom:8 }}>DRAFT</div>
      <p style={{ color:C.muted, fontSize:14, marginBottom:32 }}>Sign in to your account</p>

      <form onSubmit={submit} style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:14 }}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required
          style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:15, outline:'none', width:'100%' }}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        <input type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} required
          style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:15, outline:'none', width:'100%' }}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        {err && <p style={{ color:'#FF2D78', fontSize:13, fontWeight:600 }}>{err}</p>}
        <button type="submit" disabled={loading}
          style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'14px', fontWeight:800, fontSize:15, opacity:loading?.6:1, cursor:loading?'not-allowed':'pointer' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ color:C.muted, fontSize:14, marginTop:24 }}>
        No account?{' '}
        <Link to="/register" style={{ color:C.accent, fontWeight:700, textDecoration:'none' }}>Create one free</Link>
      </p>
    </div>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import Feed        from './pages/Feed.jsx'
import Discover    from './pages/Discover.jsx'
import Upload      from './pages/Upload.jsx'
import Profile     from './pages/Profile.jsx'
import Login       from './pages/Login.jsx'
import Register    from './pages/Register.jsx'
import BottomNav   from './components/BottomNav.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferred] = useState(null)

  useEffect(() => {
    // Auth
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault()
      setDeferred(e)
      setShowInstall(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setShowInstall(false)
    setDeferred(null)
  }

  if (session === undefined) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-1, color:'#fff' }}>DRAFT</div>
        <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #C8FF00', borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#000', overflow:'hidden' }}>

      {/* PWA install banner */}
      {showInstall && (
        <div style={{ background:'#161616', borderBottom:'1px solid #2A2A2A', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, zIndex:100 }}>
          <div>
            <span style={{ fontWeight:700, fontSize:13, color:'#fff' }}>Add DRAFT to Home Screen</span>
            <p style={{ fontSize:11, color:'#888', marginTop:2 }}>Open it like an app, anytime</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowInstall(false)} style={{ background:'transparent', border:'1px solid #333', borderRadius:8, padding:'7px 12px', color:'#888', fontSize:12, fontWeight:700 }}>Later</button>
            <button onClick={installApp} style={{ background:'#C8FF00', border:'none', borderRadius:8, padding:'7px 14px', color:'#000', fontSize:12, fontWeight:800 }}>Install</button>
          </div>
        </div>
      )}

      {/* Pages */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <Routes>
          <Route path="/"             element={<Feed session={session}/>} />
          <Route path="/discover"     element={<Discover session={session}/>} />
          <Route path="/upload"       element={session ? <Upload session={session}/> : <Navigate to="/login"/>} />
          <Route path="/profile"      element={<Profile session={session}/>} />
          <Route path="/profile/:userId" element={<Profile session={session}/>} />
          <Route path="/login"        element={session ? <Navigate to="/"/> : <Login/>} />
          <Route path="/register"     element={session ? <Navigate to="/"/> : <Register/>} />
          <Route path="*"             element={<Navigate to="/"/>} />
        </Routes>
      </div>

      <BottomNav session={session}/>
    </div>
  )
}

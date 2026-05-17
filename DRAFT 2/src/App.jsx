import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { T } from './lib/theme.js'
import Feed           from './pages/Feed.jsx'
import Discover       from './pages/Discover.jsx'
import Upload         from './pages/Upload.jsx'
import Profile        from './pages/Profile.jsx'
import Login          from './pages/Login.jsx'
import Register       from './pages/Register.jsx'
import ScoutDashboard from './pages/ScoutDashboard.jsx'
import StatsDashboard from './pages/StatsDashboard.jsx'
import Messages       from './pages/Messages.jsx'
import Notifications  from './pages/Notifications.jsx'
import BottomNav      from './components/BottomNav.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [minWait, setMinWait] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    const t = setTimeout(() => setMinWait(false), 2600)
    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  if (session === undefined || minWait) return (
    <div style={{ height:'100vh', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', overflow:'hidden', position:'relative' }}>

      {/* Atmospheric background glow */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,230,0,0.07) 0%, transparent 60%)', animation:'bgGlow 2s ease 0.1s both' }}/>
      </div>

      {/* Grain overlay */}
      <div style={{ position:'absolute', inset:0, opacity:.025, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", pointerEvents:'none' }}/>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', zIndex:1 }}>

        {/* DRAFT wordmark */}
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:window.innerWidth < 400 ? 96 : 120, fontWeight:400, letterSpacing:18, color:T.electric, lineHeight:1, textAlign:'center', animation:'logoReveal 1s cubic-bezier(.16,1,.3,1) 0.15s both', textShadow:'0 0 80px rgba(255,230,0,0.2)' }}>
          DRAFT
        </div>

        {/* Gold scan line sweeps in */}
        <div style={{ width:260, height:1.5, margin:'10px 0 0', background:`linear-gradient(90deg, transparent, ${T.electric}, ${T.gold}, transparent)`, transformOrigin:'left center', animation:'lineReveal 0.65s cubic-bezier(.16,1,.3,1) 1.05s both' }}/>

        {/* Tagline */}
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700, letterSpacing:7, color:T.sub, textTransform:'uppercase', marginTop:14, animation:'tagReveal 0.55s ease 1.55s both' }}>
          Upload Your Film. Get Discovered.
        </div>

        {/* Spinner */}
        <div style={{ marginTop:40, animation:'tagReveal 0.4s ease 2s both' }}>
          <div className="spin" style={{ width:18, height:18, borderRadius:'50%', border:`1.5px solid ${T.electric}30`, borderTopColor:T.electric }}/>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:T.bg, overflow:'hidden' }}>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <Routes>
          <Route path="/"                element={<Feed session={session}/>} />
          <Route path="/discover"        element={<Discover session={session}/>} />
          <Route path="/upload"          element={session ? <Upload session={session}/> : <Navigate to="/login"/>} />
          <Route path="/profile"         element={<Profile session={session}/>} />
          <Route path="/profile/:userId" element={<Profile session={session}/>} />
          <Route path="/scouts"          element={<ScoutDashboard session={session}/>} />
          <Route path="/stats"           element={session ? <StatsDashboard session={session}/> : <Navigate to="/login"/>} />
          <Route path="/messages"        element={session ? <Messages session={session}/> : <Navigate to="/login"/>} />
          <Route path="/notifications"   element={<Notifications session={session}/>} />
          <Route path="/login"           element={session ? <Navigate to="/"/> : <Login/>} />
          <Route path="/register"        element={session ? <Navigate to="/"/> : <Register/>} />
          <Route path="*"                element={<Navigate to="/"/>} />
        </Routes>
      </div>
      <BottomNav session={session}/>
    </div>
  )
}

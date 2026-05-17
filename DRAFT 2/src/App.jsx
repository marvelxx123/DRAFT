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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', flexDirection:'column', gap:0 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:88, fontWeight:400, letterSpacing:12, color:'#F5F0E8', lineHeight:1, textAlign:'center' }} className="flicker">
          DRAFT
        </div>
        <div style={{ width:'100%', height:2, background:`linear-gradient(90deg, transparent, ${T.electric}, ${T.gold}, transparent)` }}/>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:600, letterSpacing:5, color:T.sub, textTransform:'uppercase' }}>
          Get Discovered
        </div>
        <div className="spin" style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${T.electric}`, borderTopColor:'transparent', marginTop:8 }}/>
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

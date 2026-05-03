import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
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
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000000' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:48, fontWeight:700, letterSpacing:-3, color:'#00D4FF', lineHeight:.9 }}>DRAFT</div>
        <div style={{ width:36, height:2.5, background:'linear-gradient(90deg,#00D4FF,#C8FF00)', borderRadius:2 }}/>
        <div style={{ width:22, height:22, borderRadius:'50%', border:'2.5px solid #00D4FF', borderTopColor:'transparent', animation:'spin .7s linear infinite', marginTop:4 }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#000000', overflow:'hidden' }}>
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

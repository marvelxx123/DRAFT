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
import BottomNav      from './components/BottomNav.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

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
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <Routes>
          <Route path="/"              element={<Feed session={session}/>} />
          <Route path="/discover"      element={<Discover session={session}/>} />
          <Route path="/upload"        element={session ? <Upload session={session}/> : <Navigate to="/login"/>} />
          <Route path="/profile"       element={<Profile session={session}/>} />
          <Route path="/profile/:userId" element={<Profile session={session}/>} />
          <Route path="/scouts"        element={<ScoutDashboard session={session}/>} />
          <Route path="/login"         element={session ? <Navigate to="/"/> : <Login/>} />
          <Route path="/register"      element={session ? <Navigate to="/"/> : <Register/>} />
          <Route path="*"              element={<Navigate to="/"/>} />
        </Routes>
      </div>
      <BottomNav session={session}/>
    </div>
  )
}

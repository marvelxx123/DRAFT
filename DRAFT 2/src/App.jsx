import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Still loading
  if (session === undefined) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #C8FF00', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#000' }}>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <Routes>
          <Route path="/"        element={<Feed session={session}/>} />
          <Route path="/discover"element={<Discover session={session}/>} />
          <Route path="/upload"  element={session ? <Upload session={session}/> : <Navigate to="/login"/>} />
          <Route path="/profile" element={session ? <Profile session={session}/> : <Navigate to="/login"/>} />
          <Route path="/profile/:userId" element={<Profile session={session}/>} />
          <Route path="/login"   element={session ? <Navigate to="/"/> : <Login/>} />
          <Route path="/register"element={session ? <Navigate to="/"/> : <Register/>} />
        </Routes>
      </div>
      <BottomNav session={session}/>
    </div>
  )
}

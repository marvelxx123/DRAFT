import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase, getProfile } from './lib/supabase.js'
import Landing    from './pages/Landing.jsx'
import Login      from './pages/Login.jsx'
import Register   from './pages/Register.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import AdCopy     from './pages/tools/AdCopy.jsx'
import ContentCalendar from './pages/tools/ContentCalendar.jsx'
import EmailCampaign   from './pages/tools/EmailCampaign.jsx'
import VideoScript     from './pages/tools/VideoScript.jsx'
import Billing    from './pages/Billing.jsx'
import Settings   from './pages/Settings.jsx'

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-black mesh-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="font-display font-bold text-4xl tracking-tight gradient-text">NEXUS</span>
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent spin" />
      </div>
    </div>
  )
}

function Guard({ session, profile, children }) {
  if (!session) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      if (data.session) loadProfile(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s ?? null)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try { setProfile(await getProfile(userId)) } catch { setProfile(null) }
  }

  function refreshProfile() {
    if (session) loadProfile(session.user.id)
  }

  if (session === undefined) return <Spinner />

  const authProps = { session, profile, refreshProfile }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login"    element={session ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/onboarding" element={session ? <Onboarding {...authProps} /> : <Navigate to="/login" />} />

      <Route path="/dashboard" element={<Guard session={session} profile={profile}><Dashboard {...authProps} /></Guard>} />
      <Route path="/tools/ad-copy"          element={<Guard session={session} profile={profile}><AdCopy {...authProps} /></Guard>} />
      <Route path="/tools/content-calendar" element={<Guard session={session} profile={profile}><ContentCalendar {...authProps} /></Guard>} />
      <Route path="/tools/email-campaign"   element={<Guard session={session} profile={profile}><EmailCampaign {...authProps} /></Guard>} />
      <Route path="/tools/video-script"     element={<Guard session={session} profile={profile}><VideoScript {...authProps} /></Guard>} />
      <Route path="/billing"  element={<Guard session={session} profile={profile}><Billing {...authProps} /></Guard>} />
      <Route path="/settings" element={<Guard session={session} profile={profile}><Settings {...authProps} /></Guard>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

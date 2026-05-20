import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProfile, getUserVideos, signOut, updateProfile, changeEmail, changePassword, supabase } from '../lib/supabase.js'
import { T, POS, CAT, fmt, initials, timeAgo } from '../lib/theme.js'

function Av({ profile, size=80, accent, ring=false }) {
  const color = accent || POS[profile?.position] || T.electric
  const outer = ring ? size+5 : size
  return (
    <div style={{ width:outer, height:outer, borderRadius:'50%', flexShrink:0, background:ring?color:'transparent', padding:ring?2.5:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}15`, border:`1.5px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
        {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : initials(profile?.full_name||profile?.username||'?')}
      </div>
    </div>
  )
}

function ScoutReportPanel({ report }) {
  const cats = [
    ['Athleticism',  report.categories?.athleticism],
    ['Shooting',     report.categories?.shooting],
    ['Ball Handling',report.categories?.ball_handling],
    ['Court Vision', report.categories?.court_vision],
    ['Defense',      report.categories?.defense],
    ['Physicality',  report.categories?.physicality],
  ].filter(([, v]) => v != null)

  return (
    <div style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:'16px 18px' }}>
      {/* Score header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <div style={{ width:58, height:58, borderRadius:14, background:`${T.gold}14`, border:`2px solid ${T.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:T.gold }}>{report.overall_score}</span>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:T.gold, letterSpacing:1.5 }}>AI DRAFT SCORE</div>
          <div style={{ fontSize:11, color:T.sub, marginTop:3 }}>Powered by Claude AI</div>
        </div>
      </div>

      {/* Category bars */}
      {cats.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
          {cats.map(([label, val]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:T.sub, width:90, flexShrink:0 }}>{label}</span>
              <div style={{ flex:1, height:4, background:T.card2, borderRadius:2 }}>
                <div style={{ height:'100%', width:`${(val/10)*100}%`, background:T.electric, borderRadius:2 }}/>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:T.text2, width:14, textAlign:'right' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Written report */}
      {report.scouting_report && (
        <p style={{ fontSize:13, color:T.text2, lineHeight:1.65, marginBottom:12, fontStyle:'italic', borderLeft:`2px solid ${T.electric}`, paddingLeft:10 }}>
          {report.scouting_report}
        </p>
      )}

      {/* Strengths */}
      {report.strengths?.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.lime, letterSpacing:1.5, marginBottom:5 }}>STRENGTHS</div>
          {report.strengths.map((s, i) => (
            <div key={i} style={{ fontSize:12, color:T.text2, marginBottom:3 }}>✓ {s}</div>
          ))}
        </div>
      )}

      {/* Areas to improve */}
      {report.areas_to_improve?.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:T.sub, letterSpacing:1.5, marginBottom:5 }}>WORK ON</div>
          {report.areas_to_improve.map((a, i) => (
            <div key={i} style={{ fontSize:12, color:T.sub, marginBottom:3 }}>→ {a}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Profile({ session }) {
  const { userId }           = useParams()
  const navigate             = useNavigate()
  const [profile, setProf]   = useState(null)
  const [videos, setVideos]  = useState([])
  const [tab, setTab]        = useState('videos')
  const [loading, setLoad]   = useState(true)
  const [editing, setEdit]   = useState(false)
  const [saving, setSaving]  = useState(false)
  const [uplAv, setUplAv]    = useState(false)
  const [editForm, setEF]    = useState({})
  const [selectedVideo, setSV] = useState(null)
  const [showSettings, setSettings] = useState(false)
  const [isPublic, setPublic]       = useState(true)
  const [newEmail, setNewEmail]     = useState('')
  const [newPass, setNewPass]       = useState('')
  const [settMsg, setSettMsg]       = useState('')
  const [settLoad, setSettLoad]     = useState(false)
  const avatarRef            = useRef()

  const targetId = userId || session?.user?.id
  const isOwn    = session?.user?.id === targetId
  const accent   = POS[profile?.position] || T.electric
  const isScout  = profile?.role === 'scout' || profile?.role === 'coach'

  useEffect(() => {
    if (!targetId) { setLoad(false); return }
    Promise.all([getProfile(targetId), getUserVideos(targetId)])
      .then(([{ data:p }, { data:v }]) => {
        setProf(p); setVideos(v||[])
        setEF({ full_name:p?.full_name||'', bio:p?.bio||'', school:p?.school||'', year:p?.year||'', height:p?.height||'', position:p?.position||'' })
        setPublic(p?.is_public !== false)
        setLoad(false)
        if (!isOwn && session?.user?.id && p?.id) {
          supabase.from('notifications').insert({ user_id:p.id, actor_id:session.user.id, type:'view', text:'viewed your profile', link:`/profile/${p.id}`, read:false }).then(()=>{})
        }
      })
  }, [targetId])

  // Live-update scout scores as Gemini finishes analyzing
  useEffect(() => {
    if (!targetId) return
    const ch = supabase.channel(`video_scores_${targetId}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'videos', filter:`user_id=eq.${targetId}` },
        payload => setVideos(vs => vs.map(v => v.id === payload.new.id ? { ...v, ...payload.new } : v))
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [targetId])

  const saveProfile = async () => {
    setSaving(true)
    await updateProfile(session.user.id, editForm)
    setProf(p=>({...p,...editForm}))
    setEdit(false); setSaving(false)
  }

  const uploadAvatar = async e => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setUplAv(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${session.user.id}.${ext}`
      const { error } = await supabase.storage.from('videos').upload(`avatars/${path}`, file, { upsert:true, cacheControl:'3600' })
      if (error) throw error
      const { data:{ publicUrl } } = supabase.storage.from('videos').getPublicUrl(`avatars/${path}`)
      await updateProfile(session.user.id, { avatar_url:publicUrl })
      setProf(p=>({...p, avatar_url:publicUrl}))
    } catch(e) { console.error(e) }
    setUplAv(false)
  }

  const shareProfile = () => {
    const url = `${window.location.origin}/profile/${targetId}`
    if (navigator.share) navigator.share({ title:`${profile?.full_name} on DRAFT`, url })
    else { navigator.clipboard?.writeText(url); alert('Link copied!') }
  }

  const inp = { background:'transparent', border:`1px solid ${T.border3}`, borderRadius:10, padding:'11px 14px', color:T.text, fontSize:14, outline:'none', width:'100%', transition:'border-color .2s' }
  const focus = e => e.target.style.borderColor = T.electric
  const blur  = e => e.target.style.borderColor = T.border3

  if (!targetId) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:28, textAlign:'center', background:T.bg }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-2, color:T.electric }}>DRAFT</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700 }}>Join DRAFT</div>
      <p style={{ color:T.sub, fontSize:15, maxWidth:260, lineHeight:1.6 }}>Create your free player profile and get discovered by scouts</p>
      <Link to="/register" style={{ background:T.white, color:'#000', borderRadius:14, padding:'14px 30px', fontWeight:800, fontSize:15, textDecoration:'none', fontFamily:"'Space Grotesk',sans-serif" }}>Create Free Profile</Link>
      <Link to="/login" style={{ color:T.electric, fontSize:14, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
    </div>
  )

  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <div className="spin" style={{ width:26, height:26, borderRadius:'50%', border:`2.5px solid ${T.electric}`, borderTopColor:'transparent' }}/>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:T.bg }}>

      <div style={{ height:2, background:`linear-gradient(90deg, ${accent}, transparent)` }}/>

      <div style={{ padding:'18px 18px 0', maxWidth:560, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', gap:18, alignItems:'flex-start', marginBottom:18 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div onClick={isOwn ? ()=>avatarRef.current.click() : undefined} style={{ cursor:isOwn?'pointer':'default' }}>
              <Av profile={profile} size={76} ring/>
            </div>
            {uplAv && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.6)', borderRadius:'50%' }}>
                <div className="spin" style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${accent}`, borderTopColor:'transparent' }}/>
              </div>
            )}
            {isOwn && !uplAv && (
              <div style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #000', cursor:'pointer' }}
                onClick={()=>avatarRef.current.click()}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display:'none' }}/>
          </div>

          <div style={{ flex:1 }}>
            <div style={{ display:'flex', marginBottom:14 }}>
              {[[videos.length,'Posts'],[profile?.followers_count||0,'Followers'],[profile?.following_count||0,'Following']].map(([v,k])=>(
                <div key={k} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, lineHeight:1, fontWeight:700, color:T.text }}>{v}</div>
                  <div style={{ fontSize:10, color:T.sub, marginTop:4, fontWeight:600 }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:7 }}>
              {isOwn ? <>
                <button onClick={()=>setEdit(!editing)}
                  style={{ flex:1, padding:'9px 0', borderRadius:10, fontWeight:700, fontSize:13, background:T.card2, color:T.text, border:`1px solid ${T.border3}` }}>
                  {editing?'Cancel':'Edit Profile'}
                </button>
                <button onClick={shareProfile} style={{ width:36, height:36, borderRadius:10, background:T.card2, border:`1px solid ${T.border3}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button onClick={()=>setSettings(true)} style={{ width:36, height:36, borderRadius:10, background:T.card2, border:`1px solid ${T.border3}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </> : <>
                <button style={{ flex:1, padding:'9px 0', borderRadius:10, fontWeight:800, fontSize:14, background:accent, color:'#000', border:'none', fontFamily:"'Space Grotesk',sans-serif" }}>Follow</button>
                {session && <button onClick={()=>navigate(`/messages?with=${targetId}`)}
                  style={{ flex:1, padding:'9px 0', borderRadius:10, fontWeight:700, fontSize:13, background:T.card2, color:T.text, border:`1px solid ${T.border3}` }}>Message</button>}
              </>}
            </div>
          </div>
        </div>

        {/* Bio */}
        {!editing ? (
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700 }}>{profile?.full_name||profile?.username}</div>
              {isScout && <span style={{ fontSize:10, fontWeight:800, color:T.scoutBlue, background:`${T.scoutBlue}18`, padding:'2px 7px', borderRadius:5 }}>SCOUT</span>}
            </div>
            {profile?.position && <div style={{ fontSize:13, fontWeight:600, color:accent, marginBottom:5 }}>{[profile.position, profile.school, profile.year].filter(Boolean).join(' · ')}</div>}
            {profile?.bio && <p style={{ fontSize:14, color:T.sub, lineHeight:1.65, marginBottom:10 }}>{profile.bio}</p>}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {profile?.height && <span style={{ fontSize:11, color:T.text2, background:T.card, padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}` }}>📏 {profile.height}</span>}
              {profile?.wingspan && <span style={{ fontSize:11, color:T.text2, background:T.card, padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}` }}>🤝 {profile.wingspan}</span>}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18, background:T.card, borderRadius:14, padding:16, border:`1px solid ${T.border}` }}>
            <input placeholder="Full name" value={editForm.full_name} onChange={e=>setEF(f=>({...f,full_name:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="School or team" value={editForm.school} onChange={e=>setEF(f=>({...f,school:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="Year" value={editForm.year} onChange={e=>setEF(f=>({...f,year:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="Height" value={editForm.height} onChange={e=>setEF(f=>({...f,height:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <textarea placeholder="Bio" value={editForm.bio} onChange={e=>setEF(f=>({...f,bio:e.target.value}))} rows={3} style={{ ...inp, resize:'none', lineHeight:1.5 }} onFocus={focus} onBlur={blur}/>
            <button onClick={saveProfile} disabled={saving}
              style={{ background:T.white, color:'#000', border:'none', borderRadius:10, padding:'13px', fontWeight:800, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", opacity:saving ? 0.6 : 1 }}>
              {saving?'Saving…':'Save Changes'}
            </button>
          </div>
        )}

        {/* Stats row (players only) */}
        {!isScout && (profile?.ppg || profile?.apg || profile?.rpg || profile?.draft_score) && (
          <div style={{ background:T.card, borderRadius:14, padding:'14px 8px', marginBottom:18, border:`1px solid ${T.border}`, display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
            {[['PPG',profile?.ppg],['APG',profile?.apg],['RPG',profile?.rpg],['DRAFT',profile?.draft_score]].map(([k,v],i)=>(
              <div key={k} style={{ textAlign:'center', borderRight:i<3?`1px solid ${T.border}`:'none' }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, lineHeight:1, color:k==='DRAFT'?T.gold:T.text }}>{v||'—'}</div>
                <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1, marginTop:4 }}>{k}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons (own profile) */}
        {isOwn && !isScout && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
            <button onClick={()=>navigate('/stats')}
              style={{ padding:'12px 0', borderRadius:12, background:`${T.electric}12`, border:`1px solid ${T.electric}33`, color:T.electric, fontWeight:700, fontSize:13, fontFamily:"'Space Grotesk',sans-serif" }}>
              📊 Update Stats
            </button>
            <button onClick={()=>navigate('/upload')}
              style={{ padding:'12px 0', borderRadius:12, background:`${T.lime}12`, border:`1px solid ${T.lime}33`, color:T.lime, fontWeight:700, fontSize:13, fontFamily:"'Space Grotesk',sans-serif" }}>
              🎬 Upload Film
            </button>
          </div>
        )}


        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${T.border}` }}>
          {[['videos','▶ Videos'],['about','👤 About']].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, padding:'12px 0', background:'none', border:'none', borderBottom:tab===id?`2px solid ${accent}`:'2px solid transparent', color:tab===id?accent:T.sub, fontWeight:700, fontSize:13, transition:'all .18s' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Videos tab — Instagram 3-col reels grid */}
      {tab==='videos' && (
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {videos.length===0 ? (
            <div style={{ padding:'48px 20px', textAlign:'center', color:T.sub }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🎬</div>
              <p style={{ fontSize:15, marginBottom:16 }}>No videos yet</p>
              {isOwn && <Link to="/upload" style={{ background:T.white, color:'#000', borderRadius:10, padding:'11px 24px', fontWeight:800, fontSize:14, textDecoration:'none', display:'inline-block', fontFamily:"'Space Grotesk',sans-serif" }}>Upload First Video</Link>}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
              {videos.map(v => (
                <div key={v.id} onClick={()=>setSV(v)}
                  style={{ position:'relative', aspectRatio:'9/16', overflow:'hidden', background:T.card2, cursor:'pointer' }}>
                  {v.thumbnail_url
                    ? <img src={v.thumbnail_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                    : <video src={v.video_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline preload="metadata"/>
                  }
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,.7))' }}/>
                  {v.scout_score != null && (
                    <div style={{ position:'absolute', top:6, left:6, background:'rgba(0,0,0,.78)', borderRadius:5, padding:'2px 7px' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:T.gold }}>★ {v.scout_score}</span>
                    </div>
                  )}
                  {v.scout_score == null && (
                    <div style={{ position:'absolute', top:6, left:6 }}>
                      <span style={{ fontSize:11 }}>🤖</span>
                    </div>
                  )}
                  <div style={{ position:'absolute', bottom:6, right:7, display:'flex', alignItems:'center', gap:3 }}>
                    <svg width="9" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>{fmt(v.views_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* About tab */}
      {tab==='about' && (
        <div style={{ maxWidth:560, margin:'0 auto', padding:'16px 18px' }}>
          {[['Position',profile?.position],['School',profile?.school],['Year',profile?.year],['Height',profile?.height],['Wingspan',profile?.wingspan],['Role',profile?.role]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:14, color:T.sub }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:48 }}/>

      {/* Settings bottom sheet */}
      {showSettings && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)' }} onClick={()=>{ setSettings(false); setSettMsg(''); setNewEmail(''); setNewPass('') }}/>
          <div style={{ position:'relative', background:T.surface, borderRadius:'22px 22px 0 0', padding:'24px 22px 40px', maxHeight:'88vh', overflowY:'auto' }}>
            {/* Handle bar */}
            <div style={{ width:36, height:4, background:T.border2, borderRadius:2, margin:'-12px auto 20px' }}/>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, marginBottom:20 }}>Settings</div>

            {/* Public / Private toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:T.text }}>Public Profile</div>
                <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>Anyone can discover and view your profile</div>
              </div>
              <div onClick={async()=>{
                const next = !isPublic
                setPublic(next)
                await updateProfile(session.user.id, { is_public: next })
              }} style={{ width:48, height:28, borderRadius:14, background:isPublic?T.electric:T.card2, border:`1.5px solid ${isPublic?T.electric:T.border3}`, position:'relative', cursor:'pointer', transition:'background .2s' }}>
                <div style={{ position:'absolute', top:3, left:isPublic?22:3, width:18, height:18, borderRadius:'50%', background:isPublic?'#000':'#fff', transition:'left .2s' }}/>
              </div>
            </div>

            {/* Change Email */}
            <div style={{ padding:'16px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:10 }}>Change Email</div>
              <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="New email address" type="email"
                style={{ width:'100%', background:'transparent', border:`1px solid ${T.border3}`, borderRadius:10, padding:'12px 14px', color:T.text, fontSize:14, outline:'none', marginBottom:10 }}
                onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border3}/>
              <button disabled={settLoad||!newEmail.includes('@')} onClick={async()=>{
                setSettLoad(true); setSettMsg('')
                const { error } = await changeEmail(newEmail.trim().toLowerCase())
                setSettMsg(error ? `Error: ${error.message}` : 'Confirmation sent to new email')
                setNewEmail(''); setSettLoad(false)
              }} style={{ width:'100%', padding:'12px', background:newEmail.includes('@')?T.electric:T.card2, color:newEmail.includes('@')?'#000':T.sub, border:'none', borderRadius:10, fontWeight:700, fontSize:14, opacity:settLoad?.6:1 }}>
                {settLoad?'Saving…':'Update Email'}
              </button>
            </div>

            {/* Change Password */}
            <div style={{ padding:'16px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:10 }}>Change Password</div>
              <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password (min 6 chars)" type="password"
                style={{ width:'100%', background:'transparent', border:`1px solid ${T.border3}`, borderRadius:10, padding:'12px 14px', color:T.text, fontSize:14, outline:'none', marginBottom:10 }}
                onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border3}/>
              <button disabled={settLoad||newPass.length<6} onClick={async()=>{
                setSettLoad(true); setSettMsg('')
                const { error } = await changePassword(newPass)
                setSettMsg(error ? `Error: ${error.message}` : 'Password updated')
                setNewPass(''); setSettLoad(false)
              }} style={{ width:'100%', padding:'12px', background:newPass.length>=6?T.electric:T.card2, color:newPass.length>=6?'#000':T.sub, border:'none', borderRadius:10, fontWeight:700, fontSize:14, opacity:settLoad?.6:1 }}>
                {settLoad?'Saving…':'Update Password'}
              </button>
            </div>

            {settMsg && <p style={{ fontSize:13, color:settMsg.startsWith('Error')?T.crimson:T.lime, fontWeight:600, textAlign:'center', padding:'10px 0' }}>{settMsg}</p>}

            {/* Sign Out */}
            <button onClick={async()=>{ await signOut(); navigate('/') }}
              style={{ width:'100%', marginTop:16, padding:'14px', background:'transparent', border:`1px solid ${T.crimson}44`, borderRadius:12, color:T.crimson, fontWeight:700, fontSize:15 }}>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Video detail overlay — tap a grid cell to open */}
      {selectedVideo && (
        <div style={{ position:'fixed', inset:0, background:'#000', zIndex:200, display:'flex', flexDirection:'column', overflowY:'auto', WebkitOverflowScrolling:'touch' }} onClick={e=>{if(e.target===e.currentTarget)setSV(null)}}>
          <div style={{ position:'relative', width:'100%', flexShrink:0, background:'#000' }}>
            <video src={selectedVideo.video_url} controls autoPlay playsInline style={{ width:'100%', maxHeight:'58vh', objectFit:'contain', display:'block' }}/>
            <button onClick={()=>setSV(null)}
              style={{ position:'absolute', top:12, left:12, background:'rgba(0,0,0,.65)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ padding:'16px 18px', flex:1 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14 }}>
              <Av profile={profile} size={36}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{profile?.full_name||profile?.username}</div>
                <div style={{ fontSize:11, color:T.sub }}>{selectedVideo.category} · {timeAgo(selectedVideo.created_at)}</div>
              </div>
              <div style={{ display:'flex', gap:14 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{fmt(selectedVideo.views_count)}</div>
                  <div style={{ fontSize:10, color:T.sub }}>Views</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.crimson }}>{fmt(selectedVideo.likes_count)}</div>
                  <div style={{ fontSize:10, color:T.sub }}>Likes</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:12 }}>{selectedVideo.title}</div>

            {selectedVideo.scout_report
              ? <ScoutReportPanel report={selectedVideo.scout_report}/>
              : <div style={{ padding:'16px', background:T.card, borderRadius:12, textAlign:'center', color:T.sub, fontSize:13 }}>🤖 AI analysis in progress…</div>
            }
          </div>
          <div style={{ height:32 }}/>
        </div>
      )}
    </div>
  )
}

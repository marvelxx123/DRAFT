import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProfile, getUserVideos, signOut, updateProfile, supabase } from '../lib/supabase.js'
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
        setLoad(false)
        // Track profile view (not own)
        if (!isOwn && session?.user?.id && p?.id) {
          supabase.from('notifications').insert({ user_id:p.id, actor_id:session.user.id, type:'view', text:'viewed your profile', link:`/profile/${p.id}`, read:false }).then(()=>{})
        }
      })
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

      {/* Subtle accent top strip */}
      <div style={{ height:2, background:`linear-gradient(90deg, ${accent}, transparent)` }}/>

      <div style={{ padding:'18px 18px 0', maxWidth:560, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', gap:18, alignItems:'flex-start', marginBottom:18 }}>
          {/* Avatar */}
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

          {/* Stats + buttons */}
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
              {profile?.verified && <span style={{ fontSize:13, color:T.scoutBlue }}>✓</span>}
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
              style={{ background:T.white, color:'#000', border:'none', borderRadius:10, padding:'13px', fontWeight:800, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", opacity:saving?.6:1 }}>
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

        {/* Sign out */}
        {isOwn && (
          <button onClick={async()=>{ await signOut(); navigate('/') }}
            style={{ width:'100%', padding:'11px', background:'transparent', border:`1px solid ${T.border2}`, borderRadius:10, color:T.sub, fontWeight:600, fontSize:13, marginBottom:18 }}>
            Sign Out
          </button>
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

      {/* Videos tab */}
      {tab==='videos' && (
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {videos.length===0 && (
            <div style={{ padding:'48px 20px', textAlign:'center', color:T.sub }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🎬</div>
              <p style={{ fontSize:15, marginBottom:16 }}>No videos yet</p>
              {isOwn && <Link to="/upload" style={{ background:T.white, color:'#000', borderRadius:10, padding:'11px 24px', fontWeight:800, fontSize:14, textDecoration:'none', display:'inline-block', fontFamily:"'Space Grotesk',sans-serif" }}>Upload First Video</Link>}
            </div>
          )}
          {videos.map(v=>(
            <div key={v.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:13, alignItems:'center' }}>
              <div style={{ width:60, height:60, borderRadius:10, background:T.card2, border:`1px solid ${T.border}`, flexShrink:0, overflow:'hidden', position:'relative' }}>
                <video src={v.video_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.35)' }}>
                  <svg width="14" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:3, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.title}</div>
                <div style={{ fontSize:11, color:T.sub }}>{fmt(v.views_count)} views · {v.category} · {timeAgo(v.created_at)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={T.crimson}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>{fmt(v.likes_count)}</span>
              </div>
            </div>
          ))}
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
    </div>
  )
}

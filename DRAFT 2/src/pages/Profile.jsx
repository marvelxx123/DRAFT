import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProfile, getUserVideos, signOut, updateProfile, supabase } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', border2:'#383838', accent:'#C8FF00', muted:'#888', sub:'#555', surface:'#0D0D0D', pink:'#FF2D78', blue:'#00C2FF', green:'#00E676' }
const ACC = { PG:C.accent, SG:C.pink, SF:C.blue, PF:C.green, C:'#9B5CFF', scout:'#FF6B00', coach:'#FF6B00' }
const fmt = n => n>=1000?(n/1000).toFixed(1)+'K':String(n||0)

function Av({ profile, size=80, accent=C.accent, ring=false, onClick }) {
  const name     = profile?.full_name || profile?.username || '?'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const outer    = ring ? size+6 : size
  return (
    <div onClick={onClick} style={{ width:outer, height:outer, borderRadius:'50%', flexShrink:0, background:ring?accent:'transparent', padding:ring?3:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:onClick?'pointer':'default', position:'relative' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} alt=""/>
        : <div style={{ width:size, height:size, borderRadius:'50%', background:`${accent}20`, border:`1.5px solid ${accent}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif" }}>{initials}</div>
      }
      {onClick && (
        <div style={{ position:'absolute', bottom:ring?4:0, right:ring?4:0, width:22, height:22, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #000' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
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
  const [uploading, setUplAv]= useState(false)
  const [editForm, setEF]    = useState({})
  const avatarRef            = useRef()

  const targetId = userId || session?.user?.id
  const isOwn    = session?.user?.id === targetId
  const accent   = ACC[profile?.position] || ACC[profile?.role] || C.accent

  useEffect(() => {
    if (!targetId) { setLoad(false); return }
    Promise.all([getProfile(targetId), getUserVideos(targetId)])
      .then(([{ data:p }, { data:v }]) => {
        setProf(p)
        setVideos(v||[])
        setEF({ full_name:p?.full_name||'', bio:p?.bio||'', school:p?.school||'', year:p?.year||'', height:p?.height||'', position:p?.position||'' })
        setLoad(false)
      })
  }, [targetId])

  const saveProfile = async () => {
    setSaving(true)
    await updateProfile(session.user.id, editForm)
    setProf(p=>({...p,...editForm}))
    setEdit(false)
    setSaving(false)
  }

  const uploadAvatar = async e => {
    const file = e.target.files[0]
    if (!file) return
    setUplAv(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `avatars/${session.user.id}.${ext}`
      await supabase.storage.from('avatars').upload(path, file, { upsert:true })
      const { data:{ publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)
      await updateProfile(session.user.id, { avatar_url: publicUrl })
      setProf(p=>({...p, avatar_url:publicUrl}))
    } catch(e) { console.error(e) }
    setUplAv(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const inp = { background:C.card, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:14, outline:'none', width:'100%', WebkitAppearance:'none' }
  const focus = e => e.target.style.borderColor = C.accent
  const blur  = e => e.target.style.borderColor = C.border

  if (!targetId) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, textAlign:'center' }}>
      <div style={{ fontSize:56 }}>🏀</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700 }}>Join DRAFT</div>
      <p style={{ color:C.muted, fontSize:15, maxWidth:260, lineHeight:1.6 }}>Create your player profile and get discovered by scouts</p>
      <Link to="/register" style={{ background:C.accent, color:'#000', borderRadius:12, padding:'14px 30px', fontWeight:800, fontSize:15, textDecoration:'none' }}>Create Free Profile</Link>
      <Link to="/login" style={{ color:C.accent, fontSize:14, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
    </div>
  )

  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${C.accent}`, borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ padding:'20px 18px 0', maxWidth:560, margin:'0 auto' }}>

        {/* Header row */}
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:16 }}>
          {/* Avatar with upload */}
          <div style={{ position:'relative' }}>
            <Av profile={profile} size={80} accent={accent} ring onClick={isOwn ? ()=>avatarRef.current.click() : undefined}/>
            {uploading && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.6)', borderRadius:'50%' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${C.accent}`, borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display:'none' }}/>
          </div>

          <div style={{ flex:1 }}>
            {/* Stats */}
            <div style={{ display:'flex', marginBottom:14 }}>
              {[[videos.length,'Posts'],[profile?.followers_count||0,'Followers'],[profile?.following_count||0,'Following']].map(([v,k])=>(
                <div key={k} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, lineHeight:1, fontWeight:700 }}>{v}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:4, fontWeight:500 }}>{k}</div>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display:'flex', gap:8 }}>
              {isOwn
                ? <>
                    <button onClick={() => setEdit(!editing)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, fontWeight:700, fontSize:14, background:C.card, color:'#fff', border:`1.5px solid ${C.border2}` }}>
                      {editing ? 'Cancel' : 'Edit Profile'}
                    </button>
                    <button onClick={handleSignOut}
                      style={{ padding:'9px 14px', borderRadius:10, fontWeight:700, fontSize:13, background:'transparent', color:C.muted, border:`1.5px solid ${C.border}` }}>
                      Sign out
                    </button>
                  </>
                : <button style={{ flex:1, padding:'9px 0', borderRadius:10, fontWeight:700, fontSize:14, background:accent, color:'#000', border:'none' }}>Follow</button>
              }
            </div>
          </div>
        </div>

        {/* Bio section */}
        {!editing ? (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, marginBottom:2 }}>{profile?.full_name||profile?.username}</div>
            {profile?.position && <div style={{ fontSize:14, fontWeight:600, color:accent, marginBottom:5 }}>{[profile.position, profile.school, profile.year].filter(Boolean).join(' · ')}</div>}
            {profile?.bio && <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, marginBottom:8 }}>{profile.bio}</p>}
            {profile?.height && <span style={{ fontSize:12, color:C.sub, background:C.card, padding:'4px 10px', borderRadius:7, border:`1px solid ${C.border}` }}>📏 {profile.height}</span>}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16, background:C.card, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
            <input placeholder="Full name" value={editForm.full_name} onChange={e=>setEF(f=>({...f,full_name:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="School or team" value={editForm.school} onChange={e=>setEF(f=>({...f,school:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="Year (e.g. Junior)" value={editForm.year} onChange={e=>setEF(f=>({...f,year:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <input placeholder="Height (e.g. 6'2)" value={editForm.height} onChange={e=>setEF(f=>({...f,height:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
            <textarea placeholder="Bio" value={editForm.bio} onChange={e=>setEF(f=>({...f,bio:e.target.value}))} rows={3} style={{ ...inp, resize:'none', lineHeight:1.5 }} onFocus={focus} onBlur={blur}/>
            <button onClick={saveProfile} disabled={saving}
              style={{ background:C.accent, color:'#000', border:'none', borderRadius:10, padding:'12px', fontWeight:800, fontSize:14, opacity:saving?.6:1 }}>
              {saving?'Saving…':'Save Changes'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
          {[['videos','▶  Videos'],['about','👤  About']].map(([id,lbl])=>(
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:'12px 0', background:'none', border:'none', borderBottom:tab===id?`2px solid ${accent}`:'2px solid transparent', color:tab===id?accent:C.muted, fontWeight:700, fontSize:14, transition:'all .18s' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Videos */}
      {tab==='videos' && (
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {videos.length===0 && (
            <div style={{ padding:'48px 20px', textAlign:'center', color:C.muted }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🎬</div>
              <p style={{ fontSize:15, marginBottom:16 }}>No videos yet</p>
              {isOwn && (
                <Link to="/upload" style={{ background:C.accent, color:'#000', borderRadius:10, padding:'12px 24px', fontWeight:800, fontSize:14, textDecoration:'none', display:'inline-block' }}>
                  Upload Your First Video
                </Link>
              )}
            </div>
          )}
          {videos.map(v => (
            <div key={v.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:13, alignItems:'center' }}>
              <div style={{ width:62, height:62, borderRadius:12, background:C.card, border:`1px solid ${C.border}`, flexShrink:0, overflow:'hidden', position:'relative' }}>
                <video src={v.video_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.35)' }}>
                  <svg width="16" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.title}</div>
                <div style={{ fontSize:12, color:C.muted }}>{fmt(v.views_count)} views · {v.category} · {new Date(v.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={C.pink}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{fmt(v.likes_count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* About */}
      {tab==='about' && (
        <div style={{ maxWidth:560, margin:'0 auto', padding:'16px 18px' }}>
          {[['Position',profile?.position],['School',profile?.school],['Year',profile?.year],['Height',profile?.height],['Role',profile?.role]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, color:C.muted }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:700 }}>{v}</span>
            </div>
          ))}
          {isOwn && (
            <div style={{ marginTop:24, padding:16, background:C.card, borderRadius:12, border:`1px solid ${C.border}`, textAlign:'center' }}>
              <p style={{ fontSize:13, color:C.muted, marginBottom:12 }}>Change your profile photo by tapping your avatar at the top</p>
              <button onClick={() => avatarRef.current?.click()} style={{ background:C.accent, color:'#000', border:'none', borderRadius:10, padding:'10px 22px', fontWeight:800, fontSize:13 }}>
                Upload Photo
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ height:40 }}/>
    </div>
  )
}

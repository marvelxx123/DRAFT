import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeedVideos, getLike, addLike, removeLike, getComments, addComment } from '../lib/supabase.js'

const C = { accent:'#C8FF00', pink:'#FF2D78', blue:'#00C2FF', green:'#00E676', muted:'#888', sub:'#555', surface:'#0D0D0D', card:'#161616', border:'#2A2A2A' }
const CAT_COLORS = { GAME:C.accent, HIGHLIGHT:C.pink, DEFENSE:C.blue, TRAINING:C.green, TOURNAMENT:'#9B5CFF', CAMP:'#FF6B00' }

const Ic = ({ n, size=24, color='#fff', fill=false, sw=1.8 }) => {
  const s = { width:size, height:size, display:'block', flexShrink:0 }
  const p = { stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  const f = { stroke:'none', fill:color }
  switch(n) {
    case 'heart':    return <svg style={s} viewBox="0 0 24 24">{fill?<path {...f} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>:<path {...p} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>}</svg>
    case 'comment':  return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'share':    return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline {...p} points="16 6 12 2 8 6"/><line {...p} x1="12" y1="2" x2="12" y2="15"/></svg>
    case 'save':     return <svg style={s} viewBox="0 0 24 24">{fill?<path {...f} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>:<path {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>}</svg>
    case 'plus':     return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="12" y1="5" x2="12" y2="19"/><line {...p} x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'close':    return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="18" y1="6" x2="6" y2="18"/><line {...p} x1="6" y1="6" x2="18" y2="18"/></svg>
    case 'send':     return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="22" y1="2" x2="11" y2="13"/><polygon {...p} points="22 2 15 22 11 13 2 9 22 2"/></svg>
    default: return null
  }
}

const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)

function Av({ profile, size=44, accent=C.accent, ring=false }) {
  const name    = profile?.full_name || profile?.username || '?'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const color   = accent
  const outer   = ring ? size+5 : size
  return (
    <div style={{ width:outer, height:outer, borderRadius:'50%', flexShrink:0, background:ring?color:'transparent', padding:ring?2.5:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
        : <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}20`, border:`1.5px solid ${color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.34, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif" }}>{initials}</div>
      }
    </div>
  )
}

function CommentsPanel({ video, session, onClose }) {
  const [list, setList]   = useState([])
  const [text, setText]   = useState('')
  const [loading, setLoad]= useState(true)
  const [cLiked, setCL]   = useState({})
  const endRef            = useRef()

  useEffect(()=>{
    getComments(video.id).then(({data})=>{ setList(data||[]); setLoad(false) })
  },[video.id])

  const send = async () => {
    if (!text.trim() || !session) return
    const { data } = await addComment(session.user.id, video.id, text.trim())
    setText('')
    // Refresh
    const { data: fresh } = await getComments(video.id)
    setList(fresh||[])
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),80)
  }

  return (
    <div className="slideUp" style={{ position:'absolute', bottom:0, left:0, right:0, height:'68%', background:C.surface, borderRadius:'20px 20px 0 0', zIndex:100, display:'flex', flexDirection:'column', boxShadow:'0 -2px 40px rgba(0,0,0,.9)' }}>
      <div style={{ padding:'12px 18px 10px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ width:36, height:3, background:'#333', borderRadius:2, margin:'0 auto 12px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:17 }}>{list.length} Comments</span>
          <button onClick={onClose} style={{ background:'#1E1E1E', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="close" size={14} color={C.muted}/>
          </button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
        {loading && <p style={{ color:C.muted, textAlign:'center', padding:'20px 0' }}>Loading…</p>}
        {list.map((c,i)=>(
          <div key={c.id||i} style={{ display:'flex', gap:11, marginBottom:20 }}>
            <Av profile={c.profiles} size={34}/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:13 }}>{c.profiles?.full_name||c.profiles?.username||'User'}</span>
                <span style={{ fontSize:11, color:C.sub }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize:14, color:'#ccc', lineHeight:1.5 }}>{c.text}</p>
              <div style={{ display:'flex', gap:14, marginTop:6 }}>
                <button onClick={()=>setCL(p=>({...p,[i]:!p[i]}))} style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:4 }}>
                  <Ic n="heart" size={12} color={cLiked[i]?C.pink:C.sub} fill={!!cLiked[i]}/>
                  <span style={{ fontSize:12, color:cLiked[i]?C.pink:C.sub, fontWeight:600 }}>{c.likes_count+(cLiked[i]?1:0)}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && list.length===0 && <p style={{ color:C.muted, textAlign:'center', padding:'20px 0', fontSize:14 }}>No comments yet — be first!</p>}
        <div ref={endRef}/>
      </div>
      <div style={{ padding:'10px 14px 14px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10, alignItems:'center' }}>
        {session
          ? <>
              <Av profile={null} size={32}/>
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
                placeholder="Add a comment…"
                style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:22, padding:'10px 16px', color:'#fff', fontSize:14, outline:'none' }}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
              <button onClick={send} style={{ background:'none', border:'none', opacity:text.trim()?1:.3 }}>
                <Ic n="send" size={20} color={C.accent}/>
              </button>
            </>
          : <p style={{ fontSize:13, color:C.muted, textAlign:'center', width:'100%', padding:'4px 0' }}>Sign in to comment</p>
        }
      </div>
    </div>
  )
}

function VideoSlide({ video, session, isActive }) {
  const navigate            = useNavigate()
  const [liked, setLiked]   = useState(false)
  const [likes, setLikes]   = useState(video.likes_count||0)
  const [saved, setSaved]   = useState(false)
  const [showC, setShowC]   = useState(false)
  const [bigHeart, setBig]  = useState(false)
  const videoRef            = useRef()
  const profile             = video.profiles

  useEffect(()=>{
    if (!session) return
    getLike(session.user.id, video.id).then(({data})=>setLiked(!!data))
  },[video.id, session])

  useEffect(()=>{
    if (!videoRef.current) return
    if (isActive) videoRef.current.play().catch(()=>{})
    else videoRef.current.pause()
  },[isActive])

  const doLike = async () => {
    if (!session) { navigate('/login'); return }
    const was = liked
    setLiked(!was)
    setLikes(l=>l+(was?-1:1))
    if (!was) { setBig(true); setTimeout(()=>setBig(false),700) }
    if (was) await removeLike(session.user.id, video.id)
    else await addLike(session.user.id, video.id)
  }

  const accent = CAT_COLORS[video.category] || C.accent

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background:'#000', flexShrink:0 }}>
      {/* Video */}
      <video ref={videoRef} src={video.video_url} loop muted playsInline
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
        onDoubleClick={doLike}/>

      {/* Gradient */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.2) 50%, transparent 100%)', pointerEvents:'none' }}/>

      {/* Big heart on double tap */}
      {bigHeart && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:60, pointerEvents:'none', animation:'heartPop .6s ease forwards' }}>
          <Ic n="heart" size={110} color={C.pink} fill/>
        </div>
      )}

      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'16px 18px', zIndex:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, letterSpacing:-.5 }}>DRAFT</span>
        <div style={{ display:'flex', gap:18 }}>
          {['For You','Following','Trending'].map((t,i)=>(
            <button key={t} style={{ background:'none', border:'none', color:i===0?'#fff':'rgba(255,255,255,.35)', fontWeight:700, fontSize:14, paddingBottom:3, borderBottom:i===0?`2px solid ${C.accent}`:'2px solid transparent' }}>{t}</button>
          ))}
        </div>
        <div style={{ width:40 }}/>
      </div>

      {/* Bottom left — player info */}
      <div style={{ position:'absolute', bottom:16, left:0, width:'78%', padding:'0 16px 18px', zIndex:20 }}>
        <button onClick={()=>navigate(`/profile/${profile?.id}`)}
          style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:11, marginBottom:12, padding:0, width:'100%' }}>
          <Av profile={profile} size={46} accent={accent} ring/>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, color:'#fff', lineHeight:1.2 }}>{profile?.full_name||profile?.username}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', fontWeight:500 }}>{profile?.position && `${profile.position} · `}{profile?.school}</div>
          </div>
          {session?.user?.id !== profile?.id && (
            <div style={{ marginLeft:'auto', padding:'5px 14px', background:'rgba(255,255,255,.1)', borderRadius:18, border:'1.5px solid rgba(255,255,255,.25)', backdropFilter:'blur(6px)' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>+ Follow</span>
            </div>
          )}
        </button>
        <p style={{ fontSize:16, fontWeight:600, color:'#fff', marginBottom:10, lineHeight:1.45 }}>{video.title}</p>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:800, padding:'4px 12px', borderRadius:20, background:accent, color:'#000' }}>{video.category}</span>
          {profile?.position && <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.8)', border:'1px solid rgba(255,255,255,.15)' }}>{profile.position}</span>}
        </div>
      </div>

      {/* Right side buttons */}
      <div style={{ position:'absolute', right:14, bottom:22, zIndex:20, display:'flex', flexDirection:'column', gap:26, alignItems:'center' }}>
        {/* Avatar */}
        <button onClick={()=>navigate(`/profile/${profile?.id}`)} style={{ background:'none', border:'none', position:'relative' }}>
          <Av profile={profile} size={46} accent={accent} ring/>
          <div style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', width:20, height:20, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #000' }}>
            <Ic n="plus" size={11} color="#000" sw={2.5}/>
          </div>
        </button>
        {/* Like */}
        <button onClick={doLike} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <Ic n="heart" size={34} color={liked?C.pink:'#fff'} fill={liked}/>
          <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{fmt(likes)}</span>
        </button>
        {/* Comment */}
        <button onClick={()=>setShowC(s=>!s)} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <Ic n="comment" size={32} color="#fff"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{fmt(video.comments_count)}</span>
        </button>
        {/* Share */}
        <button style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <Ic n="share" size={30} color="#fff"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Share</span>
        </button>
        {/* Save */}
        <button onClick={()=>setSaved(s=>!s)} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <Ic n="save" size={30} color={saved?C.accent:'#fff'} fill={saved}/>
          <span style={{ fontSize:13, fontWeight:700, color:saved?C.accent:'#fff' }}>Save</span>
        </button>
      </div>

      {showC && <CommentsPanel video={video} session={session} onClose={()=>setShowC(false)}/>}

      <style>{`
        @keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}45%{transform:translate(-50%,-50%) scale(1.8)}70%{transform:translate(-50%,-50%) scale(1.2)}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .slideUp{animation:slideUp .26s cubic-bezier(.32,.72,0,1);}
      `}</style>
    </div>
  )
}

export default function Feed({ session }) {
  const [videos, setVideos] = useState([])
  const [idx, setIdx]       = useState(0)
  const [loading, setLoad]  = useState(true)
  const touchY              = useRef(null)
  const lastNav             = useRef(0)
  const navigate            = useNavigate()

  useEffect(()=>{
    getFeedVideos().then(({data,error})=>{
      if (!error) setVideos(data||[])
      setLoad(false)
    })
  },[])

  const nav = dir => {
    const now = Date.now()
    if (now - lastNav.current < 300) return
    lastNav.current = now
    if (dir>0 && idx<videos.length-1) setIdx(i=>i+1)
    if (dir<0 && idx>0) setIdx(i=>i-1)
  }

  useEffect(()=>{
    const fn = e => { e.preventDefault(); nav(e.deltaY) }
    window.addEventListener('wheel', fn, { passive:false })
    return () => window.removeEventListener('wheel', fn)
  },[idx, videos.length])

  if (loading) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${C.accent}`, borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (videos.length===0) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24 }}>
      <div style={{ fontSize:56 }}>🏀</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:700 }}>No videos yet</div>
      <p style={{ color:C.muted, textAlign:'center', fontSize:15 }}>Be the first to upload your highlights</p>
      {session
        ? <button onClick={()=>navigate('/upload')} style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'13px 28px', fontWeight:800, fontSize:15 }}>Upload Now</button>
        : <button onClick={()=>navigate('/register')} style={{ background:C.accent, color:'#000', border:'none', borderRadius:12, padding:'13px 28px', fontWeight:800, fontSize:15 }}>Join DRAFT</button>
      }
    </div>
  )

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}
      onTouchStart={e=>{ touchY.current=e.touches[0].clientY }}
      onTouchEnd={e=>{ if(!touchY.current)return; const d=touchY.current-e.changedTouches[0].clientY; if(Math.abs(d)>44)nav(d); touchY.current=null }}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', transform:`translateY(-${idx*100}%)`, transition:'transform .35s cubic-bezier(.32,.72,0,1)' }}>
        {videos.map((v,i)=>(
          <div key={v.id} style={{ width:'100%', height:'100%', flexShrink:0 }}>
            <VideoSlide video={v} session={session} isActive={i===idx}/>
          </div>
        ))}
      </div>
      {/* Progress dots */}
      <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:5, zIndex:20 }}>
        {videos.map((_,i)=>(
          <div key={i} style={{ width:3, height:i===idx?22:5, borderRadius:2, background:i===idx?C.accent:'rgba(255,255,255,.2)', transition:'all .25s' }}/>
        ))}
      </div>
    </div>
  )
}

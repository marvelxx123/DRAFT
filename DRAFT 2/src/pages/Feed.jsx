import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeedVideos, getLike, addLike, removeLike, getComments, addComment, getFollow, follow, unfollow } from '../lib/supabase.js'
import { supabase } from '../lib/supabase.js'
import { T, POS, CAT, fmt, timeAgo, initials } from '../lib/theme.js'

const Ic = ({ n, size=24, color='#fff', fill=false, sw=1.8 }) => {
  const s = { width:size, height:size, display:'block', flexShrink:0 }
  const lp = { stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  const fp = { stroke:'none', fill:color }
  switch(n) {
    case 'heart':   return <svg style={s} viewBox="0 0 24 24">{fill?<path {...fp} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>:<path {...lp} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>}</svg>
    case 'comment': return <svg style={s} viewBox="0 0 24 24"><path {...lp} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'share':   return <svg style={s} viewBox="0 0 24 24"><path {...lp} d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline {...lp} points="16 6 12 2 8 6"/><line {...lp} x1="12" y1="2" x2="12" y2="15"/></svg>
    case 'save':    return <svg style={s} viewBox="0 0 24 24">{fill?<path {...fp} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>:<path {...lp} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>}</svg>
    case 'plus':    return <svg style={s} viewBox="0 0 24 24"><line {...lp} x1="12" y1="5" x2="12" y2="19"/><line {...lp} x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'close':   return <svg style={s} viewBox="0 0 24 24"><line {...lp} x1="18" y1="6" x2="6" y2="18"/><line {...lp} x1="6" y1="6" x2="18" y2="18"/></svg>
    case 'send':    return <svg style={s} viewBox="0 0 24 24"><line {...lp} x1="22" y1="2" x2="11" y2="13"/><polygon {...lp} points="22 2 15 22 11 13 2 9 22 2"/></svg>
    case 'play':    return <svg style={s} viewBox="0 0 24 24"><polygon {...fp} points="5 3 19 12 5 21 5 3"/></svg>
    default: return null
  }
}

function Av({ profile, size=44, color }) {
  const accent = color || POS[profile?.position] || T.electric
  const name   = profile?.full_name || profile?.username || '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${accent}18`, border:`1.5px solid ${accent}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
        : initials(name)
      }
    </div>
  )
}

function CommentsPanel({ video, session, onClose }) {
  const [list, setList]  = useState([])
  const [text, setText]  = useState('')
  const [busy, setBusy]  = useState(false)
  const [load, setLoad]  = useState(true)
  const [cLikes, setCL]  = useState({})
  const endRef           = useRef()

  useEffect(() => {
    getComments(video.id).then(({ data }) => { setList(data||[]); setLoad(false) })
  }, [video.id])

  const send = async () => {
    if (!text.trim() || !session || busy) return
    setBusy(true)
    await addComment(session.user.id, video.id, text.trim())
    setText('')
    const { data } = await getComments(video.id)
    setList(data||[])
    setBusy(false)
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 80)
  }

  const isScout = (p) => p?.role === 'scout' || p?.role === 'coach'

  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'72%', background:T.surface, borderRadius:'20px 20px 0 0', zIndex:100, display:'flex', flexDirection:'column', boxShadow:'0 -1px 0 #222, 0 -24px 60px rgba(0,0,0,.95)', animation:'slideUp .28s cubic-bezier(.32,.72,0,1)' }}>
      <div style={{ padding:'10px 18px 12px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ width:32, height:3, background:T.border3, borderRadius:2, margin:'0 auto 12px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16 }}>{list.length} Comments</span>
          <button onClick={onClose} style={{ background:T.card2, border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="close" size={13} color={T.sub}/>
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', WebkitOverflowScrolling:'touch' }}>
        {load && <p style={{ color:T.sub, textAlign:'center', padding:'20px 0', fontSize:13 }}>Loading…</p>}
        {!load && list.length===0 && <p style={{ color:T.sub, textAlign:'center', padding:'20px 0', fontSize:14 }}>No comments yet — be first 🏀</p>}
        {list.map((c,i) => (
          <div key={c.id||i} style={{ display:'flex', gap:11, marginBottom:20 }}>
            <Av profile={c.profiles} size={34}/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:13, color: isScout(c.profiles) ? T.scoutBlue : T.text }}>{c.profiles?.full_name || c.profiles?.username}</span>
                {isScout(c.profiles) && <span style={{ fontSize:9, fontWeight:800, color:T.scoutBlue, background:`${T.scoutBlue}18`, padding:'1px 6px', borderRadius:4, letterSpacing:.5 }}>SCOUT</span>}
                <span style={{ fontSize:11, color:T.sub }}>{timeAgo(c.created_at)}</span>
              </div>
              <p style={{ fontSize:14, color:T.text2, lineHeight:1.5 }}>{c.text}</p>
              <button onClick={()=>setCL(prev=>({...prev,[i]:!prev[i]}))} style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                <Ic n="heart" size={12} color={cLikes[i]?T.crimson:T.sub} fill={!!cLikes[i]}/>
                <span style={{ fontSize:11, color:cLikes[i]?T.crimson:T.sub, fontWeight:600 }}>{c.likes_count+(cLikes[i]?1:0)}</span>
              </button>
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      <div style={{ padding:'10px 12px 16px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'center', background:T.surface }}>
        {session
          ? <>
              <Av profile={null} size={30}/>
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
                placeholder="Add a comment…"
                style={{ flex:1, background:T.card, border:`1.5px solid ${T.border2}`, borderRadius:22, padding:'10px 16px', color:T.text, fontSize:14, outline:'none' }}
                onFocus={e=>e.target.style.borderColor=T.electric}
                onBlur={e=>e.target.style.borderColor=T.border2}/>
              <button onClick={send} disabled={!text.trim()||busy} style={{ background:'none', border:'none', opacity:text.trim()&&!busy?1:.3, transition:'opacity .18s' }}>
                <Ic n="send" size={20} color={T.electric}/>
              </button>
            </>
          : <p style={{ fontSize:14, color:T.sub, textAlign:'center', width:'100%' }}>Sign in to comment</p>
        }
      </div>
    </div>
  )
}

function VideoSlide({ video, session, isActive }) {
  const navigate              = useNavigate()
  const [liked, setLiked]     = useState(false)
  const [likes, setLikes]     = useState(video.likes_count||0)
  const [saved, setSaved]     = useState(false)
  const [showC, setShowC]     = useState(false)
  const [heart, setHeart]     = useState(false)
  const [paused, setPause]    = useState(false)
  const [following, setFollowing] = useState(false)
  const videoRef              = useRef()
  const p                     = video.profiles
  const accent                = POS[p?.position] || T.electric
  const catColor              = CAT[video.category] || T.electric

  useEffect(() => {
    if (!session) return
    getLike(session.user.id, video.id).then(({ data }) => setLiked(!!data))
  }, [video.id, session])

  useEffect(() => {
    if (!session || !p?.id || session.user.id === p.id) return
    getFollow(session.user.id, p.id).then(({ data }) => setFollowing(!!data))
  }, [video.id, session])

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive && !paused) videoRef.current.play().catch(()=>{})
    else videoRef.current.pause()
  }, [isActive, paused])

  const doLike = async () => {
    if (!session) { navigate('/login'); return }
    const was = liked
    setLiked(!was); setLikes(l=>l+(was?-1:1))
    if (!was) { setHeart(true); setTimeout(()=>setHeart(false), 700) }
    if (was) await removeLike(session.user.id, video.id)
    else await addLike(session.user.id, video.id)
  }

  const doFollow = async (e) => {
    e.stopPropagation()
    if (!session) { navigate('/login'); return }
    const was = following
    setFollowing(!was)
    if (was) await unfollow(session.user.id, p.id)
    else await follow(session.user.id, p.id)
  }

  const share = () => {
    const url = `${window.location.origin}/profile/${p?.id}`
    if (navigator.share) navigator.share({ title:video.title, url })
    else { navigator.clipboard?.writeText(url); alert('Link copied!') }
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background:'#000', flexShrink:0, overflow:'hidden' }}>
      {/* Video */}
      <video ref={videoRef} src={video.video_url} loop muted playsInline
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
        onClick={()=>setPause(prev=>!prev)} onDoubleClick={doLike}/>

      {/* Pause icon */}
      {paused && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:50, pointerEvents:'none', background:'rgba(0,0,0,.45)', borderRadius:'50%', width:70, height:70, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Ic n="play" size={30} color="rgba(255,255,255,.9)" fill/>
        </div>
      )}

      {/* Heart pop */}
      {heart && (
        <div style={{ position:'absolute', top:'50%', left:'50%', zIndex:60, pointerEvents:'none', animation:'heartPop .65s ease forwards' }}>
          <Ic n="heart" size={96} color={T.crimson} fill/>
        </div>
      )}

      {/* Gradient */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.96) 0%, rgba(0,0,0,.3) 55%, rgba(0,0,0,.2) 100%)', pointerEvents:'none', zIndex:10 }}/>

      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'16px 18px', zIndex:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, letterSpacing:-1, color:'#fff' }}>DRAFT</div>
        <div style={{ display:'flex', gap:18 }}>
          {['For You','Following'].map((t,i)=>(
            <button key={t} style={{ background:'none', border:'none', fontWeight:700, fontSize:14, color:i===0?'#fff':'rgba(255,255,255,.35)', paddingBottom:3, borderBottom:i===0?`2px solid ${T.electric}`:'2px solid transparent' }}>{t}</button>
          ))}
        </div>
        <div style={{ width:40 }}/>
      </div>

      {/* Bottom left — info */}
      <div style={{ position:'absolute', bottom:16, left:0, width:'80%', padding:'0 16px 18px', zIndex:20 }}>
        {/* Player row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={()=>navigate(`/profile/${p?.id}`)}
            style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:12, flex:1, padding:0, textAlign:'left' }}>
            <div style={{ position:'relative' }}>
              <Av profile={p} size={46} color={accent}/>
              <div style={{ position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)', background:T.surface, border:`1px solid ${T.border2}`, borderRadius:10, padding:'1px 7px' }}>
                <span style={{ fontSize:9, fontWeight:800, color:accent, letterSpacing:.5 }}>{p?.position || 'PG'}</span>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, color:'#fff', lineHeight:1.2 }}>{p?.full_name || p?.username}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontWeight:500 }}>{p?.school}</div>
            </div>
          </button>
          {session?.user?.id !== p?.id && (
            <button onClick={doFollow}
              style={{ padding:'6px 14px', background:following?`${T.electric}18`:'rgba(255,255,255,.08)', borderRadius:18, border:following?`1px solid ${T.electric}40`:'1px solid rgba(255,255,255,.15)', backdropFilter:'blur(8px)', flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:700, color:following?T.electric:'#fff' }}>{following?'Following':'+ Follow'}</span>
            </button>
          )}
        </div>

        {/* Title */}
        <p style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.92)', marginBottom:10, lineHeight:1.4 }}>{video.title}</p>

        {/* Tags */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:800, padding:'4px 11px', borderRadius:6, background:catColor, color:'#000', letterSpacing:.3 }}>{video.category}</span>
          {p?.draft_score && <span style={{ fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:6, background:'rgba(255,255,255,.06)', color:T.gold, border:`1px solid ${T.gold}40` }}>DRAFT {p.draft_score}</span>}
          {p?.year && <span style={{ fontSize:11, fontWeight:600, padding:'4px 11px', borderRadius:6, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.1)' }}>{p.year}</span>}
        </div>
      </div>

      {/* Right side buttons */}
      <div style={{ position:'absolute', right:14, bottom:22, zIndex:20, display:'flex', flexDirection:'column', gap:24, alignItems:'center' }}>
        {/* Avatar */}
        <button onClick={()=>navigate(`/profile/${p?.id}`)} style={{ background:'none', border:'none', position:'relative' }}>
          <Av profile={p} size={46} color={accent}/>
          <div style={{ position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)', width:20, height:20, borderRadius:'50%', background:T.electric, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #000' }}>
            <Ic n="plus" size={11} color="#000" sw={2.5}/>
          </div>
        </button>

        {[
          { icon:'heart', filled:liked, count:fmt(likes), color:liked?T.crimson:'#fff', action:doLike },
          { icon:'comment', filled:false, count:fmt(video.comments_count), color:'#fff', action:()=>setShowC(s=>!s) },
          { icon:'share', filled:false, count:'Share', color:'#fff', action:share },
          { icon:'save', filled:saved, count:'Save', color:saved?T.gold:'#fff', action:()=>setSaved(s=>!s) },
        ].map((btn,i)=>(
          <button key={i} onClick={btn.action} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <Ic n={btn.icon} size={i===0?32:28} color={btn.color} fill={btn.filled}/>
            <span style={{ fontSize:12, fontWeight:700, color:btn.color }}>{btn.count}</span>
          </button>
        ))}
      </div>

      {/* Progress dots */}
      <div style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:4, zIndex:20, pointerEvents:'none' }}>
        {Array.from({ length: Math.min(video._total||7, 7) }).map((_,i)=>(
          <div key={i} style={{ width:2.5, height:i===video._idx?18:4, borderRadius:2, background:i===video._idx?T.electric:'rgba(255,255,255,.15)', transition:'all .25s' }}/>
        ))}
      </div>

      {showC && <CommentsPanel video={video} session={session} onClose={()=>setShowC(false)}/>}
    </div>
  )
}

export default function Feed({ session }) {
  const [videos, setVideos]   = useState([])
  const [idx, setIdx]         = useState(0)
  const [loading, setLoad]    = useState(true)
  const touchY                = useRef(null)
  const lastNav               = useRef(0)
  const navigate              = useNavigate()

  useEffect(() => {
    getFeedVideos().then(({ data }) => {
      setVideos((data||[]).map((v,i,arr)=>({...v,_idx:i,_total:arr.length})))
      setLoad(false)
    })
  }, [])

  const nav = dir => {
    const now = Date.now()
    if (now - lastNav.current < 280) return
    lastNav.current = now
    if (dir>0 && idx<videos.length-1) setIdx(i=>i+1)
    if (dir<0 && idx>0) setIdx(i=>i-1)
  }

  useEffect(() => {
    const fn = e => { e.preventDefault(); nav(e.deltaY) }
    window.addEventListener('wheel', fn, { passive:false })
    return () => window.removeEventListener('wheel', fn)
  }, [idx, videos.length])

  if (loading) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:T.bg }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-2, color:T.electric }}>DRAFT</div>
      <div className="spin" style={{ width:22, height:22, borderRadius:'50%', border:`2.5px solid ${T.electric}`, borderTopColor:'transparent' }}/>
    </div>
  )

  if (videos.length===0) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:28, textAlign:'center', background:T.bg }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:36, fontWeight:700, letterSpacing:-2, color:T.electric, marginBottom:4 }}>DRAFT</div>
      <p style={{ fontSize:28, fontWeight:700, color:T.text, fontFamily:"'Space Grotesk',sans-serif" }}>No videos yet</p>
      <p style={{ color:T.sub, fontSize:15, maxWidth:260, lineHeight:1.6 }}>Be the first to upload your highlights and get discovered</p>
      {session
        ? <button onClick={()=>navigate('/upload')} style={{ background:T.electric, color:'#000', border:'none', borderRadius:14, padding:'15px 30px', fontWeight:800, fontSize:15, fontFamily:"'Space Grotesk',sans-serif", marginTop:8 }}>Upload Now</button>
        : <button onClick={()=>navigate('/register')} style={{ background:T.white, color:'#000', border:'none', borderRadius:14, padding:'15px 30px', fontWeight:800, fontSize:15, fontFamily:"'Space Grotesk',sans-serif", marginTop:8 }}>Join DRAFT Free</button>
      }
    </div>
  )

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background:'#000' }}
      onTouchStart={e=>{touchY.current=e.touches[0].clientY}}
      onTouchEnd={e=>{ if(!touchY.current)return; const d=touchY.current-e.changedTouches[0].clientY; if(Math.abs(d)>44)nav(d); touchY.current=null }}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', transform:`translateY(-${idx*100}%)`, transition:'transform .38s cubic-bezier(.32,.72,0,1)', willChange:'transform' }}>
        {videos.map((v,i)=>(
          <div key={v.id} style={{ width:'100%', height:'100%', flexShrink:0 }}>
            <VideoSlide video={v} session={session} isActive={i===idx}/>
          </div>
        ))}
      </div>
    </div>
  )
}

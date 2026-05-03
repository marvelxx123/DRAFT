import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotifsRead } from '../lib/supabase.js'
import { T, initials, timeAgo } from '../lib/theme.js'

const ICONS = {
  like:          '❤️',
  comment:       '💬',
  follow:        '👤',
  message:       '✉️',
  view:          '👁️',
  scout_interest:'🎯',
}

function Av({ profile, size=44 }) {
  const isScout = profile?.role==='scout'||profile?.role==='coach'
  const color   = isScout ? T.scoutBlue : T.electric
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${color}15`, border:`1.5px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden', position:'relative' }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : initials(profile?.full_name||profile?.username||'?')}
    </div>
  )
}

export default function Notifications({ session }) {
  const navigate            = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    if (!session?.user?.id) { setLoad(false); return }
    getNotifications(session.user.id).then(({ data }) => {
      setNotifs(data||[]); setLoad(false)
      markNotifsRead(session.user.id)
    })
  }, [session])

  if (!session) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24, background:T.bg }}>
      <div style={{ fontSize:44 }}>🔔</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700 }}>Sign in to see notifications</div>
      <button onClick={()=>navigate('/login')} style={{ background:T.white, color:'#000', border:'none', borderRadius:12, padding:'13px 28px', fontWeight:800, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>Sign In</button>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:T.bg }}>
      <div style={{ padding:'20px 18px 12px' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:700 }}>Notifications</div>
      </div>

      {loading && <div style={{ display:'flex', justifyContent:'center', padding:'30px' }}><div className="spin" style={{ width:22, height:22, borderRadius:'50%', border:`2.5px solid ${T.electric}`, borderTopColor:'transparent' }}/></div>}

      {!loading && notifs.length===0 && (
        <div style={{ padding:'0 18px 20px' }}>
          <div style={{ padding:'48px 24px 28px', textAlign:'center', color:T.sub }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🔔</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, marginBottom:8, color:T.text }}>No notifications yet</div>
            <p style={{ fontSize:14, lineHeight:1.7 }}>When scouts view your profile, like your videos, or send messages — you'll see it here in real time.</p>
          </div>

          {/* Tips */}
          <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12, fontWeight:800, color:T.electric, letterSpacing:.5 }}>HOW TO GET NOTICED BY SCOUTS</span>
            </div>
            {[
              ['📹','Upload game film — scouts browse the feed every day'],
              ['📊','Keep your stats updated — DRAFT Score ranks you vs others'],
              ['⭐','Earn likes & comments — engagement = more visibility'],
              ['🔗','Share your profile link on Instagram and Twitter'],
              ['🏀','Log your games — scouts love seeing consistent stats'],
            ].map((tip,i)=>(
              <div key={i} style={{ padding:'12px 16px', borderBottom:i<4?`1px solid ${T.border}`:'none', display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontSize:18 }}>{tip[0]}</span>
                <span style={{ fontSize:13, color:T.sub, lineHeight:1.5 }}>{tip[1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifs.map(n => (
        <div key={n.id} onClick={()=>n.link&&navigate(n.link)}
          style={{ padding:'14px 18px', display:'flex', gap:13, alignItems:'center', borderBottom:`1px solid ${T.border}`, background:n.read?'transparent':`${T.electric}05`, cursor:n.link?'pointer':'default' }}>
          <div style={{ position:'relative' }}>
            <Av profile={n.actor} size={46}/>
            <div style={{ position:'absolute', bottom:-2, right:-2, width:20, height:20, borderRadius:'50%', background:T.card2, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
              {ICONS[n.type]||'🏀'}
            </div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, lineHeight:1.5, marginBottom:3 }}>
              <strong style={{ color:T.text }}>{n.actor?.full_name||'Someone'}</strong>
              {' '}
              <span style={{ color:T.text2 }}>{n.text}</span>
            </div>
            <div style={{ fontSize:11, color:T.muted }}>{timeAgo(n.created_at)}</div>
          </div>
          {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:T.electric, flexShrink:0 }}/>}
        </div>
      ))}

      <div style={{ height:40 }}/>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getConversations, getMessages, sendMessage, markRead, getProfile, createNotification } from '../lib/supabase.js'
import { supabase } from '../lib/supabase.js'
import { T, initials, timeAgo } from '../lib/theme.js'

function Av({ profile, size=42 }) {
  const isScout = profile?.role === 'scout' || profile?.role === 'coach'
  const color   = isScout ? T.scoutBlue : T.electric
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${color}15`, border:`1.5px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : initials(profile?.full_name||profile?.username||'?')}
    </div>
  )
}

function ChatView({ userId, other, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [sending, setSend]      = useState(false)
  const [myProfile, setMe]      = useState(null)
  const endRef                  = useRef()
  const isScout = other?.role === 'scout' || other?.role === 'coach'

  useEffect(() => {
    getProfile(userId).then(({ data }) => setMe(data))
  }, [userId])

  useEffect(() => {
    if (!other) return
    markRead(userId, other.id)
    getMessages(userId, other.id).then(({ data }) => {
      setMessages(data||[])
      setTimeout(() => endRef.current?.scrollIntoView(), 100)
    })
    const ch = supabase.channel(`chat_${[userId,other.id].sort().join('_')}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' }, ({ new:msg }) => {
        if ((msg.sender_id===userId&&msg.receiver_id===other.id)||(msg.sender_id===other.id&&msg.receiver_id===userId)) {
          setMessages(p => p.some(m => m.id === msg.id) ? p : [...p, msg])
          setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 80)
        }
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [other?.id])

  const send = async () => {
    if (!text.trim() || sending) return
    const msgText = text.trim()
    setSend(true)
    setText('')
    // Optimistic update — show immediately without waiting for realtime
    const tempId = `tmp_${Date.now()}`
    const optimistic = { id:tempId, sender_id:userId, receiver_id:other.id, text:msgText, created_at:new Date().toISOString(), read:false }
    setMessages(p => [...p, optimistic])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    const { data } = await sendMessage(userId, other.id, msgText)
    if (data) setMessages(p => p.map(m => m.id === tempId ? data : m))
    createNotification(other.id, userId, 'message', `${myProfile?.full_name||'Someone'} sent you a message`, '/messages')
    setSend(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12, flexShrink:0, background:T.surface }}>
        <button onClick={onBack} style={{ background:'none', border:'none', padding:4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <Av profile={other} size={38}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{other?.full_name||other?.username}</div>
          <div style={{ fontSize:11, color:isScout?T.scoutBlue:T.sub, fontWeight:700 }}>
            {isScout ? '✓ Verified Scout' : other?.position ? `${other.position} · ${other?.school||''}` : 'Player'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', WebkitOverflowScrolling:'touch' }}>
        {messages.map((m,i)=>{
          const mine = m.sender_id === userId
          return (
            <div key={m.id||i} style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start', marginBottom:10, alignItems:'flex-end', gap:8 }}>
              {!mine && <Av profile={other} size={26}/>}
              <div style={{ maxWidth:'70%' }}>
                <div style={{ background:mine?T.electric:T.card2, color:mine?'#000':T.text, padding:'11px 15px', borderRadius:mine?'18px 18px 4px 18px':'18px 18px 18px 4px', fontSize:14, fontWeight:mine?600:400, lineHeight:1.5, border:mine?'none':`1px solid ${T.border2}` }}>
                  {m.text}
                </div>
                <div style={{ fontSize:10, color:T.muted, marginTop:3, textAlign:mine?'right':'left' }}>{timeAgo(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'center', background:T.surface, flexShrink:0, paddingBottom:'max(10px, env(safe-area-inset-bottom))' }}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Message…"
          style={{ flex:1, background:T.card, border:`1px solid ${T.border2}`, borderRadius:22, padding:'11px 16px', color:T.text, fontSize:14, outline:'none' }}
          onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border2}/>
        <button onClick={send} disabled={!text.trim()||sending}
          style={{ width:40, height:40, borderRadius:'50%', background:text.trim()?T.electric:T.card, border:'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .18s' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={text.trim()?'#000':T.sub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon fill={text.trim()?'#000':T.sub} stroke="none" points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Messages({ session }) {
  const navigate                 = useNavigate()
  const [params]                 = useSearchParams()
  const [conversations, setConvos]= useState([])
  const [selected, setSelected]  = useState(null)
  const [loading, setLoad]       = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    const withId = params.get('with')
    if (withId) getProfile(withId).then(({ data }) => data && setSelected(data))
    loadConversations()
  }, [session])

  const loadConversations = async () => {
    if (!session?.user?.id) return
    const { data } = await getConversations(session.user.id)
    setConvos(data||[]); setLoad(false)
  }

  if (!session) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24, background:T.bg }}>
      <div style={{ fontSize:44 }}>💬</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700 }}>Sign in to view messages</div>
      <button onClick={()=>navigate('/login')} style={{ background:T.white, color:'#000', border:'none', borderRadius:12, padding:'13px 28px', fontWeight:800, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>Sign In</button>
    </div>
  )

  // Group conversations
  const grouped = {}
  conversations.forEach(m => {
    const other = m.sender_id===session.user.id ? m.receiver : m.sender
    if (!other) return
    if (!grouped[other.id]) grouped[other.id] = { other, latest:m, unread:0 }
    if (!m.read && m.receiver_id===session.user.id) grouped[other.id].unread++
  })
  const convos = Object.values(grouped).sort((a,b)=>new Date(b.latest.created_at)-new Date(a.latest.created_at))

  return (
    <div style={{ height:'100%', background:T.bg, display:'flex', flexDirection:'column' }}>
      {selected
        ? <ChatView userId={session.user.id} other={selected} onBack={()=>{ setSelected(null); loadConversations() }}/>
        : (
          <div style={{ flex:1, overflowY:'auto' }}>
            <div style={{ padding:'20px 18px 12px' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:700 }}>Messages</div>
            </div>
            {loading && <div style={{ display:'flex', justifyContent:'center', padding:'30px' }}><div className="spin" style={{ width:22, height:22, borderRadius:'50%', border:`2.5px solid ${T.electric}`, borderTopColor:'transparent' }}/></div>}
            {!loading && convos.length===0 && (
              <div style={{ padding:'48px 24px', textAlign:'center', color:T.sub }}>
                <div style={{ fontSize:44, marginBottom:12 }}>💬</div>
                <p style={{ fontWeight:700, fontSize:16, marginBottom:6, color:T.text }}>No messages yet</p>
                <p style={{ fontSize:14 }}>Scouts and coaches will reach out here. Share your profile to get noticed.</p>
              </div>
            )}
            {convos.map(({ other, latest, unread })=>(
              <div key={other.id} onClick={()=>setSelected(other)}
                style={{ padding:'14px 18px', display:'flex', gap:13, alignItems:'center', cursor:'pointer', borderBottom:`1px solid ${T.border}` }}>
                <Av profile={other} size={48}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontWeight:unread?800:600, fontSize:15, color:T.text }}>{other.full_name||other.username}</span>
                    <span style={{ fontSize:11, color:T.muted }}>{timeAgo(latest.created_at)}</span>
                  </div>
                  <span style={{ fontSize:13, color:T.sub, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>{latest.text}</span>
                </div>
                {unread > 0 && (
                  <div style={{ width:20, height:20, borderRadius:'50%', background:T.electric, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:900, color:'#000' }}>{unread}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

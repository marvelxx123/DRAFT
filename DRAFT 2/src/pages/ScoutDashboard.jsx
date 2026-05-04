import { T, POS, CAT, fmt, timeAgo, initials } from '../lib/theme.js'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const C = {
  bg:'#000', surface:'#0D0D0D', card:'#161616', card2:'#1F1F1F',
  border:'#2A2A2A', border2:'#383838',
  text:'#FFFFFF', text2:'#CCCCCC', sub:'#888', muted:'#555',
  accent:'#C8FF00', pink:'#FF2D78', blue:'#00C2FF',
  green:'#00E676', purple:'#9B5CFF', orange:'#FF6B00',
}

const ACC = { PG:T.lime, SG:T.crimson, SF:T.scoutBlue, PF:'#30D158', C:'#BF5AF2' }

const POSITIONS = ['All','PG','SG','SF','PF','C']
const LEVELS    = ['All','High School','College']
const YEARS     = ['All','Freshman','Sophomore','Junior','Senior','Senior (HS)','Junior (HS)']
const SORT_OPTS = ['Newest','DRAFT Score','Name']

/* ── Icons ── */
const Ic = ({ n, size=18, color='#fff', sw=1.7 }) => {
  const s = { width:size, height:size, display:'block', flexShrink:0 }
  const p = { stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  switch(n) {
    case 'search':  return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="8"/><line {...p} x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    case 'filter':  return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="4" y1="6" x2="20" y2="6"/><line {...p} x1="8" y1="12" x2="16" y2="12"/><line {...p} x1="11" y1="18" x2="13" y2="18"/></svg>
    case 'star':    return <svg style={s} viewBox="0 0 24 24"><polygon {...p} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'star-f':  return <svg style={s} viewBox="0 0 24 24"><polygon fill={color} stroke="none" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'note':    return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline {...p} points="14 2 14 8 20 8"/><line {...p} x1="16" y1="13" x2="8" y2="13"/><line {...p} x1="16" y1="17" x2="8" y2="17"/></svg>
    case 'msg':     return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'compare': return <svg style={s} viewBox="0 0 24 24"><rect {...p} x="3" y="3" width="7" height="18" rx="1"/><rect {...p} x="14" y="3" width="7" height="18" rx="1"/></svg>
    case 'board':   return <svg style={s} viewBox="0 0 24 24"><rect {...p} x="3" y="3" width="7" height="7" rx="1"/><rect {...p} x="14" y="3" width="7" height="7" rx="1"/><rect {...p} x="3" y="14" width="7" height="7" rx="1"/><rect {...p} x="14" y="14" width="7" height="7" rx="1"/></svg>
    case 'bell':    return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path {...p} d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    case 'eye':     return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle {...p} cx="12" cy="12" r="3"/></svg>
    case 'close':   return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="18" y1="6" x2="6" y2="18"/><line {...p} x1="6" y1="6" x2="18" y2="18"/></svg>
    case 'check':   return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="20 6 9 17 4 12"/></svg>
    case 'plus':    return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="12" y1="5" x2="12" y2="19"/><line {...p} x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'trash':   return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="3 6 5 6 21 6"/><path {...p} d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path {...p} d="M10 11v6M14 11v6"/></svg>
    case 'back':    return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="15 18 9 12 15 6"/></svg>
    case 'play':    return <svg style={s} viewBox="0 0 24 24"><polygon fill={color} stroke="none" points="5 3 19 12 5 21 5 3"/></svg>
    default: return null
  }
}

/* ── Avatar ── */
function Av({ profile, size=44, accent=T.lime }) {
  const name     = profile?.full_name || profile?.username || '?'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${accent}20`, border:`1.5px solid ${accent}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.34, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
        : initials
      }
    </div>
  )
}

/* ── Score Badge ── */
function Score({ val, accent=T.lime }) {
  return (
    <div style={{ background:`${accent}15`, border:`1.5px solid ${accent}44`, borderRadius:10, padding:'6px 11px', textAlign:'center', flexShrink:0, minWidth:52 }}>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:accent, lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1.2, marginTop:2 }}>DRAFT</div>
    </div>
  )
}

/* ── Notes Modal ── */
function NotesModal({ player, notes, onSave, onClose }) {
  const [text, setText] = useState(notes || '')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, width:'100%', maxWidth:440, overflow:'hidden' }}>
        <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16 }}>Scout Notes</div>
            <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{player?.full_name}</div>
          </div>
          <button onClick={onClose} style={{ background:T.card2, border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="close" size={14} color={T.sub}/>
          </button>
        </div>
        <div style={{ padding:20 }}>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={6}
            placeholder="Add your evaluation notes... e.g. Great court vision, needs to improve 3-point shooting, physical tools are elite..."
            style={{ width:'100%', background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10, padding:'12px 14px', color:T.text, fontSize:14, outline:'none', resize:'none', lineHeight:1.6, fontFamily:'Inter,sans-serif' }}
            onFocus={e=>e.target.style.borderColor=T.lime} onBlur={e=>e.target.style.borderColor=T.border}/>
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button onClick={onClose} style={{ flex:1, padding:'11px 0', borderRadius:10, background:'transparent', border:`1.5px solid ${T.border}`, color:T.sub, fontWeight:700, fontSize:14 }}>Cancel</button>
            <button onClick={()=>{ onSave(text); onClose() }} style={{ flex:2, padding:'11px 0', borderRadius:10, background:T.lime, border:'none', color:'#000', fontWeight:800, fontSize:14 }}>Save Notes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── New Board Modal ── */
function NewBoardModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, width:'100%', maxWidth:380, padding:24 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, marginBottom:16 }}>New Board</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder='e.g. "PG Targets 2026" or "Final 5"'
          style={{ width:'100%', background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10, padding:'12px 14px', color:T.text, fontSize:15, outline:'none', marginBottom:14, fontFamily:'Inter,sans-serif' }}
          onFocus={e=>e.target.style.borderColor=T.lime} onBlur={e=>e.target.style.borderColor=T.border}
          autoFocus onKeyDown={e=>e.key==='Enter'&&name.trim()&&onSave(name.trim())}/>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px 0', borderRadius:10, background:'transparent', border:`1.5px solid ${T.border}`, color:T.sub, fontWeight:700, fontSize:14 }}>Cancel</button>
          <button onClick={()=>name.trim()&&onSave(name.trim())} style={{ flex:2, padding:'11px 0', borderRadius:10, background:T.lime, border:'none', color:'#000', fontWeight:800, fontSize:14 }}>Create Board</button>
        </div>
      </div>
    </div>
  )
}

/* ── Player Card (Scout View) ── */
function ScoutPlayerCard({ player: p, saved, onSave, onNote, onCompare, inCompare, note, onView }) {
  const accent   = ACC[p.position] || T.lime
  const [videoCount, setVC] = useState(0)

  useEffect(() => {
    supabase.from('videos').select('id', { count:'exact' }).eq('user_id', p.id)
      .then(({ count }) => setVC(count||0))
  }, [p.id])

  return (
    <div style={{ background:T.card, borderRadius:14, border:`1.5px solid ${inCompare?accent:T.border}`, padding:'16px', transition:'border-color .18s', position:'relative', overflow:'hidden' }}>
      {/* Top accent line when in compare */}
      {inCompare && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent }}/>}

      <div style={{ display:'flex', gap:13, alignItems:'flex-start', marginBottom:12 }}>
        <Av profile={p} size={50} accent={accent}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.full_name||p.username}</div>
          <div style={{ fontSize:12, color:T.sub, marginBottom:6 }}>{[p.position, p.school, p.year].filter(Boolean).join(' · ')}</div>
          {p.height && <span style={{ fontSize:11, color:T.sub, background:T.card2, padding:'2px 8px', borderRadius:5, border:`1px solid ${T.border}` }}>📏 {p.height}</span>}
        </div>
        <Score val={p.draft_score||'—'} accent={accent}/>
      </div>

      {/* Stats */}
      {(p.ppg||p.apg||p.rpg) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:12 }}>
          {[['PPG',p.ppg],['APG',p.apg],['RPG',p.rpg]].map(([k,v])=>v?(
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'8px 4px', textAlign:'center', border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, color:T.text, fontWeight:700, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1, marginTop:2 }}>{k}</div>
            </div>
          ):null)}
        </div>
      )}

      {/* Note preview */}
      {note && (
        <div style={{ background:T.surface, borderRadius:8, padding:'8px 10px', marginBottom:10, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.muted, fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:4 }}>Your Notes</div>
          <p style={{ fontSize:12, color:T.text2, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{note}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:'flex', gap:7 }}>
        <button onClick={()=>onView(p.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 0', borderRadius:9, background:T.lime, border:'none', color:'#000', fontWeight:800, fontSize:12 }}>
          <Ic n="eye" size={13} color="#000"/>View
        </button>
        <button onClick={()=>onSave(p)} title={saved?'Remove from board':'Save to board'}
          style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:saved?`${T.lime}20`:T.card2, border:`1.5px solid ${saved?T.lime:T.border}`, cursor:'pointer' }}>
          <Ic n={saved?'star-f':'star'} size={14} color={saved?T.lime:T.sub}/>
        </button>
        <button onClick={()=>onNote(p)} title="Add notes"
          style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:note?`${T.scoutBlue}20`:T.card2, border:`1.5px solid ${note?T.scoutBlue:T.border}`, cursor:'pointer' }}>
          <Ic n="note" size={14} color={note?T.scoutBlue:T.sub}/>
        </button>
        <button onClick={()=>onCompare(p)} title="Compare"
          style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:inCompare?`${'#BF5AF2'}20`:T.card2, border:`1.5px solid ${inCompare?'#BF5AF2':T.border}`, cursor:'pointer' }}>
          <Ic n="compare" size={14} color={inCompare?'#BF5AF2':T.sub}/>
        </button>
      </div>

      {/* Video count badge */}
      {videoCount > 0 && (
        <div style={{ position:'absolute', top:14, right:14, background:T.card2, border:`1px solid ${T.border}`, borderRadius:6, padding:'2px 7px', display:'flex', alignItems:'center', gap:4 }}>
          <Ic n="play" size={9} color={T.muted}/>
          <span style={{ fontSize:10, color:T.muted, fontWeight:700 }}>{videoCount}</span>
        </div>
      )}
    </div>
  )
}

/* ── Compare Panel ── */
function ComparePanel({ players, onRemove }) {
  if (players.length < 2) return null
  const cats = ['PPG','APG','RPG']
  return (
    <div style={{ background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, padding:'18px 16px', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Ic n="compare" size={16} color={'#BF5AF2'}/>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:T.text }}>Comparing {players.length} Players</span>
      </div>

      {/* Player headers */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${players.length}, 1fr)`, gap:10, marginBottom:14 }}>
        {players.map(p=>{
          const accent = ACC[p.position]||T.lime
          return (
            <div key={p.id} style={{ textAlign:'center' }}>
              <Av profile={p} size={40} accent={accent}/>
              <div style={{ fontSize:12, fontWeight:700, marginTop:6, color:T.text }}>{p.full_name?.split(' ')[0]}</div>
              <div style={{ fontSize:10, color:T.sub }}>{p.position}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:16, color:accent, fontWeight:700, marginTop:4 }}>{p.draft_score||'—'}</div>
              <div style={{ fontSize:9, color:T.muted }}>DRAFT SCORE</div>
            </div>
          )
        })}
      </div>

      {/* Stat comparison */}
      {cats.map(cat=>{
        const key = cat.toLowerCase()
        const vals = players.map(p=>parseFloat(p[key])||0)
        const max  = Math.max(...vals)
        return (
          <div key={cat} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>{cat}</div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${players.length}, 1fr)`, gap:10 }}>
              {players.map((p,i)=>{
                const val  = parseFloat(p[key])||0
                const isTop = val===max && max>0
                const accent = ACC[p.position]||T.lime
                return (
                  <div key={p.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color:isTop?accent:T.text }}>{val||'—'}</span>
                      {isTop && max>0 && <span style={{ fontSize:9, fontWeight:800, color:accent }}>BEST</span>}
                    </div>
                    <div style={{ height:4, background:T.border, borderRadius:2 }}>
                      <div style={{ height:4, borderRadius:2, background:isTop?accent:T.sub, width:max>0?`${(val/max)*100}%`:'0%', transition:'width .5s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Scout Dashboard ── */
export default function ScoutDashboard({ session }) {
  const navigate = useNavigate()

  // Search & filter state
  const [q, setQ]           = useState('')
  const [pos, setPos]       = useState('All')
  const [level, setLevel]   = useState('All')
  const [year, setYear]     = useState('All')
  const [sortBy, setSort]   = useState('Newest')
  const [view, setView]     = useState('search') // search | boards | alerts

  // Data
  const [players, setPlayers] = useState([])
  const [loading, setLoad]    = useState(false)

  // Scout tools state (stored in localStorage for persistence)
  const [saved, setSaved]     = useState(() => JSON.parse(localStorage.getItem('draft_saved')||'[]'))
  const [notes, setNotes]     = useState(() => JSON.parse(localStorage.getItem('draft_notes')||'{}'))
  const [boards, setBoards]   = useState(() => JSON.parse(localStorage.getItem('draft_boards')||'[]'))
  const [compare, setCompare] = useState([])

  // Modal state
  const [noteModal, setNoteModal]   = useState(null)
  const [boardModal, setBoardModal] = useState(false)
  const [addToBoard, setAddToBoard] = useState(null) // player to add to a board

  // Persist to localStorage
  useEffect(()=>{ localStorage.setItem('draft_saved', JSON.stringify(saved)) }, [saved])
  useEffect(()=>{ localStorage.setItem('draft_notes', JSON.stringify(notes)) }, [notes])
  useEffect(()=>{ localStorage.setItem('draft_boards', JSON.stringify(boards)) }, [boards])

  // Fetch players
  useEffect(() => {
    setLoad(true)
    let query = supabase.from('profiles').select('*').eq('role','player')

    if (pos!=='All')   query = query.eq('position', pos)
    if (level==='High School') query = query.ilike('year', '%HS%')
    if (level==='College')     query = query.not('year', 'ilike', '%HS%')
    if (year!=='All')  query = query.eq('year', year)

    if (sortBy==='DRAFT Score') query = query.order('draft_score', { ascending:false, nullsFirst:false })
    else if (sortBy==='Name')   query = query.order('full_name', { ascending:true })
    else                        query = query.order('created_at', { ascending:false })

    query.limit(50).then(({ data }) => {
      let results = data || []
      if (q) results = results.filter(p =>
        (p.full_name||'').toLowerCase().includes(q.toLowerCase()) ||
        (p.school||'').toLowerCase().includes(q.toLowerCase()) ||
        (p.username||'').toLowerCase().includes(q.toLowerCase())
      )
      setPlayers(results)
      setLoad(false)
    })
  }, [q, pos, level, year, sortBy])

  // Tools
  const toggleSave = (p) => setSaved(prev => prev.find(x=>x.id===p.id) ? prev.filter(x=>x.id!==p.id) : [...prev, p])
  const isSaved    = (id) => saved.some(x=>x.id===id)

  const toggleCompare = (p) => {
    if (compare.find(x=>x.id===p.id)) setCompare(prev=>prev.filter(x=>x.id!==p.id))
    else if (compare.length < 3)      setCompare(prev=>[...prev, p])
  }

  const saveNote = (playerId, text) => setNotes(prev=>({ ...prev, [playerId]: text }))

  const createBoard = (name) => {
    const board = { id: Date.now(), name, players:[], createdAt: new Date().toISOString() }
    setBoards(prev=>[...prev, board])
    setBoardModal(false)
  }

  const addPlayerToBoard = (boardId, player) => {
    setBoards(prev=>prev.map(b=>b.id===boardId
      ? { ...b, players: b.players.find(p=>p.id===player.id) ? b.players : [...b.players, player] }
      : b
    ))
    setAddToBoard(null)
  }

  const removeFromBoard = (boardId, playerId) => {
    setBoards(prev=>prev.map(b=>b.id===boardId ? { ...b, players: b.players.filter(p=>p.id!==playerId) } : b))
  }

  const deleteBoard = (boardId) => setBoards(prev=>prev.filter(b=>b.id!==boardId))

  const inp = { width:'100%', background:T.card, border:`1.5px solid ${T.border}`, borderRadius:12, padding:'12px 14px 12px 42px', color:T.text, fontSize:15, outline:'none', WebkitAppearance:'none' }

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:T.bg }}>

      {/* Header */}
      <div style={{ padding:'20px 18px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="back" size={20} color={T.sub}/>
          </button>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, letterSpacing:-.5 }}>Scout Dashboard</div>
          {session?.user && <div style={{ marginLeft:'auto', background:`${T.lime}15`, border:`1px solid ${T.lime}33`, borderRadius:8, padding:'4px 10px' }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.lime }}>SCOUT</span>
          </div>}
        </div>
        <p style={{ fontSize:13, color:T.sub, marginBottom:18, paddingLeft:30 }}>Find your next player. Save time. Make better decisions.</p>

        {/* Stats bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
          {[[saved.length,'Saved Players'],[boards.length,'My Boards'],[Object.keys(notes).length,'Notes']].map(([v,k])=>(
            <div key={k} style={{ background:T.card, borderRadius:12, padding:'12px 10px', textAlign:'center', border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:T.lime }}>{v}</div>
              <div style={{ fontSize:10, color:T.sub, fontWeight:600, marginTop:3 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div style={{ display:'flex', gap:2, background:T.card, borderRadius:12, padding:4, marginBottom:18, border:`1px solid ${T.border}` }}>
          {[['search','🔍 Search'],['boards','📋 My Boards'],['alerts','🔔 Alerts']].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', background:view===id?T.card2:'transparent', color:view===id?T.text:T.muted, fontWeight:700, fontSize:12, transition:'all .18s' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── SEARCH VIEW ── */}
      {view==='search' && (
        <div style={{ padding:'0 18px 20px' }}>
          {/* Search input */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}>
              <Ic n="search" size={16} color={T.muted}/>
            </div>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, school…" style={inp}
              onFocus={e=>e.target.style.borderColor=T.lime} onBlur={e=>e.target.style.borderColor=T.border}/>
            {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none' }}>
              <Ic n="close" size={14} color={T.muted}/>
            </button>}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:8, marginBottom:8, WebkitOverflowScrolling:'touch' }}>
            {POSITIONS.map(p=>(
              <button key={p} onClick={()=>setPos(p)}
                style={{ padding:'6px 13px', borderRadius:18, border:`1.5px solid ${pos===p?'transparent':T.border}`, background:pos===p?T.lime:'transparent', color:pos===p?'#000':T.sub, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .18s' }}>
                {p}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:8, marginBottom:14, WebkitOverflowScrolling:'touch' }}>
            {LEVELS.map(l=>(
              <button key={l} onClick={()=>setLevel(l)}
                style={{ padding:'6px 13px', borderRadius:18, border:`1.5px solid ${level===l?'transparent':T.border}`, background:level===l?T.scoutBlue:'transparent', color:level===l?'#000':T.sub, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .18s' }}>
                {l}
              </button>
            ))}
            {SORT_OPTS.map(s=>(
              <button key={s} onClick={()=>setSort(s)}
                style={{ padding:'6px 13px', borderRadius:18, border:`1.5px solid ${sortBy===s?'transparent':T.border}`, background:sortBy===s?'#BF5AF2':'transparent', color:sortBy===s?'#fff':T.sub, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .18s' }}>
                {s}
              </button>
            ))}
          </div>

          {/* Compare panel */}
          {compare.length >= 2 && <ComparePanel players={compare} onRemove={id=>setCompare(prev=>prev.filter(p=>p.id!==id))}/>}

          {/* Compare clear */}
          {compare.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'8px 12px', background:`${'#BF5AF2'}15`, borderRadius:10, border:`1px solid ${'#BF5AF2'}33` }}>
              <Ic n="compare" size={14} color={'#BF5AF2'}/>
              <span style={{ fontSize:12, color:'#BF5AF2', fontWeight:700, flex:1 }}>{compare.length} player{compare.length>1?'s':''} selected for comparison</span>
              <button onClick={()=>setCompare([])} style={{ background:'none', border:'none' }}>
                <Ic n="close" size={14} color={'#BF5AF2'}/>
              </button>
            </div>
          )}

          {/* Results count */}
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:12 }}>
            {loading ? 'Searching…' : `${players.length} player${players.length!==1?'s':''} found`}
          </div>

          {/* Player cards */}
          {!loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {players.map(p=>(
                <ScoutPlayerCard
                  key={p.id}
                  player={p}
                  saved={isSaved(p.id)}
                  onSave={toggleSave}
                  onNote={setNoteModal}
                  onCompare={toggleCompare}
                  inCompare={!!compare.find(x=>x.id===p.id)}
                  note={notes[p.id]}
                  onView={id=>navigate(`/profile/${id}`)}
                />
              ))}
              {players.length===0 && !loading && (
                <div style={{ textAlign:'center', padding:'48px 20px', color:T.muted }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>🏀</div>
                  <p style={{ fontSize:15 }}>No players found</p>
                  <p style={{ fontSize:13, marginTop:6 }}>Try adjusting your filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BOARDS VIEW ── */}
      {view==='boards' && (
        <div style={{ padding:'0 18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18 }}>My Boards</div>
            <button onClick={()=>setBoardModal(true)}
              style={{ display:'flex', alignItems:'center', gap:6, background:T.lime, border:'none', borderRadius:10, padding:'9px 14px', color:'#000', fontWeight:800, fontSize:13 }}>
              <Ic n="plus" size={14} color="#000"/>New Board
            </button>
          </div>

          {/* Saved players board */}
          <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, marginBottom:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
              <Ic n="star-f" size={16} color={T.lime}/>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15 }}>Saved Players</span>
              <span style={{ marginLeft:'auto', background:`${T.lime}20`, color:T.lime, fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:6 }}>{saved.length}</span>
            </div>
            {saved.length===0 ? (
              <div style={{ padding:'24px 16px', textAlign:'center', color:T.muted }}>
                <p style={{ fontSize:14 }}>No saved players yet</p>
                <p style={{ fontSize:12, marginTop:4 }}>Tap ⭐ on any player to save them</p>
              </div>
            ) : (
              <div>
                {saved.map(p=>{
                  const accent = ACC[p.position]||T.lime
                  return (
                    <div key={p.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:12, alignItems:'center' }}>
                      <Av profile={p} size={40} accent={accent}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.full_name||p.username}</div>
                        <div style={{ fontSize:12, color:T.sub }}>{[p.position, p.school].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button onClick={()=>navigate(`/profile/${p.id}`)} style={{ background:T.lime, border:'none', borderRadius:8, padding:'6px 12px', color:'#000', fontWeight:700, fontSize:12 }}>View</button>
                      <button onClick={()=>toggleSave(p)} style={{ background:'none', border:'none' }}>
                        <Ic n="trash" size={15} color={T.muted}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom boards */}
          {boards.map(board=>(
            <div key={board.id} style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, marginBottom:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
                <Ic n="board" size={16} color={T.scoutBlue}/>
                <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15 }}>{board.name}</span>
                <span style={{ marginLeft:'auto', background:`${T.scoutBlue}20`, color:T.scoutBlue, fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:6 }}>{board.players.length}</span>
                <button onClick={()=>deleteBoard(board.id)} style={{ background:'none', border:'none', marginLeft:4 }}>
                  <Ic n="trash" size={14} color={T.muted}/>
                </button>
              </div>
              {board.players.length===0 ? (
                <div style={{ padding:'20px 16px', textAlign:'center', color:T.muted }}>
                  <p style={{ fontSize:13 }}>No players yet — save players and add them here</p>
                </div>
              ) : (
                board.players.map(p=>{
                  const accent = ACC[p.position]||T.lime
                  return (
                    <div key={p.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:12, alignItems:'center' }}>
                      <Av profile={p} size={38} accent={accent}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.full_name||p.username}</div>
                        <div style={{ fontSize:11, color:T.sub }}>{[p.position, p.school].filter(Boolean).join(' · ')}</div>
                        {notes[p.id] && <div style={{ fontSize:11, color:T.scoutBlue, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>📝 {notes[p.id]}</div>}
                      </div>
                      <button onClick={()=>navigate(`/profile/${p.id}`)} style={{ background:T.scoutBlue, border:'none', borderRadius:8, padding:'6px 12px', color:'#fff', fontWeight:700, fontSize:12 }}>View</button>
                      <button onClick={()=>removeFromBoard(board.id, p.id)} style={{ background:'none', border:'none' }}>
                        <Ic n="close" size={14} color={T.muted}/>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          ))}

          {boards.length===0 && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:T.muted }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
              <p style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No boards yet</p>
              <p style={{ fontSize:13 }}>Create boards to organize your recruiting — e.g. "PG Targets 2026"</p>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS VIEW ── */}
      {view==='alerts' && (
        <div style={{ padding:'0 18px 20px' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, marginBottom:16 }}>Smart Alerts</div>

          <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>🆕 New Players This Week</div>
              <div style={{ fontSize:12, color:T.sub }}>Players who joined DRAFT in the last 7 days</div>
            </div>
            <NewPlayersAlert navigate={navigate}/>
          </div>

          <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>🎬 New Videos from Saved Players</div>
              <div style={{ fontSize:12, color:T.sub }}>Recent uploads from players you saved</div>
            </div>
            {saved.length===0 ? (
              <div style={{ padding:'20px 16px', textAlign:'center', color:T.muted }}>
                <p style={{ fontSize:13 }}>Save players first to see their new videos here</p>
              </div>
            ) : (
              <SavedPlayerVideos saved={saved} navigate={navigate}/>
            )}
          </div>

          <div style={{ background:`${T.lime}10`, borderRadius:14, border:`1px solid ${T.lime}33`, padding:'16px' }}>
            <div style={{ fontWeight:800, fontSize:14, color:T.lime, marginBottom:6 }}>💡 Coming Soon</div>
            <div style={{ fontSize:13, color:T.sub, lineHeight:1.6 }}>
              • Email alerts for new players matching your filters{'\n'}
              • Push notifications when saved players upload new film{'\n'}
              • Weekly digest of top new talent in your region
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {noteModal && (
        <NotesModal
          player={noteModal}
          notes={notes[noteModal.id]}
          onSave={(text)=>saveNote(noteModal.id, text)}
          onClose={()=>setNoteModal(null)}
        />
      )}
      {boardModal && <NewBoardModal onSave={createBoard} onClose={()=>setBoardModal(false)}/>}

      <div style={{ height:30 }}/>
    </div>
  )
}

/* ── New Players Alert ── */
function NewPlayersAlert({ navigate }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoad]    = useState(true)

  useEffect(()=>{
    const weekAgo = new Date(Date.now()-7*24*60*60*1000).toISOString()
    supabase.from('profiles').select('*').eq('role','player').gte('created_at', weekAgo).order('created_at',{ascending:false}).limit(5)
      .then(({data})=>{ setPlayers(data||[]); setLoad(false) })
  },[])

  if (loading) return <div style={{ padding:'16px', textAlign:'center', color:T.muted, fontSize:13 }}>Loading…</div>
  if (players.length===0) return <div style={{ padding:'16px', textAlign:'center', color:T.muted, fontSize:13 }}>No new players this week yet</div>

  return (
    <div>
      {players.map(p=>{
        const accent = ACC[p.position]||T.lime
        return (
          <div key={p.id} onClick={()=>navigate(`/profile/${p.id}`)} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:12, alignItems:'center', cursor:'pointer' }}>
            <Av profile={p} size={38} accent={accent}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{p.full_name||p.username}</div>
              <div style={{ fontSize:11, color:T.sub }}>{[p.position,p.school,p.year].filter(Boolean).join(' · ')}</div>
            </div>
            <span style={{ fontSize:10, color:'#30D158', fontWeight:700 }}>NEW</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Saved Player Videos ── */
function SavedPlayerVideos({ saved, navigate }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoad]  = useState(true)

  useEffect(()=>{
    if (saved.length===0) { setLoad(false); return }
    const ids = saved.map(p=>p.id)
    supabase.from('videos').select('*, profiles(full_name, position)').in('user_id', ids).order('created_at',{ascending:false}).limit(10)
      .then(({data})=>{ setVideos(data||[]); setLoad(false) })
  },[saved.length])

  if (loading) return <div style={{ padding:'16px', textAlign:'center', color:T.muted, fontSize:13 }}>Loading…</div>
  if (videos.length===0) return <div style={{ padding:'16px', textAlign:'center', color:T.muted, fontSize:13 }}>No new videos from saved players</div>

  return (
    <div>
      {videos.map(v=>(
        <div key={v.id} onClick={()=>navigate(`/profile/${v.user_id}`)} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:12, alignItems:'center', cursor:'pointer' }}>
          <div style={{ width:46, height:46, borderRadius:10, background:T.card2, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
            <video src={v.video_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.title}</div>
            <div style={{ fontSize:11, color:T.sub }}>{v.profiles?.full_name} · {v.category}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

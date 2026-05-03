import { T, POS, CAT, fmt, timeAgo, initials } from '../lib/theme.js'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, updateProfile } from '../lib/supabase.js'

/* ── COLORS ── */
const C = {
  bg:'#000', surface:'#0A0A0A', card:'#141414', card2:'#1C1C1C',
  border:'#252525', border2:'#333',
  text:'#FFF', text2:'#CCC', sub:'#888', muted:'#555',
  accent:'#C8FF00', pink:'#FF2D78', blue:'#00C2FF',
  green:'#00E676', purple:'#9B5CFF', orange:'#FF6B00',
  gold:'#FFB800',
}

const POS_COLOR = { PG:T.lime, SG:T.crimson, SF:T.scoutBlue, PF:'#30D158', C:'#BF5AF2' }

/* ── HS vs College stat definitions ── */
const HS_STATS = [
  { key:'ppg',  label:'Points',    short:'PPG',  icon:'🏀', desc:'Points per game'       },
  { key:'apg',  label:'Assists',   short:'APG',  icon:'🎯', desc:'Assists per game'      },
  { key:'rpg',  label:'Rebounds',  short:'RPG',  icon:'💪', desc:'Rebounds per game'     },
  { key:'spg',  label:'Steals',    short:'SPG',  icon:'🛡️', desc:'Steals per game'       },
  { key:'bpg',  label:'Blocks',    short:'BPG',  icon:'✋', desc:'Blocks per game'       },
  { key:'fgp',  label:'FG%',       short:'FG%',  icon:'🎯', desc:'Field goal percentage' },
  { key:'tpp',  label:'3P%',       short:'3P%',  icon:'🔥', desc:'Three point percentage'},
  { key:'ftp',  label:'FT%',       short:'FT%',  icon:'⚡', desc:'Free throw percentage' },
]

const COLLEGE_EXTRA = [
  { key:'gp',   label:'Games',     short:'GP',   icon:'📅', desc:'Games played'          },
  { key:'mpg',  label:'Minutes',   short:'MPG',  icon:'⏱️', desc:'Minutes per game'      },
  { key:'tov',  label:'Turnovers', short:'TOV',  icon:'⚠️', desc:'Turnovers per game'    },
  { key:'plus_minus', label:'+/-', short:'+/-',  icon:'📊', desc:'Plus/minus per game'   },
]

const ALL_STATS = [...HS_STATS, ...COLLEGE_EXTRA]

/* ── Skill categories for the radar-style bars ── */
const SKILL_CATS = [
  { key:'scoring',   label:'Scoring',         keys:['ppg','fgp','tpp','ftp']   },
  { key:'playmaking',label:'Playmaking',       keys:['apg','tov']               },
  { key:'defense',   label:'Defense',          keys:['rpg','spg','bpg']         },
  { key:'athleticism',label:'Athleticism',     keys:[]                          },
]

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#000;color:#fff;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#111;}::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
  input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .fadeUp{animation:fadeUp .3s ease forwards;}
  .spin{animation:spin .8s linear infinite;}
  .pulse{animation:pulse 1.5s ease infinite;}
`

/* ── Helpers ── */
const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)

function Ic({ n, size=18, color='#fff', sw=1.7 }) {
  const s = { width:size, height:size, display:'block', flexShrink:0 }
  const p = { stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  switch(n) {
    case 'edit':   return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path {...p} d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    case 'check':  return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="20 6 9 17 4 12"/></svg>
    case 'plus':   return <svg style={s} viewBox="0 0 24 24"><line {...p} x1="12" y1="5" x2="12" y2="19"/><line {...p} x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'back':   return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="15 18 9 12 15 6"/></svg>
    case 'trash':  return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="3 6 5 6 21 6"/><path {...p} d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
    case 'share':  return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="18" cy="5" r="3"/><circle {...p} cx="6" cy="12" r="3"/><circle {...p} cx="18" cy="19" r="3"/><line {...p} x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line {...p} x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    case 'ball':   return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10"/><path {...p} d="M4.93 4.93c4.08 4.08 10.07 4.08 14.14 0"/><path {...p} d="M4.93 19.07c4.08-4.08 10.07-4.08 14.14 0"/><line {...p} x1="12" y1="2" x2="12" y2="22"/></svg>
    case 'up':     return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="18 15 12 9 6 15"/></svg>
    case 'dn':     return <svg style={s} viewBox="0 0 24 24"><polyline {...p} points="6 9 12 15 18 9"/></svg>
    case 'star':   return <svg style={s} viewBox="0 0 24 24"><polygon fill={color} stroke="none" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    default: return null
  }
}

/* ── Stat Bar ── */
function StatBar({ label, value, max=40, color=T.lime, suffix='' }) {
  const pct = Math.min(100, Math.round((parseFloat(value)||0) / max * 100))
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>{label}</span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color, fontWeight:700 }}>{value||'—'}{suffix}</span>
      </div>
      <div style={{ height:5, background:T.border, borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${color}88, ${color})`, borderRadius:3, transition:'width .6s cubic-bezier(.4,0,.2,1)' }}/>
      </div>
    </div>
  )
}

/* ── Big Stat Box ── */
function BigStat({ label, value, color=T.text, sub }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:28, fontWeight:700, color, lineHeight:1 }}>{value||'—'}</div>
      <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:T.sub, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

/* ── Inline Editable Stat ── */
function EditableStat({ stat, value, onChange, accent }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState(value||'')

  const save = () => {
    onChange(stat.key, local)
    setEditing(false)
  }

  if (editing) return (
    <div style={{ background:T.card2, borderRadius:12, padding:'12px 14px', border:`1.5px solid ${accent}`, display:'flex', gap:10, alignItems:'center' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:accent, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>{stat.short}</div>
        <input type="number" step="0.1" value={local} onChange={e=>setLocal(e.target.value)}
          autoFocus style={{ background:'transparent', border:'none', outline:'none', color:T.text, fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, width:'100%' }}
          onKeyDown={e=>e.key==='Enter'&&save()} placeholder="0.0"/>
        <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{stat.desc}</div>
      </div>
      <button onClick={save} style={{ background:accent, border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Ic n="check" size={14} color="#000" sw={2.5}/>
      </button>
    </div>
  )

  return (
    <div onClick={()=>setEditing(true)}
      style={{ background:T.card, borderRadius:12, padding:'12px 14px', border:`1px solid ${T.border}`, cursor:'pointer', transition:'all .18s', position:'relative' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=T.border3}
      onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', marginBottom:4 }}>{stat.short}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:24, fontWeight:700, color: value ? accent : T.muted, lineHeight:1 }}>{value||'—'}</div>
          <div style={{ fontSize:11, color:T.sub, marginTop:4 }}>{stat.label}</div>
        </div>
        <div style={{ fontSize:16 }}>{stat.icon}</div>
      </div>
      <div style={{ position:'absolute', bottom:8, right:10 }}>
        <Ic n="edit" size={11} color={T.muted}/>
      </div>
    </div>
  )
}

/* ── Game Log Row ── */
function GameRow({ game, onDelete, accent }) {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px', background:T.card, borderRadius:10, border:`1px solid ${T.border}`, marginBottom:8 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{game.opponent || 'vs Opponent'}</div>
        <div style={{ fontSize:11, color:T.sub }}>{game.date}</div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        {[['PTS',game.pts],['AST',game.ast],['REB',game.reb]].map(([k,v])=>(
          <div key={k} style={{ textAlign:'center', minWidth:32 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color: parseFloat(v)>=20?accent:T.text }}>{v||'—'}</div>
            <div style={{ fontSize:9, color:T.muted, fontWeight:700 }}>{k}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>onDelete(game.id)} style={{ background:'none', border:'none', opacity:.5 }}>
        <Ic n="trash" size={13} color={T.muted}/>
      </button>
    </div>
  )
}

/* ── Add Game Modal ── */
function AddGameModal({ onSave, onClose, accent }) {
  const [form, setForm] = useState({ opponent:'', date:new Date().toLocaleDateString(), pts:'', ast:'', reb:'', stl:'', blk:'', fgm:'', fga:'', notes:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const inp = { background:T.card2, border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', color:T.text, fontSize:15, outline:'none', width:'100%', fontFamily:'Inter,sans-serif', WebkitAppearance:'none' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:T.surface, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, maxHeight:'88vh', overflow:'auto', padding:'20px 18px 32px', border:`1px solid ${T.border}` }}>
        <div style={{ width:36, height:3, background:T.border3, borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, marginBottom:18 }}>Log a Game</div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>Opponent</label>
              <input value={form.opponent} onChange={e=>set('opponent',e.target.value)} placeholder="vs Team Name" style={inp}
                onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>Date</label>
              <input value={form.date} onChange={e=>set('date',e.target.value)} placeholder="MM/DD/YYYY" style={inp}
                onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
          </div>

          <div style={{ background:T.card, borderRadius:12, padding:'14px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 }}>Game Stats</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[['pts','Points'],['ast','Assists'],['reb','Rebounds'],['stl','Steals'],['blk','Blocks'],['tov','Turnovers']].map(([k,lbl])=>(
                <div key={k}>
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>{lbl}</label>
                  <input type="number" value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder="0"
                    style={{ ...inp, textAlign:'center', fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, padding:'10px 8px' }}
                    onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:T.card, borderRadius:12, padding:'14px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.sub, letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 }}>Shooting</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[['fgm','FGM'],['fga','FGA'],['tpm','3PM']].map(([k,lbl])=>(
                <div key={k}>
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>{lbl}</label>
                  <input type="number" value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder="0"
                    style={{ ...inp, textAlign:'center', fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, padding:'10px 8px' }}
                    onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>
                </div>
              ))}
            </div>
          </div>

          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Game notes (optional)…" rows={2}
            style={{ ...inp, resize:'none', lineHeight:1.5 }}
            onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'13px 0', borderRadius:11, background:'transparent', border:`1.5px solid ${T.border}`, color:T.sub, fontWeight:700, fontSize:15 }}>Cancel</button>
            <button onClick={()=>{ onSave({ ...form, id:Date.now() }); onClose() }}
              style={{ flex:2, padding:'13px 0', borderRadius:11, background:accent, border:'none', color:'#000', fontWeight:800, fontSize:15 }}>
              Log Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── DRAFT Score Ring ── */
function ScoreRing({ score, size=100, color=T.lime }) {
  const pct   = Math.min(100, score||0)
  const inner = size * .76
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      background:`conic-gradient(${color} 0% ${pct}%, #1C1C1C ${pct}% 100%)` }}>
      <div style={{ width:inner, height:inner, borderRadius:'50%', background:T.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:size*.26, color, fontWeight:700, lineHeight:1 }}>{score||'—'}</div>
        <div style={{ fontSize:size*.09, color:T.muted, fontWeight:800, letterSpacing:1, marginTop:2 }}>DRAFT</div>
      </div>
    </div>
  )
}

/* ── Main Dashboard ── */
export default function StatsDashboard({ session }) {
  const navigate             = useNavigate()
  const [profile, setProfile]= useState(null)
  const [loading, setLoad]   = useState(true)
  const [saving, setSaving]  = useState(false)
  const [saved, setSaved]    = useState(false)
  const [tab, setTab]        = useState('card')   // card | stats | games | skills
  const [showAddGame, setShowAddGame] = useState(false)
  const [games, setGames]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(`draft_games_${session?.user?.id}`)||'[]') } catch { return [] }
  })

  const isHS = profile?.year?.includes('HS') || profile?.role === 'player' && !profile?.year?.includes('man') && !profile?.year?.includes('ior') && !profile?.year?.includes('nior')
  const accent = POS_COLOR[profile?.position] || T.lime

  useEffect(()=>{
    if (!session?.user?.id) { setLoad(false); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => { setProfile(data); setLoad(false) })
  }, [session])

  const updateStat = async (key, value) => {
    const num = parseFloat(value)
    const update = { [key]: isNaN(num) ? null : num }
    setProfile(p => ({ ...p, ...update }))
    await updateProfile(session.user.id, update)
    // Auto-calc DRAFT score
    calcDraftScore({ ...profile, ...update })
  }

  const calcDraftScore = async (p) => {
    const weights = { ppg:.30, apg:.20, rpg:.15, spg:.10, bpg:.08, fgp:.07, tpp:.05, ftp:.05 }
    const maxVals = { ppg:40, apg:12, rpg:15, spg:4, bpg:5, fgp:70, tpp:50, ftp:95 }
    let score = 0
    Object.entries(weights).forEach(([k,w]) => {
      const val = parseFloat(p[k]) || 0
      const max = maxVals[k] || 1
      score += (Math.min(val, max) / max) * w * 100
    })
    const draft_score = Math.min(99, Math.max(1, Math.round(score)))
    await updateProfile(session.user.id, { draft_score })
    setProfile(prev => ({ ...prev, draft_score }))
  }

  const saveGame = (game) => {
    const updated = [game, ...games]
    setGames(updated)
    localStorage.setItem(`draft_games_${session.user.id}`, JSON.stringify(updated))
    // Recalculate season averages
    if (updated.length > 0) {
      const avg = (key) => {
        const vals = updated.map(g=>parseFloat(g[key])||0).filter(v=>v>0)
        return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null
      }
      const updates = { ppg:avg('pts'), apg:avg('ast'), rpg:avg('reb'), spg:avg('stl'), bpg:avg('blk'), gp:updated.length }
      Object.entries(updates).forEach(([k,v]) => v && updateStat(k, v))
    }
  }

  const deleteGame = (id) => {
    const updated = games.filter(g=>g.id!==id)
    setGames(updated)
    localStorage.setItem(`draft_games_${session.user.id}`, JSON.stringify(updated))
  }

  const shareProfile = () => {
    const url = `${window.location.origin}/profile/${session.user.id}`
    if (navigator.share) navigator.share({ title:`${profile?.full_name} — DRAFT Profile`, url })
    else { navigator.clipboard?.writeText(url); alert('Profile link copied!') }
  }

  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${T.lime}`, borderTopColor:'transparent' }} className="spin"/>
      <style>{css}</style>
    </div>
  )

  if (!session) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, background:T.bg }}>
      <style>{css}</style>
      <div style={{ fontSize:56 }}>🏀</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700 }}>Sign in to view your stats</div>
      <button onClick={()=>navigate('/login')} style={{ background:T.lime, color:'#000', border:'none', borderRadius:12, padding:'13px 28px', fontWeight:800, fontSize:15 }}>Sign In</button>
    </div>
  )

  const statList = profile?.year?.includes('man') || profile?.year?.includes('mor') || profile?.year?.includes('ior') || profile?.year?.includes('nior')
    ? ALL_STATS : HS_STATS

  return (
    <>
      <style>{css}</style>
      <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:T.bg }}>

        {/* ── PLAYER CARD (NBA style) ── */}
        <div style={{ position:'relative', background:`linear-gradient(160deg, ${accent}18 0%, ${T.surface} 60%)`, borderBottom:`1px solid ${T.border}`, padding:'20px 18px 0', overflow:'hidden' }}>
          {/* Background number */}
          <div style={{ position:'absolute', right:-10, top:-10, fontFamily:"'Space Mono',monospace", fontSize:120, fontWeight:700, color:accent, opacity:.04, userSelect:'none', lineHeight:1 }}>
            {profile?.jersey_number || '#'}
          </div>

          {/* Top row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:6, color:T.sub, fontWeight:600, fontSize:14 }}>
              <Ic n="back" size={18} color={T.sub}/>Back
            </button>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={shareProfile} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:9, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Ic n="share" size={16} color={T.sub}/>
              </button>
            </div>
          </div>

          {/* Main card content */}
          <div style={{ display:'flex', gap:18, alignItems:'flex-end', marginBottom:20 }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:76, height:76, borderRadius:'50%', background:`${accent}20`, border:`2.5px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                  : (profile?.full_name||'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                }
              </div>
              {/* Position badge */}
              {profile?.position && (
                <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', background:accent, color:'#000', fontSize:10, fontWeight:900, padding:'2px 8px', borderRadius:8, letterSpacing:.5, whiteSpace:'nowrap' }}>
                  {profile.position}
                </div>
              )}
            </div>

            {/* Name & info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, lineHeight:1.1, marginBottom:4 }}>{profile?.full_name || profile?.username}</div>
              <div style={{ fontSize:13, color:T.sub, marginBottom:6 }}>{[profile?.school, profile?.year].filter(Boolean).join(' · ')}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {profile?.height && <span style={{ fontSize:11, color:T.text2, background:T.card, padding:'3px 8px', borderRadius:6, border:`1px solid ${T.border}` }}>📏 {profile.height}</span>}
                {profile?.wingspan && <span style={{ fontSize:11, color:T.text2, background:T.card, padding:'3px 8px', borderRadius:6, border:`1px solid ${T.border}` }}>🤝 {profile.wingspan}</span>}
                {profile?.hand && <span style={{ fontSize:11, color:T.text2, background:T.card, padding:'3px 8px', borderRadius:6, border:`1px solid ${T.border}` }}>✋ {profile.hand}</span>}
              </div>
            </div>

            {/* DRAFT Score */}
            <ScoreRing score={profile?.draft_score} size={80} color={accent}/>
          </div>

          {/* Key stats strip */}
          <div style={{ display:'flex', background:T.card, borderRadius:'12px 12px 0 0', padding:'14px 8px', border:`1px solid ${T.border}`, borderBottom:'none', gap:4 }}>
            {[['PPG',profile?.ppg],['APG',profile?.apg],['RPG',profile?.rpg],['SPG',profile?.spg],['BPG',profile?.bpg]].map(([k,v],i)=>(
              <div key={k} style={{ flex:1, textAlign:'center', borderRight:i<4?`1px solid ${T.border}`:'none' }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color: v ? accent : T.muted, lineHeight:1 }}>{v||'—'}</div>
                <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1.2, marginTop:3 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:'flex', background:T.card, borderBottom:`1px solid ${T.border}`, padding:'0 4px' }}>
          {[['card','📊 Overview'],['stats','✏️ Edit Stats'],['games','📅 Game Log'],['skills','⚡ Skills']].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, padding:'12px 4px', background:'none', border:'none', borderBottom:tab===id?`2.5px solid ${accent}`:'2.5px solid transparent', color:tab===id?accent:T.muted, fontWeight:700, fontSize:11, transition:'all .18s' }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ padding:'18px 18px 80px' }}>

          {/* ── OVERVIEW TAB ── */}
          {tab==='card' && (
            <div className="fadeUp">
              {/* Level badge */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <div style={{ background:`${accent}15`, border:`1px solid ${accent}33`, borderRadius:8, padding:'4px 12px' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:accent }}>{profile?.year?.includes('HS') ? '🏫 HIGH SCHOOL' : '🎓 COLLEGE'}</span>
                </div>
                {profile?.gp && <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>{profile.gp} games played</span>}
                <button onClick={()=>setTab('stats')} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, background:T.card2, border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', color:T.sub, fontWeight:700, fontSize:12 }}>
                  <Ic n="edit" size={12} color={T.sub}/>Update Stats
                </button>
              </div>

              {/* Full stats grid */}
              <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:16 }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <Ic n="ball" size={15} color={accent}/>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15 }}>Season Stats</span>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                    {statList.map(s=>(
                      <div key={s.key} style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:profile?.[s.key]?accent:T.muted, lineHeight:1 }}>{profile?.[s.key]||'—'}</div>
                        <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1.2, marginTop:3 }}>{s.short}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shooting */}
              {(profile?.fgp || profile?.tpp || profile?.ftp) && (
                <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, marginBottom:14 }}>Shooting Splits</div>
                  {[['FG%', profile?.fgp, 60],['3P%', profile?.tpp, 45],['FT%', profile?.ftp, 95]].map(([l,v,m])=>(
                    <StatBar key={l} label={l} value={v} max={m} color={accent} suffix="%"/>
                  ))}
                </div>
              )}

              {/* Recent games */}
              {games.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15 }}>Recent Games</div>
                    <button onClick={()=>setTab('games')} style={{ fontSize:12, color:accent, fontWeight:700, background:'none', border:'none' }}>See all →</button>
                  </div>
                  {games.slice(0,3).map(g=><GameRow key={g.id} game={g} onDelete={deleteGame} accent={accent}/>)}
                </div>
              )}

              {/* Scout visibility tip */}
              <div style={{ background:`${accent}08`, border:`1px solid ${accent}22`, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:12, fontWeight:800, color:accent, marginBottom:6 }}>💡 Scout Visibility Tip</div>
                <div style={{ fontSize:13, color:T.sub, lineHeight:1.65 }}>
                  {!profile?.ppg ? '→ Add your stats to unlock your DRAFT Score and get discovered by scouts.' :
                   !profile?.avatar_url ? '→ Add a profile photo — scouts are 3x more likely to view profiles with photos.' :
                   '✓ Your profile is visible to scouts. Keep uploading videos to increase your exposure.'}
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT STATS TAB ── */}
          {tab==='stats' && (
            <div className="fadeUp">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18 }}>Edit Your Stats</div>
                  <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>Tap any stat to update. DRAFT Score auto-calculates.</div>
                </div>
              </div>

              {/* Per-game averages */}
              <div style={{ fontSize:11, fontWeight:800, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Per Game Averages</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {HS_STATS.map(s=>(
                  <EditableStat key={s.key} stat={s} value={profile?.[s.key]} onChange={updateStat} accent={accent}/>
                ))}
              </div>

              {/* College extra (only show for college players) */}
              {!profile?.year?.includes('HS') && (
                <>
                  <div style={{ fontSize:11, fontWeight:800, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>College Stats</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                    {COLLEGE_EXTRA.map(s=>(
                      <EditableStat key={s.key} stat={s} value={profile?.[s.key]} onChange={updateStat} accent={accent}/>
                    ))}
                  </div>
                </>
              )}

              {/* Physical attributes */}
              <div style={{ fontSize:11, fontWeight:800, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Physical Info</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[{key:'height',label:'Height',placeholder:"6'4\""},{key:'wingspan',label:'Wingspan',placeholder:"6'7\""},{key:'weight',label:'Weight (lbs)',placeholder:'185'},{key:'jersey_number',label:'Jersey #',placeholder:'23'}].map(f=>(
                  <div key={f.key} style={{ display:'flex', alignItems:'center', gap:12, background:T.card, borderRadius:10, padding:'11px 14px', border:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:13, color:T.sub, fontWeight:600, flex:1 }}>{f.label}</span>
                    <input value={profile?.[f.key]||''} onChange={e=>updateStat(f.key,e.target.value)}
                      placeholder={f.placeholder}
                      style={{ background:'transparent', border:'none', outline:'none', color:T.text, fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, textAlign:'right', width:100 }}/>
                  </div>
                ))}
              </div>

              <div style={{ background:T.card2, borderRadius:12, padding:'12px 14px', marginTop:16, border:`1px solid ${T.border}` }}>
                <p style={{ fontSize:12, color:T.sub, lineHeight:1.6 }}>
                  🤖 <strong style={{ color:T.text }}>Auto DRAFT Score:</strong> Your score updates automatically based on your stats. Keep your stats current for the best scout visibility.
                </p>
              </div>
            </div>
          )}

          {/* ── GAME LOG TAB ── */}
          {tab==='games' && (
            <div className="fadeUp">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18 }}>Game Log</div>
                  <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{games.length} game{games.length!==1?'s':''} logged</div>
                </div>
                <button onClick={()=>setShowAddGame(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, background:accent, border:'none', borderRadius:10, padding:'9px 14px', color:'#000', fontWeight:800, fontSize:13 }}>
                  <Ic n="plus" size={14} color="#000"/>Log Game
                </button>
              </div>

              {/* Season averages */}
              {games.length > 0 && (
                <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:T.sub, letterSpacing:1.5, textTransform:'uppercase', marginBottom:12 }}>Season Averages ({games.length} GP)</div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[
                      ['PTS', games.length ? (games.reduce((a,g)=>a+(parseFloat(g.pts)||0),0)/games.length).toFixed(1) : '—'],
                      ['AST', games.length ? (games.reduce((a,g)=>a+(parseFloat(g.ast)||0),0)/games.length).toFixed(1) : '—'],
                      ['REB', games.length ? (games.reduce((a,g)=>a+(parseFloat(g.reb)||0),0)/games.length).toFixed(1) : '—'],
                      ['STL', games.length ? (games.reduce((a,g)=>a+(parseFloat(g.stl)||0),0)/games.length).toFixed(1) : '—'],
                    ].map(([k,v])=>(
                      <div key={k} style={{ flex:1, textAlign:'center' }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:accent, lineHeight:1 }}>{v}</div>
                        <div style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:1.2, marginTop:3 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {games.length===0 ? (
                <div style={{ textAlign:'center', padding:'48px 20px', color:T.muted }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>📅</div>
                  <p style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No games logged yet</p>
                  <p style={{ fontSize:13, marginBottom:20 }}>Log your games and your season averages update automatically</p>
                  <button onClick={()=>setShowAddGame(true)} style={{ background:accent, color:'#000', border:'none', borderRadius:10, padding:'12px 24px', fontWeight:800, fontSize:14 }}>
                    Log Your First Game
                  </button>
                </div>
              ) : (
                <div>
                  {games.map(g=><GameRow key={g.id} game={g} onDelete={deleteGame} accent={accent}/>)}
                </div>
              )}
            </div>
          )}

          {/* ── SKILLS TAB ── */}
          {tab==='skills' && (
            <div className="fadeUp">
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, marginBottom:4 }}>Skill Ratings</div>
              <div style={{ fontSize:13, color:T.sub, marginBottom:20 }}>Auto-calculated from your stats</div>

              {/* Skill bars */}
              {[
                { label:'Scoring',    color:T.lime,  val: Math.min(99, Math.round(((parseFloat(profile?.ppg)||0)/40)*60 + ((parseFloat(profile?.fgp)||0)/70)*20 + ((parseFloat(profile?.tpp)||0)/50)*20)) },
                { label:'Playmaking', color:T.scoutBlue,    val: Math.min(99, Math.round(((parseFloat(profile?.apg)||0)/12)*80 + (profile?.tov?Math.max(0,20-(parseFloat(profile.tov)||0)*4):10))) },
                { label:'Defense',    color:T.crimson,    val: Math.min(99, Math.round(((parseFloat(profile?.spg)||0)/4)*40 + ((parseFloat(profile?.bpg)||0)/5)*30 + ((parseFloat(profile?.rpg)||0)/15)*30)) },
                { label:'Rebounding', color:'#30D158',   val: Math.min(99, Math.round(((parseFloat(profile?.rpg)||0)/15)*100)) },
                { label:'Shooting',   color:T.gold,    val: Math.min(99, Math.round(((parseFloat(profile?.fgp)||0)/65)*40 + ((parseFloat(profile?.tpp)||0)/50)*30 + ((parseFloat(profile?.ftp)||0)/95)*30)) },
              ].map(s=>(
                <div key={s.label} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15 }}>{s.label}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, color:s.color }}>{s.val||'—'}</span>
                  </div>
                  <div style={{ height:10, background:T.border, borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${s.val||0}%`, background:`linear-gradient(90deg, ${s.color}88, ${s.color})`, borderRadius:5, transition:'width .8s cubic-bezier(.4,0,.2,1)' }}/>
                  </div>
                </div>
              ))}

              {/* Star ratings */}
              <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:'16px', marginTop:8 }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Overall Rating</div>
                {[
                  { label:'Offensive IQ',  stars: Math.min(5,Math.round(((parseFloat(profile?.ppg)||0)/8))) },
                  { label:'Ball Handling', stars: profile?.position==='PG'?Math.min(5,Math.round(((parseFloat(profile?.apg)||0)/2))):Math.min(4,Math.round(((parseFloat(profile?.apg)||0)/3))) },
                  { label:'Defense',       stars: Math.min(5,Math.round(((parseFloat(profile?.spg)||0)+(parseFloat(profile?.bpg)||0))*1.2)) },
                  { label:'Athleticism',   stars: 3 },
                ].map(r=>(
                  <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:13, color:T.sub, fontWeight:600 }}>{r.label}</span>
                    <div style={{ display:'flex', gap:3 }}>
                      {[1,2,3,4,5].map(i=>(
                        <Ic key={i} n="star" size={14} color={i<=r.stars?T.gold:T.border3}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:16, background:`${accent}08`, border:`1px solid ${accent}22`, borderRadius:12, padding:'14px' }}>
                <div style={{ fontSize:12, fontWeight:800, color:accent, marginBottom:4 }}>How to improve your DRAFT Score</div>
                <div style={{ fontSize:12, color:T.sub, lineHeight:1.7 }}>
                  • Keep your stats updated every week{'\n'}
                  • Log individual games for detailed breakdowns{'\n'}
                  • Upload game film to back up your numbers{'\n'}
                  • Scouts verify stats against your video
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddGame && <AddGameModal onSave={saveGame} onClose={()=>setShowAddGame(false)} accent={accent}/>}
      </div>
    </>
  )
}

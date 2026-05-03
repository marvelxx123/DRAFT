import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, searchProfiles } from '../lib/supabase.js'
import { T, POS, fmt, initials } from '../lib/theme.js'

function Av({ profile, size=50 }) {
  const accent = POS[profile?.position] || T.electric
  const name   = profile?.full_name || profile?.username || '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${accent}15`, border:`1.5px solid ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.33, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif", overflow:'hidden' }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : initials(name)}
    </div>
  )
}

const FILTERS = ['All','PG','SG','SF','PF','C','Scout']
const LEVELS  = ['All Levels','High School','College']

export default function Discover({ session }) {
  const [players, setPlayers] = useState([])
  const [q, setQ]             = useState('')
  const [pos, setPos]         = useState('All')
  const [level, setLevel]     = useState('All Levels')
  const [loading, setLoad]    = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending:false }).limit(50)
    if (pos === 'Scout') query = query.in('role', ['scout','coach'])
    else if (pos !== 'All') query = query.eq('position', pos).eq('role', 'player')
    else query = query.eq('role', 'player')
    if (level === 'High School') query = query.ilike('year', '%HS%')
    else if (level === 'College') query = query.not('year', 'ilike', '%HS%')
    query.then(({ data }) => { setPlayers(data||[]); setLoad(false) })
  }, [pos, level])

  useEffect(() => {
    if (!q) {
      setLoad(true)
      supabase.from('profiles').select('*').eq('role','player').order('created_at', { ascending:false }).limit(50)
        .then(({ data }) => { setPlayers(data||[]); setLoad(false) })
      return
    }
    const t = setTimeout(() => {
      searchProfiles(q).then(({ data }) => setPlayers(data||[]))
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:T.bg }}>
      {/* Header */}
      <div style={{ padding:'20px 18px 0' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, letterSpacing:-.5, marginBottom:16 }}>Discover</div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:12 }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:.4, pointerEvents:'none', width:17, height:17 }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search players, schools…"
            style={{ width:'100%', background:T.card, border:`1px solid ${T.border2}`, borderRadius:12, padding:'13px 14px 13px 44px', color:T.text, fontSize:15, outline:'none' }}
            onFocus={e=>e.target.style.borderColor=T.electric} onBlur={e=>e.target.style.borderColor=T.border2}/>
        </div>

        {/* Position filters */}
        <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:4, marginBottom:8, WebkitOverflowScrolling:'touch' }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setPos(f)}
              style={{ padding:'7px 15px', borderRadius:20, border:`1px solid ${pos===f?'transparent':T.border2}`, background:pos===f?T.electric:'transparent', color:pos===f?'#000':T.sub, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .18s', fontFamily:"'Space Grotesk',sans-serif" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Level filters */}
        <div style={{ display:'flex', gap:7, marginBottom:18 }}>
          {LEVELS.map(l=>(
            <button key={l} onClick={()=>setLevel(l)}
              style={{ padding:'6px 13px', borderRadius:18, border:`1px solid ${level===l?'transparent':T.border2}`, background:level===l?`${T.scoutBlue}18`:'transparent', color:level===l?T.scoutBlue:T.sub, fontSize:12, fontWeight:700, transition:'all .18s', outline:level===l?`1px solid ${T.scoutBlue}55`:'none' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding:'0 18px 20px' }}>
        {loading && <p style={{ color:T.sub, textAlign:'center', padding:'30px 0', fontSize:14 }}>Loading…</p>}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {players.map(p => {
            const accent = POS[p.position] || T.electric
            const isScout = p.role === 'scout' || p.role === 'coach'
            return (
              <div key={p.id} onClick={()=>navigate(`/profile/${p.id}`)}
                style={{ background:T.card, borderRadius:14, padding:'14px', display:'flex', gap:13, alignItems:'center', cursor:'pointer', border:`1px solid ${T.border}`, transition:'border-color .15s, background .15s' }}
                onTouchStart={e=>e.currentTarget.style.background=T.card2}
                onTouchEnd={e=>e.currentTarget.style.background=T.card}>
                <Av profile={p} size={52}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.full_name||p.username}</span>
                    {p.verified && <span style={{ fontSize:10, color:T.scoutBlue }}>✓</span>}
                    {isScout && <span style={{ fontSize:9, fontWeight:800, color:T.scoutBlue, background:`${T.scoutBlue}18`, padding:'1px 6px', borderRadius:4 }}>SCOUT</span>}
                  </div>
                  <div style={{ fontSize:12, color:T.sub, marginBottom: (p.ppg||p.apg||p.rpg) ? 8 : 0 }}>
                    {[p.position, p.school, p.year].filter(Boolean).join(' · ')}
                  </div>
                  {(p.ppg||p.apg||p.rpg) && (
                    <div style={{ display:'flex', gap:12 }}>
                      {[['PPG',p.ppg],['APG',p.apg],['RPG',p.rpg]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k} style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:15, color:T.text, fontWeight:700 }}>{v}</span>
                          <span style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:.8 }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Score badge */}
                {p.draft_score ? (
                  <div style={{ background:`${T.gold}12`, border:`1px solid ${T.gold}33`, borderRadius:10, padding:'7px 10px', textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:T.gold, lineHeight:1 }}>{p.draft_score}</div>
                    <div style={{ fontSize:8, color:T.muted, fontWeight:700, letterSpacing:1, marginTop:2 }}>DRAFT</div>
                  </div>
                ) : p.position ? (
                  <div style={{ background:`${accent}12`, border:`1px solid ${accent}33`, borderRadius:10, padding:'7px 12px', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:700, color:accent }}>{p.position}</div>
                  </div>
                ) : null}
              </div>
            )
          })}
          {!loading && players.length===0 && (
            <div style={{ textAlign:'center', padding:'48px 20px', color:T.sub }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏀</div>
              <p style={{ fontSize:15, fontWeight:600 }}>No players found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

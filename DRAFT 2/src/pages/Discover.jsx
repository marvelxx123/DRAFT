import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProfiles, supabase } from '../lib/supabase.js'

const C = { card:'#161616', border:'#2A2A2A', accent:'#C8FF00', muted:'#888', sub:'#555' }
const ACC = { PG:C.accent, SG:'#FF2D78', SF:'#00C2FF', PF:'#00E676', C:'#9B5CFF', scout:'#FF6B00', coach:'#FF6B00' }

function Av({ profile, size=50, accent=C.accent, ring=false }) {
  const name     = profile?.full_name || profile?.username || '?'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const outer    = ring ? size+5 : size
  return (
    <div style={{ width:outer, height:outer, borderRadius:'50%', flexShrink:0, background:ring?accent:'transparent', padding:ring?2.5:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} alt=""/>
        : <div style={{ width:size, height:size, borderRadius:'50%', background:`${accent}20`, border:`1.5px solid ${accent}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.34, fontWeight:700, color:accent, fontFamily:"'Space Grotesk',sans-serif" }}>{initials}</div>
      }
    </div>
  )
}

export default function Discover({ session }) {
  const [players, setPlayers] = useState([])
  const [q, setQ]             = useState('')
  const [pos, setPos]         = useState('All')
  const [loading, setLoad]    = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending:false }).limit(50)
      .then(({ data }) => { setPlayers(data||[]); setLoad(false) })
  }, [])

  useEffect(() => {
    if (!q) {
      supabase.from('profiles').select('*').order('created_at', { ascending:false }).limit(50)
        .then(({ data }) => setPlayers(data||[]))
      return
    }
    const timer = setTimeout(() => {
      searchProfiles(q).then(({ data }) => setPlayers(data||[]))
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const filtered = players.filter(p =>
    pos==='All' || p.position===pos || (pos==='Scout/Coach' && (p.role==='scout'||p.role==='coach'))
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'20px 16px 10px' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, letterSpacing:-.5, marginBottom:16 }}>Discover</div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:.4, pointerEvents:'none' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search players, schools…"
          style={{ width:'100%', background:C.card, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px 13px 44px', color:'#fff', fontSize:15, outline:'none', WebkitAppearance:'none' }}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
      </div>

      {/* Position filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
        {['All','PG','SG','SF','PF','C','Scout/Coach'].map(f=>(
          <button key={f} onClick={() => setPos(f)}
            style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${pos===f?'transparent':C.border}`, background:pos===f?C.accent:'transparent', color:pos===f?'#000':C.muted, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .18s' }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <p style={{ color:C.muted, textAlign:'center', padding:'30px 0' }}>Loading…</p>}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(p => {
          const accent = ACC[p.position] || ACC[p.role] || C.accent
          return (
            <div key={p.id} onClick={() => navigate(`/profile/${p.id}`)}
              style={{ background:C.card, borderRadius:14, padding:'14px', display:'flex', gap:13, alignItems:'center', cursor:'pointer', border:`1px solid ${C.border}`, WebkitTapHighlightColor:'transparent', transition:'background .15s', activeBackground:'#222' }}>
              <Av profile={p} size={52} accent={accent} ring/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.full_name||p.username}</div>
                <div style={{ fontSize:13, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {[p.position, p.school, p.year].filter(Boolean).join(' · ')}
                </div>
              </div>
              {p.position && (
                <div style={{ background:`${accent}18`, border:`1.5px solid ${accent}44`, borderRadius:10, padding:'6px 11px', textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:700, color:accent }}>{p.position}</div>
                </div>
              )}
            </div>
          )
        })}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🏀</div>
            <p style={{ fontSize:15 }}>No players found</p>
          </div>
        )}
      </div>
    </div>
  )
}

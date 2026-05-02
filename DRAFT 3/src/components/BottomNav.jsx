import { useNavigate, useLocation } from 'react-router-dom'

const C = { border:'#2A2A2A', accent:'#C8FF00', muted:'#444', surface:'#0D0D0D' }

const Ic = ({ n, size=22, color='#fff', sw=1.7 }) => {
  const s = { width:size, height:size, display:'block' }
  const p = { stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  switch(n) {
    case 'home':   return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline {...p} points="9 22 9 12 15 12 15 22"/></svg>
    case 'search': return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="8"/><line {...p} x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    case 'upload': return <svg style={s} viewBox="0 0 24 24"><rect {...p} x="3" y="3" width="18" height="18" rx="4"/><line {...p} x1="12" y1="8" x2="12" y2="16"/><line {...p} x1="8" y1="12" x2="16" y2="12"/></svg>
    case 'scouts': return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle {...p} cx="9" cy="7" r="4"/><path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87"/><path {...p} d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'user':   return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle {...p} cx="12" cy="7" r="4"/></svg>
    default: return null
  }
}

const TABS = [
  { path:'/',        icon:'home',   label:'Feed'    },
  { path:'/discover',icon:'search', label:'Discover'},
  { path:'/upload',  icon:'upload', label:'Upload'  },
  { path:'/scouts',  icon:'scouts', label:'Scouts'  },
  { path:'/profile', icon:'user',   label:'Profile' },
]

export default function BottomNav({ session }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={{ background:`${C.surface}f8`, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-around', padding:'10px 0 16px', flexShrink:0 }}>
      {TABS.map(t => {
        const on = pathname===t.path || (t.path!=='/' && pathname.startsWith(t.path))
        return (
          <button key={t.path} onClick={() => navigate(t.path)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'none', border:'none', padding:'3px 10px', WebkitTapHighlightColor:'transparent', position:'relative' }}>
            <Ic n={t.icon} size={22} color={on?C.accent:C.muted} sw={on?2:1.7}/>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:.5, textTransform:'uppercase', color:on?C.accent:C.muted, transition:'color .18s' }}>
              {t.label}
            </span>
            {on && <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:C.accent }}/>}
          </button>
        )
      })}
    </nav>
  )
}

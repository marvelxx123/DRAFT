import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { T } from '../lib/theme.js'

const Ic = ({ n, size=22, color='#fff', sw=1.6 }) => {
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
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('notifications').select('id', { count:'exact' })
      .eq('user_id', session.user.id).eq('read', false)
      .then(({ count }) => setUnread(count||0))

    const ch = supabase.channel('notif_badge')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${session.user.id}` },
        () => setUnread(n=>n+1))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [session])

  return (
    <nav style={{ background:`${T.surface}f5`, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-around', padding:'10px 0', paddingBottom:'max(10px, env(safe-area-inset-bottom))', flexShrink:0 }}>
      {TABS.map(t => {
        const on = pathname===t.path || (t.path!=='/' && pathname.startsWith(t.path))
        return (
          <button key={t.path} onClick={()=>navigate(t.path)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'none', border:'none', padding:'2px 14px', position:'relative' }}>
            <div style={{ position:'relative', width:22, height:22 }}>
              <Ic n={t.icon} size={22} color={on ? T.electric : T.sub} sw={on ? 2 : 1.6}/>
              {/* Notification dot on profile tab */}
              {t.path==='/profile' && unread > 0 && (
                <div style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:T.crimson, border:'2px solid #000' }}/>
              )}
            </div>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:.8, textTransform:'uppercase', color:on ? T.electric : T.sub, transition:'color .15s' }}>
              {t.label}
            </span>
            {on && <div style={{ position:'absolute', bottom:-1, left:'50%', transform:'translateX(-50%)', width:18, height:2, borderRadius:1, background:T.electric }}/>}
          </button>
        )
      })}
    </nav>
  )
}

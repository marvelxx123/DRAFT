// ── DRAFT Design System ──────────────────────────────────────
// Import this in any page: import { C, Ic, Av, fmt, timeAgo } from '../lib/design.js'

export const C = {
  bg:      '#000000',
  surface: '#0A0A0A',
  card:    '#141414',
  card2:   '#1C1C1C',
  border:  '#242424',
  border2: '#303030',
  text:    '#FFFFFF',
  text2:   '#D0D0D0',
  sub:     '#888888',
  muted:   '#505050',
  accent:  '#C8FF00',
  pink:    '#FF2D78',
  blue:    '#00C2FF',
  green:   '#00E676',
  purple:  '#9B5CFF',
  orange:  '#FF6B00',
  gold:    '#FFB800',
  like:    '#FF2D78',
}

export const POS_COLOR = {
  PG: C.accent,
  SG: C.pink,
  SF: C.blue,
  PF: C.green,
  C:  C.purple,
}

export const CAT_COLOR = {
  GAME:       C.accent,
  HIGHLIGHT:  C.pink,
  DEFENSE:    C.blue,
  TRAINING:   C.green,
  TOURNAMENT: C.purple,
  CAMP:       C.orange,
}

export const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)

export const timeAgo = (ts) => {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600)  return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

export const getInitials = (name) =>
  (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body,#root{height:100%;width:100%;overflow:hidden;}
  body{background:#000;color:#fff;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;}
  ::-webkit-scrollbar{width:2px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
  button{cursor:pointer;font-family:'Inter',sans-serif;-webkit-tap-highlight-color:transparent;}
  input,textarea{font-family:'Inter',sans-serif;font-size:16px!important;}
  .sg{font-family:'Space Grotesk',sans-serif;font-weight:700;}
  .mono{font-family:'Space Mono',monospace;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}45%{transform:translate(-50%,-50%) scale(1.9)}70%{transform:translate(-50%,-50%) scale(1.2)}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}
  .fadeUp{animation:fadeUp .28s ease forwards;}
  .fadeIn{animation:fadeIn .22s ease forwards;}
  .heartPop{animation:heartPop .65s ease forwards;}
  .slideUp{animation:slideUp .26s cubic-bezier(.32,.72,0,1);}
  .slideIn{animation:slideIn .24s cubic-bezier(.32,.72,0,1);}
  .spin{animation:spin .8s linear infinite;}
  .pulse{animation:pulse 1.4s ease infinite;}
`

// DRAFT — Design System
// Street × Premium × Professional

export const T = {
  // Backgrounds
  bg:      '#000000',
  surface: '#0A0A0A',
  card:    '#111111',
  card2:   '#181818',
  card3:   '#202020',

  // Borders
  border:  '#1E1E1E',
  border2: '#2A2A2A',
  border3: '#333333',

  // Text
  text:    '#F0F0F0',
  text2:   '#AAAAAA',
  sub:     '#666666',
  muted:   '#3A3A3A',

  // Accents — tight, intentional
  white:   '#FFFFFF',
  electric:'#00D4FF',  // main CTA, active states
  gold:    '#FFB700',  // DRAFT score, premium
  crimson: '#FF2D55',  // likes, alerts
  lime:    '#C8FF00',  // player position, highlights

  // Scout-specific
  scoutBlue: '#0A84FF',
}

export const POS = {
  PG: '#C8FF00',
  SG: '#00D4FF',
  SF: '#FFB700',
  PF: '#FF2D55',
  C:  '#BF5AF2',
}

export const CAT = {
  GAME:       '#C8FF00',
  HIGHLIGHT:  '#FFB700',
  DEFENSE:    '#00D4FF',
  TRAINING:   '#30D158',
  TOURNAMENT: '#BF5AF2',
  CAMP:       '#FF9F0A',
}

export const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)
export const timeAgo = ts => {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts))/1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}
export const initials = name =>
  (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');`

export const GLOBAL_CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body,#root{height:100%;width:100%;overflow:hidden;}
body{background:#000;color:#F0F0F0;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;font-feature-settings:'kern' 1;}
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
button{cursor:pointer;font-family:'Inter',sans-serif;-webkit-tap-highlight-color:transparent;outline:none;}
input,textarea,select{font-family:'Inter',sans-serif;font-size:16px!important;-webkit-appearance:none;}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
.sg{font-family:'Space Grotesk',sans-serif;}
.mono{font-family:'Space Mono',monospace;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}50%{transform:translate(-50%,-50%) scale(2)}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(200,255,0,.3)}50%{box-shadow:0 0 20px rgba(200,255,0,.6)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes counter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fadeUp{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) forwards;}
.fadeIn{animation:fadeIn .25s ease forwards;}
.slideUp{animation:slideUp .3s cubic-bezier(.32,.72,0,1);}
.slideIn{animation:slideIn .25s cubic-bezier(.32,.72,0,1);}
.scaleIn{animation:scaleIn .25s cubic-bezier(.16,1,.3,1) forwards;}
.spin{animation:spin .7s linear infinite;}
.pulse{animation:pulse 1.6s ease infinite;}
`

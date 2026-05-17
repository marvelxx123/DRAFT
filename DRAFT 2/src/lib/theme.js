// DRAFT — Design System
// Underground × Championship × Culture

export const T = {
  // Backgrounds — pure black, no compromise
  bg:      '#000000',
  surface: '#080808',
  card:    '#0F0F0F',
  card2:   '#161616',
  card3:   '#1E1E1E',

  // Borders
  border:  '#1C1C1C',
  border2: '#262626',
  border3: '#323232',

  // Text — clean white on black
  text:    '#FFFFFF',
  text2:   '#A09080',
  sub:     '#5C5040',
  muted:   '#2A2018',

  // Accents
  white:   '#FFFFFF',
  electric:'#FFE600',  // WU-TANG YELLOW — main CTA, energy
  gold:    '#FFB700',  // GOLD — championship, DRAFT score
  crimson: '#FF1744',  // RED — likes, heat, intensity
  lime:    '#C8FF00',  // VOLT — contrast pop

  // Scouts = prestige = gold
  scoutBlue: '#FFB700',
}

export const POS = {
  PG: '#FFE600',   // yellow — the engine
  SG: '#FFB700',   // gold — the scorer
  SF: '#C8FF00',   // volt — the versatile
  PF: '#FF1744',   // red — the enforcer
  C:  '#9D4EDD',   // purple — royalty
}

export const CAT = {
  GAME:       '#FFE600',
  HIGHLIGHT:  '#FFB700',
  DEFENSE:    '#FF1744',
  TRAINING:   '#C8FF00',
  TOURNAMENT: '#9D4EDD',
  CAMP:       '#FF8C00',
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

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');`

export const GLOBAL_CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body,#root{height:100%;width:100%;overflow:hidden;}
body{background:#000;color:#F5F0E8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;font-feature-settings:'kern' 1;}
body::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");opacity:.022;pointer-events:none;z-index:9999;}
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-thumb{background:#1E1E1E;border-radius:2px;}
button{cursor:pointer;font-family:'Inter',sans-serif;-webkit-tap-highlight-color:transparent;outline:none;}
input,textarea,select{font-family:'Inter',sans-serif;font-size:16px!important;-webkit-appearance:none;}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
.sg{font-family:'Space Grotesk',sans-serif;}
.mono{font-family:'Space Mono',monospace;}
.bebas{font-family:'Bebas Neue',sans-serif;letter-spacing:.05em;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}50%{transform:translate(-50%,-50%) scale(2)}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes glow{0%,100%{box-shadow:0 0 10px rgba(255,230,0,.4)}50%{box-shadow:0 0 28px rgba(255,230,0,.7)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes counter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:.85}94%{opacity:1}97%{opacity:.9}98%{opacity:1}}
@keyframes logoReveal{0%{opacity:0;filter:blur(24px);transform:scale(1.1)}55%{opacity:1;filter:blur(2px);transform:scale(1.01)}100%{opacity:1;filter:blur(0);transform:scale(1)}}
@keyframes lineReveal{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
@keyframes tagReveal{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes bgGlow{0%{opacity:0}40%{opacity:1}100%{opacity:.35}}
.fadeUp{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) forwards;}
.fadeIn{animation:fadeIn .25s ease forwards;}
.slideUp{animation:slideUp .3s cubic-bezier(.32,.72,0,1);}
.slideIn{animation:slideIn .25s cubic-bezier(.32,.72,0,1);}
.scaleIn{animation:scaleIn .25s cubic-bezier(.16,1,.3,1) forwards;}
.spin{animation:spin .7s linear infinite;}
.pulse{animation:pulse 1.6s ease infinite;}
.flicker{animation:flicker 4s ease infinite;}
`

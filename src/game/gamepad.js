// Manette (disposition standard, Xbox ou PlayStation). En jeu : déplacement, regard, actions.
// Dans les menus : la croix ou le stick gauche déplacent le focus, A valide, B revient en arrière.
import {input,keyDown,keyUp,tapKey,KEY} from './input.js'
import {useGame,isSimRunning} from './store.js'

export const BTN={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,BACK:8,START:9,L3:10,R3:11,UP:12,DOWN:13,LEFT:14,RIGHT:15}
// Zone morte circulaire, puis remise à l'échelle : pas de dérive au repos, pas de saut à la sortie de la zone.
export function radialDeadzone(x,y,dead=.18){
 const m=Math.hypot(x,y);if(m<dead)return {x:0,y:0}
 const k=Math.min(1,(m-dead)/(1-dead))/m
 return {x:x*k,y:y*k}
}
// Regard plus précis près du centre et rapide en bout de course.
export const lookCurve=v=>Math.sign(v)*Math.abs(v)**1.7
// Élément le plus proche dans une direction ; l'écart latéral compte davantage que la distance.
export function nearestInDirection(from,items,dir){
 const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir]
 let best=-1,score=Infinity
 items.forEach((r,i)=>{
  const dx=r.x-from.x,dy=r.y-from.y,along=dx*v[0]+dy*v[1],across=Math.abs(dx*v[1])+Math.abs(dy*v[0])
  if(along<=2)return
  const s=along+across*2.2;if(s<score){score=s;best=i}
 })
 return best
}
export function rumble(strong,weak,ms){
 const pad=activePad()
 pad?.vibrationActuator?.playEffect?.('dual-rumble',{duration:ms,strongMagnitude:Math.min(1,strong),weakMagnitude:Math.min(1,weak)})?.catch?.(()=>{})
 if(!pad&&useGame.getState().inputDevice==='touch')globalThis.navigator?.vibrate?.(ms)
}
function activePad(){
 const list=globalThis.navigator?.getGamepads?.();if(!list)return null
 for(const p of list)if(p&&p.connected!==false)return p
 return null
}
const focusables=root=>[...root.querySelectorAll('button,input,textarea,select,a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>{
 if(el.disabled)return false
 const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'
})
const topContainer=()=>{const all=document.querySelectorAll('.modal-shade,.ending-screen,.journal-overlay');return all.length?all[all.length-1]:document.body}
const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
function setFocus(el){
 document.querySelector('.pad-focus')?.classList.remove('pad-focus')
 if(!el)return
 el.focus({preventScroll:true});el.classList.add('pad-focus');el.scrollIntoView({block:'nearest'})
}
function moveFocus(dir){
 const root=topContainer(),items=focusables(root);if(!items.length)return
 const cur=document.activeElement
 if(!items.includes(cur)){setFocus(root.querySelector('[data-pad-first]')||items[0]);return}
 if((dir==='left'||dir==='right')&&cur.type==='range'){
  const step=+cur.step||1,v=Math.min(+cur.max,Math.max(+cur.min,+cur.value+(dir==='right'?step:-step)))
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(cur,String(v));cur.dispatchEvent(new Event('input',{bubbles:true}));return
 }
 const others=items.filter(el=>el!==cur),i=nearestInDirection(center(cur),others.map(center),dir)
 if(i>=0)setFocus(others[i])
}
function confirmFocus(){
 const root=topContainer(),items=focusables(root),cur=document.activeElement
 if(!items.includes(cur)){setFocus(root.querySelector('[data-pad-first]')||items[0]);return}
 cur.click()
}
function goBack(){
 const close=topContainer().querySelector('.close-x')
 if(close)close.click();else tapKey(...KEY.escape)
}
function uiMode(s){return s.phase==='ending'||s.paused||s.journalVisible||s.settingsVisible||s.modal==='puzzle'||!!document.querySelector('.modal-shade,.journal-overlay')}
export function startGamepad(){
 const prev=[];let repeatDir=null,repeatAt=0,raf=0,rumbled=null
 const unsub=useGame.subscribe((s,p)=>{
  const ev=s.lastEvent;if(!ev||ev===p.lastEvent||ev===rumbled)return;rumbled=ev
  if(ev.type==='scare')rumble(1,.8,420)
  else if(ev.type==='caught')rumble(1,1,800)
  else if(ev.type==='chase_start')rumble(.8,.5,1400)
 })
 const loop=()=>{
  raf=requestAnimationFrame(loop)
  const pad=activePad(),st=input.pad
  if(!pad){st.x=st.y=st.lookX=st.lookY=0;st.run=false;prev.length=0;return}
  const b=i=>{const x=pad.buttons[i];return !!x&&(x.pressed||x.value>.4)}
  const pressed=i=>b(i)&&!prev[i]
  const s=useGame.getState()
  const left=radialDeadzone(pad.axes[0]||0,pad.axes[1]||0),right=radialDeadzone(pad.axes[2]||0,pad.axes[3]||0)
  const active=left.x||left.y||right.x||right.y||pad.buttons.some(x=>x?.pressed)
  if(active&&s.inputDevice!=='gamepad')s.setInputDevice('gamepad')
  const menu=s.phase==='menu'&&!document.querySelector('.modal-shade')
  const ui=!menu&&uiMode(s),game=!menu&&!ui
  if(game&&isSimRunning(s)){st.x=left.x;st.y=-left.y;st.lookX=lookCurve(right.x);st.lookY=lookCurve(right.y)}
  else{st.x=st.y=st.lookX=st.lookY=0}
  st.run=game&&(b(BTN.RT)||b(BTN.LT)||b(BTN.L3)||b(BTN.RB))
  if(game){
   if(pressed(BTN.A))keyDown(...KEY.interact);else if(!b(BTN.A)&&prev[BTN.A])keyUp(...KEY.interact)
   if(pressed(BTN.B))keyDown(...KEY.jump);else if(!b(BTN.B)&&prev[BTN.B])keyUp(...KEY.jump)
   if(pressed(BTN.X))tapKey(...KEY.torch)
   if(pressed(BTN.Y))tapKey(...KEY.journal)
   if(pressed(BTN.BACK))tapKey(...KEY.map)
   // Le pointeur verrouillé par la souris doit être libéré d'abord : sa perte met le jeu en pause.
   if(pressed(BTN.START)){if(document.pointerLockElement)document.exitPointerLock();else tapKey(...KEY.escape)}
  }else{
   // Menus : direction avec répétition quand on la maintient.
   const dir=b(BTN.UP)||left.y<-.55?'up':b(BTN.DOWN)||left.y>.55?'down':b(BTN.LEFT)||left.x<-.55?'left':b(BTN.RIGHT)||left.x>.55?'right':null
   const now=performance.now()
   if(dir&&(dir!==repeatDir||now>=repeatAt)){
    repeatAt=now+(dir===repeatDir?140:320);repeatDir=dir
    if(menu){if(dir==='up')tapKey(...KEY.up);else if(dir==='down')tapKey(...KEY.down)}
    else moveFocus(dir)
   }else if(!dir)repeatDir=null
   if(pressed(BTN.A)){if(menu)tapKey(...KEY.enter);else confirmFocus()}
   if(ui&&pressed(BTN.B))goBack()
   if(ui&&pressed(BTN.START)){const form=topContainer().querySelector('form');if(form)form.requestSubmit();else if(s.paused)s.setPaused(false)}
   // Le stick droit fait défiler les longs documents (énigmes, journal).
   if(ui&&right.y){const area=topContainer().querySelector('.case-file,.panel,.journal-list')||topContainer();area.scrollTop+=right.y*14}
  }
  pad.buttons.forEach((_,i)=>{prev[i]=b(i)})
 }
 raf=requestAnimationFrame(loop)
 return ()=>{cancelAnimationFrame(raf);unsub()}
}
// Bascule des aides affichées selon ce que le joueur vient d'utiliser. Les touches simulées ne comptent pas.
export function trackInputDevice(){
 const set=d=>{const s=useGame.getState();if(s.inputDevice!==d)s.setInputDevice(d)}
 const onPointer=e=>{if(e.pointerType==='touch')set('touch');else if(e.pointerType==='mouse'&&e.isTrusted)set('keyboard')}
 const onKey=e=>{if(e.isTrusted&&!document.querySelector('input:focus,textarea:focus'))set('keyboard')}
 const onMouse=e=>{if(e.isTrusted&&(Math.abs(e.movementX)>2||Math.abs(e.movementY)>2)&&useGame.getState().inputDevice==='gamepad')set('keyboard')}
 window.addEventListener('pointerdown',onPointer,true);window.addEventListener('keydown',onKey,true);window.addEventListener('mousemove',onMouse,true)
 return ()=>{window.removeEventListener('pointerdown',onPointer,true);window.removeEventListener('keydown',onKey,true);window.removeEventListener('mousemove',onMouse,true)}
}

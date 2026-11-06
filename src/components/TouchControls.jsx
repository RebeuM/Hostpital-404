import React,{useEffect,useRef,useState} from 'react'
import {Flashlight,Hand,ChevronsUp,Footprints} from 'lucide-react'
import {useGame,runtime,isSimRunning} from '../game/store'
import {input,tapKey,KEY} from '../game/input'
import {STICK,stickVector,haptic} from '../game/phone'

const LOOK_SENS=.0048,TAP_MS=220,TAP_PX=10
// Les aides disparaissent dès le premier usage, et ne reviennent pas de la session.
const coachSeen={stick:false,look:false,tip:false}
const startsStick=(x,y)=>{
 const w=window.innerWidth,h=window.innerHeight
 return x<w*.5&&y>h*(h>w?.42:.22)
}
// Commandes tactiles : à gauche, un joystick qui apparaît sous le pouce (au-delà de l'anneau, on court) ; ailleurs, glisser pour regarder, toucher pour agir.
export default function TouchControls(){
 const near=useGame(s=>!!s.near||!!s.hiding)
 const [stickOn,setStickOn]=useState(false),[running,setRunning]=useState(input.touch.runLatch),[coach,setCoach]=useState({...coachSeen})
 const [tip]=useState(!coachSeen.tip)
 useEffect(()=>{coachSeen.tip=true},[])
 const touches=useRef(new Map()),layer=useRef(),ring=useRef(),knob=useRef()
 useEffect(()=>()=>{const t=input.touch;t.x=t.y=0;t.run=false;t.runLatch=false},[])
 // Sans cela, Safari interprète les glissements (retour arrière depuis le bord, sélection, loupe) malgré touch-action.
 useEffect(()=>{
  const el=layer.current,stop=e=>e.preventDefault()
  el.addEventListener('touchstart',stop,{passive:false});el.addEventListener('touchmove',stop,{passive:false})
  return()=>{el.removeEventListener('touchstart',stop);el.removeEventListener('touchmove',stop)}
 },[])
 const seen=which=>{if(coachSeen[which])return;coachSeen[which]=true;setCoach({...coachSeen})}
 const applyStick=(x0,y0,dx,dy)=>{
  const v=stickVector(dx,dy)
  input.touch.x=v.x;input.touch.y=v.y;input.touch.run=v.run||input.touch.runLatch
  if(knob.current)knob.current.style.transform=`translate(${v.knobX}px,${v.knobY}px)`
  if(ring.current){ring.current.style.left=x0+'px';ring.current.style.top=y0+'px';ring.current.classList.toggle('running',input.touch.run&&(v.x!==0||v.y!==0))}
  if(v.x||v.y)seen('stick')
 }
 const onDown=e=>{
  if(e.pointerType==='mouse')return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  // Un seul joystick : un second doigt à gauche sert à regarder.
  const hasStick=[...touches.current.values()].some(t=>t.kind==='stick')
  const kind=startsStick(e.clientX,e.clientY)&&!hasStick?'stick':'look'
  touches.current.set(e.pointerId,{kind,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,at:performance.now(),moved:false})
  if(kind==='stick'){setStickOn(true);applyStick(e.clientX,e.clientY,0,0)}
 }
 const onMove=e=>{
  const t=touches.current.get(e.pointerId);if(!t)return
  if(t.kind==='stick'){applyStick(t.x0,t.y0,e.clientX-t.x0,e.clientY-t.y0);return}
  if(Math.hypot(e.clientX-t.x0,e.clientY-t.y0)>TAP_PX){t.moved=true;seen('look')}
  const st=useGame.getState()
  if(isSimRunning(st)){const sens=LOOK_SENS*st.settings.sensitivity,l=runtime.look
   l.yaw-=(e.clientX-t.x)*sens;l.pitch=Math.max(-1.45,Math.min(1.45,l.pitch-(e.clientY-t.y)*sens))}
  t.x=e.clientX;t.y=e.clientY
 }
 const onUp=e=>{
  const t=touches.current.get(e.pointerId);if(!t)return
  touches.current.delete(e.pointerId)
  if(t.kind==='stick'){
   // Lâcher le joystick met fin à la course demandée au bouton.
   input.touch.x=input.touch.y=0;input.touch.run=false;input.touch.runLatch=false;setRunning(false);setStickOn(false)
  }else if(e.type==='pointerup'&&!t.moved&&performance.now()-t.at<TAP_MS&&useGame.getState().near){
   // Toucher l'écran en visant un objet revient à appuyer sur « interagir ».
   haptic();tapKey(...KEY.interact)
  }
 }
 const press=(e,key)=>{e.preventDefault();e.stopPropagation();haptic();tapKey(...key)}
 const toggleRun=e=>{
  e.preventDefault();e.stopPropagation();haptic()
  const on=!input.touch.runLatch;input.touch.runLatch=on;input.touch.run=on;setRunning(on)
 }
 return <>
  <div className="touch-layer" ref={layer} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}/>
  <div className="touch-stick" ref={ring} style={{display:stickOn?'block':'none',width:STICK.radius*2,height:STICK.radius*2,margin:-STICK.radius}}><span ref={knob}/></div>
  {!stickOn&&<div className="touch-stick-hint" aria-hidden="true"/>}
  {!coach.stick&&<div className="touch-coach stick" aria-hidden="true">Glisse pour marcher<small>au-delà de l’anneau, tu cours</small></div>}
  {!coach.look&&<div className="touch-coach look" aria-hidden="true">Glisse pour regarder<small>touche pour agir</small></div>}
  {tip&&<div className="portrait-tip" aria-hidden="true">Plus confortable à l’horizontale</div>}
  <div className="touch-actions">
   <button className={'touch-btn touch-interact'+(near?' on':'')} aria-label="Interagir" onPointerDown={e=>press(e,KEY.interact)}><Hand size={32}/></button>
   <button className="touch-btn touch-jump" aria-label="Sauter" onPointerDown={e=>press(e,KEY.jump)}><ChevronsUp size={24}/></button>
   <button className={'touch-btn touch-run'+(running?' on':'')} aria-label="Courir" aria-pressed={running} onPointerDown={toggleRun}><Footprints size={23}/></button>
   <TorchButton onPress={e=>press(e,KEY.torch)}/>
  </div>
 </>
}
function TorchButton({onPress}){
 const on=useGame(s=>s.flashlight)
 return <button className={'touch-btn touch-torch'+(on?' lit':'')} aria-label="Lampe torche" aria-pressed={on} onPointerDown={onPress}><Flashlight size={21}/></button>
}

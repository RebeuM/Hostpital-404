import React,{useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {createPortal,useFrame,useThree} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import {useGame,runtime,isSimRunning} from '../game/store'
import {difficultyOf} from '../game/difficulty'
import {OUTSIDE_START,INSIDE_TRIGGER_Z,isOccupied,moveWithCollision,raycastTarget,assistedTarget,zoneName,roomAt,SECRET,INTERACTIVES,hideSpot} from '../game/layout'
import {viewFov,lampPose} from '../game/phone'
import {input} from '../game/input'
import {flickerLevel,canDread,TURN_TRAP} from '../game/dread'
import {stepStamina} from '../game/stamina'
import {QUALITY_PRESETS,PHONE_LIGHT} from '../game/settings'
import {STORIES,focusFor} from '../game/story'
import {footstep,updateTv,pantTick,setRoomAudio} from '../game/audio'
import {modelUrl,DRACO_PATH} from './assets'
import Highlighter from './Highlighter'

const EYE=1.68
// Hauteur du visage du monstre quand il saisit le joueur (animation Kill), mesurée sur le modèle.
const MONSTER_FACE_Y=2.1
const WALK=2.3,RUN=3.9
const JUMP_SPEED=4.1,GRAVITY=13
const SURFACE_BY_ROOM={parvis:'concrete',couloir:'lino',accueil:'lino',attente:'lino',secret:'concrete'}
const TV=INTERACTIVES.find(i=>i.id==='tv')

// Lampe tenue en bas à droite de la vue. Le faisceau part de sa lentille et suit ses mouvements.
// Puissance de la torche (relevée le 2026-11-06 à la demande du propriétaire, « trop basse » : 17 → 45, cône 0,33 → 0,46 rad, portée 18 → 30 m).
const LAMP_POS=new THREE.Vector3(.2,-.2,-.4),LENS_Z=-.138,BEAM_ON=45*PHONE_LIGHT.torch,BEAM_ANGLE=.46,BEAM_RANGE=30
// L'ombre de la torche s'arrête à 16 m : au-delà elle ne se voit plus dans le noir, et chaque objet en plus dans sa passe coûte.
const SHADOW_RANGE=16
// En deçà de cette distance, le faisceau baisse pour compenser le carré inverse : une surface proche reste lisible au lieu de virer au blanc.
const BEAM_CLEAR=3.2,BEAM_PROBES=Array.from({length:14},(_,i)=>.62+i*.2)
// La lampe vise le centre de l'écran à 9 m : le faisceau reste sous le réticule.
const LAMP_ROT=new THREE.Euler(Math.atan2(-LAMP_POS.y,9+LAMP_POS.z),Math.atan2(LAMP_POS.x,9+LAMP_POS.z),0)
function Flashlight({preset}){
 const rig=useRef(),spot=useRef(),halo=useRef(),target=useRef(),retract=useRef(0),dim=useRef(1),power=useRef(1),bob=useRef(0),sway=useRef({yaw:0,pitch:0}),last=useRef(null)
 const {camera,scene}=useThree()
 const {scene:source}=useGLTF(modelUrl('flashlight'),DRACO_PATH)
 // Bras CC0 (OpenGameArt, « fps arms »), déjà posé autour de la poignée par scripts/bake-arm.mjs.
 const {scene:armSource}=useGLTF(modelUrl('arm_right'),DRACO_PATH)
 const hand=useMemo(()=>{
  const arm=armSource.clone(true)
  arm.traverse(o=>{if(!o.isMesh)return
   const m=o.material.clone();m.transparent=true;m.fog=false;m.roughness=.68;m.metalness=0;m.emissive=new THREE.Color('#1e1510');m.color.set('#e8dcd2')
   o.material=m;o.castShadow=false;o.receiveShadow=false;o.renderOrder=1000;o.frustumCulled=false})
  return arm
 },[armSource])
 const {model,glass,button}=useMemo(()=>{
  const glass=new THREE.MeshStandardMaterial({color:'#fff4dc',emissive:'#fff1d6',roughness:.2,fog:false,transparent:true})
  const button=new THREE.MeshStandardMaterial({color:'#3a1612',emissive:'#ff5a2a',roughness:.5,fog:false,transparent:true})
  const body=new THREE.MeshStandardMaterial({color:'#5a5e65',emissive:'#17181b',metalness:.45,roughness:.48,fog:false,transparent:true})
  const bezel=new THREE.MeshStandardMaterial({color:'#26282b',emissive:'#0c0c0e',roughness:.82,fog:false,transparent:true})
  const mats={glass,button,body,bezel}
  const model=source.clone(true)
  model.traverse(o=>{if(!o.isMesh)return
   o.material=mats[o.name]||body;o.castShadow=false;o.receiveShadow=false;o.renderOrder=1000;o.frustumCulled=false})
  return {model,glass,button}
 },[source])
 // Vide le tampon de profondeur juste avant la lampe : elle ne traverse jamais un mur ou un meuble.
 const depthClear=useMemo(()=>{
  const m=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3)),new THREE.MeshBasicMaterial({transparent:true,colorWrite:false,depthWrite:false,depthTest:false}))
  m.renderOrder=999;m.frustumCulled=false;m.onBeforeRender=gl=>gl.clearDepth();return m
 },[])
 // La caméra doit appartenir à la scène pour que la lampe, son enfant, soit rendue.
 useEffect(()=>{scene.add(camera);return()=>{scene.remove(camera)}},[camera,scene])
 useEffect(()=>{spot.current.target=target.current},[])
 useFrame((_,dt)=>{
  if(!spot.current||!rig.current)return
  const s=useGame.getState(),p=runtime.player,d=Math.min(dt,.05)
  rig.current.visible=s.phase==='playing'&&s.modal!=='prologue'&&!s.hiding
  // Inertie : la lampe accuse un léger retard sur le regard, et balance au rythme de la marche.
  const prev=last.current||{yaw:p.yaw,pitch:p.pitch,x:p.x,z:p.z}
  const dy=Math.atan2(Math.sin(p.yaw-prev.yaw),Math.cos(p.yaw-prev.yaw)),moved=Math.hypot(p.x-prev.x,p.z-prev.z)
  const k=Math.min(1,d*10),sw=sway.current
  sw.yaw+=(THREE.MathUtils.clamp(dy*2.2,-.12,.12)-sw.yaw)*k;sw.pitch+=(THREE.MathUtils.clamp((p.pitch-prev.pitch)*2.2,-.1,.1)-sw.pitch)*k
  last.current={yaw:p.yaw,pitch:p.pitch,x:p.x,z:p.z}
  bob.current+=moved*5.2
  const amp=Math.min(1,moved/Math.max(d,.001)/WALK)
  // Face à un obstacle, la lampe se replie vers le joueur : le faisceau ne part jamais de l'autre côté du mur.
  const probe=dist=>isOccupied(p.x+Math.sin(p.yaw)*dist,p.z+Math.cos(p.yaw)*dist,s,0)
  const blocked=probe(.62)
  // Le faisceau faiblit à l'approche d'une surface, mur, meuble ou sol regardé, pour ne pas brûler l'image.
  let surface=BEAM_CLEAR
  for(const dist of BEAM_PROBES)if(probe(dist)){surface=dist;break}
  if(p.pitch<-.05)surface=Math.min(surface,EYE/Math.sin(-p.pitch))
  dim.current+=((blocked?.02:Math.min(1,(surface/BEAM_CLEAR)**2))-dim.current)*Math.min(1,d*7)
  retract.current+=((blocked?.17:0)-retract.current)*Math.min(1,d*9)
  // Au tactile, l'écran change de forme : la main garde sa place à l'écran et le faisceau continue de viser le centre.
  const touch=s.inputDevice==='touch',lamp=touch?lampPose(LAMP_POS,camera.fov,camera.aspect):LAMP_POS
  const aimX=touch?Math.atan2(-lamp.y,9+lamp.z):LAMP_ROT.x,aimY=touch?Math.atan2(lamp.x,9+lamp.z):LAMP_ROT.y
  rig.current.position.set(lamp.x+Math.sin(bob.current)*.006*amp,lamp.y+Math.abs(Math.cos(bob.current))*.008*amp-sw.pitch*.05-THREE.MathUtils.clamp(p.vy*.008,-.03,.03),lamp.z+retract.current)
  rig.current.rotation.set(aimX+sw.pitch,aimY+sw.yaw,0)
  // Pendant le blackout (Maxime disparaît), la torche meurt elle aussi ; elle revient avec le scintillement.
  const on=s.flashlight&&s.phase==='playing'&&s.blackout!=='dark'&&s.modal!=='prologue'&&!s.hiding
  power.current+=((on?1:0)-power.current)*Math.min(1,dt*12)
  const level=power.current*flickerLevel(performance.now(),runtime.torchDipUntil,s.settings.reduceMotion)
  spot.current.intensity=BEAM_ON*level*dim.current
  if(halo.current)halo.current.intensity=BEAM_ON*level*.015
  glass.emissiveIntensity=level*4;button.emissiveIntensity=level*.35
 })
 const shadow=preset.flashlightShadow>0
 // Le halo est le rebond de la torche sur les surfaces proches : très faible, il évite le noir absolu dans le dos du joueur.
 return createPortal(<>
  <pointLight ref={halo} color="#e8dcc4" intensity={.25} distance={2.6} decay={2}/>
  <group ref={rig} position={LAMP_POS.toArray()} rotation={[LAMP_ROT.x,LAMP_ROT.y,0]}>
   <primitive object={depthClear}/>
   <primitive object={model}/>
   <primitive object={hand}/>
   <spotLight ref={spot} position={[0,0,LENS_Z]} angle={BEAM_ANGLE} penumbra={.65} color="#fff1d6" intensity={BEAM_ON} distance={BEAM_RANGE} decay={2}
    castShadow={shadow} shadow-mapSize={[preset.flashlightShadow||512,preset.flashlightShadow||512]} shadow-bias={-.0004} shadow-normalBias={.02} shadow-camera-near={.2} shadow-camera-far={SHADOW_RANGE}/>
   <object3D ref={target} position={[0,0,-9]}/>
  </group>
 </>,camera)
}
export default function Player(){
 const {camera,gl}=useThree()
 const keys=useRef(new Set()),vel=useRef({x:0,z:0}),step=useRef(0),stepPhase=useRef(0),tick=useRef(0),second=useRef(0),autosave=useRef(0)
 const jumpAsked=useRef(-1e9),landDip=useRef(0)
 const shakeT=useRef(0),lastShake=useRef(0),rollSmooth=useRef(0),forward=useMemo(()=>new THREE.Vector3(),[])
 const quality=useGame(s=>s.settings.quality),fov=useGame(s=>s.settings.fov),phase=useGame(s=>s.phase)
 const preset=QUALITY_PRESETS[quality]
 const touch=useGame(s=>s.inputDevice==='touch'),size=useThree(s=>s.size)
 useEffect(()=>{camera.fov=viewFov(fov,size.width/size.height,touch);camera.updateProjectionMatrix()},[fov,camera,touch,size.width,size.height])
 // Clavier : codes physiques (ZQSD et WASD fonctionnent sans réglage), flèches, Maj.
 useEffect(()=>{
  const down=e=>{
   if(e.target.closest?.('input, textarea, button, select'))return
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault()
   keys.current.add(e.code);keys.current.add('key:'+e.key.toLowerCase())
   if(e.code==='Space'&&!e.repeat)jumpAsked.current=performance.now()
  }
  const up=e=>{keys.current.delete(e.code);keys.current.delete('key:'+e.key.toLowerCase())}
  const blur=()=>{keys.current.clear()}
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur)
  document.addEventListener('visibilitychange',blur)
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur)}
 },[])
 // Verrouillage du pointeur et souris.
 useEffect(()=>{
  const el=gl.domElement
  // La caméra reprend seule dès que la simulation tourne : aucune invite à cliquer.
  let pending=false,wasLocked=false,retry,attempts=0
  const request=async()=>{
   if(pending)return
   pending=true
   try{await el.requestPointerLock?.({unadjustedMovement:true})}
   catch{try{await el.requestPointerLock?.()}catch{}}
   pending=false
  }
  // Rien à verrouiller au tactile ni à la manette (et un refus du navigateur ne doit pas bloquer le jeu).
  const ensureLock=()=>{const st=useGame.getState();if(st.inputDevice==='keyboard'&&isSimRunning(st)&&document.pointerLockElement!==el)request()}
  const unsubscribe=useGame.subscribe((s,prev)=>{if(isSimRunning(s)&&!isSimRunning(prev)){attempts=0;ensureLock()}})
  ensureLock()
  const onChange=()=>{
   const locked=document.pointerLockElement===el
   const st=useGame.getState()
   // Chrome émet aussi cet événement après un refus : seule la perte d'un verrou réellement obtenu met en pause.
   if(!locked&&wasLocked&&isSimRunning(st))st.setPaused(true)
   wasLocked=locked
   if(locked)attempts=0
   // Verrou accordé alors qu'une fenêtre vient de s'ouvrir : le curseur doit rester disponible.
   if(locked&&(st.paused||st.journalVisible||st.settingsVisible||st.modal==='puzzle'))document.exitPointerLock()
  }
  // Refus du navigateur (attente imposée après Échap, geste requis) : quelques essais, puis le prochain geste relance.
  const onError=()=>{clearTimeout(retry);if(++attempts<=10)retry=setTimeout(ensureLock,400)}
  const onMove=e=>{
   if(document.pointerLockElement!==el)return
   const st=useGame.getState();if(!isSimRunning(st))return
   const sens=.0021*st.settings.sensitivity
   const l=runtime.look
   l.yaw-=e.movementX*sens
   l.pitch=Math.max(-1.45,Math.min(1.45,l.pitch-e.movementY*sens))
  }
  // Après les autres gestionnaires : une touche ou un clic peut avoir ouvert une fenêtre ou la pause.
  const onGesture=()=>{attempts=0;setTimeout(ensureLock,0)}
  document.addEventListener('pointerlockchange',onChange);document.addEventListener('pointerlockerror',onError)
  document.addEventListener('mousemove',onMove);document.addEventListener('click',onGesture);document.addEventListener('keydown',onGesture)
  return()=>{unsubscribe();clearTimeout(retry);document.removeEventListener('pointerlockchange',onChange);document.removeEventListener('pointerlockerror',onError);document.removeEventListener('mousemove',onMove);document.removeEventListener('click',onGesture);document.removeEventListener('keydown',onGesture)}
 },[gl])
 useEffect(()=>{
  if(phase==='playing'){const p=runtime.player;runtime.look.yaw=p.yaw;runtime.look.pitch=p.pitch;camera.position.set(p.x,EYE,p.z);camera.rotation.set(p.pitch,p.yaw+Math.PI,0,'YXZ')}
 },[phase,camera])
 useFrame((_,delta)=>{
  const s=useGame.getState()
  const p=runtime.player
  // Chronomètre : compte aussi les dialogues, énigmes et le journal ; seules la pause et la capture l'arrêtent.
  if(s.phase==='playing'&&!s.paused&&!s.capture&&s.modal!=='prologue'){second.current+=Math.min(delta,1);if(second.current>=.25){s.tickElapsed(second.current);second.current=0}}
  // Stick droit : vitesse de rotation, plus rapide à l'horizontale qu'à la verticale.
  if(isSimRunning(s)&&(input.pad.lookX||input.pad.lookY)){const d=Math.min(delta,.05)*s.settings.sensitivity,l=runtime.look;l.yaw-=input.pad.lookX*2.9*d;l.pitch=Math.max(-1.45,Math.min(1.45,l.pitch-input.pad.lookY*1.9*d))}
  // Lissage du regard : la souris pilote une cible, la caméra la rejoint en ~40 ms (moins de tremblement).
  if(!s.capture){const l=runtime.look;const k=Math.min(1,delta*26);let dy=l.yaw-p.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));p.yaw+=dy*k;p.pitch+=(l.pitch-p.pitch)*k}
  // Dialogue : la caméra se tourne doucement vers l'interlocuteur (façon Animal Crossing), la souris est ignorée.
  if(s.modal==='story'&&!s.dialogWalk){const f=focusFor(STORIES[s.dialog],s.dialogStep)
   if(f){const dx=f.x-p.x,dz=f.z-p.z;const ty=Math.atan2(dx,dz),tp=Math.atan2((f.y??1.5)-EYE,Math.max(.4,Math.hypot(dx,dz)))
    let d=ty-p.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));const k=Math.min(1,delta*3.2);p.yaw+=d*k;p.pitch+=(tp-p.pitch)*k;runtime.look.yaw=p.yaw;runtime.look.pitch=p.pitch}}
  camera.rotation.set(p.pitch,p.yaw+Math.PI,0,'YXZ')
  if(s.shake!==lastShake.current){lastShake.current=s.shake;shakeT.current=.7}
  if(s.capture){
   // Saisi par le monstre : la caméra se tourne vers lui et s'affaisse légèrement.
   // Il est bien plus grand que Thomas et se penche vers lui : la caméra lève les yeux vers son visage.
   const c=runtime.chaser;const target=Math.atan2(c.x-p.x,c.z-p.z),face=Math.min(.55,Math.atan2(MONSTER_FACE_Y-EYE,Math.max(.6,Math.hypot(c.x-p.x,c.z-p.z))))
   let d=target-p.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));p.yaw+=d*Math.min(1,delta*6);p.pitch+=(face-p.pitch)*Math.min(1,delta*5);runtime.look.yaw=p.yaw;runtime.look.pitch=p.pitch
   camera.rotation.set(p.pitch,p.yaw+Math.PI,0,'YXZ');camera.position.set(p.x+(Math.random()-.5)*.02,EYE-.08,p.z);return
  }
  // Prologue : lente avancée vers l'hôpital.
  if(s.modal==='prologue'&&!s.paused)p.z=Math.min(OUTSIDE_START.endZ,p.z+delta*.16)
  if(!isSimRunning(s)){if(!s.hiding)camera.position.set(p.x,EYE,p.z);return}
  // Caché : on reste immobile et on regarde par la fente, le souffle revient.
  if(s.hiding){
   const h=hideSpot(s.hiding),l=runtime.look
   jumpAsked.current=-1e9 // Espace dans le casier ne doit pas faire sauter à la sortie.
   let dy=l.yaw-h.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));l.yaw=h.yaw+Math.max(-.8,Math.min(.8,dy));l.pitch=Math.max(-.45,Math.min(.45,l.pitch))
   camera.position.set(h.cam[0],h.cam[1],h.cam[2]);camera.rotation.z=0
   vel.current.x=vel.current.z=0;runtime.playerMoving=false
   runtime.stamina=stepStamina(runtime.stamina,Math.min(.25,delta),{hidden:true})
   tick.current+=delta
   if(tick.current>.1){s.tickEncounter(tick.current);tick.current=0;if(s.near)s.setNear(null)}
   if(s.chase){s.decrementChase(Math.min(1,delta));if(s.chaseTime<=0){s.emit('caught');s.end('caught')}}
   return
  }
  // Pas de temps réel borné, intégré en sous-pas (≤ 50 ms) : stable à bas débit d'images sans traverser les murs.
  const dt=Math.min(.25,delta)
  // Saut : l'appui reste valable un court instant pour rester réactif juste avant l'atterrissage.
  const grounded=p.jump<=0
  if(grounded&&performance.now()-jumpAsked.current<140){p.vy=JUMP_SPEED;jumpAsked.current=-1e9}
  if(!grounded||p.vy>0){
   p.vy-=GRAVITY*dt;p.jump=Math.max(0,p.jump+p.vy*dt)
   if(p.jump<=0&&p.vy<0){landDip.current=Math.min(.09,-p.vy*.016);p.vy=0;footstep(SURFACE_BY_ROOM[roomAt(p.x,p.z)]||'tile',true)}
  }
  landDip.current*=Math.exp(-dt*11)
  const k=keys.current
  const has=(...codes)=>codes.some(c=>k.has(c))
  // Clavier, manette et tactile s'additionnent ; les sticks donnent une vitesse progressive.
  const front=(has('KeyW','ArrowUp','key:z','key:w')?1:0)-(has('KeyS','ArrowDown','key:s')?1:0)+input.pad.y+input.touch.y
  const side=(has('KeyD','ArrowRight','key:d')?1:0)-(has('KeyA','ArrowLeft','key:q','key:a')?1:0)+input.pad.x+input.touch.x
  // La course use l'endurance ; à bout de souffle, plus moyen de courir pendant un moment.
  const wantsMove=Math.hypot(front,side)>.08
  runtime.stamina=stepStamina(runtime.stamina,dt,{wantsRun:has('ShiftLeft','ShiftRight')||input.pad.run||input.touch.run,moving:wantsMove,seconds:difficultyOf(s.settings).staminaSeconds})
  const running=runtime.stamina.running;runtime.playerMoving=wantsMove
  const fx=Math.sin(p.yaw),fz=Math.cos(p.yaw)
  let tx=0,tz=0
  if(front||side){const n=1/Math.max(1,Math.hypot(front,side));const sp=(running?RUN:WALK)*n;tx=(fx*front-fz*side)*sp;tz=(fz*front+fx*side)*sp} // droite = avant × haut = (−fz, fx)
  // En l'air, on garde son élan : le joueur ne contrôle plus que légèrement sa trajectoire.
  const accel=Math.min(1,dt*(front||side?11:14))*(p.jump>0?.18:1)
  vel.current.x+=(tx-vel.current.x)*accel;vel.current.z+=(tz-vel.current.z)*accel
  const moving=Math.hypot(vel.current.x,vel.current.z)>.25
  if(moving){
   const steps=Math.max(1,Math.ceil(dt/.05)),sub=dt/steps
   let nx=p.x,nz=p.z
   for(let i=0;i<steps;i++){const next=moveWithCollision(nx,nz,vel.current.x*sub,vel.current.z*sub,s);nx=next.x;nz=next.z}
   const movedDist=Math.hypot(nx-p.x,nz-p.z)
   p.x=nx;p.z=nz
   if(movedDist>1e-4){
    const prev=stepPhase.current;stepPhase.current+=movedDist*(running?.78:.9)
    if(Math.floor(stepPhase.current)!==Math.floor(prev)&&p.jump<=0)footstep(SURFACE_BY_ROOM[roomAt(p.x,p.z)]||'tile',running)
    step.current+=movedDist*(running?2.2:1.7)
   }else{vel.current.x*=.5;vel.current.z*=.5}
  }
  const reduce=s.settings.reduceMotion
  const speed=Math.hypot(vel.current.x,vel.current.z)
  let bobY=0,roll=0,swayX=0,swayZ=0
  if(moving&&!reduce){const amp=.018+.012*Math.min(1,speed/RUN);bobY=Math.sin(step.current*2)*amp;roll=Math.sin(step.current)*.006
   // léger balancement latéral dans l'axe droite/gauche de la caméra
   const sw=Math.sin(step.current)*.012;swayX=Math.cos(p.yaw)*sw;swayZ=-Math.sin(p.yaw)*sw}
  // roulis dans les pas de côté, champ de vision élargi en course
  const targetRoll=reduce?0:-side*.012;rollSmooth.current+=(targetRoll-rollSmooth.current)*Math.min(1,dt*8)
  const targetFov=viewFov(s.settings.fov,camera.aspect,s.inputDevice==='touch')+(running&&moving&&!reduce?6:0);if(Math.abs(camera.fov-targetFov)>.05){camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix()}
  let sx=0,sy=0
  if(shakeT.current>0&&!reduce){shakeT.current-=dt;const a=shakeT.current*.09;sx=(Math.random()-.5)*a;sy=(Math.random()-.5)*a}
  camera.position.set(p.x+sx+swayX,EYE+bobY+sy+p.jump-(reduce?0:landDip.current),p.z+swayZ)
  camera.rotation.z=roll+rollSmooth.current
  tick.current+=dt;autosave.current+=dt
  if(tick.current>.1){
   const zone=zoneName(p.x,p.z);s.tickAmbientScare(tick.current,zone!==s.zone);s.tickCatScare();s.tickLaugh(tick.current);s.tickDread(tick.current);s.tickEncounter(tick.current)
   pantTick(tick.current,runtime.stamina.value)
   if(performance.now()<runtime.turnTrapUntil){const d=Math.atan2(Math.sin(p.yaw-runtime.turnTrapYaw),Math.cos(p.yaw-runtime.turnTrapYaw));if(Math.abs(d)>TURN_TRAP.angle){runtime.turnTrapUntil=0;if(canDread(s))s.scareIfAllowed()}}
   tick.current=0
   s.setZone(zone)
   {const cp=Math.cos(p.pitch);s.setNear(s.inputDevice==='touch'?assistedTarget(p.x,EYE,p.z,p.yaw,p.pitch,s):raycastTarget(p.x,EYE,p.z,Math.sin(p.yaw)*cp,Math.sin(p.pitch),Math.cos(p.yaw)*cp,s))}
   if(s.chase&&Math.abs(p.x-SECRET.x)<SECRET.w/2+.15&&p.z<35)s.markSecret()
   if(s.outside&&p.z>INSIDE_TRIGGER_Z)s.enterHospital()
   updateTv(Math.hypot(p.x-TV.x,p.z-TV.z))
   setRoomAudio(roomAt(p.x,p.z))
  }
  if(s.chase){
   s.decrementChase(Math.min(1,delta))
   if(s.chaseTime<=0){s.emit('caught');s.end('caught')}
  }else if(autosave.current>20){autosave.current=0;s.persist()}
 })
 return <><Flashlight preset={preset}/><Highlighter/></>
}

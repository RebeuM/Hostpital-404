import React,{useEffect,useMemo,useLayoutEffect,useRef,useState} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {ROOMS,SECRET,CORRIDOR,SECTOR_Z,WALLS,LINTELS,DOOR_H,GATES,PROPS,FURNITURE,WALL_H,INTERACTIVES,EXTERIOR_POINT_LIGHTS,visibleRooms,roomIdAt,gateBox,isOccupied,ROOM_DOORS,isGateOpen,isDoorPassable,isDoorShut,closedDoorBetween,roomAt,dynamicObstacles} from '../game/layout'
import {glowPreviews} from './Highlighter'
import {FURNITURE_COMPONENTS} from './Furniture'
import {useGame,runtime,isSimRunning} from '../game/store'
import {monsterStep,monsterRoar} from '../game/audio'
import {buildNavGrid,computeDistances,nextWaypoint,hasLineOfSight,pathLength} from '../game/chaseNav'
import {canDread,dangerLevel,flickerLevel,ENCOUNTER_LENGTH,AMBUSH,FALSE_ALARM,falseAlarmDist} from '../game/dread'
import {difficultyOf} from '../game/difficulty'
import {CHASE_SENSES,ENCOUNTER_SENSES,LISTEN,scaleSenses,stepLunge,perceives,huntSpeed,sawHiding,pickCell} from '../game/monsterBrain'
import {rumble} from '../game/gamepad'
import {QUALITY_PRESETS,PHONE,PHONE_LIGHT} from '../game/settings'
import {shrinkTexture,textureLimit} from '../game/phone'
import {useWorldMaterials,boxUV,planeUV,flatMaterials,decalMaterials} from './materials'
import Model from './Model'
import Exterior from './Exterior'
import StaticBatch from './StaticBatch'
import {signImageUrl} from './signs'
import NameTag from './NameTag'
import GroundFog from './Fog'
import Person from './Character'
import {B,Cyl,Sign,Whiteboard,XrayFilm,LightBox,MonitorWall,XrayArm,BedHead,KeyCabinet,Tank,Character,ScatteredPaper,Puddle,Debris,Pipes,Door,EntranceDoor} from './Props'
import {MORGUE_ADRIEN_STEP} from '../game/story'
import Cat from './Cat'

const PI=Math.PI
// ---------------------------------------------------------------------------
// Sols et plafonds
// ---------------------------------------------------------------------------
function Floors({mats}){
 const areas=[
  {x:CORRIDOR.x,z:CORRIDOR.z,w:CORRIDOR.w+.3,d:CORRIDOR.d,m:'lino'},
  ...ROOMS.map(r=>({x:r.x,z:r.z,w:r.w+.3,d:r.d+.3,m:r.id==='lab'||r.id==='morgue'?'tile':r.id==='accueil'||r.id==='attente'?'lino':'tileRoom'})),
  {x:SECRET.x,z:SECRET.z,w:SECRET.w+.3,d:SECRET.d+.3,m:'concreteFloor'},
  ...ROOMS.map(r=>({x:r.side*2.38,z:r.door,w:1.0,d:2.6,m:'lino'})),
  {x:-11.8,z:SECRET.entranceZ,w:.9,d:2.5,m:'concreteFloor'},{x:-11.8,z:SECRET.exitZ,w:.9,d:2.5,m:'concreteFloor'}
 ]
 return <group>
  {areas.map((a,i)=><React.Fragment key={i}>
   <mesh position={[a.x,0,a.z]} rotation={[-PI/2,0,0]} geometry={planeUV(a.w,a.d)} material={mats[a.m]} receiveShadow/>
   <mesh position={[a.x,WALL_H,a.z]} rotation={[PI/2,0,0]} geometry={planeUV(a.w,a.d)} material={a.m==='concreteFloor'?mats.concrete:a.m==='lino'?mats.ceiling:mats.ceilingRoom} receiveShadow/>
  </React.Fragment>)}
 </group>
}
// ---------------------------------------------------------------------------
// Murs : plinthe, soubassement peint (ou carrelé), main courante, partie haute, corniche.
// Les segments sont fusionnés par matériau pour limiter les draw calls.
// ---------------------------------------------------------------------------
function buildWallGeometry(){
 const groups={plinth:[],dado:[],tiles:[],rail:[],upper:[],upperPlaster:[],cornice:[],concrete:[]}
 const push=(key,w,h,d,x,y,z)=>{const g=boxUV(w,h,d).clone().translate(x,y,z);groups[key].push(g)}
 for(const wl of WALLS){
  const {x,z,w,d,kind}=wl
  if(kind==='concrete'){push('concrete',w,WALL_H,d,x,WALL_H/2,z);continue}
  const ex=w<d?.03:0,ez=w<d?0:.03
  push('plinth',w+ex,.12,d+ez,x,.06,z)
  push(kind==='tiles'?'tiles':'dado',w+ex*.6,1.04,d+ez*.6,x,.64,z)
  push('rail',w+ex*1.6,.07,d+ez*1.6,x,1.195,z)
  push(kind==='corridor'||kind==='tiles'?'upper':'upperPlaster',w,WALL_H-1.23,d,x,1.23+(WALL_H-1.23)/2,z)
  push('cornice',w+ex*.5,.09,d+ez*.5,x,WALL_H-.045,z)
 }
 const lintelH=WALL_H-DOOR_H+.02
 for(const {x,z,w,d,kind} of LINTELS){
  const y=WALL_H-lintelH/2,ex=w<d?.03:0,ez=w<d?0:.03
  if(kind==='concrete'){push('concrete',w,lintelH,d,x,y,z);continue}
  push(kind==='corridor'||kind==='tiles'?'upper':'upperPlaster',w,lintelH,d,x,y,z)
  push('cornice',w+ex*.5,.09,d+ez*.5,x,WALL_H-.045,z)
 }
 const out={}
 for(const k of Object.keys(groups))if(groups[k].length)out[k]=mergeGeometries(groups[k],false)
 return out
}
function Walls({mats}){
 const geo=useMemo(buildWallGeometry,[])
 const flat=flatMaterials()
 const map={plinth:flat.trim,dado:mats.dado,tiles:mats.wallTiles,rail:mats.wood,upper:mats.wall,upperPlaster:mats.plaster,cornice:flat.trim,concrete:mats.concrete}
 return <group>{Object.keys(geo).map(k=><mesh key={k} geometry={geo[k]} material={map[k]} castShadow receiveShadow/>)}</group>
}
// Traces d'humidité (décalcomanie ambientCG Leaking004) sur quelques murs.
const LEAKS=[
 [-2.11,2.3,10.2,PI/2,1.0,1.9],[2.11,2.4,27.5,-PI/2,1.3,1.9],[-2.11,2.5,41.0,PI/2,1.1,1.6],[2.11,2.2,4.0,-PI/2,.9,2.0],
 [-7.5,2.4,18.36,PI,1.3,1.8],[9.9,2.35,19.36,PI,1.0,1.8],[-10.2,2.3,31.86,PI,1.4,1.9],[15.5,2.4,38.36,PI,1.6,1.9],
 [-11.56,2.3,45.0,PI/2,1.2,2.0],[-14.46,2.0,20.0,PI/2,1.4,2.2],[-14.46,2.0,38.0,PI/2,1.2,2.2],[5.0,2.4,-4.46,0,1.2,1.8]
]
function Leaks({mats}){
 return <group>{LEAKS.map(([x,y,z,ry,w,h],i)=><mesh key={i} position={[x,y,z]} rotation={[0,ry,0]} material={mats.leak} renderOrder={2}><planeGeometry args={[w,h]}/></mesh>)}</group>
}
// ---------------------------------------------------------------------------
// Environnement (réflexions) : pièce procédurale de three.js convertie en PMREM, très atténuée.
// ---------------------------------------------------------------------------
function EnvironmentMap({enabled}){
 const {gl,scene}=useThree()
 useEffect(()=>{
  if(!enabled){scene.environment=null;return}
  const pmrem=new THREE.PMREMGenerator(gl);const env=pmrem.fromScene(new RoomEnvironment(),.04).texture
  // Intensité très faible : la carte sert aux reflets des surfaces brillantes (envMapIntensity élevé sur carrelage, acier, verre),
  // pas d'éclairage d'ambiance : l'hôpital est abandonné, il doit rester sombre.
  scene.environment=env;if('environmentIntensity' in scene)scene.environmentIntensity=.018
  return()=>{scene.environment=null;env.dispose();pmrem.dispose()}
 },[gl,scene,enabled])
 return null
}
// ---------------------------------------------------------------------------
// Salissures : bande de crasse au pied de chaque mur, taches au sol, traces de mains.
// ---------------------------------------------------------------------------
const STAINS=[[0,3.5,2.2,0],[-.8,13.5,1.8,1],[.6,22,2.6,2],[-.3,36,2.1,3],[.9,47,1.7,4],[-7.5,2.5,2.4,1],[-5.5,-2,1.6,2],[6.5,1,2.8,3],[9.5,5.5,1.5,4],
 [-8.5,11,2,0],[-5,15.5,1.9,2],[6,12,2.3,1],[9,17.5,1.6,3],[-6,23,2.2,4],[-9.5,29,1.8,0],[8,29,2.6,2],[13,34,2.9,1],[5,36.5,1.7,3],[-8,38.5,2.4,4],[-5,45,2.1,0],[-13.25,8,1.9,1],[-13.25,28,2.3,2],[-13.25,40,1.8,3]]
const HANDS=[[-11.56,1.35,15.1,PI/2,0],[-2.11,1.5,13.6,PI/2,1],[-11.56,1.2,43.9,PI/2,2],[-14.46,1.4,24,PI/2,0],[-11.9,1.3,20,-PI/2,1],[2.11,1.1,39.2,-PI/2,2],[-7.3,1.6,48.36,PI,0],[10.6,1.4,38.36,PI,1]]
function Grime(){
 const d=decalMaterials()
 const strips=useMemo(()=>{
  const out=[]
  for(const w of WALLS){
   if(w.kind==='concrete')continue
   if(w.w<w.d){out.push({p:[w.x+w.w/2+.012,.2,w.z],ry:PI/2,len:w.d});out.push({p:[w.x-w.w/2-.012,.2,w.z],ry:-PI/2,len:w.d})}
   else{out.push({p:[w.x,.2,w.z+w.d/2+.012],ry:0,len:w.w});out.push({p:[w.x,.2,w.z-w.d/2-.012],ry:PI,len:w.w})}
  }
  return out
 },[])
 return <group>
  {strips.map((s,i)=><mesh key={'g'+i} position={s.p} rotation={[0,s.ry,0]} material={d.grime} renderOrder={1}><planeGeometry args={[s.len,.4]}/></mesh>)}
  {STAINS.map(([x,z,size,v],i)=><mesh key={'s'+i} position={[x,.004,z]} rotation={[-PI/2,0,(i*1.7)%6.28]} material={d.stains[v%d.stains.length]} renderOrder={1}><planeGeometry args={[size,size*.8]}/></mesh>)}
  {HANDS.map(([x,y,z,ry,v],i)=><mesh key={'h'+i} position={[x,y,z]} rotation={[0,ry,(i%2?.3:-.2)]} material={d.hands[v%d.hands.length]} renderOrder={2}><planeGeometry args={[.42,.42]}/></mesh>)}
 </group>
}
// Dalles de plafond tombées, trous au plafond et câbles pendants.
const CEILING_DAMAGE=[[-.9,11.5,0],[1.1,27.5,1],[-1.2,41,2],[-9.5,10.5,0],[12.5,26,1],[-4.5,45.5,2],[8.5,-1.5,0]]
function CeilingDamage(){
 const f=flatMaterials()
 return <group>{CEILING_DAMAGE.map(([x,z,v],i)=><group key={i} position={[x,0,z]}>
  <mesh position={[0,WALL_H-.02,0]} rotation={[PI/2,0,0]} material={f.black}><planeGeometry args={[.62,.62]}/></mesh>
  <B p={[.35,.012,.2]} s={[.6,.02,.6]} rot={[0,i*.7,.06]} m="paint"/>
  <B p={[-.4,.08,-.3]} s={[.4,.02,.45]} rot={[.12,i*1.3,-.3]} m="paint"/>
  {[0,1].map(k=><Cyl key={k} p={[(k?.12:-.08),WALL_H-.55,(k?-.1:.1)]} r={.008} h={1.1-k*.3} rot={[k?.25:-.2,0,k?.15:-.1]} m="black" shadow={false}/>)}
  {v===1&&<B p={[0,WALL_H-.12,0]} s={[.6,.02,.6]} rot={[0,0,.35]} m="paint"/>}
 </group>)}</group>
}
// ---------------------------------------------------------------------------
// Éclairage
// ---------------------------------------------------------------------------
// Hôpital abandonné : presque tout est éteint. Il reste quelques néons mourants sur le circuit de secours,
// des veilleuses faibles et des écrans ; la torche du joueur est la source principale.
const INSIDE_LIGHTS=[
 {p:[0,2.9,1.5],color:'#ffd7a8',strength:2.6,distance:10,seed:3,flick:'neon'},
 {p:[0,2.9,16],color:'#a7efd0',strength:2.2,distance:10,seed:2,flick:'neon'},
 {p:[0,2.9,45.5],color:s=>s.chase?'#ff3a2e':'#ff8a6a',strength:s=>s.chase?11:1.6,distance:11,seed:5,flick:'neon'},
 {p:[-7,2.85,1.2],color:'#ffcf9a',strength:3.2,distance:11,seed:7,flick:'neon'},
 {p:[7,2.85,1.5],color:'#c9e4d6',strength:1.2,distance:9},
 {p:[-7,2.85,13],color:'#9cf0c0',strength:2.4,distance:10,seed:1,flick:'neon'},
 {p:[7.5,2.85,14],color:'#8fdbe6',strength:2,distance:10},
 {p:[-7,2.85,26],color:'#f0b070',strength:2.2,distance:10},
 {p:[10,2.85,31],color:'#86e3bf',strength:3.4,distance:14,seed:4,flick:'neon'},
 {p:[-7,2.85,41],color:'#86a6ff',strength:1.6,distance:11},
 {p:[-7,3,46.5],color:'#ff3030',strength:1.8,distance:8,seed:9,flick:'neon'},
 {p:[-13.8,2.4,12],color:'#ffb060',strength:1.4,distance:8},
 {p:[-13.8,2.4,34],color:'#ffb060',strength:1.4,distance:8}
].map(l=>({when:'inside',decay:2,...l}))
const CHASER_LIGHT={p:null,color:'#ec453b',strength:6,distance:6,decay:2,when:'chase'}
const ALL_LIGHTS=[...INSIDE_LIGHTS,...EXTERIOR_POINT_LIGHTS,CHASER_LIGHT]
const lightPos=(l,out)=>l.when==='chase'?out.set(runtime.chaser.x,1.8,runtime.chaser.z):out.set(l.p[0],l.p[1],l.p[2])
const resolve=(v,s)=>typeof v==='function'?v(s):v
// Un nombre fixe de lumières, réaffectées aux sources les plus proches : chaque pixel n'en évalue que quelques-unes, et le
// nombre de lumières ne change jamais, ce qui évite de recompiler tous les matériaux (blackout, fuite).
const INDOOR_DIM=.27,OUTDOOR_DIM=.45
function LightPool({count}){
 const refs=useRef([]),ambient=useRef(),hemi=useRef(),timer=useRef(1)
 const slots=useMemo(()=>Array.from({length:count},()=>({entry:null,fade:0})),[count])
 const v=useMemo(()=>new THREE.Vector3(),[])
 useFrame(({clock},dt)=>{
  const s=useGame.getState(),p=runtime.player,dark=!!s.blackout,reduce=s.settings.reduceMotion,t0=clock.elapsedTime
  const flicker=flickerLevel(performance.now(),runtime.flickerUntil,reduce)
  if(ambient.current)ambient.current.intensity=dark?.003:.012*PHONE_LIGHT.fill
  if(hemi.current)hemi.current.intensity=dark?0:.028*PHONE_LIGHT.fill
  timer.current+=dt
  if(timer.current>.15){
   timer.current=0
   const insideSeen=!s.outside||s.entranceOpen
   const ranked=ALL_LIGHTS.filter(l=>l.when==='inside'?insideSeen:l.when==='outside'?s.outside:s.chase)
    .map(l=>{const d=lightPos(l,v).distanceTo(new THREE.Vector3(p.x,1.6,p.z));return {l,d,score:resolve(l.strength,s)/(1+d*d)}})
    .filter(x=>x.d<x.l.distance+5).sort((a,b)=>b.score-a.score).slice(0,count).map(x=>x.l)
   // Une source déjà affectée garde sa place : pas de saut de lumière.
   for(const slot of slots)if(slot.entry&&!ranked.includes(slot.entry)){slot.entry=null;slot.fade=0}
   for(const l of ranked){if(slots.some(x=>x.entry===l))continue;const free=slots.find(x=>!x.entry);if(free){free.entry=l;free.fade=0}}
  }
  slots.forEach((slot,i)=>{
   const light=refs.current[i];if(!light)return
   const l=slot.entry
   if(!l||dark){light.intensity=0;return}
   slot.fade=Math.min(1,slot.fade+dt*5)
   lightPos(l,light.position);light.color.set(resolve(l.color,s));light.distance=l.distance;light.decay=l.decay
   let k=1;const t=t0+(l.seed||0)
   if(!reduce&&l.flick==='neon'){const n=Math.sin(t*17.3)*Math.sin(t*5.1)*Math.sin(t*1.7);k=.78+.14*Math.sin(t*2.3)+.22*n;if(Math.sin(t*.9+(l.seed||0))>.985)k*=.1}
   else if(l.flick==='lamp')k=.85+.15*Math.sin(t*23)*Math.sin(t*3.1)
   else if(l.flick==='dying')k=Math.sin(t*1.3)>.93?.15:1
   // Ambiance plus sombre ; la fuite garde sa lumière rouge pleine.
   light.intensity=resolve(l.strength,s)*k*slot.fade*(l.when==='outside'?runtime.outdoorMix*OUTDOOR_DIM:s.chase?1:INDOOR_DIM*flicker)
  })
 })
 return <group>
  <ambientLight ref={ambient} intensity={.012} color="#9fb0a8"/>
  <hemisphereLight ref={hemi} args={['#5c6c68','#060908',.028]}/>
  {slots.map((_,i)=><pointLight key={i} ref={o=>{refs.current[i]=o}} intensity={0} distance={10} decay={2}/>)}
 </group>
}
// Prépare tout au chargement (programmes, textures, surbrillances) : sinon le premier regard vers une pièce fige le jeu.
function Prewarm(){
 const {gl,scene,camera}=useThree()
 useEffect(()=>{
  let alive=true
  const nextFrame=()=>new Promise(r=>requestAnimationFrame(r))
  ;(async()=>{
   try{
    await nextFrame();await nextFrame();if(!alive)return
    scene.updateMatrixWorld(true)
    const textures=new Map()
    scene.traverse(o=>{for(const m of [].concat(o.material||[]))for(const k in m){const v=m[k];if(v&&v.isTexture&&!textures.has(v))textures.set(v,k)}})
    // Téléphone : aucune texture n'a encore été envoyée à la carte graphique (pas de rendu au menu), c'est le moment de les réduire.
    let n=0;for(const [t,role] of textures){if(PHONE&&!gl.properties.get(t).__webglTexture)shrinkTexture(t,textureLimit(role,Math.max(t.image?.width||0,t.image?.height||0)));gl.initTexture(t);if(++n%6===0){await nextFrame();if(!alive)return}}
    const boxes=[...INTERACTIVES.map(i=>i.hit),...GATES.map(gateBox)]
    const previews=glowPreviews(scene,boxes);previews.forEach(c=>scene.add(c))
    // Un programme dépend de la sortie : avec post-effets, la scène se dessine dans une cible, sans tonemapping ; sans eux, à l'écran.
    // Compiler pour l'autre cas ne sert à rien, et la compilation retomberait sur la première visée d'un objet : le jeu se figerait.
    const post=QUALITY_PRESETS[useGame.getState().settings.quality].postprocessing
    const target=post?new THREE.WebGLRenderTarget(4,4):null,prev=gl.getRenderTarget()
    gl.setRenderTarget(target);const compiled=gl.compileAsync(scene,camera);gl.setRenderTarget(prev)
    await compiled
    if(alive){
     // Un rendu de toute la scène, rien de masqué, surbrillances comprises : envoie d'un coup géométries et états à la carte graphique.
     // Sans post-effets, il va à l'écran (caché par le menu), réduit à un pixel : seul compte ce qui est envoyé, pas ce qui est dessiné.
     const hidden=[],culled=[]
     scene.traverse(o=>{if(!o.visible&&!o.isLight){if(!(o.isMesh&&o.parent&&o.userData.batched)){hidden.push(o);o.visible=true}}if(o.frustumCulled&&o.isMesh){culled.push(o);o.frustumCulled=false}})
     gl.setRenderTarget(target);if(!post){gl.setScissorTest(true);gl.setScissor(0,0,1,1)}
     gl.render(scene,camera)
     if(!post)gl.setScissorTest(false);gl.setRenderTarget(prev)
     hidden.forEach(o=>{o.visible=false});culled.forEach(o=>{o.frustumCulled=true})
    }
    previews.forEach(c=>scene.remove(c));target?.dispose();if(!alive)return
   }catch(e){console.warn('[prewarm]',e)}
   if(alive)useGame.getState().setPrepared(true)
  })()
  return()=>{alive=false}
 },[gl,scene,camera])
 return null
}
// Luminaires fluorescents (modèle Poly Haven), certains éteints.
const FIXTURES=(()=>{
 const list=[]
 // Seuls les néons proches d'une source encore alimentée sont allumés.
 for(let i=0;i<14;i++){const z=-2.5+i*3.85;list.push({x:0,z,ry:PI/2,on:[1,5,12].includes(i)})}
 for(const r of ROOMS){
  const n=r.id==='lab'?4:2
  for(let i=0;i<n;i++){
   const x=r.id==='lab'?r.x+(i%2?3.2:-3.2):r.x
   const z=r.id==='lab'?r.z+(i<2?-3.5:3.5):r.z+(i?-3.0:3.0)
   list.push({x,z,ry:0,on:(r.id==='accueil'&&i===1)||(r.id==='patients'&&i===0)||(r.id==='radio'&&i===0)||(r.id==='security'&&i===0)||(r.id==='lab'&&i===1)})
  }
 }
 return list
})()
function Fixtures({list}){
 const blackout=useGame(s=>!!s.blackout)
 return <group>
  {list.map((f,i)=><Model key={i} id="mounted_fluorescent_lights" position={[f.x,WALL_H-.01,f.z]} rotation={[0,f.ry,0]} castShadow={false} emissive={f.on&&!blackout?.36:0}/>)}
 </group>
}
function SecretSconces(){
 const blackout=useGame(s=>!!s.blackout)
 return <group>
  {[6,16,26,36].map(z=><Model key={z} id="industrial_caged_sconce" position={[SECRET.x-SECRET.w/2+.16,2.3,z]} rotation={[0,PI/2,0]} castShadow={false} emissive={blackout?0:z===16||z===36?1.1:0.12}/>)}
 </group>
}
// ---------------------------------------------------------------------------
// Signalétique
// ---------------------------------------------------------------------------
function Placards(){
 const signs=[
  {id:'dir-accueil',p:[2.11,1.9,-1.2],header:'ACCUEIL',sub:'HÔPITAL CHARCOT',kind:'sign',ry:-PI/2,w:1.3,h:.75},
  {id:'dir-attente',p:[2.11,1.95,6.6],header:'SALLE D’ATTENTE',sub:'MERCI DE PATIENTER',kind:'sign',ry:-PI/2,w:1.2,h:.75},
  {id:'dir-patients',p:[-2.11,1.95,9.5],header:'PATIENTS',sub:'201   202   203   204',kind:'sign',ry:PI/2,w:1.2,h:.75},
  {id:'dir-radiologie',p:[2.11,1.9,17.6],header:'RADIOLOGIE',sub:'RÉSERVÉ AU PERSONNEL',kind:'sign',ry:-PI/2,w:1.3,h:.8},
  {id:'dir-securite',p:[-2.11,1.9,22.3],header:'SÉCURITÉ',sub:'VIDÉOSURVEILLANCE',kind:'warning',ry:PI/2,w:1.15,h:.8},
  {id:'dir-h404',p:[2.11,1.88,26.5],header:'H-404',sub:'ZONE EXPÉRIMENTALE',kind:'warning',ry:-PI/2,w:1.25,h:.8},
  {id:'dir-morgue',p:[-2.11,1.88,38.8],header:'MORGUE',sub:'ACCÈS LIMITÉ',kind:'warning',ry:PI/2,w:1.15,h:.82},
  {id:'warn-defense-entrer',p:[2.11,1.75,40.5],header:'DÉFENSE D’ENTRER',sub:'PERSONNEL AUTORISÉ UNIQUEMENT',kind:'warning',ry:-PI/2,w:1.0,h:1.2},
  {id:'poster-hygiene',p:[2.11,1.9,12.0],header:'HYGIÈNE',sub:'LAVEZ-VOUS LES MAINS',kind:'poster',ry:-PI/2,w:.9,h:1.15},
  {id:'poster-silence',p:[-2.11,1.9,32.5],header:'SILENCE',sub:'SERVICE DE NUIT',kind:'poster',ry:PI/2,w:.9,h:1.15},
  {id:'accueil-admissions',p:[-6.5,2.25,7.36],header:'ACCUEIL',sub:'INFORMATIONS PATIENTS · ADMISSIONS',kind:'sign',ry:PI,w:2.0,h:.65},
  {id:'poster-urgences',p:[8.0,2.1,7.36],header:'URGENCES',sub:'EN CAS DE DANGER COMPOSEZ LE 15',kind:'poster',ry:PI,w:1.3,h:1.15},
  {id:'note-de-service',p:[11.55,1.9,2.0],header:'NOTE DE SERVICE',sub:'ARCHIVAGE SAINTE-CATHERINE — DIRECTION',kind:'poster',ry:-PI/2,w:.95,h:1.2},
  {id:'tableau-chambres',p:[-4.3,2.2,18.36],header:'TABLEAU DES CHAMBRES',sub:'BERNARD · VASSEUR · LAURENT · MARTIN',kind:'poster',ry:PI,w:1.5,h:1.1},
  {id:'graffiti-reponses',p:[-8.5,2.0,18.36],header:'Les réponses se trouvent parfois sous vos yeux. Encore faut-il savoir regarder.',sub:'',kind:'graffiti',ry:PI,w:3.4,h:1.7},
  {id:'poster-examens',p:[7.2,2.15,8.64],header:'EXAMENS',sub:'RADIOLOGIE — PATIENTS',kind:'poster',ry:0,w:1.2,h:1.2},
  {id:'sign-poste-securite',p:[-7.1,2.2,20.14],header:'POSTE DE SÉCURITÉ',sub:'CHARCOT — SURVEILLANCE',kind:'sign',ry:0,w:1.6,h:.6},
  {id:'warn-protocole-h404',p:[12.4,2.15,38.36],header:'PROTOCOLE H-404',sub:'EXPÉRIMENTATIONS CLANDESTINES — CONFIDENTIEL',kind:'warning',ry:PI,w:1.45,h:1.2},
  {id:'warn-risque-biologique',p:[6.0,2.15,23.64],header:'RISQUE BIOLOGIQUE',sub:'ÉQUIPEMENT OBLIGATOIRE',kind:'warning',ry:0,w:1.2,h:1.2},
  {id:'warn-chambre-froide',p:[-4.5,2.1,48.36],header:'CHAMBRE FROIDE',sub:'RISQUE BIOLOGIQUE',kind:'warning',ry:PI,w:1.3,h:1.15},
  {id:'sign-morgue-archives',p:[-7.0,2.3,35.64],header:'MORGUE',sub:'DÉCÈS 2018 — DOSSIERS ARCHIVÉS',kind:'sign',ry:0,w:1.6,h:.6}
 ]
 return <group>
  {signs.map((s,i)=><Sign key={i} {...s}/>)}
  {ROOMS.map(r=><Sign key={'room'+r.id} id={'plaque-'+r.id} p={[r.side*2.07,2.72,r.door-1.75]} w={.8} h={.5} header={r.title} sub="CHARCOT" kind="sign" ry={r.side===1?-PI/2:PI/2}/>)}
  {[0,1,2,3].map(i=><Sign key={'plate'+i} id={'plate-'+(201+i)} p={[-11.56,1.75,9.6+i*2.45]} w={.5} h={.26} header={String(201+i)} kind="door" ry={PI/2}/>)}
  <Sign id="plate-eleonore" p={[-11.56,1.45,14.5]} w={.9} h={.3} header="ÉLÉONORE VASSEUR — PATIENTE 203" kind="plate" ry={PI/2}/>
  <Sign id="sign-secteur-patients" p={[0,2.94,SECTOR_Z-.15]} w={1.6} h={.5} header="SECTEUR PATIENTS" sub="ACCÈS CONTRÔLÉ" kind="warning" ry={PI}/>
  {/* Panneau suspendu du hall, dos à dos : l'image côté retour porte les fixations qui montent au plafond. */}
  <group position={[0,2.6,-1.5]}>
   <B p={[0,.29,0]} s={[1.74,.17,.04]} m="trim" shadow={false}/>
   <Sign id="suspendu-accueil-attente" p={[0,.42,.03]} w={1.9} h={.48} header="← ACCUEIL     SALLE D’ATTENTE →" sub="" kind="sign" ry={0}/>
   <Sign id="suspendu-secteurs" p={[0,.29,-.03]} w={1.9} h={.44} header="SECTEUR PATIENTS" sub="" kind="sign" ry={PI}/>
   <B p={[0,.56,-.01]} s={[.03,.3,.03]} m="trim" shadow={false}/>
  </group>
 </group>
}
// ---------------------------------------------------------------------------
// Mobilier : modèles GLB placés depuis layout.PROPS + compléments procéduraux par pièce.
// ---------------------------------------------------------------------------
function Furniture({mats,props,furniture}){
 return <group>
  {props.map((p,i)=><Model key={i} id={p.m} position={[p.x,p.y,p.z]} rotation={[0,p.ry,0]} scale={p.s} castShadow={!p.onTable||p.m==='classic_laptop'||p.m==='Television_01'}/>)}
  {furniture.map((f,i)=>{const C=FURNITURE_COMPONENTS[f.t];if(!C)return null
   return <group key={'f'+i} position={[f.x,0,f.z]} rotation={[0,f.ry,0]}><C mats={mats} {...f.o}/></group>})}
 </group>
}
// Mobilier et luminaires répartis par pièce : une pièce invisible n'est pas dessinée du tout.
const inRoom=id=>o=>roomIdAt(o.x,o.z)===id
function RoomContents({id,mats,refs,children}){
 const test=useMemo(()=>inRoom(id),[id])
 const props=useMemo(()=>PROPS.filter(test),[test]),furniture=useMemo(()=>FURNITURE.filter(test),[test]),fixtures=useMemo(()=>FIXTURES.filter(test),[test])
 return <group ref={o=>{if(refs)refs.current[id]=o}}>
  <Fixtures list={fixtures}/>
  <StaticBatch><Furniture mats={mats} props={props} furniture={furniture}/></StaticBatch>
  {children}
 </group>
}
// Galerie secrète : de petits feux au sol, de part et d'autre du passage. On lit sa longueur et son axe en courant, sans y voir plus clair.
const GALLERY_MARKER_STEP=2.2,GALLERY_MARKER_X=.72
function GalleryMarkers(){
 const ref=useRef()
 const spots=useMemo(()=>{const out=[];for(let z=SECRET.z-SECRET.d/2+.8;z<SECRET.z+SECRET.d/2-.5;z+=GALLERY_MARKER_STEP)for(const side of [-1,1])out.push([SECRET.x+side*GALLERY_MARKER_X,z]);return out},[])
 useLayoutEffect(()=>{const m=new THREE.Matrix4();spots.forEach(([x,z],i)=>{m.makeTranslation(x,.012,z);ref.current.setMatrixAt(i,m)});ref.current.instanceMatrix.needsUpdate=true},[spots])
 useFrame(()=>{if(ref.current)ref.current.visible=useGame.getState().chase})
 return <instancedMesh ref={ref} args={[undefined,undefined,spots.length]} frustumCulled={false}><boxGeometry args={[.04,.012,.3]}/><meshBasicMaterial color="#b9742c" toneMapped={false}/></instancedMesh>
}
function Rooms({mats}){
 const refs=useRef({}),tick=useRef(99)
 useFrame((_,dt)=>{
  tick.current+=dt;if(tick.current<.05)return
  tick.current=0
  const s=useGame.getState(),p=runtime.player,vis=visibleRooms(p.x,p.z,s,p.yaw,QUALITY_PRESETS[s.settings.quality].seeRooms)
  for(const id in refs.current)if(id&&refs.current[id])refs.current[id].visible=vis.has(id)
 })
 return <>
  <RoomContents id="accueil" mats={mats} refs={refs}><Accueil mats={mats}/></RoomContents>
  <RoomContents id="attente" mats={mats} refs={refs}><Attente/></RoomContents>
  <RoomContents id="patients" mats={mats} refs={refs}><Patients mats={mats}/></RoomContents>
  <RoomContents id="radio" mats={mats} refs={refs}><Radio mats={mats}/></RoomContents>
  <RoomContents id="security" mats={mats} refs={refs}><Security mats={mats}/></RoomContents>
  <RoomContents id="lab" mats={mats} refs={refs}><Lab mats={mats}/></RoomContents>
  <RoomContents id="morgue" mats={mats} refs={refs}><Morgue mats={mats}/></RoomContents>
  <RoomContents id={null} mats={mats}/>
 </>
}
function Accueil({mats}){
 const sectorOpen=useGame(s=>s.sectorOpen),dialog=useGame(s=>s.dialog)
 return <group>
  <Model id="wall_clock" position={[-7,2.45,7.36]} rotation={[0,PI,0]} castShadow={false}/>
  <Model id="fire_alarm" position={[-3.0,1.5,7.36]} rotation={[0,PI,0]} castShadow={false}/>
  <Model id="fire_alarm" position={[2.11,1.5,8.0]} rotation={[0,-PI/2,0]} castShadow={false}/>
  <ScatteredPaper p={[-8.3,0,4]}/><ScatteredPaper p={[-3.6,0,1.1]} rot={.5} n={6}/><ScatteredPaper p={[-9.4,0,-1.5]} rot={2}/>
  <Puddle p={[-5.1,0,-1.0]} w={.8} d={.5} blood/><Puddle p={[-9,0,2.2]} w={1.3} d={.9}/>
  {!sectorOpen&&<Person id="squatter_homeless" clip="Idle_Standing" position={[-4.3,0,3.7]} rotation={[0,PI*.55,0]} face={dialog==='squatter'} watch/>}
  <group position={[-11.56,1.9,.3]} rotation={[0,PI/2,0]}><B s={[1.4,1.0,.05]} m="trim" shadow={false}/><B p={[0,0,.03]} s={[1.3,.9,.01]} m="paper" shadow={false}/></group>
 </group>
}
function Attente(){
 return <group>
  {/* La note qu'on peut lire : une simple feuille tant que son image n'est pas fournie. */}
  {!signImageUrl('note-de-service')&&<B p={[11.54,1.9,2.0]} s={[.012,.42,.3]} m="paper" shadow={false}/>}
  <Model id="wall_clock" position={[7.1,2.45,7.36]} rotation={[0,PI,0]} castShadow={false}/>
  <ScatteredPaper p={[7.4,0,-1.45]}/><ScatteredPaper p={[5.2,0,4.4]} rot={1.1} n={3}/>
  <Puddle p={[6.1,0,3.9]} w={1.0} d={.7}/>
  <Debris p={[10.5,0,4.5]}/>
  {/* Le chat de la table basse : une petite surprise pour qui fouille la salle d'attente (E : il chante et tourne). */}
  <Cat/>
 </group>
}
function Patients({mats}){
 const done=useGame(s=>s.done.patients)
 return <group>
  {[0,1,2,3].map(i=><BedHead key={i} p={[-11.53,1.32,9.6+i*2.45]} ry={PI/2} on={i===2}/>)}
  <group position={[-10.5,0,9.6]} rotation={[0,PI/2,0]}><Person id="person_meilin_lying" position={[0,.52,.6]}/></group>
  <Sign id="etiquette-tiroir" p={[-6.0,1.0,17.8]} w={.5} h={.2} header="TIROIR SÉCURISÉ" kind="door" ry={0}/>
  <ScatteredPaper p={[-4.3,0,16.2]} n={6}/><ScatteredPaper p={[-7.6,0,12.0]} rot={1.3}/>
  <Puddle p={[-8.4,0,15.3]} w={.9} d={.6} blood/>
  <B p={[-10.3,.55,14.3]} s={[.08,.02,.2]} m="paper" shadow={false}/>
  {done&&<B p={[-6.0,1.05,17.6]} s={[.22,.02,.3]} m="paper" shadow={false}/>}
 </group>
}
function Radio({mats}){
 const done=useGame(s=>s.done.radio),opened=useGame(s=>s.done.patients)
 return <group>
  {/* L'appareil de radiographie est un modèle (xray_machine, layout.PROPS). */}
  <XrayArm p={[9.6,0,12.7]}/>
  <Whiteboard id="tableau-equation" p={[8.6,1.85,19.36]} ry={PI} w={2.3} h={1.35} header="3(2X − 4) + 5 = 29" sub="Coffre : X × 4 — quatre chiffres"/>
  {[0,1,2].map(i=><XrayFilm key={i} id={'radio-'+(i+1)} p={[11.56,1.75,13.2+i*.8]} ry={-PI/2} seed={i+1}/>)}
  <LightBox id="radio-negatoscope" p={[11.56,1.65,16.8]} ry={-PI/2} on={opened}/>
  {/* Coffre fermé, puis ouvert une fois l'énigme résolue ; le corps du coffre reste au même endroit (la porte ouverte décale le centre du modèle). */}
  {done?<Model id="safe_open" position={[6.204,.79,18.04]} rotation={[0,PI,0]}/>:<Model id="safe_closed" position={[6.3,.79,18.179]} rotation={[0,PI,0]}/>}
  <ScatteredPaper p={[4.3,0,15.8]} n={3}/><Puddle p={[7.4,0,15.6]} w={1.1} d={.8}/>
  <Model id="fire_alarm" position={[2.64,1.5,13.0]} rotation={[0,PI/2,0]} castShadow={false}/>
 </group>
}
function Security({mats}){
 const restored=useGame(s=>!!s.done.security)
 return <group>
  <MonitorWall p={[-11.35,0,26.0]} restored={restored}/>
  <Whiteboard id="tableau-planning" p={[-7.2,1.9,31.86]} ry={PI} w={2.5} h={1.4} header="PROJET H-404 — RÉORGANISATION" sub="A Diagnostic élec. 2h · B Générateur 3h (après A) · C Caméras 1h (après A) · D Test accès 1h (après B et C)"/>
  <Model id="power_box_01" position={[-11.56,1.55,29.6]} rotation={[0,PI/2,0]} castShadow={false}/>
  <KeyCabinet p={[-11.52,1.45,23.6]} ry={PI/2}/>
  <Cyl p={[-10.15,.835,25.75]} r={.04} h={.09} m="paper" n={14} shadow={false}/>
  <B p={[-11.5,2.2,29.6]} s={[.04,.6,.08]} m="pipe" shadow={false}/>
  <Sign id="etiquette-systeme" p={[-9.4,1.05,25.3]} w={.44} h={.2} header="SYSTÈME DÉSACTIVÉ" kind="door" ry={-PI/2}/>
  <ScatteredPaper p={[-8.5,0,28.2]} n={6}/><ScatteredPaper p={[-6.3,0,24.3]} rot={.7}/>
  <Puddle p={[-6,0,27.5]} w={1.2} d={.7}/>
 </group>
}
function Lab({mats}){
 return <group>
  <Tank p={[12.6,0,24.4]}/><Tank p={[14.6,0,24.4]}/>
  {/* Les trois lits du laboratoire sont des modèles (layout.PROPS). */}
  <Sign id="feuille-protocole" p={[7.4,.8,27.9]} w={.42} h={.3} header="PROTOCOLE H-404" sub="EXPÉRIMENTATIONS CLANDESTINES" kind="warning" frame={false} ry={0}/>
  <ScatteredPaper p={[10.3,0,31.7]} n={6}/><ScatteredPaper p={[5.0,0,30.0]} rot={2.2}/>
  <Puddle p={[11.4,0,31.3]} w={1.2} d={.9} blood/><Puddle p={[13.5,0,35.5]} w={1.6} d={1.0}/>
  <Debris p={[4.3,0,29.0]}/>
  <Model id="fire_alarm" position={[2.64,1.5,32.0]} rotation={[0,PI/2,0]} castShadow={false}/>
  <Model id="wall_clock" position={[9.0,2.5,23.64]} rotation={[0,0,0]} castShadow={false}/>
 </group>
}
function Morgue({mats}){
 const usb=useGame(s=>s.usb),dialog=useGame(s=>s.dialog),step=useGame(s=>s.dialogStep),chase=useGame(s=>s.chase)
 return <group>
  {/* Casiers réfrigérés et tables : modèles Sketchfab (layout.PROPS). Carlos est allongé sur la table chirurgicale ensanglantée, sous son drap. */}
  <group position={[-6.2,0,40.2]}><Person id="person_carlos_lying" position={[0,.9,-.85]} rotation={[0,PI,0]}/></group>
  <Model id="maxime_phone" position={[-6.3,.79,42.0]} rotation={[0,.4,0]} castShadow={false}/>
  {!usb&&<Model id="usb_backup" position={[-6.05,.79,42.25]} rotation={[0,1.2,0]} castShadow={false}/>}
  <ScatteredPaper p={[-5.35,0,44.1]} n={3}/>
  <Puddle p={[-8.1,0,43.2]} w={.9} d={.7} blood/><Puddle p={[-10.2,0,37.6]} w={1.5} d={1.0}/>
  <Model id="fire_alarm" position={[-2.64,1.5,37.0]} rotation={[0,-PI/2,0]} castShadow={false}/>
  {/* « Il est devant la porte » : Adrien apparaît pour sa dernière réplique, puis la poursuite prend le relais. */}
  {dialog==='morgue'&&step>=MORGUE_ADRIEN_STEP&&!chase&&<Person id="squatter_homeless" clip="Idle_Standing" position={[-3.1,0,42.0]} rotation={[0,-PI/2,0]} tint={.55} face watch/>}
 </group>
}
// Maxime : à côté de Thomas pendant l'introduction, puis il marche jusqu'au portail et y attend ; il disparaît au blackout.
const MAXIME_INTRO=[1.1,0,-.6],MAXIME_GATE=[.9,0,6.9]
const MAXIME_HEADING=Math.atan2(MAXIME_GATE[0]-MAXIME_INTRO[0],MAXIME_GATE[2]-MAXIME_INTRO[2])
// Dehors, il attend près de l'entrée ; il entre le premier dès que la porte s'ouvre.
const MAXIME_OUTSIDE=[1.5,0,-6.7]
const MAXIME_ENTRY=[[.3,-5.3],[.3,-3.9],[1.1,-.6]]
const INTRO_YAW=Math.atan2(0-MAXIME_INTRO[0],-2-MAXIME_INTRO[2])
function Maxime(){
 const dialog=useGame(s=>s.dialog),step=useGame(s=>s.dialogStep),phase=useGame(s=>s.phase)
 const outside=useGame(s=>s.outside),entranceOpen=useGame(s=>s.entranceOpen)
 const [mode,setMode]=useState(()=>{const s=useGame.getState();return s.outside?'outside':s.dialog==='intro'?'intro':'gate'})
 const [heading,setHeading]=useState(0)
 const group=useRef(),leg=useRef(0)
 useEffect(()=>{if(outside&&!entranceOpen){setMode('outside');return}if(entranceOpen){leg.current=0;setMode('enter')}},[outside,entranceOpen])
 useEffect(()=>{if(phase!=='playing'||useGame.getState().outside)return;if(dialog==='intro')setMode(m=>m==='enter'?m:'intro');else setMode(m=>m==='intro'?'walk':m)},[dialog,phase])
 useEffect(()=>{const g=group.current;if(!g)return;if(mode==='outside')g.position.set(...MAXIME_OUTSIDE);else if(mode==='intro')g.position.set(...MAXIME_INTRO);else if(mode==='gate')g.position.set(...MAXIME_GATE)},[mode])
 useFrame((_,dt)=>{
  const g=group.current;if(!g)return
  if(mode==='enter'){
   // Il finit d'entrer même si le dialogue a déjà commencé.
   if(useGame.getState().paused)return
   const [tx,tz]=MAXIME_ENTRY[leg.current],dx=tx-g.position.x,dz=tz-g.position.z,len=Math.hypot(dx,dz)
   if(len<.06){if(leg.current<MAXIME_ENTRY.length-1)leg.current++;else setMode(useGame.getState().dialog==='intro'?'intro':'walk');return}
   const d=Math.min(len,dt*2.3);g.position.x+=d*dx/len;g.position.z+=d*dz/len
   const h=Math.atan2(dx,dz);if(Math.abs(h-heading)>.02)setHeading(h)
   return
  }
  if(mode!=='walk')return
  if(!isSimRunning(useGame.getState()))return
  const dx=MAXIME_GATE[0]-g.position.x,dz=MAXIME_GATE[2]-g.position.z,len=Math.hypot(dx,dz)
  if(len<.06){setMode('gate');return}
  const d=Math.min(len,dt*1.25);g.position.x+=d*dx/len;g.position.z+=d*dz/len
 })
 const yaw=mode==='enter'?heading:mode==='walk'?MAXIME_HEADING:mode==='gate'?-.6:mode==='outside'?PI*.92:INTRO_YAW
 const face=mode==='outside'||dialog==='intro'||(dialog==='disappearance'&&step===0)
 return <group ref={group}><Person id="maxime_teen" clip={mode==='walk'||mode==='enter'?'Walk_Relaxed':'Idle_Standing'} rotation={[0,yaw,0]} offset={2.1} face={face} watch moving={mode==='walk'||mode==='enter'}/><NameTag name="MAXIME" y={2.06}/></group>
}
// Décor sans état du couloir et de la galerie (fusionné).
function CorridorDecor(){
 return <group>
  <Pipes z0={-4.4} z1={49.9} x={1.55} y={3.02}/>
  <Pipes z0={-4.4} z1={49.9} x={-1.7} y={3.0}/>
  <Pipes z0={-1.4} z1={45.2} x={-13.9} y={2.95}/>
  {Array.from({length:12},(_,i)=><ScatteredPaper key={i} p={[(i%3-1)*.7,0,3+i*3.7]} rot={(i*1.87)%6.28} n={3+(i%3)}/>)}
  {[[-.6,10,false],[.5,26,false],[-.4,44,true],[.8,38,false]].map(([x,z,blood],i)=><Puddle key={i} p={[x,0,z]} w={1.4} d={.9} blood={blood} rot={i}/>)}
  <Debris p={[1.6,0,30.5]}/><Debris p={[-1.6,0,47.0]} rot={1}/>
  <Debris p={[-13.0,0,6.5]} rot={.3}/><Debris p={[-13.6,0,24.0]} rot={2.1}/>
  <Puddle p={[-13.2,0,16]} w={1.2} d={2.2}/><Puddle p={[-13.3,0,40]} w={1.1} d={1.6}/>
 </group>
}
// Personnages du couloir : Maxime attend dehors au début, ils restent donc hors du groupe intérieur.
function Corridor(){
 const sectorOpen=useGame(s=>s.sectorOpen),chase=useGame(s=>s.chase),encounter=useGame(s=>s.encounter)
 return <group>
  {!sectorOpen&&<Maxime/>}
  {!chase&&<Apparition/>}
  {!chase&&<Haunts/>}
  {encounter&&!chase&&<Encounter/>}
  {chase&&<Person id="maxime_teen" clip="Idle_Standing" position={[.6,0,-6.4]} rotation={[0,0,0]} offset={3.5}/>}
 </group>
}
// ---------------------------------------------------------------------------
// Poursuivant (Adrien) pendant la fuite.
// ---------------------------------------------------------------------------
// Le monstre apparaît devant la porte de la morgue, puis traque le joueur où qu'il aille (voir game/chaseNav.js).
const CHASER_START=[-3.0,42.0]
// Monstre fourni par le propriétaire (veritytm.glb) : échelle et orientation ajustées après mesure in-engine.
// Plus rapide que la marche (2,3) et moins que la course (3,9) : il faut courir pour lui échapper.
export const MONSTER={scale:1.1,yaw:-Math.PI/2,speed:2.75,catchDistance:1.5,transformTime:1.5,headStart:2.4}
// Les portes fermées ne l'arrêtent pas, elles le retardent : la grille les considère ouvertes, il les enfonce en arrivant.
const monsterGrid=s=>{const st={...s,monster:true,doorsOpened:Object.fromEntries(ROOM_DOORS.map(d=>[d,true]))};return buildNavGrid((x,z)=>isOccupied(x,z,st,.28))}
const DOOR_BREAK=2.2,DOOR_SWING=.45,MONSTER_DOOR_OPEN=1.9
// Vue dégagée : les murs de sa grille, et les portes fermées qu'elle ignore.
const clearView=(a,p,s)=>hasLineOfSight(a.grid,a.x,a.z,p.x,p.z)&&!closedDoorBetween(a.x,a.z,p.x,p.z,s)
// Un pas du monstre vers un point. Renvoie faux tant qu'il enfonce une porte.
function stepMonster(a,actor,s,dt,tx,tz,field,speed){
 dt=Math.min(dt,.1) // Une image très longue ne doit pas lui faire sauter le plan d'une porte.
 if(a.doorOpenFor>0){a.doorOpenFor-=dt;if(a.doorOpenFor<=0)s.monsterLeavesDoor()}
 if(a.breaking>0){a.breaking-=dt;if(a.breaking<=0){s.monsterOpensDoor(a.breakingId);a.doorWait=DOOR_SWING;if(s.chase&&a.breakingId==='morgue')a.doorOpenFor=MONSTER_DOOR_OPEN}return false}
 // Il laisse les battants s'écarter avant de franchir le seuil.
 if(a.doorWait>0){a.doorWait-=dt;return false}
 const goal=nextWaypoint(a.grid,field,a.x,a.z,tx,tz),dx=goal.x-a.x,dz=goal.z-a.z,len=Math.hypot(dx,dz)
 // Pas de chemin connu : il attend. Foncer tout droit le ferait traverser les murs.
 if(goal.reachable===false)return false
 for(const id of ROOM_DOORS){
  if(!isDoorShut(id,s)||!isGateOpen(id,{...s,monster:true}))continue
  const g=GATES.find(x=>x.id===id)
  // Le monstre s'apprête à franchir le plan de la porte, n'importe où sur sa largeur.
  if(Math.abs(a.z-g.z)<g.w/2+.25&&Math.abs(a.x-g.x)<1.1&&Math.sign(a.x-g.x)!==Math.sign(goal.x-g.x)){a.breaking=DOOR_BREAK;a.breakingId=id;s.emit('slam',{x:g.x,z:g.z,sample:'door-close'});return false}
 }
 if(len>.02){const step=Math.min(len,dt*speed);a.x+=step*dx/len;a.z+=step*dz/len;a.travel+=step
  const want=Math.atan2(dx,dz)+MONSTER.yaw,cur=actor.rotation.y
  actor.rotation.y=cur+Math.atan2(Math.sin(want-cur),Math.cos(want-cur))*Math.min(1,dt*9)}
 actor.position.set(a.x,0,a.z)
 return true
}
const setDanger=v=>document.documentElement.style.setProperty('--danger',v.toFixed(2))
// Sons et signaux communs : pas, grognements, cœur, bord de l'écran, vibrations.
function monsterPresence(a,p,dt){
 const rel=chaserBearing(p,a)
 if(a.travel>.8){a.travel=0;monsterStep(rel.pan,rel.dist)}
 a.roar-=dt;if(a.roar<=0){a.roar=4+Math.random()*4;monsterRoar(rel.pan,rel.dist)}
 return rel
}
function senseOf(a,s,p,senses,dt,field){
 a.sense-=dt
 if(a.sense<=0){
  a.sense=.25;field=computeDistances(a.grid,p.x,p.z,field)
  runtime.chaseDist=pathLength(a.grid,field,a.x,a.z)
  a.perceived=perceives(a.grid,a,p,{hiding:!!s.hiding,running:runtime.stamina.running,moving:runtime.playerMoving,doorBetween:!!closedDoorBetween(a.x,a.z,p.x,p.z,s)},senses,runtime.chaseDist)
  const danger=s.hiding?dangerLevel(Math.hypot(p.x-a.x,p.z-a.z))*.7:dangerLevel(runtime.chaseDist);setDanger(danger)
  if(danger>.7)rumble(danger*.5,danger*.3,160)
 }
 a.lostFor=a.perceived?0:a.lostFor+dt
 return field
}
function Chaser(){
 const chase=useGame(s=>s.chase),capture=useGame(s=>s.capture);const actor=useRef();const fresh=()=>({x:CHASER_START[0],z:CHASER_START[1],travel:0,roar:3,wait:MONSTER.headStart,sense:0,grid:null,field:null,searchField:null,search:null,perceived:true,lostFor:0,breaking:0,hidingWas:false,sawHide:false,lunge:{left:0,wait:4},listen:0,listenIn:LISTEN.pause})
 const loc=useRef(fresh())
 // Au début de la fuite, le monstre apparaît devant la porte et se transforme (clip MonsterTransform) avant de courir :
 // le joueur a ce délai pour s'éloigner.
 const [stage,setStage]=useState('transform')
 useEffect(()=>{if(chase){loc.current=fresh();setStage('transform')
  // Transformation accélérée, puis le monstre fixe sa proie un instant : le joueur garde le même temps d'avance.
  const a=setTimeout(()=>setStage('stare'),MONSTER.transformTime*1000),b=setTimeout(()=>setStage('run'),MONSTER.headStart*1000);return()=>{clearTimeout(a);clearTimeout(b);setDanger(0);runtime.chaseDist=Infinity}}},[chase])
 useFrame((_,dt)=>{
  if(!chase||!actor.current)return
  const s=useGame.getState();const a=loc.current;const p=runtime.player
  runtime.chaser.x=a.x;runtime.chaser.z=a.z
  if(s.capture){actor.current.rotation.y=Math.atan2(p.x-a.x,p.z-a.z)+MONSTER.yaw;return}
  if(!isSimRunning(s))return
  if(a.wait>0){a.wait-=dt;actor.current.position.set(a.x,0,a.z);actor.current.rotation.y=Math.atan2(p.x-a.x,p.z-a.z)+MONSTER.yaw;return}
  if(!a.grid)a.grid=monsterGrid(s)
  const level=difficultyOf(s.settings),senses=scaleSenses(CHASE_SENSES,level)
  a.field=senseOf(a,s,p,senses,dt,a.field)
  // Caché sans avoir été vu : il perd le joueur et fouille autour. Vu en train de se cacher : il vient l'en sortir.
  const hiding=!!s.hiding
  if(hiding&&!a.hidingWas){a.sawHide=sawHiding(a.grid,a,p,runtime.chaseDist,level.hideRange);a.search=null}
  a.hidingWas=hiding
  let moved
  if(hiding&&!a.sawHide){
   if(!a.search||Math.hypot(a.search.x-a.x,a.search.z-a.z)<.6){
    a.search=pickCell(a.grid,a.field,8,32)||{x:p.x,z:p.z}
    a.searchField=computeDistances(a.grid,a.search.x,a.search.z,a.searchField)
   }
   moved=stepMonster(a,actor.current,s,dt,a.search.x,a.search.z,a.searchField,senses.searchSpeed)
  }else{
   // Il a perdu le joueur : il s'arrête parfois pour écouter. S'il le voit à quelques mètres, il bondit.
   a.listenIn-=dt
   if(a.listen<=0&&a.listenIn<=0&&!a.perceived&&a.lostFor>senses.scentAfter){a.listen=LISTEN.length;a.listenIn=LISTEN.pause+Math.random()*LISTEN.spread;setStage('listen')}
   if(a.listen>0){a.listen-=dt;moved=false;if(a.perceived)a.listen=0;if(a.listen<=0)setStage('run')}
   else{
    const before=a.lunge.left,boost=level.lunge?stepLunge(a.lunge,dt,a.perceived,runtime.chaseDist):1
    if(before<=0&&a.lunge.left>0){const r=chaserBearing(p,a);monsterRoar(r.pan,r.dist)}
    moved=stepMonster(a,actor.current,s,dt,p.x,p.z,a.field,huntSpeed(a.perceived,a.lostFor,senses)*boost)
   }
  }
  const rel=monsterPresence(a,p,moved?dt:0)
  // Il faut une vue dégagée : à moins de 1,5 m mais de l'autre côté d'un mur, le joueur n'est pas pris.
  if(hiding?(a.sawHide&&rel.dist<1.6):(rel.dist<MONSTER.catchDistance&&clearView(a,p,s)))s.beginCapture()
 })
 if(!chase)return null
 return <group ref={actor} name="chaser"><Person id="monster" clip={capture?'Kill':stage==='transform'?'MonsterTransform':stage==='stare'||stage==='listen'?'Idle':'Run'} timeScale={capture?1:stage==='transform'?1.15:1.32} scale={MONSTER.scale} fade={.12}/></group>
}
// Rencontre avant la fin : une forme vient rôder autour du joueur, puis repart. S'il la croise et qu'elle l'attrape, il se réveille plus loin.
function Encounter(){
 const actor=useRef(),[pose,setPose]=useState('walk')
 const st=useRef(null)
 useEffect(()=>()=>{setDanger(0);runtime.chaseDist=Infinity},[])
 useFrame((_,dt)=>{
  const s=useGame.getState(),p=runtime.player
  if(!isSimRunning(s)||!actor.current)return
  // Fausse alerte : rien à voir, seulement des pas lourds qui approchent, passent tout près et s'éloignent.
  if(runtime.encounterKind==='false'){
   if(!st.current)st.current={age:0,step:0,angle:Math.random()*Math.PI*2}
   const a=st.current;a.age+=dt;a.step-=dt;a.angle+=dt*.12
   const dist=falseAlarmDist(a.age)
   runtime.chaseDist=dist;setDanger(dangerLevel(dist)*.8)
   if(a.step<=0&&a.age<FALSE_ALARM.length){a.step=FALSE_ALARM.steps;monsterStep(Math.sin(a.angle),dist)}
   if(a.age>FALSE_ALARM.length+1.5)s.endEncounter()
   return
  }
  const level=difficultyOf(s.settings),senses=scaleSenses(ENCOUNTER_SENSES,level)
  if(!st.current){
   const grid=monsterGrid(s),field=computeDistances(grid,p.x,p.z),ambush=runtime.encounterKind==='ambush'
   const fx=Math.sin(p.yaw),fz=Math.cos(p.yaw),ahead=(x,z)=>{const dx=x-p.x,dz=z-p.z;return (dx*fx+dz*fz)/(Math.hypot(dx,dz)||1)>.25}
   const hidden=(x,z)=>!hasLineOfSight(grid,x,z,p.x,p.z)
   // L'embuscade l'attend dans le couloir, passage obligé, de préférence devant lui. Faute de place, il rôde comme d'habitude.
   const inCorridor=(x,z)=>Math.abs(x)<1.9&&roomAt(x,z)==='couloir'&&hidden(x,z)
   const lurk=accept=>pickCell(grid,field,AMBUSH.minCells,AMBUSH.maxCells,Math.random,accept)
   const spot=ambush&&(lurk((x,z)=>inCorridor(x,z)&&ahead(x,z))||lurk(inCorridor))
   const spawn=spot||pickCell(grid,field,70,1e6,Math.random,hidden)||pickCell(grid,field,50,1e6,Math.random,hidden)
   if(!spawn){s.endEncounter();return}
   st.current={...spawn,home:spawn,grid,field,target:null,targetField:null,travel:0,roar:5,sense:0,perceived:false,lostFor:99,breaking:0,age:0,hidingWas:false,sawHide:false,hunt:false,pause:0,waiting:!!spot}
   if(spot)setPose('idle')
   actor.current.position.set(spawn.x,0,spawn.z);actor.current.visible=true
  }
  const a=st.current;a.age+=dt
  a.field=senseOf(a,s,p,senses,dt,a.field)
  const hiding=!!s.hiding
  // À l'affût : immobile et silencieux, tourné vers le joueur, jusqu'à ce qu'il approche.
  if(a.waiting){
   actor.current.rotation.y=Math.atan2(p.x-a.x,p.z-a.z)+MONSTER.yaw
   if(!hiding&&(runtime.chaseDist<AMBUSH.trigger||a.perceived)){
    a.waiting=false;a.age=ENCOUNTER_LENGTH-AMBUSH.afterLength;a.perceived=true;a.lostFor=0;a.hunt=true;setPose('run')
    const r=chaserBearing(p,a);monsterRoar(r.pan,r.dist);s.emit('encounter-alert')
   }else if(a.age>AMBUSH.length&&!clearView(a,p,s)){s.endEncounter();return}
   else return
  }
  if(hiding&&!a.hidingWas)a.sawHide=a.hunt&&sawHiding(a.grid,a,p,runtime.chaseDist,level.hideRange)
  a.hidingWas=hiding
  const hunt=a.perceived||a.lostFor<senses.forgetAfter||(hiding&&a.sawHide)
  if(hunt!==a.hunt){a.hunt=hunt;a.target=null;a.pause=0;setPose(hunt?'run':'walk')}
  let moved
  if(hunt&&(!hiding||a.sawHide))moved=stepMonster(a,actor.current,s,dt,p.x,p.z,a.field,senses.speed)
  else if(a.pause>0){a.pause-=dt;moved=false;if(a.pause<=0)setPose('walk')}
  else{
   const leaving=a.age>ENCOUNTER_LENGTH
   if(!a.target||Math.hypot(a.target.x-a.x,a.target.z-a.z)<.7){
    // Il s'arrête parfois à un carrefour et tend l'oreille, avant de repartir.
    if(a.target&&!leaving&&Math.random()<.6){a.target=null;a.pause=1.2+Math.random()*1.8;setPose('idle');return}
    a.target=leaving?a.home:pickCell(a.grid,a.field,8,26)||a.home
    a.targetField=computeDistances(a.grid,a.target.x,a.target.z,a.targetField)
   }
   moved=stepMonster(a,actor.current,s,dt,a.target.x,a.target.z,a.targetField,senses.patrolSpeed)
   // Il s'en va dès qu'on ne le voit plus.
   if(leaving&&Math.hypot(p.x-a.x,p.z-a.z)>9&&!clearView(a,p,s)){s.endEncounter();return}
  }
  const rel=monsterPresence(a,p,moved?dt:0)
  if(hiding?(a.sawHide&&rel.dist<1.6):(rel.dist<MONSTER.catchDistance&&clearView(a,p,s)))s.encounterCaught()
 })
 return <group ref={actor} visible={false} name="encounter"><Person id="monster" clip={pose==='run'?'Run':pose==='idle'?'Idle':'Walk'} timeScale={pose==='run'?1.32:pose==='idle'?1:.9} scale={MONSTER.scale} fade={.2} silhouette/></group>
}
// Le décor change quand on ne regarde pas : un fauteuil roulant qui revient, des messages sur les murs, une porte qui se referme.
const WALL_MESSAGES=[
 {text:'IL TE VOIT',x:2.1,z:21.8,ry:-Math.PI/2},
 {text:'NE TE RETOURNE PAS',x:-2.1,z:18.6,ry:Math.PI/2},
 {text:'ELLE EST ENCORE ICI',x:2.1,z:35.2,ry:-Math.PI/2},
 {text:'TROP TARD',x:-2.1,z:47.6,ry:Math.PI/2}
]
function messageTexture(text){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d')
 g.font='italic 700 104px Impact, "Arial Narrow", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#7d0f09'
 for(let i=0;i<4;i++){g.globalAlpha=.3+Math.random()*.25;g.fillText(text,512+(Math.random()-.5)*6,120+(Math.random()-.5)*6)}
 // Coulures.
 g.globalAlpha=.6;for(let i=0;i<16;i++){const x=120+Math.random()*790,y=125+Math.random()*30;g.fillRect(x,y,2+Math.random()*3,25+Math.random()*80)}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex
}
function WallMessage({text,x,z,ry,index}){
 const ref=useRef(),tex=useMemo(()=>messageTexture(text),[text])
 useFrame(()=>{if(ref.current)ref.current.visible=runtime.hauntMessages>index})
 return <mesh ref={ref} visible={false} position={[x,1.65,z]} rotation={[0,ry,0]}><planeGeometry args={[2.3,.58]}/><meshStandardMaterial map={tex} transparent roughness={.7} depthWrite={false} polygonOffset polygonOffsetFactor={-2}/></mesh>
}
function Haunts(){
 const chair=useRef()
 useFrame(()=>{
  // Une nouvelle partie retire le fauteuil.
  if(chair.current)chair.current.visible=dynamicObstacles.has('chair')
  if(!runtime.hauntAsked)return
  runtime.hauntAsked=false
  const s=useGame.getState(),p=runtime.player,fx=Math.sin(p.yaw),fz=Math.cos(p.yaw)
  const unseen=(x,z,min)=>{const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);return d>min&&(dx*fx+dz*fz)/d<.15}
  const options=[]
  // Le fauteuil réapparaît derrière le joueur, tourné vers lui.
  if(Math.abs(p.x)<2.3&&p.z>9&&s.sectorOpen)options.push(()=>{
   const side=Math.random()<.5?-1:1,z=p.z-Math.sign(fz||1)*(6+Math.random()*2.5),x=side*1.55
   if(!unseen(x,z,4)||isOccupied(x,z,s,.35)||!chair.current)return false
   chair.current.position.set(x,0,z);chair.current.rotation.y=Math.atan2(p.x-x,p.z-z);dynamicObstacles.set('chair',{x,z,w:.7,d:.7})
   s.emit('slam',{x,z,sample:'creak'});return true
  })
  const m=WALL_MESSAGES[runtime.hauntMessages]
  if(m&&unseen(m.x,m.z,5))options.push(()=>{runtime.hauntMessages++;return true})
  // Une porte déjà ouverte se referme, loin du joueur.
  const doors=ROOM_DOORS.filter(id=>s.doorsOpened?.[id]&&isGateOpen(id,s)).map(id=>GATES.find(g=>g.id===id)).filter(g=>unseen(g.x,g.z,7)&&roomAt(p.x,p.z)!==g.id)
  if(doors.length)options.push(()=>{const g=doors[Math.floor(Math.random()*doors.length)]
   useGame.setState(st=>({doorsOpened:{...st.doorsOpened,[g.id]:false}}));return true})
  while(options.length){const i=Math.floor(Math.random()*options.length);if(options.splice(i,1)[0]())return}
  s.emit('dread','noise')
 })
 return <>
  <group ref={chair} visible={false}><Model id="wheelchair_01"/></group>
  {WALL_MESSAGES.map((m,i)=><WallMessage key={m.text} {...m} index={i}/>)}
 </>
}
// Silhouette immobile au bout du regard : elle n'est là que quelques instants et disparaît si l'on s'approche.
function Apparition(){
 const g=useRef(),st=useRef({until:0})
 useFrame(()=>{
  const group=g.current;if(!group)return
  const s=useGame.getState(),p=runtime.player,now=performance.now()
  if(runtime.apparitionAsked){
   runtime.apparitionAsked=false
   // Légèrement hors de l'axe : la silhouette ne doit pas se cacher derrière le réticule.
   const a=p.yaw+(Math.random()<.5?-1:1)*(.07+Math.random()*.07),fx=Math.sin(a),fz=Math.cos(a);let run=0
   for(let d=1;d<=10;d+=.5){if(isOccupied(p.x+fx*d,p.z+fz*d,s,.35))break;run=d}
   if(run>=6.5){const d=Math.min(run,8+Math.random()*1.5);group.position.set(p.x+fx*d,0,p.z+fz*d);group.visible=true;st.current.until=now+2600+Math.random()*1800}
   else s.emit('dread','noise')
  }
  if(!group.visible)return
  const dx=p.x-group.position.x,dz=p.z-group.position.z
  group.rotation.y=Math.atan2(dx,dz)
  if(now>st.current.until||Math.hypot(dx,dz)<4.5||!canDread(s)){group.visible=false;runtime.flickerUntil=now+260}
 })
 return <group ref={g} visible={false}><Person id="squatter_homeless" clip="Idle_Standing" silhouette/>
  {/* Dans le noir, on voit d'abord deux yeux qui fixent le joueur. */}
  {[-.05,.05].map(x=><mesh key={x} position={[x,1.53,.12]} scale={[.024,.017,.01]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#fff0d2" fog={false}/></mesh>)}
 </group>
}
function chaserBearing(p,a){
 const dx=a.x-p.x,dz=a.z-p.z,dist=Math.hypot(dx,dz)
 const ang=Math.atan2(dx,dz)-p.yaw
 return {dist,pan:Math.max(-1,Math.min(1,Math.sin(ang)))}
}
// Sur le parvis, porte fermée, rien de l'intérieur n'est visible : on ne dessine pas ses millions de triangles.
function InteriorOnly({children}){
 const ref=useRef()
 useFrame(()=>{if(ref.current){const s=useGame.getState();ref.current.visible=!s.outside||s.entranceOpen}})
 return <group ref={ref}>{children}</group>
}
// Qualité Minimale : sans relief des textures (normalMap), deuxième poste de dépense par pixel mesuré en rendu logiciel.
// Les matériaux des modèles sont partagés d'une qualité à l'autre : la texture est gardée pour être remise si l'on remonte.
// Effet de mise en page : tout le décor est déjà dans la scène, et la précompilation (Prewarm) passe après.
function MaterialBudget({normalMaps}){
 const scene=useThree(s=>s.scene)
 useLayoutEffect(()=>{
  scene.traverse(o=>{if(!o.isMesh)return
   for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue
    if(!normalMaps&&m.normalMap){m.userData.__normalMap=m.normalMap;m.normalMap=null;m.needsUpdate=true}
    else if(normalMaps&&m.userData.__normalMap){m.normalMap=m.userData.__normalMap;delete m.userData.__normalMap;m.needsUpdate=true}}})
 },[scene,normalMaps])
 return null
}
export default function World(){
 const quality=useGame(s=>s.settings.quality)
 const preset=QUALITY_PRESETS[quality]
 const mats=useWorldMaterials(preset.anisotropy)
 return <group>
  <EnvironmentMap enabled={preset.roomReflections}/>
  <InteriorOnly>
   <Floors mats={mats}/>
   <Walls mats={mats}/>
   <Leaks mats={mats}/>
   <StaticBatch><Grime/><CeilingDamage/><CorridorDecor/></StaticBatch>
   {GATES.filter(g=>g.id!=='entrance').map(g=><Door key={g.id} g={g} mats={mats}/>)}
   <GroundFog quality={quality}/>
  </InteriorOnly>
  <EntranceDoor p={[0,0,CORRIDOR.zMin]} mats={mats}/>
  <Exterior mats={mats} quality={quality} anisotropy={preset.anisotropy}/>
  <InteriorOnly>
   <SecretSconces/>
   <Placards/>
   <Rooms mats={mats}/>
  </InteriorOnly>
  <Corridor/>
  <Chaser/>
  <GalleryMarkers/>
  <LightPool count={preset.lights}/>
  <MaterialBudget normalMaps={preset.normalMaps!==false}/>
  <Prewarm/>
 </group>
}

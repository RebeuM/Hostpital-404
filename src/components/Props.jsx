import React,{useMemo,useRef,Suspense} from 'react'
import {useTexture} from '@react-three/drei'
import {signImageUrl,signRatio} from './signs'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {flatMaterials,makeXrayTexture,makeMonitorTexture,boxUV} from './materials'
import {useGame,runtime} from '../game/store'
import {isDoorShut,isGateOpen,WALL_H} from '../game/layout'
import {ModelPart} from './Model'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const F=flatMaterials
export function B({p=[0,0,0],s=[1,1,1],m='metal',mat,rot=[0,0,0],shadow=true,receive=true,children}){
 return <mesh position={p} rotation={rot} material={mat||F()[m]} castShadow={shadow} receiveShadow={receive}>
  <boxGeometry args={s}/>{children}
 </mesh>
}
export function Cyl({p=[0,0,0],r=.06,r2,h=1,m='metal',mat,rot=[0,0,0],n=12,shadow=true}){
 return <mesh position={p} rotation={rot} material={mat||F()[m]} castShadow={shadow} receiveShadow>
  <cylinderGeometry args={[r,r2??r,h,n]}/>
 </mesh>
}
// Plan texturé par une image externe (public/assets/signs) ; en cas d'absence ou d'erreur, retour au rendu canvas.
function ImagePlane({url,w,h,emissive=0,roughness=.85}){
 const tex=useTexture(url);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8
 return <mesh position={[0,0,.004]}><planeGeometry args={[w,h]}/><meshStandardMaterial map={tex} emissiveMap={emissive?tex:null} emissive={emissive?'#ffffff':'#000000'} emissiveIntensity={emissive} roughness={roughness} side={THREE.DoubleSide} alphaTest={.5}/></mesh>
}
class SignBoundary extends React.Component{
 constructor(p){super(p);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(err){console.error(`[signs] Image d'affiche illisible : ${this.props.url}`,err)}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
// Texture plane : image fournie (si l'identifiant est déclaré dans signs.js) sinon texture canvas.
export function SignSurface({id,w,h,fallbackTex,emissive=0,roughness=.85}){
 const url=signImageUrl(id)
 const canvasPlane=fallbackTex===null?null:<mesh position={[0,0,.004]}><planeGeometry args={[w,h]}/><meshStandardMaterial map={fallbackTex} emissiveMap={emissive&&fallbackTex?fallbackTex:null} emissive={emissive?'#ffffff':'#000000'} emissiveIntensity={emissive} roughness={roughness} side={THREE.DoubleSide}/></mesh>
 if(!url)return canvasPlane
 return <SignBoundary url={url} fallback={canvasPlane}><Suspense fallback={canvasPlane}><ImagePlane url={url} w={w} h={h} emissive={emissive} roughness={roughness}/></Suspense></SignBoundary>
}
// Panneau : n'existe que si son image a été fournie (voir signs.js). Aucun panneau n'est généré.
export function Sign({id,p=[0,1.6,0],w=1.5,h:baseH=.95,ry=0}){
 const url=signImageUrl(id)
 if(!url)return null
 const ratio=signRatio(id),h=ratio?w/ratio:baseH
 return <group position={p} rotation={[0,ry,0]}>
  <SignSurface id={id} w={w} h={h} fallbackTex={null}/>
 </group>
}
// Tableau blanc : vierge tant qu'aucune image n'est fournie.
export function Whiteboard({id,p,w=2.2,h=1.3,ry=0}){
 return <group position={p} rotation={[0,ry,0]}>
  <B p={[0,0,-.03]} s={[w+.08,h+.08,.05]} m="chrome" shadow={false}/>
  <SignSurface id={id} w={w} h={h} roughness={.35}/>
  <B p={[0,-h/2-.02,.06]} s={[w*.8,.04,.12]} m="chrome" shadow={false}/>
 </group>
}
export function XrayFilm({id,p,ry=0,seed=1,w=.62,h=.78}){
 const tex=useMemo(()=>makeXrayTexture(seed),[seed])
 return <group position={p} rotation={[0,ry,0]}>
  <SignSurface id={id} w={w} h={h} fallbackTex={tex} emissive={.1} roughness={.4}/>
  <B p={[0,h/2+.015,0]} s={[w+.04,.03,.02]} m="trim" shadow={false}/>
 </group>
}
export function LightBox({id,p,ry=0,on=true,w=1.1,h=.9}){
 const tex=useMemo(()=>makeXrayTexture(3),[])
 return <group position={p} rotation={[0,ry,0]}>
  <B p={[0,0,-.04]} s={[w+.1,h+.1,.08]} m="paint" shadow={false}/>
  <SignSurface id={id} w={w} h={h} fallbackTex={tex} emissive={on?1.1:0} roughness={.3}/>
 </group>
}
export function Monitor({p=[0,0,0],variant=0,rot=0,dead=false}){
 const tex=useMemo(()=>makeMonitorTexture(dead?9:variant),[variant,dead])
 return <group position={p} rotation={[0,rot,0]}>
  <B p={[0,.26,0]} s={[.5,.4,.3]} m="dark"/>
  <mesh position={[0,.27,-.152]} rotation={[0,Math.PI,0]}><planeGeometry args={[.4,.3]}/>
   <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={dead?0:1.1} roughness={.25} color={dead?'#111':'#fff'}/></mesh>
  <B p={[0,.03,0]} s={[.3,.06,.22]} m="dark"/>
 </group>
}
// Mur d'écrans de la salle de sécurité (face +x).
export function MonitorWall({p,ry=0,restored=false}){
 return <group position={p} rotation={[0,ry,0]}>
  <B p={[0,1.35,0]} s={[.42,1.5,2.6]} m="dark"/>
  {Array.from({length:6},(_,i)=>{
   const col=i%3,row=i/3|0
   return <Monitor key={i} p={[.22,.72+row*.62,-.85+col*.85]} variant={i} rot={-Math.PI/2} dead={!restored&&i!==4}/>
  })}
  <B p={[.1,.02,0]} s={[.6,.05,2.7]} m="trim" shadow={false}/>
 </group>
}
export function XrayMachine({p,ry=0}){
 return <group position={p} rotation={[0,ry,0]}>
  <B p={[0,1.05,0]} s={[1.3,2.1,.9]} m="paint"/>
  <B p={[0,1.42,-.47]} s={[1.0,1.3,.06]} m="dark"/>
  <B p={[0,2.18,0]} s={[1.4,.12,1.0]} m="trim"/>
  <Cyl p={[0,1.6,.75]} r={.05} h={1.5} rot={[Math.PI/2,0,0]} m="chrome"/>
  <B p={[0,1.6,1.45]} s={[.5,.5,.36]} m="paint"/>
  <B p={[0,1.6,1.65]} s={[.3,.3,.06]} m="glass" shadow={false}/>
 </group>
}
export function Tank({p}){
 return <group position={p}>
  <Cyl p={[0,1.1,0]} r={.36} h={1.95} m="tank" n={24} shadow={false}/>
  <Cyl p={[0,.72,0]} r={.33} h={1.15} m="fluid" n={24} shadow={false}/>
  <B p={[0,2.12,0]} s={[.84,.12,.84]} m="metal"/>
  <B p={[0,.08,0]} s={[.86,.14,.86]} m="metal"/>
  <B p={[0,1.6,.37]} s={[.2,.12,.01]} m="paper" shadow={false}/>
 </group>
}
export function Character({p=[0,0,0],coat='coat',rot=0,hood=true}){
 return <group position={p} rotation={[0,rot,0]}>
  <B p={[0,1.26,0]} s={[.5,.78,.3]} m={coat}/>
  <B p={[0,.78,0]} s={[.46,.24,.3]} m={coat}/>
  <B p={[0,1.75,0]} s={[.2,.24,.22]} m="skin"/>
  {hood&&<B p={[0,1.82,-.02]} s={[.3,.3,.3]} m="hood"/>}
  {[-.14,.14].map(x=><React.Fragment key={x}>
   <B p={[x,.4,0]} s={[.17,.82,.2]} m="denim"/>
   <B p={[x*2.3,1.22,0]} s={[.14,.7,.2]} m={coat}/>
   <B p={[x,.03,.04]} s={[.17,.07,.3]} m="black"/>
  </React.Fragment>)}
 </group>
}
export function ScatteredPaper({p=[0,0,0],rot=0,n=4}){
 return <group position={p} rotation={[0,rot,0]}>
  {Array.from({length:n},(_,i)=><mesh key={i} position={[(i%2)*.18-.1,.004+i*.002,(i/2|0)*.16-.1]} rotation={[-Math.PI/2,0,i*.6]} material={F().paper} receiveShadow>
   <planeGeometry args={[.21,.297]}/></mesh>)}
 </group>
}
export function Puddle({p=[0,0,0],w=1.1,d=.7,blood=false,rot=0}){
 return <mesh position={[p[0],.006,p[2]]} rotation={[-Math.PI/2,0,rot]} scale={[w,d,1]} material={blood?F().blood:F().water} receiveShadow>
  <circleGeometry args={[1,28]}/>
 </mesh>
}
export function Debris({p,rot=0}){
 return <group position={p} rotation={[0,rot,0]}>
  {Array.from({length:6},(_,i)=><B key={i} p={[Math.cos(i*1.1)*.3,.03,Math.sin(i*1.7)*.25]} s={[.12+i*.02,.06,.09]} rot={[0,i,0]} m="paint"/>)}
 </group>
}
// Conduites au plafond (couloir / galerie).
export function Pipes({z0,z1,x=1.6,y=3.05}){
 const len=z1-z0,zc=(z0+z1)/2
 return <group>
  <Cyl p={[x,y,zc]} r={.06} h={len} rot={[Math.PI/2,0,0]} m="pipe" n={10}/>
  <Cyl p={[x+.2,y+.05,zc]} r={.035} h={len} rot={[Math.PI/2,0,0]} m="pipeRust" n={8}/>
  {Array.from({length:Math.max(1,Math.round(len/3.5))},(_,i)=><B key={i} p={[x+.1,y+.1,z0+(i+.5)*len/Math.max(1,Math.round(len/3.5))]} s={[.42,.06,.08]} m="trim" shadow={false}/>)}
 </group>
}
// Porte à deux battants métalliques avec huisserie épaisse, vitrage, poignées et voyant.
// Les battants des pièces s'ouvrent vers l'intérieur de la pièce ; ceux du portail vers le secteur patients.
// Porte hospitalière (hospital_door.glb, scripts/bake-bed-door.mjs) : un bâti fixe et deux battants, chacun avec son origine sur sa charnière.
const DOOR_HINGE={a:-1.114,b:1.051},DOOR_GLASS={y:1.729,h:.808,w:.219,z:.5385}
const DOOR_OPEN=Math.PI*.48
// Vitre du hublot : le modèle a de vrais trous dans ses battants.
const DoorGlass=({dir,mats})=><mesh position={[0,DOOR_GLASS.y,dir*DOOR_GLASS.z]} material={mats?.doorGlass||F().glass}><boxGeometry args={[.012,DOOR_GLASS.h,DOOR_GLASS.w]}/></mesh>
// Bande photoluminescente sur les montants, comme dans un vrai bâtiment : à peine visible, juste assez pour situer une porte de loin et de biais.
// Elle n'éclaire rien. Un seul appel de dessin par porte.
const EDGE_OPEN=new THREE.MeshBasicMaterial({color:'#2b6e55',toneMapped:false}),EDGE_LOCKED=new THREE.MeshBasicMaterial({color:'#7a3026',toneMapped:false})
let edgeGeometry=null
function doorEdges(w){
 if(edgeGeometry)return edgeGeometry
 const parts=[];for(const x of [-.215,.215])for(const z of [-w/2+.015,w/2-.015]){const b=new THREE.BoxGeometry(.012,2.02,.018);b.translate(x,1.01,z);parts.push(b)}
 return edgeGeometry=mergeGeometries(parts)
}
export function Door({g,mats}){
 const opened=useGame(s=>!isDoorShut(g.id,s)),unlocked=useGame(s=>isGateOpen(g.id,s))
 const wasOpen=useRef(opened)
 // Seule source du son d'une porte qui bouge, quelle qu'en soit la cause. Situé dans l'espace : une porte qui claque au loin s'entend au loin.
 // Au début d'une partie, les portes reprennent leur état d'un coup : ce saut ne s'entend pas.
 useFrame(()=>{
  const now=performance.now();if(runtime.doorSoundsFrom==null)runtime.doorSoundsFrom=now+600
  if(opened===wasOpen.current)return
  wasOpen.current=opened
  if(now>=runtime.doorSoundsFrom)useGame.getState().emit('door-move',{x:g.x,z:g.z,opened})
 })
 // Les battants s'ouvrent vers le +x du modèle (côté des ferme-portes) : toute la porte est orientée vers la pièce à ouvrir.
 const ry=g.axis==='x'?(g.x>0?0:Math.PI):-Math.PI/2
 return <group position={[g.x,0,g.z]} rotation={[0,ry,0]}>
  <ModelPart id="hospital_door" part="door_frame"/>
  <B p={[0,.01,0]} s={[.4,.02,g.w]} m="trim" shadow={false}/>
  <mesh geometry={doorEdges(g.w)} material={unlocked?EDGE_OPEN:EDGE_LOCKED}/>
  <Leaf id={g.id} part="door_leaf_a" hinge={DOOR_HINGE.a} dir={1} target={DOOR_OPEN} opened={opened} unlocked={unlocked} mats={mats}/>
  <Leaf id={g.id} part="door_leaf_b" hinge={DOOR_HINGE.b} dir={-1} delay={.07} target={-DOOR_OPEN} opened={opened} unlocked={unlocked} mats={mats}/>
  {g.axis==='x'&&<Sign id="bande-acces-restreint" p={[-.16,2.94,0]} w={.3} h={.5} ry={Math.PI/2} header="ACCÈS" sub="RESTREINT" kind="warning" frame={false}/>}
 </group>
}
// Battant articulé sur sa charnière : il s'étend vers +z (dir = 1) ou −z (dir = −1).
const OPEN_TIME=1.25,CLOSE_TIME=.5,PUSH_SHARE=.16,RATTLE_TIME=.55
function Leaf({id,part,hinge,dir,target,opened,unlocked,delay=0,mats}){
 // Avancement de 0 (fermé) à 1 (ouvert) : un court temps de poussée, puis le battant pivote et se cale en fin de course.
 const ref=useRef(),progress=useRef(opened?1:0),wait=useRef(0)
 const wasOpen=useRef(opened)
 useFrame((_,delta)=>{
  if(wasOpen.current!==opened){wasOpen.current=opened;wait.current=opened?delay:0}
  const dt=Math.min(delta,.05)
  if(wait.current>0)wait.current-=dt
  else progress.current=opened?Math.min(1,progress.current+dt/OPEN_TIME):Math.max(0,progress.current-dt/CLOSE_TIME)
  const p=progress.current
  const u=Math.max(0,(p-PUSH_SHARE)/(1-PUSH_SHARE)),back=1+1.1*Math.pow(u-1,3)+.1*Math.pow(u-1,2)
  let angle=opened?target*back:target*p*p
  // Porte verrouillée : le battant tremble contre son pêne.
  const r=useGame.getState().doorRattle
  if(r&&r.id===id&&!opened){const t=(performance.now()-r.at)/1000;if(t>=0&&t<RATTLE_TIME){const k=1-t/RATTLE_TIME;angle+=Math.sin(t*46)*.016*k*Math.sign(target)}}
  if(ref.current)ref.current.rotation.y=angle
 })
 return <group ref={ref} position={[0,0,hinge]}>
  <ModelPart id="hospital_door" part={part}/>
  <DoorGlass dir={dir} mats={mats}/>
  {/* Témoin de verrouillage, visible des deux côtés. */}
  <B p={[0,2.42,dir*.54]} s={[.06,.03,.7]} m={unlocked?'greenLight':'redLight'} shadow={false}/>
 </group>
}
// Porte de l'entrée principale : même modèle, condamnée de l'intérieur une fois franchie.
function EntranceLeaf({part,hinge,dir,mats}){
 const ref=useRef(),progress=useRef(0)
 useFrame((_,delta)=>{
  const open=useGame.getState().entranceOpen,dt=Math.min(delta,.05)
  progress.current=open?Math.min(1,progress.current+dt/1.2):Math.max(0,progress.current-dt/.35)
  const u=progress.current
  if(ref.current)ref.current.rotation.y=dir*(open?1-Math.pow(1-u,3):u*u)*Math.PI*.52
 })
 return <group ref={ref} position={[0,0,hinge]}><ModelPart id="hospital_door" part={part}/><DoorGlass dir={dir} mats={mats}/></group>
}
export function EntranceDoor({p,mats}){
 const outside=useGame(s=>s.outside)
 return <group position={p}>
  {/* Rotation π/2 : le +x du modèle regarde le parvis, les battants s'ouvrent vers l'extérieur. */}
  <group rotation={[0,Math.PI/2,0]}>
   <ModelPart id="hospital_door" part="door_frame"/>
   <EntranceLeaf part="door_leaf_a" hinge={DOOR_HINGE.a} dir={1} mats={mats}/>
   <EntranceLeaf part="door_leaf_b" hinge={DOOR_HINGE.b} dir={-1} mats={mats}/>
  </group>
  {!outside&&<>
   <B p={[0,1.28,.07]} s={[.06,2.5,.1]} m="trim"/>
   <B p={[0,1.05,.12]} s={[2.2,.09,.04]} m="pipeRust"/>
   <B p={[0,1.7,.12]} s={[2.2,.09,.04]} rot={[0,0,.05]} m="pipeRust"/>
   <Sign id="sign-sortie-condamnee" p={[0,2.94,.16]} w={.8} h={.5} header="SORTIE" sub="CONDAMNÉE" kind="warning"/>
  </>}
 </group>
}

// Bras de radiographie suspendu au plafond : rail, colonne télescopique, tube et collimateur au-dessus de la table.
export function XrayArm({p}){
 return <group position={p}>
  <B p={[0,WALL_H-.06,0]} s={[2.4,.1,.5]} m="trim"/>
  <B p={[.3,WALL_H-.14,0]} s={[.4,.08,.44]} m="paint"/>
  <Cyl p={[.3,2.5,0]} r={.07} h={1.1} m="chrome"/>
  <Cyl p={[.3,1.98,0]} r={.1} h={.3} m="paint"/>
  <B p={[.1,1.84,0]} s={[.6,.08,.08]} m="chrome"/>
  <B p={[-.1,1.62,0]} s={[.46,.36,.36]} m="paint"/>
  <B p={[-.1,1.42,0]} s={[.3,.04,.3]} m="dark" shadow={false}/>
  <B p={[.14,1.62,0]} s={[.02,.06,.12]} m="screen" shadow={false}/>
  <Cyl p={[.5,2.5,-.15]} r={.012} h={1.3} rot={[.15,0,.25]} m="black" shadow={false}/>
 </group>
}
// Panneau de tête de lit : gaine murale avec prises, voyant et rail porte-accessoires.
export function BedHead({p,ry=0,on=false}){
 return <group position={p} rotation={[0,ry,0]}>
  <B s={[1.1,.14,.05]} m="paint"/>
  <B p={[-.38,0,.03]} s={[.08,.06,.012]} m={on?'greenLight':'screenDead'} shadow={false}/>
  <B p={[-.2,0,.03]} s={[.08,.06,.012]} m="redDark" shadow={false}/>
  {[.12,.28].map(x=><Cyl key={x} p={[x,0,.03]} r={.02} h={.02} rot={[Math.PI/2,0,0]} m="chrome" shadow={false}/>)}
  <B p={[.44,0,.03]} s={[.05,.08,.012]} m="dark" shadow={false}/>
  <B p={[0,-.13,.025]} s={[.5,.03,.03]} m="chrome" shadow={false}/>
 </group>
}
// Armoire à clés murale, porte ouverte, quelques clés encore pendues.
export function KeyCabinet({p,ry=0}){
 return <group position={p} rotation={[0,ry,0]}>
  <B s={[.42,.52,.08]} m="paint"/>
  <B p={[0,0,-.03]} s={[.38,.48,.01]} m="dark" shadow={false}/>
  <group position={[-.21,0,.04]} rotation={[0,-1.7,0]}><B p={[.21,0,.01]} s={[.42,.52,.02]} m="paint"/><B p={[.34,0,.025]} s={[.03,.06,.012]} m="chrome" shadow={false}/></group>
  {Array.from({length:12},(_,i)=><B key={i} p={[-.14+(i%4)*.093,.15-(i/4|0)*.13,.0]} s={[.01,.025,.01]} m="chrome" shadow={false}/>)}
  {[1,2,6,9].map(i=><B key={'k'+i} p={[-.14+(i%4)*.093,.115-(i/4|0)*.13,.012]} s={[.018,.05,.004]} m="chrome" shadow={false}/>)}
  <B p={[.08,.31,.0]} s={[.2,.05,.01]} m="paper" shadow={false}/>
 </group>
}

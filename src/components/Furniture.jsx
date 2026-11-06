import React,{useMemo} from 'react'
import * as THREE from 'three'
import {flatMaterials,boxUV,makeMonitorTexture} from './materials'
import {B,Cyl} from './Props'

// Mobilier hospitalier procédural (proportions réelles), habillé avec les matériaux PBR du décor.
// Les dimensions de collision correspondantes sont dans layout.js (FURNITURE_SIZE).
const F=flatMaterials
const Steel=({p,s,mats,shadow=true})=><mesh position={p} geometry={boxUV(...s)} material={mats?.steel||F().metal} castShadow={shadow} receiveShadow/>
const Paint=({p,s,m='paint',mat,rot})=><B p={p} s={s} m={m} mat={mat} rot={rot}/>

// Lit d'hôpital 2,1 × 0,95 m : châssis, sommier, matelas, oreiller, couverture, barrières, roues, manivelle.
// Brancard 1,95 × 0,65 m, hauteur 0,85 m.
export function Gurney({mats,stained=false,sheet=true}){
 return <group>
  <Steel p={[0,.8,0]} s={[.62,.04,1.9]} mats={mats}/>
  <B p={[0,.87,0]} s={[.58,.1,1.84]} mat={stained?mats?.linenDark:mats?.fabric}/>
  {sheet&&<B p={[0,.94,.1]} s={[.6,.03,1.3]} mat={mats?.curtain}/>}
  {[-.26,.26].map(x=><group key={x}>
   <Cyl p={[x,.5,0]} r={.015} h={.62} rot={[0,0,.25*(x>0?-1:1)]} m="chrome"/>
   <Cyl p={[x*.6,.5,0]} r={.015} h={.62} rot={[0,0,-.25*(x>0?-1:1)]} m="chrome"/>
   <Cyl p={[x,1.0,.35]} r={.012} h={1.0} rot={[Math.PI/2,0,0]} m="chrome"/>
   {[-.05,.3,.75].map(z=><Cyl key={z} p={[x,.92,z]} r={.01} h={.16} m="chrome"/>)}
  </group>)}
  <Steel p={[0,.17,0]} s={[.5,.04,1.5]} mats={mats}/>
  {[-.22,.22].map(x=>[-.7,.7].map(z=><Cyl key={x+':'+z} p={[x,.07,z]} r={.07} h={.04} rot={[Math.PI/2,0,0]} m="black"/>))}
 </group>
}
export function OverbedTable({mats}){
 return <group>
  <Steel p={[0,.03,0]} s={[.75,.05,.3]} mats={mats}/>
  <Cyl p={[0,.5,0]} r={.025} h={.95} m="chrome"/>
  <B p={[0,.98,0]} s={[.8,.03,.4]} mat={mats?.wood}/>
 </group>
}
// Armoire à pharmacie vitrée 0,9 × 0,45 × 1,9 m.
export function MedicalCabinet({mats,empty=false}){
 return <group>
  <Steel p={[0,.95,0]} s={[.9,1.9,.45]} mats={mats}/>
  {[-.22,.22].map(x=><group key={x}>
   <B p={[x,1.05,-.235]} s={[.4,1.5,.02]} m="glass" shadow={false}/>
   <B p={[x,1.05,-.228]} s={[.42,1.52,.01]} m="trim" shadow={false}/>
   <B p={[x*1.5,1.05,-.25]} s={[.012,.14,.012]} m="chrome" shadow={false}/>
  </group>)}
  {[.5,.9,1.3,1.65].map(y=><B key={y} p={[0,y,.02]} s={[.84,.02,.38]} m="paint" shadow={false}/>)}
  {!empty&&Array.from({length:12},(_,i)=><Cyl key={i} p={[-.33+(i%6)*.13,[.58,.98,1.38][i/6|0]+.07,(i%2?.05:-.1)]} r={.03} h={.14} m={i%3?'paper':'glass'} shadow={false}/>)}
  <B p={[0,1.82,-.236]} s={[.5,.1,.005]} m="red" shadow={false}/>
 </group>
}
export function Sink({mats}){
 return <group>
  <B p={[0,.78,-.02]} s={[.5,.14,.4]} m="paint"/>
  <B p={[0,.86,-.02]} s={[.4,.03,.3]} m="dark" shadow={false}/>
  <Cyl p={[0,.98,.14]} r={.012} h={.2} m="chrome"/><Cyl p={[0,1.07,.07]} r={.012} h={.16} rot={[Math.PI/2,0,0]} m="chrome"/>
  <B p={[0,.4,-.05]} s={[.44,.62,.34]} m="paint"/>
  <Cyl p={[0,.35,-.16]} r={.03} h={.7} m="chrome"/>
  <B p={[0,1.55,.19]} s={[.5,.6,.02]} m="chrome" shadow={false}/>
  <B p={[0,1.55,.185]} s={[.46,.56,.012]} m="black" shadow={false}/>
 </group>
}
// Rail de rideau en U (1,2 × 2,2 m) avec rideau partiellement tiré.
export function CurtainRail({mats,drawn=.6,w=1.2,d=2.3}){
 return <group>
  <Cyl p={[0,2.15,-d/2]} r={.012} h={w} rot={[0,0,Math.PI/2]} m="chrome" shadow={false}/>
  <Cyl p={[-w/2,2.15,0]} r={.012} h={d} rot={[Math.PI/2,0,0]} m="chrome" shadow={false}/>
  <Cyl p={[w/2,2.15,0]} r={.012} h={d} rot={[Math.PI/2,0,0]} m="chrome" shadow={false}/>
  <Cyl p={[-w/2,2.6,-d/2]} r={.01} h={.9} m="chrome" shadow={false}/>
  <B p={[-w/2+.015,1.35,-d/2+d*drawn/2]} s={[.025,1.6,d*drawn]} mat={mats?.curtain} shadow={false}/>
  {drawn>.5&&<B p={[0,1.35,-d/2+.015]} s={[w*.7,1.6,.025]} mat={mats?.curtain} shadow={false}/>}
 </group>
}
// Moniteur de constantes sur pied roulant.
export function VitalsMonitor({on=false,variant=3}){
 const tex=useMemo(()=>makeMonitorTexture(on?variant:9),[on,variant])
 return <group>
  {[0,1,2,3,4].map(i=><B key={i} p={[Math.cos(i*1.2566)*.22,.04,Math.sin(i*1.2566)*.22]} s={[.3,.03,.06]} rot={[0,-i*1.2566,0]} m="metal"/>)}
  <Cyl p={[0,.65,0]} r={.02} h={1.2} m="chrome"/>
  <B p={[0,1.3,0]} s={[.42,.3,.28]} m="dark"/>
  <mesh position={[0,1.31,-.142]} rotation={[0,Math.PI,0]}><planeGeometry args={[.34,.22]}/><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={on?1.2:0} color={on?'#fff':'#111'} roughness={.3}/></mesh>
  <B p={[.16,1.1,-.1]} s={[.02,.3,.02]} m="black" shadow={false}/>
  <Cyl p={[-.12,.9,.2]} r={.006} h={.6} rot={[.3,0,.2]} m="black" shadow={false}/>
 </group>
}
export function BiohazardBin(){
 return <group>
  <B p={[0,.4,0]} s={[.5,.8,.5]} m="yellow"/>
  <B p={[0,.82,0]} s={[.52,.06,.52]} m="yellowDark"/>
 </group>
}
export function WaitingBench({mats,n=4}){
 const w=n*.55
 return <group>
  <Steel p={[0,.42,0]} s={[w,.05,.08]} mats={mats}/>
  {[-1,1].map(s=><group key={s}><Cyl p={[s*(w/2-.3),.2,0]} r={.02} h={.42} m="chrome"/><B p={[s*(w/2-.3),.02,0]} s={[.06,.04,.5]} m="chrome"/></group>)}
  {Array.from({length:n},(_,i)=>{const x=(i-(n-1)/2)*.55;return <group key={i} position={[x,0,0]}>
   <B p={[0,.46,.02]} s={[.5,.06,.46]} mat={mats?.leather||F().leather}/>
   <B p={[0,.72,-.2]} s={[.5,.44,.06]} rot={[-.15,0,0]} mat={mats?.leather||F().leather}/>
  </group>})}
 </group>
}
export function Radiator({w=1.0}){
 return <group>
  <B p={[0,.4,0]} s={[w,.6,.1]} m="paint"/>
  {Array.from({length:Math.floor(w/.08)},(_,i)=><B key={i} p={[-w/2+.04+i*.08,.4,-.06]} s={[.04,.56,.03]} m="paint" shadow={false}/>)}
  <Cyl p={[w/2-.05,.08,.05]} r={.012} h={.16} m="chrome"/>
 </group>
}
export function CrashCart(){
 return <group>
  <B p={[0,.5,0]} s={[.7,.8,.5]} m="red"/>
  {[.25,.45,.65].map(y=><B key={y} p={[0,y,-.252]} s={[.62,.14,.01]} m="redDark" shadow={false}/>)}
  {[.25,.45,.65].map(y=><B key={y} p={[0,y,-.26]} s={[.2,.015,.01]} m="chrome" shadow={false}/>)}
  <B p={[0,.92,0]} s={[.72,.04,.52]} m="chrome"/>
  <B p={[-.2,1.0,0]} s={[.25,.12,.18]} m="dark"/>
  {[-.3,.3].map(x=>[-.2,.2].map(z=><Cyl key={x+':'+z} p={[x,.05,z]} r={.05} h={.04} rot={[Math.PI/2,0,0]} m="black"/>))}
  <Cyl p={[.33,.95,.2]} r={.012} h={.7} rot={[Math.PI/2,0,0]} m="chrome"/>
 </group>
}
export function VendingMachine({on=false}){
 return <group>
  <B p={[0,.95,0]} s={[.9,1.9,.75]} m="dark"/>
  <B p={[-.12,1.05,-.376]} s={[.56,1.3,.01]} m="glass" shadow={false}/>
  {Array.from({length:12},(_,i)=><B key={i} p={[-.32+(i%4)*.13,.6+(i/4|0)*.35,-.34]} s={[.08,.18,.08]} m={i%2?'red':'paper'} shadow={false}/>)}
  <B p={[.3,1.1,-.377]} s={[.2,.9,.01]} m={on?'screen':'screenDead'} shadow={false}/>
  <B p={[.3,.45,-.377]} s={[.2,.2,.01]} m="black" shadow={false}/>
  <B p={[0,1.8,-.377]} s={[.86,.14,.01]} m={on?'lampWarm':'paint'} shadow={false}/>
 </group>
}
export function LinenCart({mats}){
 return <group>
  <Steel p={[0,.12,0]} s={[.6,.04,.8]} mats={mats}/>
  {[-.28,.28].map(x=>[-.38,.38].map(z=><Cyl key={x+':'+z} p={[x,.55,z]} r={.012} h={.9} m="chrome"/>))}
  <B p={[0,.55,0]} s={[.56,.7,.76]} mat={mats?.linenDark}/>
  <B p={[0,.92,0]} s={[.5,.1,.7]} mat={mats?.fabric}/>
 </group>
}
export function ApronRack(){
 return <group>
  <Cyl p={[0,.9,0]} r={.02} h={1.8} m="chrome"/><B p={[0,.02,0]} s={[.5,.04,.5]} m="chrome"/>
  <B p={[0,1.78,0]} s={[.7,.03,.03]} m="chrome"/>
  {[-.22,0,.22].map(x=><B key={x} p={[x,1.3,0]} s={[.3,.9,.05]} m={x?'denim':'coat'}/>)}
 </group>
}
export function LabFridge({on=false}){
 return <group>
  <B p={[0,.95,0]} s={[.75,1.9,.7]} m="paint"/>
  <B p={[0,.95,-.352]} s={[.68,1.8,.01]} m="trim" shadow={false}/>
  <B p={[.28,1.0,-.36]} s={[.02,.5,.02]} m="chrome" shadow={false}/>
  <B p={[0,1.75,-.36]} s={[.2,.06,.005]} m={on?'screen':'screenDead'} shadow={false}/>
  <B p={[0,1.4,-.358]} s={[.2,.14,.004]} m="yellow" shadow={false}/>
 </group>
}
export function LabBench({mats,w=2.4}){
 return <group>
  <B p={[0,.45,0]} s={[w,.9,.7]} m="paint"/>
  <B p={[0,.92,0]} s={[w+.05,.05,.78]} m="black"/>
  {Array.from({length:Math.round(w/.6)},(_,i)=><B key={i} p={[-w/2+.3+i*.6,.45,-.355]} s={[.55,.84,.01]} m="trim" shadow={false}/>)}
  <Cyl p={[w/2-.35,1.05,.15]} r={.012} h={.22} m="chrome"/><Cyl p={[w/2-.35,1.15,.08]} r={.012} h={.14} rot={[Math.PI/2,0,0]} m="chrome"/>
  <B p={[w/2-.35,.95,.1]} s={[.3,.03,.25]} m="dark" shadow={false}/>
  <B p={[-w/2+.5,1.08,0]} s={[.35,.28,.3]} m="paint"/><B p={[-w/2+.5,1.08,-.152]} s={[.2,.08,.005]} m="screenDead" shadow={false}/>
  {[0,1,2].map(i=><Cyl key={i} p={[-.1+i*.14,1.03,.1]} r={.025} h={.18} m="glass" shadow={false}/>)}
 </group>
}
export function MorgueScale(){
 return <group><B p={[0,.02,0]} s={[.5,.04,.5]} m="metal"/><Cyl p={[0,.6,-.2]} r={.02} h={1.2} m="chrome"/><Cyl p={[0,1.22,-.2]} r={.18} h={.05} rot={[Math.PI/2,0,0]} m="paint"/><B p={[0,.05,0]} s={[.44,.03,.44]} m="chrome" shadow={false}/></group>
}
export function Fridge({mats}){return <LabFridge/>}
// Table de dissection avec évier intégré.
export function Trolley({mats}){
 return <group>
  {[.3,.65,.95].map(y=><Steel key={y} p={[0,y,0]} s={[.9,.03,.5]} mats={mats}/>)}
  {[-.42,.42].map(x=>[-.22,.22].map(z=><Cyl key={x+':'+z} p={[x,.5,z]} r={.012} h={.96} m="chrome"/>))}
  {[-.42,.42].map(x=>[-.22,.22].map(z=><Cyl key={'w'+x+':'+z} p={[x,.04,z]} r={.04} h={.03} rot={[Math.PI/2,0,0]} m="black"/>))}
  <B p={[.15,1.0,0]} s={[.3,.08,.2]} m="paper" shadow={false}/><Cyl p={[-.2,1.04,.1]} r={.04} h={.14} m="glass" shadow={false}/>
 </group>
}
// Plante verte morte dans son pot : tiges sèches et quelques feuilles tombées.
export function DeadPlant(){
 return <group>
  <Cyl p={[0,.2,0]} r={.17} r2={.13} h={.4} m="pipeRust" n={14}/>
  <Cyl p={[0,.4,0]} r={.15} h={.03} m="dark" shadow={false}/>
  {[0,1,2,3,4].map(i=><B key={i} p={[Math.cos(i*1.3)*.07,.62+i*.05,Math.sin(i*1.3)*.07]} s={[.018,.5+i*.08,.018]} rot={[Math.cos(i)*.3,i*1.3,Math.sin(i*2)*.3]} m="hood"/>)}
  {[0,1,2].map(i=><B key={'l'+i} p={[Math.cos(i*2.1)*.17,.84+i*.1,Math.sin(i*2.1)*.17]} s={[.18,.004,.08]} rot={[.4,i*2.1,.3]} m="hood" shadow={false}/>)}
  <B p={[.26,.004,.1]} s={[.14,.004,.07]} rot={[0,.6,0]} m="hood" shadow={false}/>
 </group>
}
// Table basse de salle d'attente avec magazines.
export function LowTable({mats}){
 return <group>
  <B p={[0,.42,0]} s={[.8,.03,.5]} mat={mats?.wood}/>
  {[-.35,.35].map(x=>[-.2,.2].map(z=><Cyl key={x+':'+z} p={[x,.2,z]} r={.015} h={.4} m="chrome"/>))}
  <B p={[-.15,.44,.05]} s={[.21,.01,.3]} rot={[0,.2,0]} m="paper" shadow={false}/><B p={[.18,.445,-.08]} s={[.21,.01,.3]} rot={[0,-.4,0]} m="paper" shadow={false}/>
  <Cyl p={[.28,.47,.15]} r={.035} h={.08} m="paper" n={12} shadow={false}/>
 </group>
}
export const FURNITURE_COMPONENTS={plant:DeadPlant,lowtable:LowTable,gurney:Gurney,overbed:OverbedTable,medcab:MedicalCabinet,sink:Sink,curtain:CurtainRail,vitals:VitalsMonitor,biobin:BiohazardBin,bench:WaitingBench,radiator:Radiator,crash:CrashCart,vending:VendingMachine,linen:LinenCart,aprons:ApronRack,fridge:LabFridge,labbench:LabBench,scale:MorgueScale,trolley:Trolley}

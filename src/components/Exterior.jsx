// Parvis de l'hôpital : décor du début de partie, visible aussi à travers la vitre de l'entrée à la fin.
import React,{useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useFrame,useThree} from '@react-three/fiber'
import {EXTERIOR_PROPS,EXTERIOR_ZONE,LAMP_POSTS,CARS,BOLLARDS,DOOR_W,DOOR_H} from '../game/layout'
import {MODEL_BOUNDS} from '../game/modelBounds'
import {SKY_URL} from './assets'
import {PHONE,QUALITY_PRESETS} from '../game/settings'
import {shrinkTexture,TEXTURE_LIMIT} from '../game/phone'
import {useTexture} from '@react-three/drei'
import {windGust} from '../game/wind'
import {useGame,runtime} from '../game/store'
import {boxUV,planeUV,useExteriorMaterials} from './materials'
import Forest from './Forest'
import StaticBatch from './StaticBatch'
import Model from './Model'
import {B,Cyl,Sign,ScatteredPaper} from './Props'
import Dancer from './Dancer'

const PI=Math.PI
const FACADE_Z=-4.82,FACADE_H=7.6,FACADE_X=16
const canvasTexture=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}

// Rotation du ciel photographié : place sa lune basse au sud-ouest, là d'où vient la lumière de la scène.
const SKY_YAW=1.74
function Sky({tex}){
 const clouds=useRef()
 // Nuages : bruit fractal périodique, défilant avec le vent devant le vrai ciel.
 const cloudTex=useMemo(()=>{
  const W=768,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),im=g.createImageData(W,H)
  const P=64,lat=new Float32Array(P*P);let seed=99;for(let i=0;i<P*P;i++){seed=(seed*16807)%2147483647;lat[i]=seed/2147483647}
  const val=(x,y,per)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=(i,j)=>lat[((j%P+P)%P)*P+((i%per+per)%per)%P];return (a(xi,yi)*(1-u)+a(xi+1,yi)*u)*(1-v)+(a(xi,yi+1)*(1-u)+a(xi+1,yi+1)*u)*v}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let n=0,amp=.5,fr=1;for(let o=0;o<5;o++){n+=amp*val(x/W*8*fr,y/H*5*fr,8*fr);amp*=.5;fr*=2}
   const fade=Math.min(1,y/(H*.12))*Math.max(0,Math.min(1,(H*.98-y)/(H*.2))),al=Math.max(0,Math.min(1,(n-.42)*3.6))*fade,o=(y*W+x)*4
   im.data[o]=im.data[o+1]=im.data[o+2]=255;im.data[o+3]=al*255}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t},[])
 useFrame(({clock})=>{cloudTex.offset.x=clock.elapsedTime*.0028;if(clouds.current)clouds.current.material.opacity=.62+.1*Math.sin(clock.elapsedTime*.1)})
 return <group>
  <mesh position={[0,0,-14]} rotation={[0,SKY_YAW,0]}><sphereGeometry args={[262,48,24]}/><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} color="#5a6470"/></mesh>
  <mesh ref={clouds} position={[0,0,-14]}><sphereGeometry args={[250,32,12,0,PI*2,0,PI/2]}/><meshBasicMaterial map={cloudTex} color="#2a3543" transparent opacity={.66} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false}/></mesh>
 </group>
}
// Lisière d'horizon : une ligne de cimes sombres ferme la forêt et empêche de voir le ciel entre les troncs.
function TreeLine(){
 const tex=useMemo(()=>{const t=canvasTexture(2048,256,(g,w,h)=>{
  g.clearRect(0,0,w,h);g.fillStyle='#fff'
  let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647}
  for(let i=0;i<150;i++){const x=r()*w,top=h*(.08+r()*.5),half=10+r()*20
   g.beginPath();g.moveTo(x,top);for(let y=top;y<h;y+=14){const k=(y-top)/(h-top);g.lineTo(x+half*k*(1+.4*r()),y);g.lineTo(x+half*k*.6,y+5)}g.lineTo(x-half,h);for(let y=h;y>top;y-=14){const k=(y-top)/(h-top);g.lineTo(x-half*k*(1+.4*r()),y)}g.closePath();g.fill()}
  g.fillRect(0,h*.62,w,h*.38)});t.wrapS=THREE.RepeatWrapping;t.repeat.set(4,1);return t},[])
 return <mesh position={[0,18,-6]}><cylinderGeometry args={[215,215,44,48,1,true]}/><meshBasicMaterial alphaMap={tex} alphaTest={.5} color="#0d151d" side={THREE.BackSide} fog={false}/></mesh>
}
// Forme irrégulière d'une flaque, bords fondus dans le sol.
function puddleAlpha(){
 return canvasTexture(256,256,(g,w)=>{g.fillStyle='#000';g.fillRect(0,0,w,w);let seed=17;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647}
  for(let i=0;i<34;i++){const a=r()*6.28,d=r()*62,x=128+Math.cos(a)*d*1.25,y=128+Math.sin(a)*d*.8,R=18+r()*30,gr=g.createRadialGradient(x,y,R*.45,x,y,R);gr.addColorStop(0,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,w)}})
}
function WaterPatch({x,z,w,d,rot=0,ext}){return <mesh position={[x,.0115,z]} rotation={[-PI/2,0,rot]} material={ext.water}><planeGeometry args={[w,d]}/></mesh>}
function Ground({ext}){
 const {zMin,zMax,xMax}=EXTERIOR_ZONE,d=zMax-zMin,cz=(zMin+zMax)/2
 return <group>
  {/* Bande de terre autour de la dalle du parvis, qui rejoint le relief de la forêt. */}
  <mesh position={[0,-.035,cz-.4]} rotation={[-PI/2,0,0]} geometry={planeUV(xMax*2+4.2,d+3.4)} material={ext.dirt} receiveShadow/>
  <mesh position={[0,-.012,cz]} rotation={[-PI/2,0,0]} geometry={planeUV(xMax*2+1,d)} material={ext.asphalt} receiveShadow/>
  <mesh position={[0,.004,cz]} rotation={[-PI/2,0,0]} geometry={planeUV(3.6,d)} material={ext.path} receiveShadow/>
  {/* Route d'accès qui s'enfonce dans la forêt derrière le portail. */}
  <mesh position={[0,-.02,zMin-100]} rotation={[-PI/2,0,0]} geometry={planeUV(6.4,200)} material={ext.road} receiveShadow/>
  {[-1.87,1.87].map(x=><mesh key={x} position={[x,.05,cz]} geometry={boxUV(.14,.1,d)} material={ext.path} castShadow receiveShadow/>)}
  {[0,1,2,3].map(i=><B key={i} p={[7.5,.006,-8.2-i*2.7]} s={[4.6,.004,.09]} m="paper" shadow={false} receive={false}/>)}
  <WaterPatch x={-3.9} z={-18.6} w={3.4} d={2.2} ext={ext}/><WaterPatch x={5.2} z={-21} w={4.2} d={2.4} rot={.5} ext={ext}/><WaterPatch x={-6} z={-8.6} w={2.8} d={1.7} rot={1.1} ext={ext}/><WaterPatch x={11.2} z={-20} w={3} d={2} rot={2} ext={ext}/>
  <ScatteredPaper p={[3.1,0,-18.5]} rot={.8} n={4}/><ScatteredPaper p={[-3.3,0,-11.4]} rot={1.2} n={5}/>
  {BOLLARDS.map(([x,z,tilt],i)=><group key={i} position={[x,0,z]} rotation={[tilt,0,tilt*.5]}><Cyl p={[0,.45,0]} r={.055} h={.9} mat={ext.rust} n={10}/><Cyl p={[0,.74,0]} r={.06} h={.1} m="paper" n={10}/></group>)}
 </group>
}
// Ombres de contact : sans elles, les objets semblent flotter au-dessus du sol.
function ContactShadows(){
 const items=useMemo(()=>{
  const out=EXTERIOR_PROPS.filter(p=>!(p.y>0)).map(p=>{const b=MODEL_BOUNDS[p.m],s=p.s||1;return {x:p.x,z:p.z,w:b.size[0]*s*1.5,d:b.size[2]*s*1.5,ry:p.ry||0,o:1}})
  for(const c of CARS)out.push({x:c.x,z:c.z,w:2.5,d:5,ry:c.ry,o:1})
  for(const p of LAMP_POSTS)out.push({x:p.x,z:p.z,w:.9,d:.9,ry:0,o:1})
  for(const [x,z] of BOLLARDS)out.push({x,z,w:.42,d:.42,ry:0,o:1})
  for(const x of [-2.35,2.35])out.push({x,z:-7.1,w:.6,d:.6,ry:0,o:1})
  return out},[])
 const tex=useMemo(()=>canvasTexture(128,128,(g,w)=>{const r=g.createRadialGradient(w/2,w/2,w*.12,w/2,w/2,w/2);r.addColorStop(0,'rgba(0,0,0,.82)');r.addColorStop(.6,'rgba(0,0,0,.42)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,w,w)}),[])
 const stripe=useMemo(()=>canvasTexture(4,128,(g,w,h)=>{const l=g.createLinearGradient(0,0,0,h);l.addColorStop(0,'rgba(0,0,0,.72)');l.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=l;g.fillRect(0,0,w,h)}),[])
 return <group>
  {items.map((it,i)=><mesh key={i} position={[it.x,.0085,it.z]} rotation={[-PI/2,0,it.ry]}><planeGeometry args={[it.w,it.d]}/><meshBasicMaterial map={tex} transparent depthWrite={false}/></mesh>)}
  {/* Pied du bâtiment : l'humidité et l'ombre noircissent le sol le long de la façade. */}
  {[-1,1].map(s=><mesh key={s} position={[s*8.6,.0085,-5.45]} rotation={[-PI/2,0,0]}><planeGeometry args={[14.8,1.2]}/><meshBasicMaterial map={stripe} transparent depthWrite={false}/></mesh>)}
 </group>
}
// Fenêtre : appui et linteau saillants qui accrochent la lumière, vitre réfléchissante, ou planches clouées.
function Window({x,y,kind,mats,ext,z=FACADE_Z-.03}){
 return <group position={[x,y,z]}>
  <mesh position={[0,-.92,-.08]} geometry={boxUV(1.72,.1,.24)} material={ext.path} castShadow/>
  <mesh position={[0,.92,-.05]} geometry={boxUV(1.66,.14,.14)} material={ext.path} castShadow/>
  <B p={[0,0,0]} s={[1.5,1.7,.09]} m="trim" shadow={false}/>
  {kind==='lit'
   ?<><mesh position={[0,0,-.056]} rotation={[0,PI,0]}><planeGeometry args={[1.3,1.5]}/><meshBasicMaterial color="#6a5430" fog={false}/></mesh>
     {/* Quelqu'un regarde déjà le parvis. */}
     <mesh position={[.28,-.42,-.06]} rotation={[0,PI,0]}><planeGeometry args={[.36,.66]}/><meshBasicMaterial color="#0c0a07" fog={false}/></mesh>
     <mesh position={[.28,.04,-.06]} rotation={[0,PI,0]}><circleGeometry args={[.13,14]}/><meshBasicMaterial color="#0c0a07" fog={false}/></mesh></>
   :<mesh position={[0,0,-.052]} rotation={[0,PI,0]} material={ext.glass}><planeGeometry args={[1.3,1.5]}/></mesh>}
  {kind==='broken'&&<mesh position={[-.3,.28,-.056]} rotation={[0,PI,.5]}><circleGeometry args={[.34,5]}/><meshBasicMaterial color="#020303"/></mesh>}
  {kind!=='boarded'&&<><B p={[0,0,-.07]} s={[.05,1.5,.03]} m="trim" shadow={false}/><B p={[0,.1,-.07]} s={[1.3,.05,.03]} m="trim" shadow={false}/></>}
  {kind==='boarded'&&[-.5,-.12,.3,.58].map((py,i)=><mesh key={i} position={[(i%2?.04:-.05),py,-.08]} rotation={[0,0,(i%2?.07:-.09)]} geometry={boxUV(1.62,.24,.04)} material={mats.wood} castShadow/>)}
 </group>
}
const WINDOW_X=[4.9,7.1,9.7,11.9,14.5]
const WINDOWS=(()=>{
 const low=['boarded','boarded','dark','boarded','broken'],up=['dark','boarded','broken','dark','boarded']
 const list=[]
 WINDOW_X.forEach((x,i)=>{list.push({x:-x,y:1.75,kind:low[i]});list.push({x,y:1.75,kind:low[(i+2)%5]});list.push({x:-x,y:5.55,kind:i===2?'lit':up[i]});list.push({x,y:5.55,kind:up[(i+3)%5]})})
 return list
})()
// Enseigne : apparaîtra dès que son image sera fournie (identifiant ext-enseigne).
function HospitalSign(){
 return <Sign id="ext-enseigne" p={[0,4.1,PAV_Z-.09]} w={6.8} ry={PI}/>
}
const STAINS=[[-14.5,4.2,1.3,1],[-11.9,4.25,1.2,.9],[-9.7,4.22,1.4,1],[-7.1,4.25,1.2,.9],[-4.9,4.2,1.3,.9],[4.9,4.22,1.3,.9],[7.1,4.2,1.6,1],[9.7,4.25,1.3,1],[11.9,4.2,1.4,1],[14.5,4.25,1.2,.9],[-11,7,2.6,1.1],[-6,7,2.2,1.2],[6,7,2.3,1.2],[11.6,7,2.4,1]]
const PAV_W=7.2,PAV_H=10.6,PAV_Z=FACADE_Z-.55
// Enveloppe du bâtiment vue de dehors (côtés, arrière, toit). Elle traverse les pièces : elle n'existe que sur le parvis.
function BuildingShell({ext}){
 const ref=useRef()
 useFrame(()=>{if(ref.current)ref.current.visible=useGame.getState().outside})
 return <group ref={ref}>
  {/* Volume du bâtiment : retours latéraux, arrière et toit, pour rester crédible vu de biais et depuis le fond. */}
  {[-1,1].map(s=><mesh key={'r'+s} position={[s*FACADE_X,FACADE_H/2,6]} rotation={[0,PI/2,0]} geometry={boxUV(21.6,FACADE_H,.12)} material={ext.facade} castShadow/>)}
  <mesh position={[0,FACADE_H/2,16.8]} geometry={boxUV(FACADE_X*2,FACADE_H,.12)} material={ext.facade}/>
  {/* Toit en volume : un simple plan ne bloquerait pas la lune, qui éclairerait le sol de l'intérieur. */}
  <mesh position={[0,FACADE_H+.1,6]} geometry={boxUV(FACADE_X*2+.2,.2,22)} material={ext.road} castShadow/>
  {/* Équipements de toiture : ils cassent la ligne du toit sur le fond de forêt. */}
  <Cyl p={[-10.2,9.5,1.6]} r={1.15} h={2.2} n={20} mat={ext.rust}/>
  <Cyl p={[-10.2,10.75,1.6]} r={.2} r2={1.2} h={.32} n={20} mat={ext.rust}/>
  {[[-11.1,0],[-9.3,0],[-10.2,.9],[-10.2,-.9]].map(([x,o],i)=><Cyl key={i} p={[x,8.05,1.6+o]} r={.06} h={.9} mat={ext.rust} n={6}/>)}
  <mesh position={[8.5,8.15,-1.4]} geometry={boxUV(2.3,1,1.4)} material={ext.rust} castShadow/>
  <mesh position={[11.4,8,-.8]} geometry={boxUV(1.3,.72,1.1)} material={ext.rust} castShadow/>
  <Cyl p={[8.2,8.95,-1.4]} r={.3} h={.6} n={12} mat={ext.rust}/>
  <Cyl p={[5.9,9.6,2.2]} r={.035} h={4} n={6} m="pipe"/><B p={[5.9,10.8,2.2]} s={[1.1,.03,.03]} m="pipe" shadow={false}/><B p={[5.9,10.3,2.2]} s={[.7,.03,.03]} m="pipe" shadow={false}/>
 </group>
}
function Facade({mats,ext}){
 const gap=DOOR_W/2,side=FACADE_X-gap,band=3.5
 return <group>
  {/* Rez-de-chaussée en brique, étage en béton taché, percés pour la porte. */}
  {[-1,1].map(s=><group key={s}>
   <mesh position={[s*(gap+side/2),band/2,FACADE_Z]} geometry={boxUV(side,band,.12)} material={ext.brick} castShadow receiveShadow/>
   <mesh position={[s*(gap+side/2),.45,FACADE_Z-.08]} geometry={boxUV(side,.9,.06)} material={ext.plinth} receiveShadow/>
  </group>)}
  <mesh position={[0,(band+FACADE_H)/2,FACADE_Z]} geometry={boxUV(FACADE_X*2,FACADE_H-band,.12)} material={ext.facade} castShadow receiveShadow/>
  {/* Linteau : la percée de la façade a exactement la taille de la porte. */}
  <mesh position={[0,(DOOR_H+band)/2,FACADE_Z]} geometry={boxUV(DOOR_W,band-DOOR_H,.12)} material={ext.brick} castShadow receiveShadow/>
  {/* Pilastres : ils rythment la façade et portent de vraies ombres sous la lune. */}
  {[-13.2,-8.4,8.4,13.2].map(x=><mesh key={x} position={[x,FACADE_H/2,FACADE_Z-.13]} geometry={boxUV(.44,FACADE_H,.26)} material={ext.facade} castShadow receiveShadow/>)}
  {[-1,1].map(s=><mesh key={'p'+s} position={[s*3.6,band/2,FACADE_Z-.13]} geometry={boxUV(.44,band,.26)} material={ext.brick} castShadow receiveShadow/>)}
  <mesh position={[0,FACADE_H+.14,FACADE_Z-.05]} geometry={boxUV(FACADE_X*2+.4,.32,.4)} material={ext.path} castShadow/>
  <mesh position={[0,band,FACADE_Z-.08]} geometry={boxUV(FACADE_X*2,.16,.2)} material={ext.path} castShadow/>
  {/* Corps central plus haut et saillant, au-dessus de l'entrée. */}
  <mesh position={[0,(band+PAV_H)/2,PAV_Z+.28]} geometry={boxUV(PAV_W,PAV_H-band,.6)} material={ext.facade} castShadow receiveShadow/>
  <mesh position={[0,PAV_H+.14,PAV_Z+.2]} geometry={boxUV(PAV_W+.36,.3,.86)} material={ext.path} castShadow/>
  {[-2.3,0,2.3].flatMap(x=>[6.1,8.75].map(y=><Window key={x+'_'+y} x={x} y={y} kind={y>8?'boarded':x===0?'dark':'broken'} mats={mats} ext={ext} z={PAV_Z-.03}/>))}
  {/* Coulures sous les fenêtres et la corniche : le béton a pris vingt ans de pluie. */}
  {STAINS.map(([x,y,w,h],i)=><mesh key={'s'+i} position={[x,y,FACADE_Z-.067]} rotation={[0,PI,0]} material={mats.leak}><planeGeometry args={[w,h]}/></mesh>)}
  {[-2.3,0,2.3].map(x=><mesh key={'ps'+x} position={[x,4.9,PAV_Z-.01]} rotation={[0,PI,0]} material={mats.leak}><planeGeometry args={[1.5,1.1]}/></mesh>)}
  {WINDOWS.map((w,i)=><Window key={i} {...w} mats={mats} ext={ext}/>)}
  {/* Auvent de l'entrée sur deux poteaux. */}
  <mesh position={[0,3.2,-6.05]} geometry={boxUV(5.2,.16,2.5)} material={ext.rust} castShadow receiveShadow/>
  <mesh position={[0,3.33,-6.05]} geometry={boxUV(5.3,.08,2.6)} material={ext.rust} castShadow/>
  {[-2.35,2.35].map(x=><Cyl key={x} p={[x,1.56,-7.1]} r={.09} h={3.12} mat={ext.rust}/>)}
  <HospitalSign/>
  <Sign id="ext-condamne" p={[2.45,1.7,FACADE_Z-.09]} w={1.15} h={.75} header="CONDAMNÉ" sub="DANGER — ACCÈS INTERDIT" kind="warning" ry={PI}/>
  <Sign id="ext-urgences" p={[-2.45,2.05,FACADE_Z-.09]} w={1.15} h={.46} header="URGENCES" sub="SERVICE FERMÉ" kind="sign" ry={PI}/>
  <Model id="power_box_01" position={[-6,1.55,FACADE_Z-.08]} rotation={[0,-PI/2,0]} castShadow={false}/>
  <Model id="fire_alarm" position={[1.65,1.55,FACADE_Z-.08]} rotation={[0,PI,0]} castShadow={false}/>
  <Cyl p={[-8.95,3.9,FACADE_Z-.14]} r={.05} h={7.6} mat={ext.rust}/><Cyl p={[8.95,3.9,FACADE_Z-.14]} r={.05} h={7.6} mat={ext.rust}/>
 </group>
}
// Lampadaire réel (scan) agrandi à la hauteur d'un éclairage de parking, avec une ampoule lumineuse pour le halo.
const LAMP_SCALE=1.32,LAMP_TOP=3.62*LAMP_SCALE
// Halo dans l'air autour de l'ampoule.
function LampGlow(){
 const map=useMemo(()=>canvasTexture(128,128,(g,w)=>{const r=g.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);r.addColorStop(0,'rgba(255,222,180,.6)');r.addColorStop(.09,'rgba(255,200,145,.2)');r.addColorStop(.28,'rgba(255,185,125,.045)');r.addColorStop(.7,'rgba(255,180,120,0)');g.fillStyle=r;g.fillRect(0,0,w,w)}),[])
 return <sprite position={[0,LAMP_TOP,0]} scale={[1.9,1.9,1]}><spriteMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false}/></sprite>
}
function LampPost({x,z,ry}){
 return <group position={[x,0,z]}>
  <Model id="street_lamp_01" position={[0,0,0]} rotation={[0,ry,0]} scale={LAMP_SCALE} castShadow={false}/>
  <mesh position={[0,LAMP_TOP,0]}><sphereGeometry args={[.09,12,10]}/><meshBasicMaterial color="#ffd9a0" toneMapped={false}/></mesh>
  <LampGlow/>
 </group>
}
// Clôture de chantier : poteaux et panneaux grillagés, portail fermé derrière le joueur.
function Fence(){
 const {xMax,zMin}=EXTERIOR_ZONE
 const mesh=useMemo(()=>{const t=canvasTexture(128,128,(g,w)=>{g.clearRect(0,0,w,w);g.strokeStyle='#8a8f8c';g.lineWidth=3;for(let i=-w;i<w*2;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i+w,w);g.moveTo(i+w,0);g.lineTo(i,w);g.stroke()}});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,4);return new THREE.MeshStandardMaterial({map:t,transparent:true,alphaTest:.3,side:THREE.DoubleSide,roughness:.6,metalness:.4})},[])
 const panels=useMemo(()=>{const out=[];const zF=zMin-.45,X=xMax+.45
  for(let x=-X+1.6;x<X;x+=3.2)out.push({x,z:zF,ry:0,tilt:Math.abs(x-6)<2?.05:0})
  for(const s of [-1,1])for(let z=zF+1.6;z<-5;z+=3.2)out.push({x:s*X,z,ry:PI/2,tilt:0})
  return out},[xMax,zMin])
 return <group>
  {panels.map((p,i)=><group key={i} position={[p.x,0,p.z]} rotation={[p.tilt,p.ry,0]}>
   <mesh position={[0,1.2,0]} material={mesh}><planeGeometry args={[3.2,2.3]}/></mesh>
   <Cyl p={[-1.6,1.25,0]} r={.04} h={2.5} m="pipe" n={6} shadow={false}/>
   <B p={[0,2.36,0]} s={[3.2,.03,.03]} m="pipe" shadow={false}/>
  </group>)}
  <Sign id="ext-chantier" p={[-1.65,1.62,zMin-.27]} w={1.05} h={.7} header="DÉFENSE" sub="D’ENTRER — SITE FERMÉ" kind="warning" ry={0}/>
  {/* Portail fermé par une chaîne, sur la route barrée. */}
  {[-1,1].map(s=><group key={s} position={[s*1.55,0,zMin-.34]}>
   <Cyl p={[-s*1.45,1.25,0]} r={.05} h={2.5} m="pipeRust" n={8}/><Cyl p={[s*1.45,1.25,0]} r={.05} h={2.5} m="pipeRust" n={8}/>
   <B p={[0,2.46,0]} s={[2.9,.06,.06]} m="pipeRust"/><B p={[0,.12,0]} s={[2.9,.06,.06]} m="pipeRust"/><B p={[0,1.3,0]} s={[2.9,.05,.05]} m="pipeRust" shadow={false}/>
  </group>)}
  {[.18,-.18,.34,-.34].map((y,i)=><B key={i} p={[0,1.28+y*.5,zMin-.3]} s={[.26,.035,.05]} rot={[0,0,i%2?.45:-.45]} m="metal" shadow={false}/>)}
  <B p={[0,1.12,zMin-.27]} s={[.13,.15,.05]} m="yellowDark" shadow={false}/>
 </group>
}
// Lumières du parvis : éteintes une fois entré, pour ne pas éclairer l'intérieur à travers les murs.
function ExteriorLights({shadows}){
 const a=useRef(),hemi=useRef(),moon=useRef()
 const scene=useThree(s=>s.scene)
 const frames=useRef(0)
 const [p1]=LAMP_POSTS
 const target=useMemo(()=>{const o=new THREE.Object3D();o.position.set(p1.x,0,p1.z);return o},[p1])
 useEffect(()=>{runtime.moonBaked=false},[])
 useFrame(({clock})=>{
  const s=useGame.getState(),t=clock.elapsedTime
  // Porte ouverte, la lumière du parvis s'efface en approchant : aucun éclairage de lune ne doit tomber dans le hall.
  const pz=runtime.player.z,doorK=s.entranceOpen?Math.max(0,Math.min(1,(pz+4.7)/-4.3)):1
  const mix=s.outside?.12+.88*doorK*doorK*(3-2*doorK):0;runtime.outdoorMix=mix
  const on=mix,flick=.85+.15*Math.sin(t*23)*Math.sin(t*3.1)
  if(a.current){a.current.intensity=36*on*flick;a.current.target=target}
  if(hemi.current)hemi.current.intensity=.52*mix
  // Les nuages voilent la lune par moments.
  if(moon.current)moon.current.intensity=.4*mix*(.68+.32*Math.sin(t*.09+1)*Math.sin(t*.041)+.2*windGust(t*.4))
  // Brume de nuit légère dehors, brouillard dense à l'intérieur.
  if(scene.fog){scene.fog.density=s.outside?.042+(.0095-.042)*mix:.042;scene.fog.color.set(s.outside&&mix>.5?'#0a1016':'#030607')}
  // Ombres fixes : calculées à la première sortie, une fois la forêt visible, puis plus aucun coût.
  if(s.outside&&!runtime.moonBaked){
   if(shadows){if(moon.current)moon.current.shadow.needsUpdate=true;if(a.current)a.current.shadow.needsUpdate=true}
   if(++frames.current>=3)runtime.moonBaked=true
  }
 })
 return <>
  <hemisphereLight ref={hemi} args={['#8aa2c2','#2c363c',0]}/>
  <directionalLight ref={moon} position={[-118,76,-118]} color="#b9cce4" intensity={0} castShadow={shadows} shadow-mapSize={[2048,2048]} shadow-bias={-.0006} shadow-normalBias={.04} shadow-autoUpdate={false} shadow-camera-left={-62} shadow-camera-right={62} shadow-camera-top={52} shadow-camera-bottom={-52} shadow-camera-near={10} shadow-camera-far={300}/>
  <primitive object={target}/>
  <spotLight ref={a} position={[p1.x,LAMP_TOP-.05,p1.z]} color="#ffcfa0" intensity={0} angle={1.12} penumbra={.85} distance={20} decay={1.7} castShadow={shadows} shadow-mapSize={[1024,1024]} shadow-bias={-.0012} shadow-autoUpdate={false} shadow-camera-near={.3} shadow-camera-far={20}/>
 </>
}
const CHASE_SEES_OUTSIDE_Z=10
function ExteriorOnly({children}){
 const ref=useRef()
 // Pendant la fuite, le parvis ne se voit que depuis le hall, par la porte d'entrée : au fond de l'hôpital, inutile de le dessiner.
 useFrame(()=>{if(ref.current){const s=useGame.getState();ref.current.visible=s.outside||(s.chase&&runtime.player.z<CHASE_SEES_OUTSIDE_Z)}})
 return <group ref={ref}>{children}</group>
}
export default function Exterior({mats,quality,anisotropy}){
 const ext=useExteriorMaterials(anisotropy)
 const gl=useThree(s=>s.gl)
 const sky=useTexture(SKY_URL)
 // Le vrai ciel sert aussi de reflet : vitres et sol mouillé renvoient la lune et les nuages.
 useMemo(()=>{
  sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping
  // La carte de réflexion prend la résolution du ciel : au téléphone, 4096 px coûteraient une centaine de Mo pour un reflet discret.
  if(PHONE&&!gl.properties.get(sky).__webglTexture)shrinkTexture(sky,TEXTURE_LIMIT.atlas)
  // Qualité Minimale : pas de reflet du ciel (ni la carte à calculer au chargement, ni son échantillonnage à chaque pixel).
  const skyRefl=QUALITY_PRESETS[quality].skyReflections
  const env=skyRefl?(()=>{const pm=new THREE.PMREMGenerator(gl),t=pm.fromEquirectangular(sky).texture;pm.dispose();return t})():null
  const rot=new THREE.Euler(0,SKY_YAW,0)
  const reflect=(m,i,rough)=>{m.envMap=env;m.envMapRotation=rot;m.envMapIntensity=i;if(rough!==undefined)m.roughness=rough;m.needsUpdate=true}
  reflect(ext.asphalt,.2,.6);reflect(ext.path,.13,.74);reflect(ext.road,.12,.72)
  ext.glass=new THREE.MeshStandardMaterial({color:'#0b0f13',metalness:1,roughness:.1});reflect(ext.glass,.55)
  ext.water=new THREE.MeshStandardMaterial({color:'#20262c',metalness:1,roughness:.05,transparent:true,alphaMap:puddleAlpha(),depthWrite:false});reflect(ext.water,.42)
  sky.mapping=THREE.UVMapping;sky.needsUpdate=true
 },[gl,sky,ext,quality])
 return <group>
  <ExteriorOnly>
  <Sky tex={sky}/>
  <TreeLine/>
  <StaticBatch>
   <Ground ext={ext}/>
   <ContactShadows/>
   <Facade mats={mats} ext={ext}/>
  </StaticBatch>
  <BuildingShell ext={ext}/>
  {CARS.map((c,i)=><Model key={i} id="covered_car" position={[c.x,0,c.z]} rotation={[0,c.ry,0]}/>)}
  <Dancer/>
  {LAMP_POSTS.map((p,i)=><LampPost key={i} {...p}/>)}
  <StaticBatch><Fence/></StaticBatch>
  <Forest quality={quality} floor={ext.forestFloor}/>
  {EXTERIOR_PROPS.map((p,i)=><Model key={i} id={p.m} position={[p.x,p.y||0,p.z]} rotation={p.rot||[0,p.ry||0,0]} scale={p.s||1} tint={p.tint}/>)}
  <Model id="industrial_caged_sconce" position={[0,3.02,-6.05]} rotation={[0,0,0]} scale={.7} castShadow={false}/>
  </ExteriorOnly>
  <ExteriorLights shadows={QUALITY_PRESETS[quality].exteriorShadows}/>
 </group>
}

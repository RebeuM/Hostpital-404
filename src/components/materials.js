import * as THREE from 'three'
import {useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import {TEXTURE_SETS,EXTERIOR_TEXTURE_SETS,DECALS,textureUrls,TEXTURE_BASE} from './assets'

// ---------------------------------------------------------------------------
// Matériaux PBR à partir des textures locales (Poly Haven / ambientCG, CC0).
// Les UV des murs sont exprimées en mètres (voir boxUV) : repeat = 1/size.
// ---------------------------------------------------------------------------
function configure(tex,{srgb=false,anisotropy=4,repeat=1}={}){
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping
 tex.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace
 tex.anisotropy=anisotropy;tex.repeat.set(repeat,repeat);tex.needsUpdate=true
 return tex
}
export function pbr(maps,set,opts={}){
 const [diff,nor,arm]=maps;const scale=1/set.size
 configure(diff,{srgb:true,anisotropy:opts.anisotropy,repeat:scale});configure(nor,{anisotropy:opts.anisotropy,repeat:scale});configure(arm,{anisotropy:opts.anisotropy,repeat:scale})
 const m=new THREE.MeshStandardMaterial({
  map:diff,normalMap:nor,roughnessMap:arm,metalnessMap:arm,aoMap:arm,aoMapIntensity:opts.ao??1,
  roughness:1,metalness:1,color:opts.color||'#ffffff',normalScale:new THREE.Vector2(opts.normal??1,opts.normal??1),
  side:opts.side||THREE.FrontSide,envMapIntensity:opts.env??.35
 })
 if(opts.emissive){m.emissive=new THREE.Color(opts.emissive);m.emissiveIntensity=opts.emissiveIntensity??1}
 return m
}
// Matériaux du parvis.
export function useExteriorMaterials(anisotropy=4){
 const keys=Object.keys(EXTERIOR_TEXTURE_SETS)
 const textures=useTexture(keys.flatMap(k=>textureUrls(EXTERIOR_TEXTURE_SETS[k])))
 return useMemo(()=>{
  const out={},tints={asphalt:'#b2b7bb',path:'#807f77',forestFloor:'#55594c',dirt:'#5c564b',road:'#5e5f5f',facade:'#9b9990',brick:'#b3a79a',plinth:'#a09a92',rust:'#c9bfb2'}
  keys.forEach((k,i)=>{out[k]=pbr(textures.slice(i*3,i*3+3),EXTERIOR_TEXTURE_SETS[k],{anisotropy,color:tints[k],env:.2})})
  return out
 },[textures,anisotropy])
}
// Charge tous les jeux de textures (Suspense) et construit les matériaux une seule fois.
export function useWorldMaterials(anisotropy=4){
 const keys=Object.keys(TEXTURE_SETS)
 const urls=keys.flatMap(k=>textureUrls(TEXTURE_SETS[k]))
 const leakUrl=`${TEXTURE_BASE}${DECALS.leak.dir}/diff.webp`
 const textures=useTexture([...urls,leakUrl])
 return useMemo(()=>{
  const maps={};keys.forEach((k,i)=>{maps[k]=textures.slice(i*3,i*3+3)})
  const leak=textures[textures.length-1];leak.colorSpace=THREE.SRGBColorSpace;leak.anisotropy=anisotropy
  const o={anisotropy}
  const mats={
   lino:pbr(maps.floorHall,TEXTURE_SETS.floorHall,{...o,env:3,color:'#a9a79f',normal:.8}),
   tileRoom:pbr(maps.floorRoom,TEXTURE_SETS.floorRoom,{...o,env:3,color:'#b9b2a4',normal:.7}),
   tile:pbr(maps.tile,TEXTURE_SETS.tile,{...o,env:2.5,color:'#e6e8e0',normal:.9}),
   wall:pbr(maps.plasterOld,TEXTURE_SETS.plasterOld,{...o,color:'#b9b4a4',normal:.9}),
   plaster:pbr(maps.plasterOld,TEXTURE_SETS.plasterOld,{...o,color:'#d2cdbb',normal:.8}),
   dado:pbr(maps.dado,TEXTURE_SETS.dado,{...o,color:'#a9adb0',normal:.7}),
   wallTiles:pbr(maps.wallTiles,TEXTURE_SETS.wallTiles,{...o,env:2.5,color:'#d7dbd6',normal:1}),
   ceiling:pbr(maps.ceilingA,TEXTURE_SETS.ceilingA,{...o,color:'#9fa198',normal:.7}),
   ceilingRoom:pbr(maps.ceilingB,TEXTURE_SETS.ceilingB,{...o,color:'#a3a59c',normal:.7}),
   concrete:pbr(maps.concrete,TEXTURE_SETS.concrete,{...o,color:'#b7b5ae',normal:.8}),
   concreteFloor:pbr(maps.concreteFloor,TEXTURE_SETS.concreteFloor,{...o,color:'#a09e97',normal:.8}),
   metalRusty:pbr(maps.metalRusty,TEXTURE_SETS.metalRusty,{...o,env:1.2,color:'#c8c6c0'}),
   steel:pbr(maps.steel,TEXTURE_SETS.steel,{...o,env:3,color:'#e3e6e6'}),
   wood:pbr(maps.wood,TEXTURE_SETS.wood,{...o,color:'#b9a78c'}),
   fabric:pbr(maps.fabric,TEXTURE_SETS.fabric,{...o,color:'#cfd3c4',normal:.7}),
   leather:pbr(maps.leather,TEXTURE_SETS.leather,{...o,color:'#4e5a57'}),
   // Coulures : mélange multiplicatif (assombrit le mur au lieu de poser un rectangle clair).
   leak:new THREE.MeshStandardMaterial({map:leak,transparent:true,premultipliedAlpha:true,opacity:.9,roughness:.6,metalness:0,depthWrite:false,blending:THREE.MultiplyBlending,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,color:'#5a4f45'})
  }
  // Variantes dérivées partageant les textures.
  mats.frame=mats.steel.clone();mats.frame.color.set('#4d5553');mats.frame.roughness=1
  mats.doorGlass=new THREE.MeshStandardMaterial({color:'#2a3a3b',transparent:true,opacity:.55,roughness:.15,metalness:.3,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:4})
  mats.linenDark=mats.fabric.clone();mats.linenDark.color.set('#aab0a4')
  mats.curtain=mats.fabric.clone();mats.curtain.color.set('#8f9a90');mats.curtain.side=THREE.DoubleSide
  return mats
 },[textures,anisotropy])
}
// Matériaux unis (sans texture) partagés entre tous les objets procéduraux.
let flat
export function flatMaterials(){
 if(flat)return flat
 const b=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.75,envMapIntensity:.4,...o})
 flat={
  trim:b('#2b3331',{metalness:.35,roughness:.6}),
  dark:b('#121a1c',{metalness:.25,roughness:.7}),
  black:b('#0a1012',{roughness:.3,metalness:.3}),
  metal:b('#9ba7a5',{metalness:.75,roughness:.4}),
  chrome:b('#d6dcdb',{metalness:.9,roughness:.22}),
  paint:b('#8a9a95',{roughness:.65}),
  red:b('#8a2420',{roughness:.55}),
  redDark:b('#4e1512',{roughness:.6}),
  yellow:b('#c9a227',{roughness:.6}),
  yellowDark:b('#8d7118',{roughness:.6}),
  greenTank:b('#2f5a3a',{roughness:.45,metalness:.5}),
  glass:b('#6f949b',{transparent:true,opacity:.28,roughness:.1,metalness:.2,side:THREE.DoubleSide,depthWrite:false}),
  blood:b('#4a1416',{roughness:.2,metalness:.1,transparent:true,opacity:.78,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),
  water:b('#1a2a2d',{roughness:.05,metalness:.6,transparent:true,opacity:.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),
  screen:b('#5bf7b1',{emissive:'#2bd77e',emissiveIntensity:1.1,roughness:.3}),
  screenDead:b('#121a1c',{roughness:.25,metalness:.4}),
  lamp:b('#ecfff3',{emissive:'#cfffe4',emissiveIntensity:1.3,roughness:.4}),
  lampWarm:b('#ffe7bd',{emissive:'#f8c27a',emissiveIntensity:1.1}),
  lampDead:b('#8d948f',{roughness:.6}),
  redLight:b('#f04a3c',{emissive:'#ff2a1c',emissiveIntensity:2.6}),
  greenLight:b('#4cf59c',{emissive:'#25e37f',emissiveIntensity:1.5}),
  skin:b('#8f735c',{roughness:.9}),
  coat:b('#3f3a33',{roughness:.95}),
  hood:b('#2b2924',{roughness:.98}),
  denim:b('#2d4555',{roughness:.95}),
  paper:b('#d9d2b4',{roughness:1,side:THREE.DoubleSide}),
  phone:b('#111416',{roughness:.3,metalness:.5}),
  phoneScreen:b('#9ec7ff',{emissive:'#6fa8ff',emissiveIntensity:1.2}),
  pipe:b('#5c6361',{metalness:.6,roughness:.5}),
  pipeRust:b('#6b4a35',{metalness:.3,roughness:.8}),
  xrayFilm:b('#0c1a2a',{emissive:'#2a5d8f',emissiveIntensity:.9,roughness:.4}),
  safe:b('#43494a',{metalness:.7,roughness:.45}),
  tank:b('#7aa39f',{transparent:true,opacity:.42,roughness:.08,metalness:.1,side:THREE.DoubleSide,depthWrite:false}),
  fluid:b('#5f9a4a',{transparent:true,opacity:.55,roughness:.2,emissive:'#2d5a1e',emissiveIntensity:.4,depthWrite:false})
 }
 return flat
}
// ---------------------------------------------------------------------------
// Géométrie de boîte dont les UV sont exprimées en mètres (motifs à l'échelle physique).
// ---------------------------------------------------------------------------
const geoCache=new Map()
export function boxUV(w,h,d){
 const key=`${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`
 if(geoCache.has(key))return geoCache.get(key)
 const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv
 // Faces dans l'ordre +x,-x,+y,-y,+z,-z ; 4 sommets par face.
 const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]]
 for(let f=0;f<6;f++){const [su,sv]=dims[f];for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*su,uv.getY(k)*sv)}}
 uv.needsUpdate=true
 geoCache.set(key,g);return g
}
export function planeUV(w,h){
 const key=`p${w.toFixed(3)}|${h.toFixed(3)}`
 if(geoCache.has(key))return geoCache.get(key)
 const g=new THREE.PlaneGeometry(w,h);const uv=g.attributes.uv
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h)
 uv.needsUpdate=true;geoCache.set(key,g);return g
}
// ---------------------------------------------------------------------------
// Textures de signalétique et d'écrans dessinées sur canvas.
// ---------------------------------------------------------------------------
function noiseRandom(seed=0x9af249){let v=seed>>>0;return ()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296}}
function grunge(ctx,w,h,n,rng){for(let i=0;i<n;i++){
 const x=rng()*w,y=rng()*h,a=rng()*6+.3
 ctx.fillStyle=rng()>.46?`rgba(0,0,0,${.012+rng()*.115})`:`rgba(210,224,198,${.008+rng()*.08})`
 ctx.beginPath();ctx.ellipse(x,y,a*(1+rng()*2),a*.6,rng()*3,0,Math.PI*2);ctx.fill()
}}
function canvasTexture(width,height,draw){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
 const ctx=canvas.getContext('2d');draw(ctx,width,height)
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true
 return t
}
const textCache=new Map()
const wrap=(txt,maxChars)=>{const a=String(txt).split(' '),res=[];let line='';for(const word of a){if((line+' '+word).length>maxChars){res.push(line);line=word}else line+=(line?' ':'')+word}if(line)res.push(line);return res}
// Salissures procédurales (canvas) : bande de crasse au pied des murs, taches au sol, traces de mains.
export function makeGrimeStrip(){
 const key='grime-strip';if(textCache.has(key))return textCache.get(key)
 const t=canvasTexture(512,128,(c,w,h)=>{
  const r=noiseRandom(4242);c.clearRect(0,0,w,h)
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(20,14,10,0)');g.addColorStop(.55,'rgba(20,14,10,.35)');g.addColorStop(1,'rgba(12,9,6,.85)');c.fillStyle=g;c.fillRect(0,0,w,h)
  for(let i=0;i<900;i++){const x=r()*w,y=h*.3+r()*h*.7;c.fillStyle=`rgba(10,8,6,${.05+r()*.25})`;c.beginPath();c.ellipse(x,y,2+r()*9,1+r()*4,r()*3,0,Math.PI*2);c.fill()}
  for(let i=0;i<60;i++){const x=r()*w;c.fillStyle=`rgba(40,30,20,${.1+r()*.3})`;c.fillRect(x,h*.5+r()*h*.3,1+r()*3,h*.5)}
 })
 t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;textCache.set(key,t);return t
}
export function makeStainTexture(seed=1){
 const key='stain'+seed;if(textCache.has(key))return textCache.get(key)
 const t=canvasTexture(256,256,(c,w,h)=>{
  const r=noiseRandom(seed*7919);c.clearRect(0,0,w,h)
  const blobs=3+Math.floor(r()*4)
  for(let b=0;b<blobs;b++){const cx=w*.3+r()*w*.4,cy=h*.3+r()*h*.4,rad=w*.12+r()*w*.2
   const g=c.createRadialGradient(cx,cy,rad*.1,cx,cy,rad);g.addColorStop(0,`rgba(22,16,12,${.5+r()*.3})`);g.addColorStop(.7,`rgba(22,16,12,${.2+r()*.2})`);g.addColorStop(1,'rgba(22,16,12,0)')
   c.fillStyle=g;c.beginPath();c.ellipse(cx,cy,rad*(1+r()*.6),rad*(.6+r()*.6),r()*3,0,Math.PI*2);c.fill()}
  for(let i=0;i<120;i++){c.fillStyle=`rgba(18,13,10,${.1+r()*.3})`;c.beginPath();c.ellipse(r()*w,r()*h,1+r()*4,1+r()*3,r()*3,0,Math.PI*2);c.fill()}
 })
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;textCache.set(key,t);return t
}
export function makeHandprintTexture(seed=1){
 const key='hand'+seed;if(textCache.has(key))return textCache.get(key)
 const t=canvasTexture(256,256,(c,w,h)=>{
  const r=noiseRandom(seed*331+17);c.clearRect(0,0,w,h)
  const col=(a)=>`rgba(96,12,10,${a})`
  c.save();c.translate(128,150);c.rotate((r()-.5)*.5)
  c.fillStyle=col(.78);c.beginPath();c.ellipse(0,10,46,58,0,0,Math.PI*2);c.fill()
  const fingers=[[-38,-70,13,52,.35],[-14,-92,13,62,.1],[12,-96,13,64,-.05],[36,-80,12,56,-.25],[62,-10,13,44,-1.0]]
  for(const [x,y,rw,rh,rot] of fingers){c.save();c.translate(x,y);c.rotate(rot);c.fillStyle=col(.72);c.beginPath();c.ellipse(0,0,rw,rh,0,0,Math.PI*2);c.fill();c.restore()}
  c.restore()
  // coulures
  for(let i=0;i<5;i++){const x=90+r()*80;c.fillStyle=col(.35+r()*.3);c.fillRect(x,170+r()*30,2+r()*3,20+r()*70)}
  // usure : on perce la trace
  c.globalCompositeOperation='destination-out';for(let i=0;i<260;i++){c.beginPath();c.ellipse(r()*w,r()*h,1+r()*3,1+r()*2,r()*3,0,Math.PI*2);c.fill()}
 })
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;textCache.set(key,t);return t
}
let decalMats
export function decalMaterials(){
 if(decalMats)return decalMats
 const mk=(map,extra={})=>new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,color:'#ffffff',...extra})
 decalMats={grime:mk(makeGrimeStrip(),{opacity:.9}),stains:[1,2,3,4,5].map(i=>mk(makeStainTexture(i),{opacity:.85})),hands:[1,2,3].map(i=>mk(makeHandprintTexture(i),{opacity:.95}))}
 return decalMats
}
export function makeXrayTexture(seed=1){
 const key='xray'+seed;if(textCache.has(key))return textCache.get(key)
 const t=canvasTexture(512,640,(c,w,h)=>{
  const r=noiseRandom(seed*977)
  const g=c.createRadialGradient(256,300,40,256,320,420);g.addColorStop(0,'#28445a');g.addColorStop(1,'#050a10');c.fillStyle=g;c.fillRect(0,0,w,h)
  c.strokeStyle='rgba(205,225,240,.65)';c.lineWidth=8
  for(let i=0;i<11;i++){const y=120+i*42;c.beginPath();c.moveTo(256,y);c.quadraticCurveTo(110+r()*20,y+30,70,y+70+i*3);c.stroke();c.beginPath();c.moveTo(256,y);c.quadraticCurveTo(402-r()*20,y+30,442,y+70+i*3);c.stroke()}
  c.fillStyle='rgba(220,235,245,.7)';c.fillRect(242,90,28,480)
  c.fillStyle='rgba(255,255,255,.5)';c.font='22px monospace';c.textAlign='left';c.fillText(seed===3?'VASSEUR E. / 2018':'CHARCOT — RADIO '+seed,24,32)
  grunge(c,w,h,3000,r)
 })
 textCache.set(key,t);return t
}
export function makeMonitorTexture(variant=0){
 const key='mon'+variant;if(textCache.has(key))return textCache.get(key)
 const t=canvasTexture(256,192,(c,w,h)=>{
  const r=noiseRandom(variant*131+7)
  c.fillStyle=variant===9?'#070b0b':'#0a1611';c.fillRect(0,0,w,h)
  if(variant!==9){c.fillStyle='rgba(120,200,160,.18)';for(let i=0;i<60;i++)c.fillRect(r()*w,r()*h,r()*40,2)
   c.fillStyle='#8fe7b6';c.font='bold 14px monospace';c.textAlign='left';c.fillText('CAM 0'+(variant+1)+'  —  NO SIGNAL',10,22)
   c.strokeStyle='rgba(140,220,180,.35)';c.lineWidth=2;c.strokeRect(14,34,228,140)
   for(let y=0;y<h;y+=4){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,y,w,1)}}
 })
 textCache.set(key,t);return t
}

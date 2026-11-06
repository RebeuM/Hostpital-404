// Forêt autour du parvis. Sapins réels (scan Poly Haven allégé par scripts/bake-forest.mjs) près de la clôture,
// images d'arbres au loin, sous-bois. Tout est masqué une fois entré dans l'hôpital : la scène intérieure n'en paie pas le coût.
import React,{useLayoutEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {useGLTF,useTexture} from '@react-three/drei'
import {useGame,runtime} from '../game/store'
import {DEAD_TREES,groundHeight} from '../game/layout'
import {windGust} from '../game/wind'
import {modelUrl,DRACO_PATH,FOREST_IMPOSTOR_URL} from './assets'
import {QUALITY_PRESETS} from '../game/settings'

// Vent : uniformes partagés et déformation appliquée en coordonnées monde (le sens du vent reste le même pour tous, quelle que soit la rotation de l'arbre).
const WIND={uWindT:{value:0},uWindG:{value:0}}
function addWind(material,key,amp,flutter=0,prev){
 material.onBeforeCompile=sh=>{
  prev?.(sh)
  sh.uniforms.uWindT=WIND.uWindT;sh.uniforms.uWindG=WIND.uWindG
  sh.vertexShader='uniform float uWindT;uniform float uWindG;\n'+sh.vertexShader.replace('#include <project_vertex>',`
   vec4 mvPosition=instanceMatrix*vec4(transformed,1.0);
   float wH=mvPosition.y-instanceMatrix[3].y;
   vec2 wBase=instanceMatrix[3].xz;
   float wP=wBase.x*.13+wBase.y*.17;
   float wK=(${amp.toFixed(5)})*wH*wH*(.35+uWindG);
   float wS=sin(uWindT*1.05+wP)+.55*sin(uWindT*2.3+wP*1.7);
   mvPosition.x+=wS*wK+.45*wK*uWindG;
   mvPosition.z+=wS*wK*.55;
   mvPosition.xyz+=sin(uWindT*3.3+mvPosition.xzy*1.6)*(${flutter.toFixed(4)})*wH*(.4+uWindG);
   mvPosition=modelViewMatrix*mvPosition;
   gl_Position=projectionMatrix*mvPosition;`)
 }
 material.customProgramCacheKey=()=>'wind-'+key
 return material
}
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
// Hauteur réelle de chaque sapin dans l'atlas d'images (voir scripts/bake-forest.mjs).
const IMPOSTOR_H=[19,14.49,14.94]
const TILE_ASPECT=340/1024

// Zones sans arbre : parvis, bâtiment, route d'accès au sud.
const inClearing=(x,z,m=0)=>
 (Math.abs(x)<16.4+m&&z>-25.6-m&&z<-4)||
 (x>-17.5-m&&x<19+m&&z>-6&&z<18.5+m)||
 (Math.abs(x)<4.4+m&&z<-25)
// Distance au parvis : décide du niveau de détail. Le joueur y reste enfermé, le choix peut donc être fixé une fois pour toutes.
const parvisDistance=(x,z)=>Math.hypot(Math.max(0,Math.abs(x)-15),Math.max(0,-24.5-z,z+4.8))

function buildPlan(density){
 const r=rng(404),firs=[[],[],[]],far=[]
 const clump=(x,z)=>.5+.5*Math.sin(x*.075+1.3)*Math.cos(z*.062-.7)
 const MESH_RANGE=density.meshRange
 for(let gx=-190;gx<190;gx+=density.cell)for(let gz=-200;gz<200;gz+=density.cell){
  const x=gx+r()*density.cell*.85,z=gz+r()*density.cell*.85,keep=r(),variant=Math.floor(r()*3),scale=.92+r()*.5,ry=r()*Math.PI*2
  if(inClearing(x,z,1))continue
  const d=parvisDistance(x,z)
  if(keep>.5+.5*clump(x,z)+(d<20?.25:0))continue
  const y=groundHeight(x,z)-.05
  if(d<MESH_RANGE)firs[variant].push({x,y,z,scale,ry,near:d<density.nearRange})
  else if(Math.hypot(x,z+6)<190)far.push({x,y,z,scale,ry,variant})
 }
 // Grande masse derrière l'hôpital : depuis le parvis, le toit cache tout ce qui est bas ou lointain.
 // Seuls de très grands sapins, serrés juste derrière le bâtiment, forment une lisière continue au-dessus du toit.
 for(let gx=-46;gx<46;gx+=density.backCell)for(let gz=19;gz<62;gz+=density.backCell){
  const x=gx+r()*density.backCell,z=gz+r()*density.backCell,variant=r()<.6?0:Math.floor(r()*3),depth=(z-19)/43
  far.push({x,y:groundHeight(x,z)-.05,z,scale:(1.25+r()*.45)*(1+depth*.55)*(variant?1.25:1),ry:r()*Math.PI*2,variant})
 }
 // Quelques sapins à l'intérieur de la clôture.
 DEAD_TREES.forEach((t,i)=>firs[i%3].push({x:t.x,y:0,z:t.z,scale:.86+i*.05,ry:i*1.7,near:true}))
 return {firs,far}
}
const composeMatrix=(()=>{const q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();return (m,x,y,z,ry,sc,tilt=0)=>{e.set(tilt,ry,tilt*.6);q.setFromEuler(e);p.set(x,y,z);s.setScalar(sc);m.compose(p,q,s);return m}})()

// Chaque maillage d'un modèle devient un InstancedMesh ; un même lot place tout le modèle, ou une seule de ses variantes.
function meshesOf(scene){
 const list=[];scene.updateMatrixWorld(true)
 scene.traverse(o=>{if(!o.isMesh)return
  const local=o.matrixWorld.clone();local.setPosition(0,0,0)
  list.push({geometry:o.geometry,material:o.material,local})})
 return list
}
function Instances({geometry,material,local,items,shadow}){
 const ref=useRef()
 useLayoutEffect(()=>{
  const im=ref.current;if(!im)return
  const m=new THREE.Matrix4(),out=new THREE.Matrix4()
  items.forEach((it,i)=>{composeMatrix(m,it.x,it.y||0,it.z,it.ry,it.scale,it.tilt||0);out.multiplyMatrices(m,local);im.setMatrixAt(i,out)})
  im.instanceMatrix.needsUpdate=true
 },[items,local])
 if(!items.length)return null
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} frustumCulled={false} castShadow={shadow} receiveShadow={shadow}/>
}
function FirGroup({id,items,shadow}){
 const {scene}=useGLTF(modelUrl(id),DRACO_PATH),{scene:nearScene}=useGLTF(modelUrl(id+'_near'),DRACO_PATH)
 const tone=m=>{const c=m.clone();c.color.setRGB(1.65,1.78,1.6);return addWind(c,id+'-cards',.00115,.0022)}
 const {solid,cards,nearCards}=useMemo(()=>{
  const all=meshesOf(scene),near=meshesOf(nearScene)
  return {
   solid:all.filter(m=>!(m.material.alphaTest>0)).map(m=>({...m,material:addWind(m.material.clone(),id+'-'+m.material.name,.00115)})),
   cards:all.filter(m=>m.material.alphaTest>0).map(m=>({...m,material:tone(m.material)})),
   nearCards:near.map(m=>({...m,material:tone(m.material)}))
  }
 },[scene,nearScene,id])
 const nearItems=useMemo(()=>items.filter(i=>i.near),[items]),farItems=useMemo(()=>items.filter(i=>!i.near),[items])
 return <>
  {solid.map((m,i)=><Instances key={'s'+i} {...m} items={items} shadow={shadow}/>)}
  {cards.map((m,i)=><Instances key={'c'+i} {...m} items={farItems} shadow={shadow}/>)}
  {nearCards.map((m,i)=><Instances key={'n'+i} {...m} items={nearItems} shadow={shadow}/>)}
 </>
}
// Sous-bois : chaque élément reçoit une variante du modèle.
function Scatter({id,items,tint,shadow=false,lightest,sway=0}){
 const {scene}=useGLTF(modelUrl(id),DRACO_PATH)
 const meshes=useMemo(()=>{let l=meshesOf(scene);
  // Touffes et fougères par centaines : on ne garde que les variantes les plus légères du modèle.
  if(lightest)l=l.sort((a,b)=>a.geometry.index.count-b.geometry.index.count).slice(0,lightest);if(tint)for(const m of l){m.material=m.material.clone();m.material.color.set(tint)}
  if(sway)l=l.map((m,i)=>({...m,material:addWind(m.material.clone(),id+i,sway,.012)}));return l},[scene,tint,sway,id])
 const byVariant=useMemo(()=>meshes.map((_,v)=>items.filter(it=>it.variant%meshes.length===v)),[meshes,items])
 return <>{meshes.map((m,i)=><Instances key={i} {...m} items={byVariant[i]} shadow={shadow}/>)}</>
}
// Sapins lointains : deux plans croisés portant deux vues réelles de l'arbre, sur un seul appel de dessin.
function FarTrees({items}){
 const tex=useTexture(FOREST_IMPOSTOR_URL)
 const geometry=useMemo(()=>{
  const w=TILE_ASPECT/2,P=[-w,0,0,w,0,0,w,1,0,-w,1,0, 0,0,-w,0,0,w,0,1,w,0,1,-w],U=[0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],Q=[0,0,0,0,1,1,1,1]
  const g=new THREE.InstancedBufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('aQuad',new THREE.Float32BufferAttribute(Q,1))
  g.setIndex([0,1,2,0,2,3,4,5,6,4,6,7])
  g.setAttribute('aTile',new THREE.InstancedBufferAttribute(new Float32Array(items.map(t=>t.variant*2)),1))
  return g
 },[items])
 const material=useMemo(()=>{
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4
  const m=new THREE.MeshBasicMaterial({map:tex,alphaTest:.38,side:THREE.DoubleSide});m.color.setRGB(.46,.62,.8)
  addWind(m,'far-tree',.00115,0,sh=>{
   sh.vertexShader='attribute float aTile;attribute float aQuad;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv.x=(vMapUv.x+aTile+aQuad)/6.0;')
   // Clair de lune : cime éclairée, pied dans l'ombre.
   sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=mix(.25,1.15,smoothstep(.12,.92,vMapUv.y));')
  })
  return m
 },[tex])
 const ref=useRef()
 useLayoutEffect(()=>{
  const im=ref.current;if(!im)return
  const m=new THREE.Matrix4()
  const c=new THREE.Color(),r=rng(77)
  items.forEach((t,i)=>{composeMatrix(m,t.x,t.y-.05,t.z,t.ry,t.scale*IMPOSTOR_H[t.variant]);im.setMatrixAt(i,m);const v=.62+r()*.62;c.setRGB(v,v*(.94+r()*.14),v);im.setColorAt(i,c)})
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true
 },[items])
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} frustumCulled={false}/>
}
function understory(){
 const r=rng(2026),out={grass:[],fern:[],shrub:[],rock:[],log:[],stump:[],branch:[]}
 const spot=(xr,zr)=>{for(let i=0;i<30;i++){const x=(r()*2-1)*xr,z=-14.6+(r()*2-1)*zr;if(!inClearing(x,z,-.6))return {x,z}}return null}
 const add=(list,n,xr,zr,min,span,tilt=0)=>{for(let i=0;i<n;i++){const p=spot(xr,zr);if(p)out[list].push({...p,y:groundHeight(p.x,p.z)-.05,ry:r()*6.28,scale:min+r()*span,variant:i,tilt:(r()-.5)*tilt})}}
 add('grass',170,40,34,.9,1.5);add('fern',150,44,36,.9,1.3);add('shrub',55,46,38,1.1,1.8)
 add('rock',46,50,42,.32,.75);add('stump',20,44,36,.7,.5);add('branch',64,42,34,.8,.9,.4);add('log',18,42,34,.9,.5,.08)
 // Mauvaises herbes qui reprennent le parvis : le long de la façade, de la clôture et des bordures.
 for(let i=0;i<110;i++){const edge=r();let x,z
  if(edge<.35){x=(r()*2-1)*14.6;z=-5.2-r()*1}else if(edge<.6){x=(r()<.5?-1:1)*(14.2+r()*.8);z=-24+r()*19}else if(edge<.8){x=(r()*2-1)*14.6;z=-24.2+r()*.9}else{x=(r()<.5?-1:1)*(1.98+r()*.7);z=-23.5+r()*17}
  out.grass.push({x,z,ry:r()*6.28,scale:.7+r()*1.2,variant:i})}
 return out
}
// Sol de la forêt : un seul grand maillage en relief.
// Grille resserrée au centre et lâche au loin, où le brouillard efface tout : à 110 subdivisions, mailles d'environ 2 m
// au bord de la clairière (comme l'ancienne grille régulière de 240) et de 5 m à 100 m, cinq fois moins de triangles.
function Terrain({material,segments}){
 const geometry=useMemo(()=>{
  const half=260,g=new THREE.PlaneGeometry(2,2,segments,segments);g.rotateX(-Math.PI/2)
  const P=g.attributes.position,U=g.attributes.uv,warp=v=>Math.sign(v)*Math.pow(Math.abs(v),1.7)*half
  for(let i=0;i<P.count;i++){const x=warp(P.getX(i)),z=warp(P.getZ(i));P.setXYZ(i,x,groundHeight(x,z)-.06,z);U.setXY(i,x,z)}
  g.computeVertexNormals();g.computeBoundingSphere();return g
 },[segments])
 return <mesh geometry={geometry} material={material} receiveShadow/>
}
// Feuilles mortes et aiguilles au sol, plus denses le long des bordures où le vent les accumule.
function FallenLeaves({count}){
 const material=useMemo(()=>{
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=rng(11),cols=['#5a3f22','#6e4a24','#463320','#7a5a2c','#3c3a22','#55401f']
  for(let i=0;i<4;i++){const ox=(i%2)*128+64,oy=(i>>1)*128+64
   for(let n=0;n<(i<2?1:1);n++){g.save();g.translate(ox,oy);g.fillStyle=cols[i];g.beginPath();g.ellipse(0,0,i<2?46:22,i<2?24:44,.3*i,0,6.3);g.fill();g.strokeStyle='rgba(20,12,6,.7)';g.lineWidth=2;g.beginPath();g.moveTo(-40,0);g.lineTo(40,0);g.stroke();g.restore()}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace
  return new THREE.MeshStandardMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide,roughness:.95})
 },[])
 const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);g.setAttribute('aSp',new THREE.BufferAttribute(new Float32Array(4),1));return g},[])
 const ref=useRef()
 useLayoutEffect(()=>{
  const im=ref.current;if(!im)return
  const r=rng(909),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3(),c=new THREE.Color()
  let i=0
  while(i<count){
   const x=(r()*2-1)*15.4,z=-24.6+r()*19.6,edge=Math.min(15-Math.abs(x),z+24.5,-5-z,Math.abs(Math.abs(x)-1.95))
   if(r()>.14+.86*Math.exp(-Math.max(0,edge)*.75))continue
   e.set((r()-.5)*.25,r()*6.28,(r()-.5)*.25);q.setFromEuler(e);p.set(x,.016+r()*.012,z);const k=.07+r()*.09;s.set(k,1,k);m.compose(p,q,s);im.setMatrixAt(i,m)
   const v=.7+r()*.6;c.setRGB(v,v,v);im.setColorAt(i,c);i++
  }
  im.instanceMatrix.needsUpdate=true
 },[count])
 return <instancedMesh ref={ref} args={[geometry,material,count]} frustumCulled={false} receiveShadow/>
}
// Feuilles et aiguilles emportées par les rafales, autour du joueur.
function BlownLeaves({count}){
 const ref=useRef()
 const {geometry,seeds}=useMemo(()=>{const g=new THREE.BufferGeometry(),r=rng(55),a=new Float32Array(count*3),seeds=[];for(let i=0;i<count;i++){seeds.push({x:(r()-.5)*40,y:r()*5,z:(r()-.5)*36,p:r()*6.28,v:.7+r()*.8})}g.setAttribute('position',new THREE.BufferAttribute(a,3));return {geometry:g,seeds}},[count])
 const map=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();g.ellipse(16,16,14,7,.5,0,6.3);g.fill();return new THREE.CanvasTexture(c)},[])
 useFrame(({camera},dt)=>{
  const d=Math.min(dt,.05),t=WIND.uWindT.value,gust=WIND.uWindG.value,P=geometry.attributes.position
  for(let i=0;i<seeds.length;i++){const s=seeds[i]
   s.x+=(1.2+gust*5.5)*s.v*d;s.z+=(.45+gust*1.7)*s.v*d;s.y+=(Math.sin(t*2+s.p)*.5-.36+gust*.22)*d
   if(s.x>20)s.x-=40;if(s.z>18)s.z-=36;if(s.y<.03)s.y=2+Math.random()*3.5
   P.setXYZ(i,camera.position.x+s.x-((camera.position.x+s.x)%.0001),s.y,camera.position.z+s.z)}
  P.needsUpdate=true
 })
 return <points ref={ref} geometry={geometry} frustumCulled={false}><pointsMaterial color="#6d5332" size={.048} map={map} alphaTest={.4} transparent sizeAttenuation depthWrite={false}/></points>
}
// Bancs de brume qui glissent entre les troncs, en lisière de forêt.
function Mist({count}){
 const group=useRef()
 const map=useMemo(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d'),r=rng(5)
  for(let i=0;i<60;i++){const x=50+r()*156,y=42+r()*44,R=22+r()*30,gr=g.createRadialGradient(x,y,0,x,y,R);gr.addColorStop(0,'rgba(255,255,255,.035)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128)}
  return new THREE.CanvasTexture(c)},[])
 const items=useMemo(()=>{const r=rng(31),out=[];for(let i=0;i<count;i++){const side=r(),a=r();let x,z
   // Trois bancs hors de la clôture, chacun glissant le long de son côté : la brume ne traverse jamais le parvis.
   if(side<.34){x=(a*2-1)*44;z=-31-r()*16;out.push({x,z,axis:'x',min:-46,max:46})}else if(side<.67){x=-(20+r()*20);z=-34+a*50;out.push({x,z,axis:'z',min:-36,max:18})}else{x=20+r()*20;z=-34+a*50;out.push({x,z,axis:'z',min:-36,max:18})}
   Object.assign(out[out.length-1],{y:groundHeight(x,z)+.8+r()*.8,w:12+r()*12,h:3.6+r()*2.4,v:.14+r()*.22,o:.42+r()*.4})}return out},[count])
 useFrame((_,dt)=>{const g=group.current;if(!g)return;const d=Math.min(dt,.05),gust=WIND.uWindG.value;g.children.forEach((c,i)=>{const it=items[i];c.position[it.axis]+=it.v*(.5+gust*1.6)*d;if(c.position[it.axis]>it.max)c.position[it.axis]=it.min})})
 return <group ref={group}>{items.map((it,i)=><sprite key={i} position={[it.x,it.y,it.z]} scale={[it.w,it.h,1]}><spriteMaterial map={map} color="#6f8092" opacity={it.o} transparent depthWrite={false}/></sprite>)}</group>
}
export default function Forest({quality,floor}){
 const f=QUALITY_PRESETS[quality].forest
 const group=useRef(),shadowOff=useRef(false)
 const density=useMemo(()=>({cell:f.cell,meshRange:f.meshRange,nearRange:f.nearRange,backCell:f.backCell}),[f])
 const plan=useMemo(()=>buildPlan(density),[density])
 const under=useMemo(understory,[])
 const thin=f.thin
 const pick=l=>thin===1?l:l.filter((_,i)=>i%thin===0),pickProps=l=>f.thinProps>1?l.filter((_,i)=>i%f.thinProps===0):l
 useFrame(({clock})=>{
  if(group.current)group.current.visible=useGame.getState().outside
  // Une fois l'ombre de lune calculée, les arbres n'ont plus à être redessinés dans celle de la lampe torche.
  if(group.current&&runtime.moonBaked&&!shadowOff.current){shadowOff.current=true;group.current.traverse(o=>{if(o.isMesh)o.castShadow=false})}
  WIND.uWindT.value=clock.elapsedTime;WIND.uWindG.value=windGust(performance.now()/1000)
 })
 const shadow=QUALITY_PRESETS[quality].exteriorShadows
 return <group ref={group}>
  <Terrain material={floor} segments={f.terrain}/>
  {plan.firs.map((items,i)=><FirGroup key={i} id={'fir_'+'abc'[i]} items={items} shadow={shadow}/>)}
  <FarTrees items={plan.far}/>
  <Scatter id="grass_medium_02" items={pick(under.grass)} tint="#b8bca0" lightest={2} sway={.5}/>
  <Scatter id="fern_02" items={pick(under.fern)} lightest={2} sway={.22}/>
  <Scatter id="shrub_04" items={pick(under.shrub)} sway={.25}/>
  <Scatter id="rock_moss_set_01" items={pickProps(under.rock)} shadow={shadow}/>
  <Scatter id="tree_stump_01" items={pickProps(under.stump)} shadow={shadow}/>
  <Scatter id="dry_branches_medium_01" items={pick(under.branch)}/>
  <Scatter id="dead_tree_trunk_02" items={pickProps(under.log)} shadow={shadow}/>
  <FallenLeaves count={f.leaves}/>
  {f.blown>0&&<BlownLeaves count={f.blown}/>}
  <Mist count={f.mist}/>
 </group>
}

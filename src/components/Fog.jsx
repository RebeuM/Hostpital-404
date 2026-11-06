import React,{useEffect,useLayoutEffect,useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {ROOMS,SECRET,CORRIDOR} from '../game/layout'
import {QUALITY_PRESETS} from '../game/settings'

// Brouillard volumétrique bon marché : nappes de brume (quads instanciés, toujours tournés vers la caméra)
// qui dérivent lentement au ras du sol dans le couloir, les salles et le passage de service.
// Le matériau Lambert est détourné dans onBeforeCompile : les nappes sont éclairées par les lumières de la
// scène (torche, néons mourants, veilleuses), atténuées par le brouillard de distance et s'effacent quand
// le joueur les traverse (pas de plan opaque collé à la caméra). La texture (disque doux + bruit fractal)
// est générée sur canvas : aucun fichier, aucune dépendance réseau.


function makeFogTexture(size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')
 let seed=48271;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 const lerp=(a,b,t)=>a+(b-a)*t,fade=t=>t*t*(3-2*t)
 const octaves=[4,8,16,32].map((n,i)=>{const grid=new Float32Array(n*n);for(let k=0;k<grid.length;k++)grid[k]=rand();return {grid,n,w:1/2**(i+1)}})
 const sample=({grid,n},u,v)=>{
  const fx=u*n,fy=v*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fade(fx-ix),ty=fade(fy-iy)
  const at=(i,j)=>grid[(j%n)*n+(i%n)]
  return lerp(lerp(at(ix,iy),at(ix+1,iy),tx),lerp(at(ix,iy+1),at(ix+1,iy+1),tx),ty)
 }
 const img=g.createImageData(size,size),d=img.data
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,r=Math.hypot(u-.5,v-.5)*2
  let n=0;for(const o of octaves)n+=o.w*sample(o,u,v);n/=.9375
  const disc=Math.max(0,1-r*r),a=Math.pow(disc,1.7)*(.3+.7*n)
  const o=(y*size+x)*4;d[o]=d[o+1]=d[o+2]=255;d[o+3]=Math.round(255*Math.min(1,a))
 }
 g.putImageData(img,0,0)
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping
 return t
}

// Répartition déterministe des nappes : couloir (renforcé), passage de service (nappes plus étroites), salles.
function scatter(count){
 if(!count)return []
 let seed=90413;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 const zones=[
  {x:CORRIDOR.x,z:CORRIDOR.z,w:CORRIDOR.w-1.2,d:CORRIDOR.d-2,weight:CORRIDOR.w*CORRIDOR.d*1.3,scale:1},
  {x:SECRET.x,z:SECRET.z,w:SECRET.w-1.1,d:SECRET.d-2,weight:SECRET.w*SECRET.d,scale:.62},
  ...ROOMS.map(r=>({x:r.x,z:r.z,w:r.w-1.4,d:r.d-1.4,weight:r.w*r.d,scale:1}))
 ]
 const total=zones.reduce((s,z)=>s+z.weight,0)
 const puffs=[]
 for(const zone of zones){
  const n=Math.max(2,Math.round(count*zone.weight/total))
  for(let i=0;i<n;i++){
   const sx=(2.4+rand()*1.6)*zone.scale
   puffs.push({
    x:zone.x+(rand()-.5)*zone.w,z:zone.z+(rand()-.5)*zone.d,y:.25+rand()*.85,
    sx,sy:sx*(.42+rand()*.2),
    seed:[rand(),.12+rand()*.18,.1+rand()*.15,.16+rand()*.12]  // phase, vitesse de dérive, vitesse de balancement, opacité
   })
  }
 }
 return puffs
}

function patchShader(shader,uTime){
 shader.uniforms.uTime=uTime
 shader.vertexShader=shader.vertexShader
  .replace('#include <common>','#include <common>\nuniform float uTime;\nattribute vec4 aSeed;\nvarying float vFog;')
  // La normale regarde toujours la caméra : la nappe est éclairée comme une surface face au joueur.
  .replace('#include <defaultnormal_vertex>','vec3 transformedNormal = vec3(0.0, 0.0, 1.0);')
  .replace('#include <project_vertex>',`
   vec3 iPos = instanceMatrix[3].xyz;
   vec2 iScale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
   float t = uTime * aSeed.y + aSeed.x * 6.2831;
   vec3 drift = vec3(sin(t) * 0.42 + sin(t * 0.37 + 1.7) * 0.22, sin(t * 0.61 + 0.5) * 0.05, cos(t * 0.83 + 2.1) * 0.42);
   vec4 center = modelViewMatrix * vec4(iPos + drift, 1.0);
   float dist = length(center.xyz);
   float near = smoothstep(0.4, 2.4, dist);
   float breath = 0.72 + 0.28 * sin(uTime * aSeed.y * 1.35 + aSeed.x * 9.0);
   vFog = near * breath * aSeed.w;
   float ang = (aSeed.x - 0.5) * 0.5 + sin(uTime * aSeed.z + aSeed.x * 6.2831) * 0.14;
   float ca = cos(ang), sa = sin(ang);
   vec2 q = position.xy * iScale * smoothstep(0.0, 0.25, near);
   q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);
   vec4 mvPosition = vec4(center.xyz + vec3(q, 0.0), 1.0);
   gl_Position = projectionMatrix * mvPosition;`)
 shader.fragmentShader=shader.fragmentShader
  .replace('#include <common>','#include <common>\nvarying float vFog;')
  .replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a *= vFog;')
  // Éclairage enveloppant : la brume diffuse la lumière dans toutes les directions, pas seulement de face.
  .replace('#include <lights_lambert_pars_fragment>',THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
   'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
   'float dotNL = 0.6 + 0.4 * dot( geometryNormal, directLight.direction );'))
}

export default function GroundFog({quality='medium'}){
 const mesh=useRef()
 const puffs=useMemo(()=>scatter(QUALITY_PRESETS[quality]?.fogPuffs??280),[quality])
 const uTime=useMemo(()=>({value:0}),[])
 const texture=useMemo(()=>makeFogTexture(),[])
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(1,1)
  const seeds=new Float32Array(puffs.length*4);puffs.forEach((p,i)=>seeds.set(p.seed,i*4))
  g.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4))
  return g
 },[puffs])
 const material=useMemo(()=>{
  const m=new THREE.MeshLambertMaterial({map:texture,color:'#9fb0ad',emissive:'#0e1314',transparent:true,depthWrite:false,fog:true})
  m.onBeforeCompile=shader=>patchShader(shader,uTime)
  m.customProgramCacheKey=()=>'hospital404-ground-fog'
  return m
 },[texture,uTime])
 useLayoutEffect(()=>{
  const im=mesh.current;if(!im)return
  const m=new THREE.Matrix4()
  puffs.forEach((p,i)=>{m.makeScale(p.sx,p.sy,1);m.setPosition(p.x,p.y,p.z);im.setMatrixAt(i,m)})
  im.instanceMatrix.needsUpdate=true;im.count=puffs.length
 },[puffs])
 useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material])
 useEffect(()=>()=>texture.dispose(),[texture])
 useFrame(({clock})=>{uTime.value=clock.elapsedTime})
 // Qualité Minimale : pas de brume du tout (son remplissage transparent et éclairé coûtait la moitié de l'image).
 if(!puffs.length)return null
 return <instancedMesh ref={mesh} name="fog" args={[geometry,material,puffs.length]} frustumCulled={false} renderOrder={4}/>
}

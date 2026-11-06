import {useEffect,useRef} from 'react'
import * as THREE from 'three'
import {useFrame,useThree} from '@react-three/fiber'
import {useGame,isSimRunning} from '../game/store'

const GLOW=new THREE.Color('#ffb060')
const level={value:0}
// Éclaircit l'objet sans effacer sa texture (lueur proportionnelle à sa couleur) et ajoute un liseré sur ses contours.
function glowMaterial(source){
 const m=source.clone()
 if(m.isMeshStandardMaterial||m.isMeshPhongMaterial){
  m.onBeforeCompile=shader=>{
   shader.uniforms.uGlow=level;shader.uniforms.uGlowColor={value:GLOW}
   shader.fragmentShader='uniform float uGlow;uniform vec3 uGlowColor;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float glowRim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.4);
    totalEmissiveRadiance+=uGlowColor*uGlow*(diffuseColor.rgb*.85+.035+glowRim*.75);`)
  }
  m.customProgramCacheKey=()=>'glow'
 }else if(m.color)m.color.lerp(GLOW,.35)
 return m
}
const center=new THREE.Vector3()
// Maillages dont le centre tombe dans la boîte de la cible. La caméra (lampe, bras) n'est jamais concernée.
export function meshesInBox(scene,[x,y,z,hx,hy,hz]){
 const found=[]
 const visit=o=>{
  if(o.isCamera||o.isPoints)return
  if(o.isMesh&&o.geometry){
   if(!o.geometry.boundingBox)o.geometry.computeBoundingBox()
   o.geometry.boundingBox.getCenter(center).applyMatrix4(o.matrixWorld)
   if(Math.abs(center.x-x)<=hx&&Math.abs(center.y-y)<=hy&&Math.abs(center.z-z)<=hz)found.push(o)
  }
  for(const c of o.children)visit(c)
 }
 visit(scene)
 return found
}
const copies=new WeakMap()
const copyOf=m=>{if(!copies.has(m))copies.set(m,glowMaterial(m));return copies.get(m)}
// Copies lumineuses de tous les objets ciblables, à compiler au chargement : la première visée ne provoque plus d'à-coup.
export function glowPreviews(scene,boxes){
 const out=[]
 for(const box of boxes)for(const mesh of meshesInBox(scene,box)){const c=mesh.clone(false);c.visible=true;c.material=Array.isArray(mesh.material)?mesh.material.map(copyOf):copyOf(mesh.material);out.push(c)}
 return out
}
// Met en surbrillance l'objet visé : ses matériaux sont remplacés par une copie lumineuse le temps de la visée.
export default function Highlighter(){
 const scene=useThree(s=>s.scene)
 const current=useRef(null),applied=useRef([]),time=useRef(0)
 const restore=()=>{
  // Un matériau changé entre-temps (voyant de porte) ne doit pas être écrasé par l'ancien.
  for(const {mesh,original,glow} of applied.current)if(mesh.material===glow)mesh.material=original
  applied.current=[]
 }
 useEffect(()=>restore,[])
 useFrame((_,dt)=>{
  const s=useGame.getState(),target=isSimRunning(s)&&(!s.modal||s.dialogWalk)?s.near:null,id=target?.id??null
  if(id!==current.current){
   restore();current.current=id
   if(target?.hit)for(const mesh of meshesInBox(scene,target.hit)){
    const original=mesh.material
    const glow=Array.isArray(original)?original.map(copyOf):copyOf(original)
    mesh.material=glow;applied.current.push({mesh,original,glow})
   }
  }
  if(!id)return
  time.current+=dt
  level.value=.5+.14*Math.sin(time.current*3.6)
 })
 return null
}

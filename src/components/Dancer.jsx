import React,{useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import {SkeletonUtils} from 'three-stdlib'
import {modelUrl,DRACO_PATH} from './assets'
import {ModelBoundary} from './Model'
import {useGame,runtime} from '../game/store'
import {DANCER} from '../game/layout'

// Easter egg du parvis : « Emmanuel M. » (jamray747, CC BY 4.0) danse, à moitié caché derrière la voiture bâchée.
// Le modèle n'a pas d'animation (pose en T) : la danse est calculée ici, os par os, à 116 battements par minute.
// Les rotations sont données dans le repère du personnage (x : sa gauche, y : le haut, z : devant lui),
// ce qui rend le calcul indépendant des axes propres à chaque os.
const BPM=116,BONES=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot']
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1)
const smooth=t=>t*t*(3-2*t)
// Mélange doux entre deux figures : k vaut 0 puis passe à 1 sur la dernière mesure de chaque bloc de 8 temps.
const blend=(beat,len=8,fade=2)=>{const p=beat%len;return p<len-fade?0:smooth((p-(len-fade))/fade)}

// Trois figures, enchaînées toutes les deux mesures.
// 0 : pointé disco (un bras vers le ciel, l'autre vers le sol, alternés tous les deux temps).
// 1 : « raise the roof » (avant-bras dressés, paumes qui poussent le plafond sur chaque temps).
// 2 : bras de « running man » (avant-bras devant lui, qui pompent en alternance).
const flip=ph=>.5+.5*Math.max(-1,Math.min(1,Math.sin(ph*.5)*2.4))
function armPose(f,ph){
 if(f===0){const a=flip(ph),up={down:-.95,fwd:-.35,bend:0,lift:.1},low={down:1.15,fwd:-.45,bend:.25,lift:0}
  return {l:mixPose(low,up,a),r:mixPose(up,low,a)}}
 if(f===1){const push=Math.abs(Math.sin(ph))
  const p={down:.42-.32*push,fwd:-.25,bend:.15,lift:1.55}
  return {l:p,r:p}}
 const pump=.5+.5*Math.sin(ph)
 return {l:{down:1.3,fwd:-.15-.6*pump,bend:1.45,lift:0},r:{down:1.3,fwd:-.15-.6*(1-pump),bend:1.45,lift:0}}
}
const mixPose=(a,c,k)=>({down:a.down+(c.down-a.down)*k,fwd:a.fwd+(c.fwd-a.fwd)*k,bend:a.bend+(c.bend-a.bend)*k,lift:a.lift+(c.lift-a.lift)*k})

function Dance({position,ry}){
 const {scene}=useGLTF(modelUrl('emmanuel'),DRACO_PATH)
 const clone=useMemo(()=>{
  const c=SkeletonUtils.clone(scene)
  c.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false
   for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.envMapIntensity=.4}})
  return c
 },[scene])
 const rig=useMemo(()=>{
  const b={};clone.traverse(o=>{if(!o.isBone)return;const base=o.name.replace(/_\d+$/,'');if(BONES.includes(base)&&!b[base])b[base]=o})
  const rest=new Map(Object.values(b).map(o=>[o,o.quaternion.clone()]))
  return {b,rest,ok:BONES.every(n=>b[n])}
 },[clone])
 const group=useRef(),body=useRef()
 const tmp=useMemo(()=>({p:new THREE.Quaternion(),pi:new THREE.Quaternion(),d:new THREE.Quaternion(),r:new THREE.Quaternion(),ri:new THREE.Quaternion(),w:new THREE.Vector3()}),[])
 // Tourne un os de « angle » autour d'un axe du repère du personnage, après ses parents.
 const turn=(bone,axis,angle)=>{
  if(!bone||!angle)return
  bone.parent.updateWorldMatrix(true,false)
  bone.parent.getWorldQuaternion(tmp.p);tmp.pi.copy(tmp.p).invert()
  body.current.getWorldQuaternion(tmp.r);tmp.w.copy(axis).applyQuaternion(tmp.r)
  tmp.d.setFromAxisAngle(tmp.w,angle)
  bone.quaternion.premultiply(tmp.d.premultiply(tmp.pi).multiply(tmp.p))
 }
 const time=useRef(0)
 useFrame((_,dt)=>{
  const g=group.current;if(!g||!rig.ok)return
  const s=useGame.getState()
  // Rien à calculer quand le parvis n'est pas affiché ou que le joueur est loin.
  if(!(s.outside||s.chase))return
  const p=runtime.player;if(p&&Math.hypot(p.x-position[0],p.z-position[2])>40)return
  if(!(s.phase==='playing'&&(s.paused||s.settingsVisible)))time.current+=Math.min(dt,.1)
  // userData.beat fige la danse sur un temps donné (captures des scripts de vérification).
  const beat=g.userData.beat??time.current*BPM/60,ph=beat*Math.PI,{b,rest}=rig
  for(const [o,q] of rest)o.quaternion.copy(q)
  const bounce=Math.abs(Math.sin(ph))            // un rebond par temps
  const sway=Math.sin(ph*.5)                      // poids d'un pied sur l'autre, sur deux temps
  const fig=Math.floor(beat/8)%3,next=(fig+1)%3,k=blend(beat)
  // Bras d'abord, torse ensuite : les rotations du torse emportent les bras avec elles.
  // Coudes pliés dans la pose en T (bend : avant-bras vers l'avant, lift : vers le haut), puis bras abaissé (down,
  // 0 = horizontal, 1,4 = le long du corps, négatif = levé) et avancé (fwd, négatif = devant lui).
  const A=armPose(fig,ph),B=armPose(next,ph)
  const L=mixPose(A.l,B.l,k),R=mixPose(A.r,B.r,k)
  turn(b.LeftForeArm,Y,-L.bend);turn(b.LeftForeArm,Z,L.lift);turn(b.RightForeArm,Y,R.bend);turn(b.RightForeArm,Z,-R.lift)
  turn(b.LeftArm,Z,-L.down);turn(b.LeftArm,X,L.fwd);turn(b.RightArm,Z,R.down);turn(b.RightArm,X,R.fwd)
  // Torse : rotation des épaules à contretemps, inclinaison sur le pied d'appui, hochement de tête sur le temps.
  turn(b.Hips,Z,.05*sway);turn(b.Spine,Z,-.08*sway);turn(b.Spine1,Y,.22*Math.sin(ph*.5+.5));turn(b.Spine2,X,.07*bounce)
  turn(b.Head,X,.18*bounce-.06);turn(b.Head,Z,.1*Math.sin(ph*.5+1))
  // Jambes : genoux qui plient sur le temps, plus sur la jambe d'appui ; le corps descend d'autant, pieds au sol.
  const knee=.1+.22*bounce
  body.current.position.y=-.9*(1-Math.cos(knee))
  for(const [up,leg,foot,side] of [[b.LeftUpLeg,b.LeftLeg,b.LeftFoot,1],[b.RightUpLeg,b.RightLeg,b.RightFoot,-1]]){
   const load=1+.4*side*sway
   turn(up,X,-knee*load);turn(leg,X,2*knee*load);turn(foot,X,-knee*load)
  }
 })
 if(!rig.ok)return null
 return <group ref={group} position={position} rotation={[0,ry,0]} name="dancer"><group ref={body}><primitive object={clone}/></group></group>
}
export default function Dancer(){
 return <ModelBoundary id="emmanuel" part="dancer"><Dance position={[DANCER.x,0,DANCER.z]} ry={DANCER.ry}/></ModelBoundary>
}

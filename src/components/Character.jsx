import React,{useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useGLTF,useAnimations} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import {SkeletonUtils} from 'three-stdlib'
import {modelUrl,DRACO_PATH} from './assets'
import {useGame,runtime} from '../game/store'
import {MODEL_BOUNDS} from '../game/modelBounds'
import {flatMaterials} from './materials'

// Personnages humains (Innerscene, CC0, base MakeHuman) : squelette partagé, clips nommés
// Idle_Standing · Walk_Relaxed · Walk_Brisk · Jog · Run · Walk_Carry · Sit_Stand. Le modèle regarde vers +z à rotation nulle.
// face  : le corps pivote vers le joueur (pendant un dialogue, façon « je te parle »).
// watch : la tête suit le joueur quand il est devant et à moins de 7 m (l'homme de l'accueil « observe »).
// silhouette : une forme sans détail, debout dans le noir.
// moving : le personnage se déplace ; il regarde où il va, quels que soient face et watch.
// Une forme grise sans détail, à peine plus claire que le noir du couloir, que le brouillard efface au loin.
const SILHOUETTE=new THREE.MeshBasicMaterial({color:'#2e2a28'})
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a))
// Résout un nom de clip : exact, sinon insensible à la casse, sinon sous-chaîne (ex. 'Run' → 'verity.mdl/@Run').
function resolveClip(actions,clip){
 if(actions[clip])return clip
 const names=Object.keys(actions);const lc=String(clip).toLowerCase()
 return names.find(n=>n.toLowerCase()===lc)||names.find(n=>n.toLowerCase().includes(lc))||names[0]
}
function Skinned({id,clip='Idle_Standing',timeScale=1,position=[0,0,0],rotation=[0,0,0],scale=1,tint,offset=0,name,fade=.25,face=false,watch=false,moving=false,silhouette=false}){
 const {scene,animations}=useGLTF(modelUrl(id),DRACO_PATH)
 const clone=useMemo(()=>{
  const c=SkeletonUtils.clone(scene)
  c.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=!silhouette;o.receiveShadow=!silhouette;o.frustumCulled=false
   if(silhouette){o.material=SILHOUETTE;return}
   const mats=Array.isArray(o.material)?o.material:[o.material]
   for(const m of mats){if(!m)continue;m.envMapIntensity=.4;if(tint&&/top|bottom|suit|shirt|pants|jacket|coat|cloth/i.test(m.name)){o.material=m.clone();o.material.color.multiplyScalar(tint)}}}})
  return c
 },[scene,tint,silhouette])
 const {actions,mixer}=useAnimations(animations,clone)
 useEffect(()=>{
  const key=resolveClip(actions,clip);const a=key?actions[key]:null;if(!a)return
  a.reset();a.time=offset;a.timeScale=timeScale;a.fadeIn(fade).play()
  return()=>{a.fadeOut(fade)}
 },[clip,actions,timeScale,offset,fade])
 // Orientation gérée hors de React (lissée) : la cible est le joueur (face) ou la rotation demandée.
 const group=useRef();const head=useRef(null);const headYaw=useRef(0)
 const tmp=useMemo(()=>({v:new THREE.Vector3(),q:new THREE.Quaternion(),base:new THREE.Quaternion(),last:new THREE.Quaternion(),up:new THREE.Vector3(),init:false}),[])
 useEffect(()=>{head.current=clone.getObjectByName('head')||null},[clone])
 useFrame((_,dt)=>{
  // Les animations ne sont gelées qu'en pause (menu de pause, réglages) : pendant un dialogue les personnages
  // continuent de respirer, et un personnage qui apparaît pendant un dialogue termine son fondu d'entrée.
  const s=useGame.getState();mixer.timeScale=s.phase==='playing'&&(s.paused||s.settingsVisible)?0:1
  const g=group.current;if(!g)return
  if(!tmp.init){g.rotation.set(rotation[0],rotation[1],rotation[2]);tmp.init=true}
  const p=runtime.player;g.getWorldPosition(tmp.v)
  const dx=p.x-tmp.v.x,dz=p.z-tmp.v.z,dist=Math.hypot(dx,dz),toPlayer=Math.atan2(dx,dz)
  // Face au joueur pendant un dialogue ; un personnage observé se retourne aussi quand Thomas vient tout près.
  const close=watch&&dist<3.0&&s.phase==='playing'
  const targetYaw=!moving&&(face||close)?toPlayer:rotation[1]
  g.rotation.y+=wrap(targetYaw-g.rotation.y)*Math.min(1,dt*(moving?7:face?3.5:2.5))
  const h=head.current
  if(h&&(watch||face)){
   // Décalage de la tête autour de la verticale, limité à ±60°, seulement si le joueur est devant et proche.
   let rel=wrap(toPlayer-g.rotation.y);const inFront=!moving&&Math.abs(rel)<1.9&&dist<7&&s.phase==='playing'
   const want=inFront?Math.max(-1.05,Math.min(1.05,rel))*.8:0
   headYaw.current+=(want-headYaw.current)*Math.min(1,dt*5)
   // Appliqué après le mélangeur : si l'os n'a pas été réécrit par l'animation, on repart de la pose de base.
   if(h.quaternion.equals(tmp.last))h.quaternion.copy(tmp.base)
   tmp.base.copy(h.quaternion)
   h.getWorldQuaternion(tmp.q).invert();tmp.up.set(0,1,0).applyQuaternion(tmp.q).normalize()
   h.rotateOnAxis(tmp.up,headYaw.current);tmp.last.copy(h.quaternion)
  }
 })
 return <group ref={group} position={position} name={name}><primitive object={clone} scale={scale}/></group>
}
function Fallback({id,position,rotation}){
 const b=MODEL_BOUNDS[id];const m=flatMaterials()
 const s=b?b.size:[.5,1.8,.5],c=b?[(b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2]:[0,.9,0]
 return <group position={position} rotation={rotation}><mesh position={c} material={m.coat} castShadow><boxGeometry args={s}/></mesh></group>
}
class Boundary extends React.Component{
 constructor(p){super(p);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(err){console.error(`[assets] Personnage illisible : ${this.props.id}`,err);useGame.getState().reportAssetError(this.props.id)}
 render(){return this.state.failed?<Fallback {...this.props}/>:this.props.children}
}
export default function Person(props){return <Boundary {...props}><Skinned {...props}/></Boundary>}
// Figure statique (allongée) : simple modèle, même garde-fou.
export {Fallback as PersonFallback}

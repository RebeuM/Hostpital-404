import React,{useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import {SkeletonUtils} from 'three-stdlib'
import {modelUrl,DRACO_PATH} from './assets'
import {ModelBoundary} from './Model'
import {runtime} from '../game/store'
import {CAT} from '../game/layout'

// Le chat « OIIA » (xman, Sketchfab, CC BY 4.0) : immobile sur sa table basse, il tourne sur lui-même
// tant qu'il chante (E pour lui parler). À la fin de la chanson, il termine son tour avant de s'arrêter.
function SingingCat(){
 const {scene,animations}=useGLTF(modelUrl('meme_cat'),DRACO_PATH)
 const clone=useMemo(()=>{const c=SkeletonUtils.clone(scene);c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return c},[scene])
 const mixer=useMemo(()=>new THREE.AnimationMixer(clone),[clone])
 const action=useMemo(()=>animations[0]?mixer.clipAction(animations[0]):null,[mixer,animations])
 const spinning=useRef(false)
 useEffect(()=>{if(!action)return;action.play();action.paused=true;action.time=0;mixer.update(0);return()=>mixer.stopAllAction()},[action,mixer])
 useFrame((_,dt)=>{
  if(!action)return
  const singing=performance.now()<runtime.catSongUntil
  if(singing&&!spinning.current){spinning.current=true;action.paused=false}
  if(!spinning.current)return
  const before=action.time
  mixer.update(Math.min(dt,.1))
  // Chanson finie : on s'arrête quand le tour en cours revient au début (le temps de l'action repart à zéro).
  if(!singing&&action.time<before){spinning.current=false;action.paused=true;action.time=0;mixer.update(0)}
 })
 return <primitive object={clone} position={[CAT.x,CAT.y,CAT.z]} rotation={[0,CAT.ry,0]} name="oiia-cat"/>
}
export default function Cat(){
 return <ModelBoundary id="meme_cat" position={[CAT.x,CAT.y,CAT.z]} rotation={[0,CAT.ry,0]}><SingingCat/></ModelBoundary>
}

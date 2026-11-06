import React,{useMemo,useEffect} from 'react'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import {SkeletonUtils} from 'three-stdlib'
import {modelUrl,DRACO_PATH,ALL_MODEL_URLS} from './assets'
import {MODEL_BOUNDS} from '../game/modelBounds'
import {useGame} from '../game/store'
import {flatMaterials} from './materials'

// Précharge tous les GLB (décodeur Draco local, pas de CDN).
export function preloadModels(){for(const url of ALL_MODEL_URLS)useGLTF.preload(url,DRACO_PATH)}

const prepared=new WeakSet()
function prepareScene(scene){
 if(prepared.has(scene))return
 scene.traverse(o=>{
  if(o.isMesh){
   o.castShadow=true;o.receiveShadow=true
   const mats=Array.isArray(o.material)?o.material:[o.material]
   for(const m of mats){if(!m)continue
    // Verre « transmission » (vitre de l'horloge, hublot du groupe électrogène) : il suffit d'un seul à l'écran pour que
    // three.js redessine tout le décor opaque une seconde fois dans une texture. Une transparence simple rend pareil à cette taille.
    if(m.transmission>0){m.transmission=0;m.transparent=true;m.opacity=Math.min(m.opacity,.28);m.depthWrite=false;m.roughness=Math.min(m.roughness??.1,.15);m.needsUpdate=true}
    m.envMapIntensity=.6;if(m.emissiveMap||m.emissive?.getHex?.()>0){m.emissiveIntensity=Math.max(m.emissiveIntensity,1.4)}if(m.transparent&&m.opacity<.05)m.visible=false}
  }
 })
 prepared.add(scene)
}
function GltfModel({id,position=[0,0,0],rotation=[0,0,0],scale=1,castShadow=true,emissive,tint}){
 const {scene}=useGLTF(modelUrl(id),DRACO_PATH)
 const clone=useMemo(()=>{
  prepareScene(scene)
  const c=SkeletonUtils.clone(scene)
  c.traverse(o=>{if(o.isMesh){o.castShadow=castShadow;o.receiveShadow=true
   if(emissive!==undefined){const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.length===1?mats[0].clone():mats.map(m=>m.clone());
    const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.emissiveMap||m.emissive){m.emissiveIntensity=emissive;if(emissive===0)m.emissive=new THREE.Color('#000')}}}}})
  if(tint)c.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set(tint)}})
  return c
 },[scene,castShadow,emissive,tint])
 return <primitive object={clone} position={position} rotation={rotation} scale={scale}/>
}
// Remplacement procédural si un modèle manque : un volume simple aux dimensions attendues.
function FallbackBox({id,position,rotation,scale=1}){
 const b=MODEL_BOUNDS[id];const m=flatMaterials()
 if(!b)return null
 const s=b.size.map(v=>v*scale),c=[(b.min[0]+b.max[0])/2*scale,(b.min[1]+b.max[1])/2*scale,(b.min[2]+b.max[2])/2*scale]
 return <group position={position} rotation={rotation}><mesh position={c} material={m.paint} castShadow receiveShadow><boxGeometry args={s}/></mesh></group>
}
export class ModelBoundary extends React.Component{
 constructor(p){super(p);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(err){
  console.error(`[assets] Modèle introuvable ou illisible : ${this.props.id}`,err)
  useGame.getState().reportAssetError(this.props.id)
 }
 render(){
  // Une partie manquante ne s'affiche pas : son volume de collision reste assuré par le plan.
  if(this.state.failed)return this.props.part?null:<FallbackBox {...this.props}/>
  return this.props.children
 }
}
// Un seul nœud nommé d'un GLB (bâti ou battant de porte) : son placement est laissé au groupe parent.
function GltfPart({id,part}){
 const {scene}=useGLTF(modelUrl(id),DRACO_PATH)
 const clone=useMemo(()=>{
  prepareScene(scene)
  const src=scene.getObjectByName(part)
  if(!src)throw new Error(`Partie « ${part} » absente de ${id}`)
  const c=src.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);return c
 },[scene,id,part])
 return <primitive object={clone}/>
}
export function ModelPart(props){
 return <ModelBoundary {...props}><GltfPart {...props}/></ModelBoundary>
}
// Modèle qui joue ses animations en boucle.
function GltfAnimated({id,position,rotation}){
 const {scene,animations}=useGLTF(modelUrl(id),DRACO_PATH)
 const clone=useMemo(()=>{prepareScene(scene);return SkeletonUtils.clone(scene)},[scene])
 const mixer=useMemo(()=>new THREE.AnimationMixer(clone),[clone])
 useEffect(()=>{animations.forEach(a=>mixer.clipAction(a).play());return()=>mixer.stopAllAction()},[mixer,animations])
 useFrame((_,dt)=>mixer.update(Math.min(dt,.1)))
 return <primitive object={clone} position={position} rotation={rotation}/>
}
export function AnimatedModel(props){
 return <ModelBoundary {...props}><GltfAnimated {...props}/></ModelBoundary>
}
export default function Model(props){
 return <ModelBoundary {...props}><GltfModel {...props}/></ModelBoundary>
}

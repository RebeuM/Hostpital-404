// Fusion automatique d'objets qui ne bougent jamais : un seul appel de dessin par matériau au lieu d'un par objet.
// Les objets ciblables restent à part : la surbrillance les retrouve et change leur matériau.
import {useLayoutEffect,useRef} from 'react'
import * as THREE from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {INTERACTIVES,GATES,gateBox} from '../game/layout'

const TARGETS=[...INTERACTIVES.map(i=>i.hit),...GATES.map(gateBox)]
const center=new THREE.Vector3()
const isTargetable=mesh=>{
 if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox()
 mesh.geometry.boundingBox.getCenter(center).applyMatrix4(mesh.matrixWorld)
 // Marge : mêmes boîtes que la surbrillance, légèrement élargies pour ne jamais fusionner un objet visable.
 return TARGETS.some(([x,y,z,hx,hy,hz])=>Math.abs(center.x-x)<=hx+.05&&Math.abs(center.y-y)<=hy+.05&&Math.abs(center.z-z)<=hz+.05)
}
const attrsOf=list=>Object.entries(list[0].geometry.attributes).map(([k,a])=>`${k}:${a.array?.constructor?.name}${a.normalized?'n':''}${a.isInterleavedBufferAttribute?'i':''}`).join(',')
export default function StaticBatch({children}){
 const ref=useRef()
 useLayoutEffect(()=>{
  const root=ref.current;if(!root)return
  root.updateWorldMatrix(true,true)
  const toLocal=new THREE.Matrix4().copy(root.matrixWorld).invert()
  const groups=new Map()
  root.traverse(o=>{
   if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.geometry?.attributes?.position)return
   if(isTargetable(o))return
   const attrs=Object.keys(o.geometry.attributes).filter(a=>['position','normal','uv'].includes(a)).sort().join()
   const key=[o.material.uuid,attrs,o.castShadow,o.receiveShadow,o.renderOrder,o.geometry.index?1:0].join('|')
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o)
  })
  const added=[]
  for(const list of groups.values()){
   if(list.length<2){if(import.meta.env.DEV){const r=window.__batchReport||(window.__batchReport={merged:0,failed:[],singles:0});r.singles++}continue}
   const geos=list.map(o=>{
    const g=new THREE.BufferGeometry()
    for(const a of ['position','normal','uv'])if(o.geometry.attributes[a])g.setAttribute(a,o.geometry.attributes[a].clone())
    if(o.geometry.index)g.setIndex(o.geometry.index.clone())
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal,o.matrixWorld));return g
   })
   const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose())
   if(import.meta.env.DEV){const r=window.__batchReport||(window.__batchReport={merged:0,failed:[],singles:0});if(merged)r.merged+=list.length;else r.failed.push(list[0].name+'×'+list.length+' '+attrsOf(list))}
   if(!merged)continue
   const m=new THREE.Mesh(merged,list[0].material)
   Object.assign(m,{castShadow:list[0].castShadow,receiveShadow:list[0].receiveShadow,renderOrder:list[0].renderOrder});root.add(m);added.push(m)
   // Les originaux, cachés, ne bougeront plus : three.js cesse de recalculer leur position à chaque image
   // (des milliers d'objets ; 1,1 ms par image avec un processeur bridé, mesuré par scripts de profil).
   list.forEach(o=>{o.visible=false;o.userData.batched=true;o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false})
   m.updateMatrix();m.matrixAutoUpdate=false
  }
  return()=>{added.forEach(m=>{root.remove(m);m.geometry.dispose()})}
 },[])
 return <group ref={ref}>{children}</group>
}

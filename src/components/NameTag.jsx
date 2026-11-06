// Nom flottant au-dessus d'un personnage : toujours face au joueur, s'efface avec la distance, caché par les murs.
import {useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {useFrame} from '@react-three/fiber'
import {useGame,runtime} from '../game/store'

const WIDTH=512,HEIGHT=128
function draw(canvas,name){
 const g=canvas.getContext('2d');g.clearRect(0,0,WIDTH,HEIGHT)
 const font=getComputedStyle(document.documentElement).getPropertyValue('--font-type').trim()||'monospace'
 g.font=`400 66px ${font}`;g.textAlign='center';g.textBaseline='middle'
 const w=Math.min(WIDTH-8,g.measureText(name).width+64)
 g.fillStyle='rgba(12,9,7,.82)';g.fillRect((WIDTH-w)/2,18,w,HEIGHT-36)
 g.strokeStyle='rgba(217,205,181,.55)';g.lineWidth=3;g.strokeRect((WIDTH-w)/2+1.5,19.5,w-3,HEIGHT-39)
 g.fillStyle='#e6dbc3';g.fillText(name,WIDTH/2,HEIGHT/2+3)
}
export default function NameTag({name,y=2.05,fadeFrom=10,fadeTo=16}){
 const sprite=useRef()
 const {canvas,texture}=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;draw(canvas,name)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return {canvas,texture}
 },[name])
 // La police du jeu peut arriver après le premier dessin.
 useEffect(()=>{let live=true;document.fonts?.ready.then(()=>{if(live){draw(canvas,name);texture.needsUpdate=true}});return()=>{live=false}},[canvas,name,texture])
 const pos=useMemo(()=>new THREE.Vector3(),[])
 useFrame(()=>{
  const sp=sprite.current;if(!sp)return
  const s=useGame.getState(),p=runtime.player;sp.getWorldPosition(pos)
  const d=Math.hypot(pos.x-p.x,pos.z-p.z)
  sp.material.opacity=s.modal==='prologue'||s.blackout?0:Math.max(0,Math.min(1,(fadeTo-d)/(fadeTo-fadeFrom)))
  sp.visible=sp.material.opacity>.01
 })
 return <sprite ref={sprite} position={[0,y,0]} scale={[.62,.155,1]} renderOrder={5}>
  <spriteMaterial map={texture} transparent depthWrite={false} fog={false} toneMapped={false}/>
 </sprite>
}

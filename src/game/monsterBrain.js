// Ce que le monstre perçoit et comment il réagit. Il voit (vue dégagée) et il entend (distance par le chemin, pas à vol d'oiseau).
// Pendant la fuite, il flaire le joueur et finit toujours par le retrouver, sauf s'il est caché.
import {hasLineOfSight} from './chaseNav.js'
export const CHASE_SENSES={sight:16,hearRun:15,hearWalk:4.5,speed:2.75,scentSpeed:2.2,scentAfter:4,searchSpeed:1.9}
export const ENCOUNTER_SENSES={sight:8,hearRun:9,hearWalk:2.5,speed:2.75,patrolSpeed:1.7,forgetAfter:5}
export function perceives(grid,m,p,{hiding=false,running=false,moving=false,doorBetween=false},senses,pathDist=Infinity){
 if(hiding)return false
 // La grille considère les portes ouvertes (il les enfonce) : une porte fermée coupe tout de même la vue.
 if(!doorBetween&&Math.hypot(p.x-m.x,p.z-m.z)<senses.sight&&hasLineOfSight(grid,m.x,m.z,p.x,p.z))return true
 return moving&&pathDist<(running?senses.hearRun:senses.hearWalk)
}
// Vitesse de traque : à fond tant qu'il perçoit le joueur, plus lente quand il suit seulement sa piste.
export const huntSpeed=(perceived,lostFor,c=CHASE_SENSES)=>perceived||lostFor<c.scentAfter?c.speed:c.scentSpeed
// Vu en train de se cacher, ou talonné de trop près (il entend la porte du casier) : se cacher ne sert à rien.
export const sawHiding=(grid,m,p,pathDist=Infinity,range=7)=>pathDist<range||(Math.hypot(p.x-m.x,p.z-m.z)<9&&hasLineOfSight(grid,m.x,m.z,p.x,p.z))
// Sens et vitesses selon la difficulté.
export function scaleSenses(base,d){
 const out={...base}
 for(const k of ['speed','scentSpeed','searchSpeed','patrolSpeed'])if(k in out)out[k]=base[k]*d.monster
 for(const k of ['hearRun','hearWalk'])if(k in out)out[k]=base[k]*d.hearing
 return out
}
// Accélération soudaine : il voit le joueur à quelques mètres et bondit, annoncée par un grognement.
export const LUNGE={factor:1.22,length:1.2,near:5,far:13,pause:7,spread:5}
export function stepLunge(l,dt,perceived,pathDist,random=Math.random){
 if(l.left>0){l.left-=dt;return LUNGE.factor}
 l.wait-=dt
 if(l.wait>0||!perceived||pathDist<LUNGE.near||pathDist>LUNGE.far)return 1
 l.left=LUNGE.length;l.wait=LUNGE.pause+random()*LUNGE.spread;l.count=(l.count||0)+1
 return LUNGE.factor
}
// Quand il a perdu le joueur, il s'arrête parfois pour écouter.
export const LISTEN={length:1.3,pause:6,spread:6}
// Une case libre, assez loin du point de départ par le chemin : pour fouiller autour, ou pour apparaître hors de vue.
export function pickCell(grid,dist,minCells,maxCells,random=Math.random,accept=()=>true){
 const out=[]
 for(let i=0;i<dist.length;i++)if(dist[i]>=minCells&&dist[i]<=maxCells)out.push(i)
 for(let t=0;t<30&&out.length;t++){
  const i=out[Math.floor(random()*out.length)]
  const x=grid.xMin+((i%grid.cols)+.5)*grid.cell,z=grid.zMin+(Math.floor(i/grid.cols)+.5)*grid.cell
  if(accept(x,z))return {x,z}
 }
 return null
}

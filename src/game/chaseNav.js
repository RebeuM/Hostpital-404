// Navigation du monstre : une grille des zones praticables, et un champ de distances calculé depuis le joueur.
// Le monstre descend ce champ : il suit le joueur partout, en contournant les murs, quel que soit le chemin pris.
export const NAV_BOUNDS={xMin:-15.5,xMax:17.5,zMin:-4.8,zMax:51,cell:.4}
export function buildNavGrid(isBlocked,bounds=NAV_BOUNDS){
 const {xMin,xMax,zMin,zMax,cell}=bounds,cols=Math.ceil((xMax-xMin)/cell),rows=Math.ceil((zMax-zMin)/cell)
 const blocked=new Uint8Array(cols*rows)
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)blocked[r*cols+c]=isBlocked(xMin+(c+.5)*cell,zMin+(r+.5)*cell)?1:0
 return {xMin,zMin,cell,cols,rows,blocked}
}
const colOf=(g,x)=>Math.floor((x-g.xMin)/g.cell),rowOf=(g,z)=>Math.floor((z-g.zMin)/g.cell)
const indexAt=(g,x,z)=>{const c=colOf(g,x),r=rowOf(g,z);return c<0||r<0||c>=g.cols||r>=g.rows?-1:r*g.cols+c}
const centerX=(g,i)=>g.xMin+((i%g.cols)+.5)*g.cell,centerZ=(g,i)=>g.zMin+(Math.floor(i/g.cols)+.5)*g.cell
// Case libre la plus proche : le joueur peut frôler un meuble et se trouver sur une case marquée occupée.
export function nearestFreeCell(g,x,z,maxRing=6){
 const c0=colOf(g,x),r0=rowOf(g,z);let best=-1,bestD=Infinity
 for(let ring=0;ring<=maxRing;ring++){
  for(let r=r0-ring;r<=r0+ring;r++)for(let c=c0-ring;c<=c0+ring;c++){
   if(Math.max(Math.abs(r-r0),Math.abs(c-c0))!==ring||c<0||r<0||c>=g.cols||r>=g.rows)continue
   const i=r*g.cols+c;if(g.blocked[i])continue
   const d=(centerX(g,i)-x)**2+(centerZ(g,i)-z)**2;if(d<bestD){bestD=d;best=i}
  }
  if(best>=0)return best
 }
 return -1
}
// Les 8 directions, diagonales comprises (coût 14 contre 10) : sans elles, tous les trajets sont en L et longent les murs.
const steps=g=>[[-1,10],[1,10],[-g.cols,10],[g.cols,10],[-g.cols-1,14],[-g.cols+1,14],[g.cols-1,14],[g.cols+1,14]]
// Peut-on passer de la case i à sa voisine i+offset ? Une diagonale ne coupe pas le coin d'un obstacle.
function canStep(g,i,offset){
 const n=g.cols*g.rows,j=i+offset;if(j<0||j>=n||g.blocked[j])return false
 const c=i%g.cols,dc=((offset%g.cols)+g.cols+Math.floor(g.cols/2))%g.cols-Math.floor(g.cols/2)
 if(c+dc<0||c+dc>=g.cols)return false
 if(dc!==0&&Math.abs(offset)!==1)return !g.blocked[i+dc]&&!g.blocked[i+offset-dc]
 return true
}
// Distances (en cases, diagonales à 1,4) depuis le joueur. Le coût ne prend que deux valeurs : une file par coût suffit,
// environ 12 000 cases, assez rapide pour être refait plusieurs fois par seconde.
export function computeDistances(g,x,z,out=null){
 const n=g.cols*g.rows,dist=out||new Float32Array(n);dist.fill(-1)
 const start=nearestFreeCell(g,x,z);if(start<0)return dist
 const moves=steps(g),buckets=Array.from({length:15},()=>[]);buckets[0].push(start)
 const cost=new Int32Array(n).fill(2e9);cost[start]=0
 let d=0,pending=1
 while(pending>0){
  const bucket=buckets[d%15]
  while(bucket.length){
   const i=bucket.pop();pending--
   if(cost[i]!==d||dist[i]>=0)continue
   dist[i]=d/10
   for(const [off,w] of moves){
    if(!canStep(g,i,off))continue
    const j=i+off,nd=d+w
    if(nd<cost[j]){cost[j]=nd;buckets[nd%15].push(j);pending++}
   }
  }
  d++
 }
 return dist
}
// Vue dégagée entre deux points. Les extrémités sont ignorées : un personnage peut frôler un obstacle sans être derrière lui.
export function hasLineOfSight(g,ax,az,bx,bz,skip=.4){
 // Sous 0,8 m, un mur ne peut pas les séparer : son épaisseur plus le gabarit des deux personnages dépasse cette distance.
 const len=Math.hypot(bx-ax,bz-az);if(len<=skip*2)return true
 const steps=Math.ceil(len/.12)
 for(let k=0;k<=steps;k++){
  const t=k/steps,along=t*len;if(along<skip||along>len-skip)continue
  const i=indexAt(g,ax+(bx-ax)*t,az+(bz-az)*t);if(i<0||g.blocked[i])return false
 }
 return true
}
// Prochain point à rejoindre : le joueur s'il est en vue, sinon le point le plus lointain du chemin encore en vue (trajet lissé).
export function nextWaypoint(g,dist,x,z,tx,tz,lookAhead=16){
 if(hasLineOfSight(g,x,z,tx,tz))return {x:tx,z:tz,reachable:true}
 let i=nearestFreeCell(g,x,z)
 if(i<0||dist[i]<0)return {x:tx,z:tz,reachable:false}
 const moves=steps(g)
 let best={x:centerX(g,i),z:centerZ(g,i),reachable:true},first=true
 for(let k=0;k<lookAhead&&dist[i]>0;k++){
  // À distance égale, la case la plus proche du joueur : il va vers lui, pas le long d'un mur.
  let next=-1,d=dist[i],closest=Infinity
  for(const [off] of moves){
   if(!canStep(g,i,off))continue
   const j=i+off;if(dist[j]<0||dist[j]>d+1e-4)continue
   const near=(centerX(g,j)-tx)**2+(centerZ(g,j)-tz)**2
   if(dist[j]<d-1e-4){d=dist[j];closest=near;next=j}
   else if(next>=0&&dist[j]<d+1e-4&&near<closest){closest=near;next=j}
  }
  if(next<0)break
  i=next
  const px=centerX(g,i),pz=centerZ(g,i)
  if(first||hasLineOfSight(g,x,z,px,pz,.2)){best={x:px,z:pz,reachable:true};first=false}
 }
 return best
}
export const pathLength=(g,dist,x,z)=>{const i=nearestFreeCell(g,x,z);return i<0||dist[i]<0?Infinity:dist[i]*g.cell}

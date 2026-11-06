// Lit et porte fournis par le propriétaire (raw/hospital_bed.glb, raw/hospital_door.glb ; licences dans docs/ASSETS.md).
// Lit : remis d'équerre (il est tourné de 17° dans le fichier), tête vers -z, sol à y=0, rehaussé (matelas à 41 cm d'origine).
// Porte : mise à l'échelle, recentrée sur son bâti et découpée en trois nœuds : door_frame, door_leaf_a (z<0) et door_leaf_b (z>0).
// Chaque battant a son origine sur sa charnière : il suffit de le tourner autour de y pour l'ouvrir.
// Usage : node scripts/bake-bed-door.mjs <dossier-de-travail>
//   Dépendances dans le dossier de travail : npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @gltf-transform/cli
import fs from 'fs'
import path from 'path'
import {execFileSync} from 'child_process'
const WORK=path.resolve(process.argv[2]||'.bake-work')
const mod=p=>import(path.join(WORK,'node_modules/@gltf-transform',p,'dist/index.js'))
const {NodeIO,getBounds}=await mod('core')
const {ALL_EXTENSIONS}=await mod('extensions')
const {prune,compactPrimitive,transformPrimitive}=await mod('functions')
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
const CLI=path.join(WORK,'node_modules/.bin/gltf-transform')
fs.mkdirSync(path.join(WORK,'norm'),{recursive:true})
const optimize=(name,extra)=>execFileSync(CLI,['optimize',path.join(WORK,'norm',name+'.glb'),path.join('public/assets/models',name+'.glb'),'--compress','draco','--texture-compress','webp','--texture-size','1024','--instance','false',...extra],{stdio:'ignore'})
const round=v=>+v.toFixed(3)

// ------------------------------------------------------------------- Lit
{
 const BED_YAW=-72.93*Math.PI/180,BED_SCALE_Y=1.3
 const doc=await io.read('raw/hospital_bed.glb'),scene=doc.getRoot().getDefaultScene()||doc.getRoot().listScenes()[0]
 const wrap=doc.createNode('hospital_bed')
 for(const n of scene.listChildren()){scene.removeChild(n);wrap.addChild(n)}
 scene.addChild(wrap)
 wrap.setScale([1,BED_SCALE_Y,1]);wrap.setRotation([0,Math.sin(BED_YAW/2),0,Math.cos(BED_YAW/2)])
 const b=getBounds(wrap);wrap.setTranslation([-(b.min[0]+b.max[0])/2,-b.min[1],-(b.min[2]+b.max[2])/2])
 await doc.transform(prune());await io.write(path.join(WORK,'norm/hospital_bed.glb'),doc)
 optimize('hospital_bed',['--simplify','false'])
 console.log('lit : ',b.max.map((v,i)=>round(v-b.min[i])).join(' x '),'m,',fs.statSync('public/assets/models/hospital_bed.glb').size>>10,'Ko')
}

// ----------------------------------------------------------------- Porte
{
 const DOOR_SCALE=1.1
 const doc=await io.read('raw/hospital_door.glb'),root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0]
 const buffer=root.listBuffers()[0]
 // Îlots de triangles connectés (les sommets de même position sont soudés).
 const islandsOf=(prim,W)=>{
  const a=prim.getAttribute('POSITION'),n=a.getCount(),v=[0,0,0],pos=new Float64Array(n*3)
  for(let i=0;i<n;i++){a.getElement(i,v);for(let c=0;c<3;c++)pos[i*3+c]=W[c]*v[0]+W[4+c]*v[1]+W[8+c]*v[2]+W[12+c]}
  const par=Int32Array.from({length:n},(_,i)=>i),find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x},uni=(x,y)=>{par[find(x)]=find(y)}
  const seen=new Map();for(let i=0;i<n;i++){const k=`${Math.round(pos[i*3]*1e4)},${Math.round(pos[i*3+1]*1e4)},${Math.round(pos[i*3+2]*1e4)}`;if(seen.has(k))uni(i,seen.get(k));else seen.set(k,i)}
  const idx=prim.getIndices().getArray();for(let t=0;t<idx.length;t+=3){uni(idx[t],idx[t+1]);uni(idx[t],idx[t+2])}
  const groups=new Map();for(let t=0;t<idx.length;t+=3){const r=find(idx[t]);if(!groups.has(r))groups.set(r,{tris:[],zMin:9e9,zMax:-9e9});const g=groups.get(r);g.tris.push(idx[t],idx[t+1],idx[t+2]);for(let c=0;c<3;c++){const z=pos[idx[t+c]*3+2];g.zMin=Math.min(g.zMin,z);g.zMax=Math.max(g.zMax,z)}}
  return [...groups.values()]
 }
 // Le bâti porte aussi ce qui reste fixe : bras de ferme-porte et butée centrale. Le reste suit le battant de son côté.
 const destination=(meshName,island)=>{
  if(meshName.startsWith('door_Frame'))return 'door_frame'
  const size=island.tris.length/3
  if(meshName.startsWith('Metal_parts')&&(size===148||size===540))return 'door_frame'
  return (island.zMin+island.zMax)/2<0?'door_leaf_a':'door_leaf_b'
 }
 const parts={door_frame:[],door_leaf_a:[],door_leaf_b:[]}
 const sources=root.listNodes().filter(n=>n.getMesh())
 let frameMin=9e9,frameMax=-9e9
 for(const node of sources){
  const W=node.getWorldMatrix()
  for(const prim of node.getMesh().listPrimitives()){
   const buckets={door_frame:[],door_leaf_a:[],door_leaf_b:[]}
   for(const isl of islandsOf(prim,W)){const d=destination(node.getName(),isl);buckets[d].push(...isl.tris);if(d==='door_frame'&&node.getName().startsWith('door_Frame')){frameMin=Math.min(frameMin,isl.zMin);frameMax=Math.max(frameMax,isl.zMax)}}
   for(const [k,tris] of Object.entries(buckets)){if(!tris.length)continue
    const p=prim.clone();p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(tris)).setBuffer(buffer));compactPrimitive(p);parts[k].push({prim:p,W})}
  }
 }
 // Le bâti est un peu plus large d'un côté : on centre la porte sur lui pour raccorder les deux murs.
 const zc=(frameMin+frameMax)/2,s=DOOR_SCALE,LEAF_EDGE=.984
 const hinge={door_frame:0,door_leaf_a:(-LEAF_EDGE-zc)*s,door_leaf_b:(LEAF_EDGE-zc)*s}
 for(const n of [...scene.listChildren()]){scene.removeChild(n);n.dispose()}
 for(const [name,list] of Object.entries(parts)){
  const mesh=doc.createMesh(name),node=doc.createNode(name).setMesh(mesh).setTranslation([0,0,hinge[name]])
  for(const {prim,W} of list){
   // Matrice colonne : monde d'origine, puis recentrage et échelle, puis origine sur la charnière.
   const m=W.slice();for(let c=0;c<4;c++){const o=c*4;m[o]*=s;m[o+1]*=s;m[o+2]*=s}
   m[14]=(W[14]-zc)*s-hinge[name];transformPrimitive(prim,m);mesh.addPrimitive(prim)
  }
  scene.addChild(node)
 }
 await doc.transform(prune());await io.write(path.join(WORK,'norm/hospital_door.glb'),doc)
 optimize('hospital_door',['--join','false','--flatten','false','--palette','false','--simplify','true','--simplify-error','0.0004'])
 // Mesures reprises dans le code : largeur et hauteur du bâti, ouverture du hublot par rapport à la charnière.
 const f=getBounds(scene.listChildren().find(n=>n.getName()==='door_frame'))
 console.log('porte :',round(f.max[2]-f.min[2]),'x',round(f.max[1]-f.min[1]),'m (bâti) ; profondeur',round(f.max[0]-f.min[0]),'; charnières',round(hinge.door_leaf_a),round(hinge.door_leaf_b),';',fs.statSync('public/assets/models/hospital_door.glb').size>>10,'Ko')
 for(const leaf of ['door_leaf_a','door_leaf_b']){
  const n=scene.listChildren().find(x=>x.getName()===leaf);let holes={yMin:9e9,yMax:-9e9,zMin:9e9,zMax:-9e9},tris=0
  for(const p of n.getMesh().listPrimitives()){if(p.getMaterial().getName()!=='doors')continue
   const a=p.getAttribute('POSITION'),idx=p.getIndices().getArray(),v=[[0,0,0],[0,0,0],[0,0,0]]
   for(let t=0;t<idx.length;t+=3){for(let c=0;c<3;c++)a.getElement(idx[t+c],v[c]);const xs=v.map(q=>q[0]),ys=v.map(q=>q[1]),zs=v.map(q=>q[2])
    // Faces de l'épaisseur du panneau situées à l'intérieur du battant : ce sont les parois du hublot.
    if(Math.max(...xs)-Math.min(...xs)<.03)continue
    const y=(Math.max(...ys)+Math.min(...ys))/2,z=Math.abs((Math.max(...zs)+Math.min(...zs))/2)
    if(y<1.1||y>2.3||z<.15||z>.95)continue
    holes.yMin=Math.min(holes.yMin,...ys);holes.yMax=Math.max(holes.yMax,...ys);holes.zMin=Math.min(holes.zMin,...zs);holes.zMax=Math.max(holes.zMax,...zs);tris++}}
  console.log(' ',leaf,'hublot : y',round(holes.yMin),'..',round(holes.yMax),' z',round(holes.zMin),'..',round(holes.zMax),'(',tris,'faces )')
 }
}

// Objets fournis par le propriétaire (dossier Objet3d/ et lampe chirurgicale à la racine ; auteurs et licences dans docs/ASSETS.md).
// Chaque modèle est remis dans le repère du jeu (mètres, sol à y=0, centré en x/z, face avant vers +z) puis compressé.
// Usage : node scripts/bake-objet3d.mjs <dossier-de-travail> [nom ...]
//   Dépendances dans le dossier de travail : npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @gltf-transform/cli
import fs from 'fs'
import path from 'path'
import {execFileSync} from 'child_process'
const WORK=path.resolve(process.argv[2]||'.bake-work'),ONLY=process.argv.slice(3)
const mod=p=>import(path.join(WORK,'node_modules/@gltf-transform',p,'dist/index.js'))
const {NodeIO,getBounds}=await mod('core')
const {ALL_EXTENSIONS}=await mod('extensions')
const {prune,compactPrimitive}=await mod('functions')
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
const CLI=path.join(WORK,'node_modules/.bin/gltf-transform')
const LAMP='Lampe_Chirurgicale_Hopital_Abandonne_LowPoly.glb',dir=f=>path.join('Objet3d',f+'.glb')
// rotX, yaw : degrés. keepNode : préfixe du nœud à garder. keepX : côté de x à garder (deux objets dans un même fichier).
// dropMaterial : matériau à retirer. anchor:'top' : origine en haut (objet suspendu). simplify : ratio de sommets. texture : taille maximale.
const MODELS=[
 {name:'surgical_lamp',file:LAMP,rotX:-90,anchor:'top',texture:256},
 {name:'bedside_cabinet',file:dir('bedside_table'),scale:.42,yaw:-90},
 {name:'oxygen_cart',file:dir('oxygen_cylinder'),simplify:.25},
 {name:'reception_desk',file:dir('outthere_reception_desk'),scale:.01},
 {name:'locker_black',file:dir('game_locker'),scale:.82,yaw:-90,simplify:.6},
 {name:'locker_blue_closed',file:dir('metal_school_lockers'),keepNode:'cabine low.010',scale:.95,yaw:-90},
 {name:'locker_blue_open',file:dir('metal_school_lockers'),keepNode:'cabine low.011',scale:.95,yaw:-90},
 {name:'locker_row',file:dir('school_locker'),dropMaterial:'Material.002',scale:.92,yaw:-90},
 {name:'safe_closed',file:dir('safe'),keepX:-1,scale:.099},
 {name:'safe_open',file:dir('safe'),keepX:1,scale:.099},
 {name:'landline_phone',file:dir('phone'),scale:.01,texture:512,simplify:.5},
 {name:'maxime_phone',file:dir('cell_phone'),texture:512,simplify:.3},
 {name:'smartphone_old',file:dir('smart_phone_school_project'),scale:.06,rotX:90},
 {name:'usb_backup',file:dir('Cle_USB_BACKUP_H404_FINAL'),scale:1.25,rotX:90,texture:512,simplify:.5},
 {name:'meme_cat',file:dir('oiiaioooooiai_cat'),texture:512,animated:true}
]
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]
const round=v=>+v.toFixed(3)
fs.mkdirSync(path.join(WORK,'norm'),{recursive:true})
const bounds=[]
for(const e of MODELS){
 if(ONLY.length&&!ONLY.includes(e.name))continue
 const doc=await io.read(e.file),root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0]
 for(const n of root.listNodes()){const m=n.getMesh();if(!m)continue
  if(e.dropMaterial&&m.listPrimitives().every(p=>p.getMaterial()?.getName()===e.dropMaterial))n.setMesh(null)
  else if(e.keepNode&&!n.getName().startsWith(e.keepNode))n.setMesh(null)
 }
 if(e.keepX)for(const n of root.listNodes()){const m=n.getMesh();if(!m)continue;const W=n.getWorldMatrix()
  for(const p of m.listPrimitives()){const a=p.getAttribute('POSITION'),ix=p.getIndices().getArray(),v=[0,0,0],keep=[],worldX=i=>{a.getElement(i,v);return W[0]*v[0]+W[4]*v[1]+W[8]*v[2]+W[12]}
   for(let t=0;t<ix.length;t+=3)if((worldX(ix[t])+worldX(ix[t+1])+worldX(ix[t+2]))*e.keepX>0)keep.push(ix[t],ix[t+1],ix[t+2])
   p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(root.listBuffers()[0]));compactPrimitive(p)}}
 const wrap=doc.createNode(e.name);for(const n of scene.listChildren()){scene.removeChild(n);wrap.addChild(n)};scene.addChild(wrap)
 const s=e.scale??1,y=(e.yaw??0)*Math.PI/360,x=(e.rotX??0)*Math.PI/360
 wrap.setScale([s,s,s]);wrap.setRotation(qmul([0,Math.sin(y),0,Math.cos(y)],[Math.sin(x),0,0,Math.cos(x)]))
 let b=getBounds(wrap);wrap.setTranslation([-(b.min[0]+b.max[0])/2,e.anchor==='top'?-b.max[1]:-b.min[1],-(b.min[2]+b.max[2])/2]);b=getBounds(wrap)
 await doc.transform(prune())
 const norm=path.join(WORK,'norm',e.name+'.glb'),out=path.join('public/assets/models',e.name+'.glb');await io.write(norm,doc)
 // Un objet animé garde ses nœuds : fusionner casserait l'animation.
 const keepNodes=e.animated?['--join','false','--flatten','false','--resample','false']:[]
 const simplify=e.simplify?['--simplify','true','--simplify-ratio',String(e.simplify),'--simplify-error','0.002']:['--simplify','false']
 execFileSync(CLI,['optimize',norm,out,'--compress','draco','--texture-compress','webp','--texture-size',String(e.texture||1024),'--instance','false',...keepNodes,...simplify],{stdio:'ignore'})
 bounds.push(` ${e.name}:{min:[${b.min.map(round)}],max:[${b.max.map(round)}],size:[${b.max.map((v,i)=>round(v-b.min[i]))}]},`)
 console.log(e.name.padEnd(22),String(fs.statSync(e.file).size>>10).padStart(6),'Ko ->',String(fs.statSync(out).size>>10).padStart(5),'Ko',b.max.map((v,i)=>round(v-b.min[i])).join(' x '))
}
console.log('--- à reporter dans src/game/modelBounds.js :\n'+bounds.join('\n'))

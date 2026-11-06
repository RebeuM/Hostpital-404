// Mobilier Sketchfab (CC BY 4.0, voir docs/ASSETS.md) : télécharge les GLB avec le jeton API du propriétaire (~/.sketchfab-token),
// normalise chaque modèle (sélection de nœuds, échelle en mètres, rotation Y, recentrage x/z, sol à y=0) puis le compresse.
// Usage : node scripts/sketchfab-props.mjs <dossier-de-travail> [nom ...]
//   Dépendances (hors projet, dans le dossier de travail) : npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @gltf-transform/cli
//  Sortie : public/assets/models/<name>.glb ; les boîtes englobantes sont à recopier dans src/game/modelBounds.js (getBounds sur le GLB final).
import fs from 'fs'
import path from 'path'
import os from 'os'
import {execFileSync} from 'child_process'
const WORK=path.resolve(process.argv[2]||'.sketchfab-work'),ONLY=process.argv.slice(3)
const CONFIG=JSON.parse(fs.readFileSync(new URL('./sketchfab-props.json',import.meta.url),'utf8'))
const mod=p=>import(path.join(WORK,'node_modules/@gltf-transform',p,'dist/index.js'))
const {NodeIO,getBounds}=await mod('core')
const {ALL_EXTENSIONS}=await mod('extensions')
const {prune}=await mod('functions')
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
const token=fs.readFileSync(path.join(os.homedir(),'.sketchfab-token'),'utf8').trim()
for(const d of ['dl','norm'])fs.mkdirSync(path.join(WORK,d),{recursive:true})
async function download(uid){
 const f=path.join(WORK,'dl',uid+'.glb');if(fs.existsSync(f))return f
 // L'API limite le débit : patienter puis réessayer en cas de 429.
 for(let attempt=0;attempt<6;attempt++){
  const r=await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`,{headers:{Authorization:'Token '+token}})
  if(r.ok){const j=await r.json();const g=await fetch(j.glb.url);fs.writeFileSync(f,Buffer.from(await g.arrayBuffer()));return f}
  await new Promise(res=>setTimeout(res,8000*(attempt+1)))
 }
 throw new Error('téléchargement impossible : '+uid)
}
for(const e of CONFIG){
 if(ONLY.length&&!ONLY.includes(e.name))continue
 const src=await download(e.src)
 const doc=await io.read(src),root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0]
 let tops=scene.listChildren()
 while(tops.length===1&&!tops[0].getMesh()&&tops[0].listChildren().length>0)tops=tops[0].listChildren()
 if(e.nodes){for(const n of tops)if(!e.nodes.some(p=>(n.getName()||'').startsWith(p)))n.dispose();tops=tops.filter(n=>!n.isDisposed())}
 if(e.index){tops.forEach((n,i)=>{if(!e.index.includes(i))n.dispose()});tops=tops.filter(n=>!n.isDisposed())}
 if(e.dropNodes){const drop=[];scene.traverse(n=>{if(e.dropNodes.some(p=>(n.getName()||'').startsWith(p)))drop.push(n)});drop.forEach(n=>n.dispose())}
 root.listAnimations().forEach(a=>a.dispose())
 if(e.opaque)root.listMaterials().forEach(m=>m.setAlphaMode('OPAQUE'))
 const wrap=doc.createNode('norm_'+e.name)
 for(const n of scene.listChildren()){scene.removeChild(n);wrap.addChild(n)}
 scene.addChild(wrap)
 const s=e.scale??1,yaw=(e.yaw??0)*Math.PI/180
 wrap.setScale([s,s,s]);wrap.setRotation([0,Math.sin(yaw/2),0,Math.cos(yaw/2)])
 let b=getBounds(wrap)
 wrap.setTranslation([-(b.min[0]+b.max[0])/2,(e.anchor==='top'?-b.max[1]:-b.min[1])+(e.yOffset??0),-(b.min[2]+b.max[2])/2])
 await doc.transform(prune())
 const norm=path.join(WORK,'norm',e.name+'.glb');await io.write(norm,doc)
 const out=path.join('public/assets/models',e.name+'.glb')
 const simplify=e.name==='xray_machine'?['--simplify','true','--simplify-ratio','0.25','--simplify-error','0.001']:['--simplify','false']
 execFileSync(path.join(WORK,'node_modules/.bin/gltf-transform'),['optimize',norm,out,'--compress','draco','--texture-compress','webp','--texture-size','1024','--instance','false',...simplify],{stdio:'ignore'})
 b=getBounds(wrap)
 console.log(`${e.name.padEnd(24)} ${(fs.statSync(out).size/1024).toFixed(0).padStart(5)} Ko  size=${b.max.map((v,i)=>(v-b.min[i]).toFixed(2)).join(' x ')}`)
}

// « Emmanuel M. » par jamray747 (Sketchfab, CC BY 4.0, crédité dans docs/ASSETS.md, LICENCES.md et public/credits.html).
// Modèle à squelette sans animation : la danse est animée dans le jeu (src/components/Dancer.jsx).
// Ici : pieds au sol à y = 0, centré, regard vers +z, puis compression Draco et textures WebP 512 px (vu de loin, derrière une voiture).
// Puis : node scripts/optimize-models.mjs <dossier-de-travail> (le modèle passe de 72 800 à 16 700 triangles).
// Usage : node scripts/bake-emmanuel.mjs <dossier-de-travail> [source.glb]
//   Dépendances dans le dossier de travail : npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @gltf-transform/cli draco3dgltf sharp
import fs from 'fs'
import path from 'path'
import {execFileSync} from 'child_process'
const WORK=path.resolve(process.argv[2]||'.bake-work'),SOURCE=process.argv[3]||'raw/emmanuel_m.glb'
const mod=p=>import(path.join(WORK,'node_modules/@gltf-transform',p,'dist/index.js'))
const {NodeIO,getBounds}=await mod('core')
const {ALL_EXTENSIONS}=await mod('extensions')
const {prune}=await mod('functions')
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc=await io.read(SOURCE),scene=doc.getRoot().getDefaultScene()||doc.getRoot().listScenes()[0]
const wrap=doc.createNode('emmanuel')
for(const n of scene.listChildren()){scene.removeChild(n);wrap.addChild(n)}
scene.addChild(wrap)
const b=getBounds(wrap),size=b.max.map((v,i)=>v-b.min[i])
wrap.setTranslation([-(b.min[0]+b.max[0])/2,-b.min[1],-(b.min[2]+b.max[2])/2])
await doc.transform(prune())
fs.mkdirSync(path.join(WORK,'norm'),{recursive:true})
const norm=path.join(WORK,'norm/emmanuel.glb');await io.write(norm,doc)
// Pas de simplification : elle abîmerait les poids du squelette.
execFileSync(path.join(WORK,'node_modules/.bin/gltf-transform'),['optimize',norm,'public/assets/models/emmanuel.glb','--compress','draco','--texture-compress','webp','--texture-size','512','--simplify','false'],{stdio:'inherit'})
console.log('emmanuel :',size.map(v=>+v.toFixed(3)).join(' x '),'m,',fs.statSync('public/assets/models/emmanuel.glb').size>>10,'Ko')

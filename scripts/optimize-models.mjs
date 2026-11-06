// Allège les modèles trop détaillés pour leur taille à l'écran (simplification meshoptimizer, erreur bornée) :
// un carton à 4 000 triangles ou un meuble à 26 000 coûtaient autant qu'une pièce entière sur une petite carte graphique.
// L'erreur est relative à la taille de chaque maillage (0,002 = 2 mm par mètre) : la silhouette et les UV ne bougent pas
// à l'œil. Les textures ne sont pas réencodées ; la géométrie est recompressée en Draco. 
// Usage : node scripts/optimize-models.mjs <dossier-de-travail> [entrée=public/assets/models] [sortie=même dossier]
//   Dépendances dans le dossier de travail : npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf meshoptimizer
import fs from 'fs'
import path from 'path'
const WORK=path.resolve(process.argv[2]||'.bake-work'),IN=process.argv[3]||'public/assets/models',OUT=process.argv[4]||IN
const mod=p=>import(path.join(WORK,'node_modules/@gltf-transform',p,'dist/index.js'))
const {NodeIO}=await mod('core')
const {ALL_EXTENSIONS}=await mod('extensions')
const {weld,simplify,prune,dedup}=await mod('functions')
const {MeshoptSimplifier}=await import(path.join(WORK,'node_modules/meshoptimizer/index.js'))
const draco3d=(await import(path.join(WORK,'node_modules/draco3dgltf/draco3dgltf.js'))).default
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()})
await MeshoptSimplifier.ready
// Seuil : en dessous, le modèle est laissé tel quel. Erreur plus fine pour ce qui se voit de près.
const MIN_TRIS=2500,DEFAULT_ERROR=.002
// Vérifié à l'œil, avant/après côte à côte : la torche (vue en gros plan) demande une erreur plus fine, sinon ses crans
// disparaissent ; les façades biseautées du meuble à tiroirs et les lattes du banc ondulent à toute erreur : 0 = non touché.
const ERROR={flashlight:.0005,drawer_cabinet:0,bench_wood:0,arm_right:.0015,hospital_door:0,hospital_bed:.002,squatter_homeless:.0015,maxime_teen:.0015,monster:.0015,emmanuel:.002,meme_cat:.002,
 // Le rideau d'arbres : déjà allégé par Poly Haven, les variantes lointaines supportent plus.
 fir_a:.006,fir_b:.006,fir_c:.006}
const tris=doc=>{let t=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const i=p.getIndices(),pos=p.getAttribute('POSITION');t+=(i?i.getCount():pos.getCount())/3}return Math.round(t)}
fs.mkdirSync(OUT,{recursive:true})
let before=0,after=0
for(const f of fs.readdirSync(IN).filter(f=>f.endsWith('.glb')).sort()){
 const id=f.replace(/\.glb$/,''),src=path.join(IN,f),doc=await io.read(src),t0=tris(doc),err=ERROR[id]??DEFAULT_ERROR
 before+=t0
 if(t0<MIN_TRIS||!err){after+=t0;if(OUT!==IN)fs.copyFileSync(src,path.join(OUT,f));continue}
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:0,error:err,lockBorder:false}),prune())
 const t1=tris(doc);after+=t1
 if(t1>t0*.92){after+=t0-t1;if(OUT!==IN)fs.copyFileSync(src,path.join(OUT,f));console.log(`${id.padEnd(28)} ${String(t0).padStart(6)} → gain trop faible, inchangé`);continue}
 await io.write(path.join(OUT,f),doc)
 console.log(`${id.padEnd(28)} ${String(t0).padStart(6)} → ${String(t1).padStart(6)} triangles (${Math.round(100*t1/t0)} %), ${fs.statSync(src).size>>10} → ${fs.statSync(path.join(OUT,f)).size>>10} Ko`)
}
console.log(`\nTotal : ${before} → ${after} triangles (${Math.round(100*after/before)} %)`)

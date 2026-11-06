// Prépare le bras tenant la lampe : pose les doigts du rig « fps arms » (OpenGameArt, CC0), garde le bras droit,
// fige la pose dans les sommets et exporte un GLB exprimé dans le repère de la lampe (mètres, optique vers -Z).
// Usage : serveur sur 5179, puis SRC=<dossier extrait> OUT=<fichier.glb> CHROMIUM=<chrome> node scripts/bake-arm.mjs
import {chromium} from 'playwright'
import fs from 'fs'
const {SRC,OUT}=process.env
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args:['--ignore-gpu-blocklist','--enable-gpu']})
const page=await browser.newPage()
page.on('pageerror',e=>console.log('[err]',e.message))
await page.route('**/__arm.fbx',r=>r.fulfill({body:fs.readFileSync(SRC+'/FPS ARMS RIG 1.fbx')}))
await page.route('**/__diff.png',r=>r.fulfill({body:fs.readFileSync(SRC+'/new_diff.png'),contentType:'image/png'}))
await page.goto('http://localhost:5179/')
const POSE=JSON.parse(fs.readFileSync(new URL('./arm-pose.json',import.meta.url)))
const out=await page.evaluate(async POSE=>{
 const T=await import('/node_modules/.vite/deps/three.js').catch(()=>import('/node_modules/three/build/three.module.js'))
 const {FBXLoader}=await import('/node_modules/three/examples/jsm/loaders/FBXLoader.js')
 const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
 const U=await import('/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js')
 const o=await new FBXLoader().loadAsync('/__arm.fbx');o.updateMatrixWorld(true)
 let mesh;const bones={};o.traverse(c=>{if(c.isSkinnedMesh)mesh=c;if(c.isBone)bones[c.name]=c})
 const P=n=>bones[n].getWorldPosition(new T.Vector3())
 // Repère de la main au repos : F vers les doigts, H du pouce vers l'auriculaire, N sort de la paume.
 const W=P('handR'),M=P('f_middle01R'),I=P('f_index01R'),Pk=P('f_pinky01R')
 const F=M.clone().sub(W).normalize(),Hd=Pk.clone().sub(I);const Th=Hd.clone().multiplyScalar(-1);Th.addScaledVector(F,-Th.dot(F)).normalize()
 const N=Th.clone().cross(F).normalize()
 const handLen=W.distanceTo(M)+P('f_middle01R').distanceTo(P('f_middle02R'))+P('f_middle02R').distanceTo(P('f_middle03R'))+P('f_middle03R').distanceTo(P('f_middle03R_end'))
 const scale=POSE.handLength/handLen
 // Doigts : chaque phalange tourne autour de l'axe pouce-auriculaire.
 const rot=(name,axis,deg)=>{const b=bones[name];const q=b.getWorldQuaternion(new T.Quaternion()).invert();b.rotateOnAxis(axis.clone().applyQuaternion(q).normalize(),T.MathUtils.degToRad(deg));b.updateMatrixWorld(true)}
 // Resserre les doigts : le rig les écarte au repos.
 for(const f of ['index','middle','ring','pinky']){rot('palm_'+f+'R',N,POSE.spread?.[f]||0)}
 for(const f of ['index','middle','ring','pinky']){const a=POSE.fingers[f];for(let i=0;i<3;i++)rot('f_'+f+'0'+(i+1)+'R',Th,a[i])}
 for(const [i,step] of POSE.thumb.entries()){const axis=new T.Vector3(...step.axis.map((v,k)=>0)).addScaledVector(F,step.axis[0]).addScaledVector(Th,step.axis[1]).addScaledVector(N,step.axis[2]).normalize();rot('thumb0'+(i+1)+'R',axis,step.deg)}
 o.updateMatrixWorld(true)
 // Sommets posés, en coordonnées monde du modèle.
 const g=mesh.geometry,pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,si=g.attributes.skinIndex,sw=g.attributes.skinWeight
 const sk=mesh.skeleton,mats=sk.bones.map((b,i)=>new T.Matrix4().multiplyMatrices(b.matrixWorld,sk.boneInverses[i]).multiply(mesh.bindMatrix))
 // Passage dans le repère de la lampe.
 const Fd=new T.Vector3(...POSE.frame.fingers).normalize(),Ng=new T.Vector3(...POSE.frame.palm);Ng.addScaledVector(Fd,-Ng.dot(Fd)).normalize();const Td=Fd.clone().cross(Ng).normalize()
 const from=new T.Matrix4().makeBasis(F,Th,N),to=new T.Matrix4().makeBasis(Fd,Td,Ng)
 const R=new T.Matrix4().multiplyMatrices(to,from.clone().transpose())
 const palmC=W.clone().lerp(M,POSE.palmAlong)
 const target=new T.Vector3(...POSE.grip)
 const place=new T.Matrix4().makeTranslation(target.x,target.y,target.z).multiply(new T.Matrix4().makeScale(scale,scale,scale)).multiply(R).multiply(new T.Matrix4().makeTranslation(-palmC.x,-palmC.y,-palmC.z))
 const nmat=new T.Matrix3().setFromMatrix4(R)
 const keep=(name)=>/R(_end)?$/.test(name)&&!/^clavicle|^deltoid/.test(name)
 const P3=[],N3=[],UV=[];const v=new T.Vector3(),a=new T.Vector3(),n=new T.Vector3(),b=new T.Vector3()
 const skin=i=>{a.set(0,0,0);b.set(0,0,0);v.fromBufferAttribute(pos,i);n.fromBufferAttribute(nor,i);let best=-1,bn=null
  for(let k=0;k<4;k++){const w=sw.getComponent(i,k);if(!w)continue;const id=si.getComponent(i,k);if(w>best){best=w;bn=sk.bones[id].name}
   a.addScaledVector(v.clone().applyMatrix4(mats[id]),w);b.addScaledVector(n.clone().transformDirection(mats[id]),w)}
  return {p:a.clone().applyMatrix4(place),n:b.clone().normalize().applyMatrix3(nmat).normalize(),bn}}
 const total=pos.count;let kept=0
 for(let i=0;i<total;i+=3){const t=[skin(i),skin(i+1),skin(i+2)];if(!t.every(x=>keep(x.bn)))continue;kept++
  for(let k=0;k<3;k++){P3.push(...t[k].p.toArray());N3.push(...t[k].n.toArray());UV.push(uv.getX(i+k),uv.getY(i+k))}}
 let geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(P3),3));geo.setAttribute('normal',new T.BufferAttribute(new Float32Array(N3),3));geo.setAttribute('uv',new T.BufferAttribute(new Float32Array(UV),2))
 geo=U.mergeVertices(geo,1e-5);geo.computeBoundingBox()
 const tex=await new T.TextureLoader().loadAsync('/__diff.png');tex.colorSpace=T.SRGBColorSpace
 const m=new T.Mesh(geo,new T.MeshStandardMaterial({name:'skin',map:tex,roughness:.7}));m.name='arm'
 const buf=await new GLTFExporter().parseAsync(m,{binary:true})
 let bin='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)bin+=String.fromCharCode.apply(null,u.subarray(i,i+32768))
 return {b64:btoa(bin),info:{tris:kept,scale,handLen,verts:geo.attributes.position.count,min:geo.boundingBox.min.toArray().map(x=>+x.toFixed(3)),max:geo.boundingBox.max.toArray().map(x=>+x.toFixed(3))}}
},POSE)
console.log(JSON.stringify(out.info))
fs.writeFileSync(OUT,Buffer.from(out.b64,'base64'))
await browser.close()

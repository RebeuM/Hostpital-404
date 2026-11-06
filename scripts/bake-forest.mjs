// Prépare les sapins de la forêt à partir du scan « fir_tree_01 » (Poly Haven, CC0) : 7,8 M de triangles inutilisables en jeu.
// Sortie : un GLB léger par variante (tronc et branches réels, aiguilles remplacées par des plaques placées sur les vraies
// branches) et un atlas d'images pour les arbres lointains.
// Usage : serveur sur 5179, puis SRC=<dossier du modèle> OUT=<dossier> CHROMIUM=<chrome> node scripts/bake-forest.mjs
import {chromium} from 'playwright'
import fs from 'fs'
import path from 'path'
import http from 'http'
const {SRC,OUT}=process.env
const gltf=JSON.parse(fs.readFileSync(path.join(SRC,'fir_tree_01.gltf')))
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args:['--ignore-gpu-blocklist','--enable-gpu','--js-flags=--max-old-space-size=8192']})
const page=await browser.newPage({viewport:{width:800,height:600}})
page.on('pageerror',e=>console.log('[err]',e.message));page.on('console',m=>{if(m.text().startsWith('[bake]'))console.log(m.text())})
// Serveur local : le fichier du scan (478 Mo) dépasse ce que Playwright peut transmettre par interception.
const files=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');fs.createReadStream(path.join(SRC,decodeURIComponent(req.url.split('?')[0]))).on('error',()=>{res.statusCode=404;res.end()}).pipe(res)}).listen(5188)
await page.goto('http://localhost:5179/')
const save=(name,dataUrl)=>fs.writeFileSync(path.join(OUT,name),Buffer.from(dataUrl.split(',')[1],'base64'))
await page.exposeFunction('__save',(name,dataUrl)=>save(name,dataUrl))
await page.evaluate(async gltf=>{
 const T=await import('/node_modules/.vite/deps/three.js').catch(()=>import('/node_modules/three/build/three.module.js'))
 const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
 const bin=await (await fetch('http://localhost:5188/'+gltf.buffers[0].uri)).arrayBuffer()
 const TYPED={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}
 const SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}
 const read=i=>{const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView];return new TYPED[a.componentType](bin,(v.byteOffset||0)+(a.byteOffset||0),a.count*SIZE[a.type])}
 const texOf=async(name,kind,srgb)=>{const t=await new T.TextureLoader().setCrossOrigin('anonymous').loadAsync(`http://localhost:5188/textures/${name}_${kind}_1k.jpg`);if(srgb)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t}
 // Les matériaux peuvent partager des images (branches mortes) : on suit les références du fichier.
 const texFrom=async(p,kind)=>{const m=gltf.materials[p.material],ref=kind==='base'?m.pbrMetallicRoughness.baseColorTexture:m.normalTexture,uri=gltf.images[gltf.textures[ref.index].source].uri;const t=await new T.TextureLoader().setCrossOrigin('anonymous').loadAsync('http://localhost:5188/'+uri);if(kind==='base')t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t}
 const c=document.createElement('canvas');c.width=c.height=1024
 const r=new T.WebGLRenderer({canvas:c,antialias:true,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true})
 r.setClearColor(0x2d3a26,0)   // Couleur de fond proche des aiguilles : évite le liseré noir une fois filtré.
 // Éclairage neutre et modéré : la lumière de la scène finale s'ajoute par-dessus, sans brûler les aiguilles.
 const light=s=>{s.add(new T.HemisphereLight(0xffffff,0x4a5048,1.3));const d=new T.DirectionalLight(0xffffff,.8);d.position.set(.4,1,.6);s.add(d)}
 const twigMat=new T.MeshStandardMaterial({map:await texOf('fir_tree_01_twig','diff',true),roughness:.85,side:T.DoubleSide})
 const nodes=gltf.nodes.filter(n=>n.mesh!==undefined)
 const prims=n=>gltf.meshes[n.mesh].primitives.map(p=>({p,name:gltf.materials[p.material].name}))
 const geoOf=p=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(read(p.attributes.POSITION),3));g.setAttribute('normal',new T.BufferAttribute(read(p.attributes.NORMAL),3));if(p.attributes.TEXCOORD_0!==undefined)g.setAttribute('uv',new T.BufferAttribute(read(p.attributes.TEXCOORD_0),2));if(p.indices!==undefined)g.setIndex(new T.BufferAttribute(read(p.indices),1));return g}
 // La translation du fichier range les variantes côte à côte : on la retire pour centrer chaque arbre.
 const matrixOf=n=>{const o=new T.Object3D();if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);o.updateMatrix();return o.matrix}
 const shot=async(name,draw,w,h)=>{r.setSize(w,h,false);draw();await window.__save(name,c.toDataURL('image/png'))}

 // Analyse des aiguilles : grille de voxels sur les triangles.
 const analyse=(g,M,cell)=>{
  const pos=g.attributes.position.array,idx=g.index.array,e=M.elements,map=new Map()
  for(let i=0;i<idx.length;i+=3*7){ // un triangle sur 7 suffit pour la statistique
   const a=idx[i]*3,x0=pos[a],y0=pos[a+1],z0=pos[a+2]
   const x=e[0]*x0+e[4]*y0+e[8]*z0+e[12],y=e[1]*x0+e[5]*y0+e[9]*z0+e[13],z=e[2]*x0+e[6]*y0+e[10]*z0+e[14]
   const k=Math.floor(x/cell)+','+Math.floor(y/cell)+','+Math.floor(z/cell)
   let v=map.get(k);if(!v){v={n:0,sx:0,sy:0,sz:0,xx:0,xy:0,xz:0,yy:0,yz:0,zz:0};map.set(k,v)}
   v.n++;v.sx+=x;v.sy+=y;v.sz+=z;v.xx+=x*x;v.xy+=x*y;v.xz+=x*z;v.yy+=y*y;v.yz+=y*z;v.zz+=z*z
  }
  return [...map.values()]
 }
 // Axes principaux d'un nuage (itération de puissance sur la covariance) : plan de la branche.
 const pca=v=>{
  const n=v.n,mx=v.sx/n,my=v.sy/n,mz=v.sz/n,C=[v.xx/n-mx*mx,v.xy/n-mx*my,v.xz/n-mx*mz,v.yy/n-my*my,v.yz/n-my*mz,v.zz/n-mz*mz]
  const mul=(x,y,z)=>new T.Vector3(C[0]*x+C[1]*y+C[2]*z,C[1]*x+C[3]*y+C[4]*z,C[2]*x+C[4]*y+C[5]*z)
  let a=new T.Vector3(mx,0.1,mz).normalize();for(let i=0;i<12;i++)a=mul(a.x,a.y,a.z).normalize()
  const la=mul(a.x,a.y,a.z).dot(a)
  let b=new T.Vector3(-a.z,.2,a.x);b.addScaledVector(a,-b.dot(a)).normalize()
  for(let i=0;i<12;i++){b=mul(b.x,b.y,b.z);b.addScaledVector(a,-b.dot(a)).normalize()}
  const lb=mul(b.x,b.y,b.z).dot(b)
  return {c:new T.Vector3(mx,my,mz),a,b,la:Math.max(la,1e-4),lb:Math.max(lb,1e-4)}
 }

 // 1) Plaques : quatre portions réelles de branches, vues de dessus, sur un atlas 2×2.
 const main=nodes[0],mainTwig=prims(main).find(x=>/twig/.test(x.name)),mainGeo=geoOf(mainTwig.p),mainM=matrixOf(main)
 const cells=analyse(mainGeo,mainM,1.3).filter(v=>v.n>200).map(v=>({v,...pca(v)})).sort((p,q)=>q.v.n-p.v.n)
 const picks=[];for(const q of cells){const mid=q.c.y>6&&q.c.y<14,flat=q.lb/q.la>.12;if(mid&&flat&&!picks.some(s=>s.c.distanceTo(q.c)<2.5))picks.push(q);if(picks.length===4)break}
 console.log('[bake] voxels',cells.length,'plaques',picks.length)
 const atlasRT=[]
 const scene=new T.Scene();light(scene);const mesh=new T.Mesh(mainGeo,twigMat);mesh.applyMatrix4(mainM);mesh.frustumCulled=false;scene.add(mesh)
 const SPAN=2.0
 const atlasCv=document.createElement('canvas');atlasCv.width=atlasCv.height=2048;const ac=atlasCv.getContext('2d')
 r.setSize(1024,1024,false)
 for(let i=0;i<picks.length;i++){const q=picks[i],n=q.a.clone().cross(q.b).normalize();if(n.y<0)n.negate()
  const cam=new T.OrthographicCamera(-SPAN/2,SPAN/2,SPAN/2,-SPAN/2,.01,1.0);cam.position.copy(q.c).addScaledVector(n,.5);cam.up.copy(q.a);cam.lookAt(q.c);cam.near=.02;cam.far=1.0;cam.updateProjectionMatrix()
  r.clear();r.render(scene,cam)
  // Masque arrondi : la plaque ne doit jamais montrer le bord carré de son image.
  const tile=document.createElement('canvas');tile.width=tile.height=1024;const tc=tile.getContext('2d');tc.drawImage(c,0,0)
  tc.globalCompositeOperation='destination-in';const gr=tc.createRadialGradient(512,512,300,512,512,505);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');tc.fillStyle=gr;tc.fillRect(0,0,1024,1024)
  ac.drawImage(tile,(i%2)*1024,(i>>1)*1024)}
 await window.__save('fir_cards.png',atlasCv.toDataURL('image/png'))
 const cardTex=new T.CanvasTexture(atlasCv);cardTex.colorSpace=T.SRGBColorSpace;cardTex.flipY=true
 mesh.visible=false
 const cardMat=new T.MeshStandardMaterial({name:'fir_cards',map:cardTex,vertexColors:true,alphaTest:.42,side:T.DoubleSide,roughness:1,metalness:0,transparent:false})

 // 2) Pour chaque variante : tronc et branches réels + plaques sur les vraies branches.
 const report={}
 const impostor=[]
 for(const [ni,n] of nodes.entries()){
  const M=matrixOf(n),list=prims(n),twig=list.find(x=>/twig/.test(x.name)),geoT=geoOf(twig.p)
  const root=new T.Group();root.name='fir_'+'abc'[ni]
  let solidTris=0
  for(const x of list){if(/twig/.test(x.name))continue
   const g=geoOf(x.p);g.applyMatrix4(M);solidTris+=g.index.count/3
   // Le tronc de la variante c n'a pas d'UV dans le fichier : projection cylindrique.
   if(!g.attributes.uv){const P=g.attributes.position,uv=new Float32Array(P.count*2);for(let i=0;i<P.count;i++){uv[i*2]=Math.atan2(P.getX(i),P.getZ(i))/(Math.PI*2)+.5;uv[i*2+1]=P.getY(i)/3}g.setAttribute('uv',new T.BufferAttribute(uv,2))}
   const m=new T.MeshStandardMaterial({name:x.name,map:await texFrom(x.p,'base'),normalMap:await texFrom(x.p,'normal'),roughness:.95,metalness:0})
   const me=new T.Mesh(g,m);me.name=x.name;root.add(me)}
  // Deux niveaux de plaques : standard pour la forêt, fin pour les arbres que le joueur peut approcher (GLB à part, sans le tronc).
  const buildCards=(cell,minN,maxA,maxB,minA,minB,denseN)=>{
   const cl=analyse(geoT,M,cell).filter(v=>v.n>minN).map(v=>({v,...pca(v)}))
   // Enveloppe de l'arbre par tranche de hauteur : sert à assombrir l'intérieur du feuillage, où la lumière n'arrive pas.
   const env={};for(const q of cl){const k=Math.round(q.c.y);env[k]=Math.max(env[k]||.5,Math.hypot(q.c.x,q.c.z))}
   const maxY=Math.max(...cl.map(q=>q.c.y))
   const P=[],Nn=[],U=[],I=[],Col=[];let k=0
   const quad=(c,a,b,sa,sb,sp,seed)=>{const u0=(sp%2)*.5,v0=.5-(sp>>1)*.5
    const up=new T.Vector3(c.x,Math.max(.4,Math.hypot(c.x,c.z)*.28),c.z).normalize()
    const rad=Math.hypot(c.x,c.z)/(env[Math.round(c.y)]||1),ao=(.22+.78*Math.min(1,Math.pow(rad,1.5)))*(.72+.28*c.y/maxY)*(.86+.28*seed)
    for(const [su,sv] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=c.clone().addScaledVector(a,su*sa).addScaledVector(b,sv*sb);P.push(p.x,p.y,p.z);Nn.push(up.x,up.y,up.z);U.push(u0+(sv+1)*.25,v0+(su+1)*.25);Col.push(ao,ao,ao)}
    I.push(k,k+1,k+2,k,k+2,k+3);k+=4}
   cl.forEach((q,i)=>{const sa=Math.min(maxA,Math.max(minA,Math.sqrt(q.la)*2)),sb=Math.min(maxB,Math.max(minB,Math.sqrt(q.lb)*2.2)),s=(i*.618)%1;quad(q.c,q.a,q.b,sa,sb,i%4,s)
    if(q.v.n>denseN){const n=q.a.clone().cross(q.b).normalize();quad(q.c,q.a,n,sa*.8,sb*.55,(i+1)%4,s)}})
   const gc=new T.BufferGeometry();gc.setAttribute('position',new T.Float32BufferAttribute(P,3));gc.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));gc.setAttribute('uv',new T.Float32BufferAttribute(U,2));gc.setAttribute('color',new T.Float32BufferAttribute(Col,3));gc.setIndex(I)
   const cm=new T.Mesh(gc,cardMat);cm.name='cards';return cm
  }
  const cm=buildCards(.72,14,.92,.82,.42,.36,170);root.add(cm)
  root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root)
  const hero=buildCards(.42,6,.6,.52,.28,.24,48)
  report[root.name]={solidTris,cardTris:cm.geometry.index.count/3,heroTris:hero.geometry.index.count/3,min:box.min.toArray().map(x=>+x.toFixed(2)),max:box.max.toArray().map(x=>+x.toFixed(2))}
  const saveGlb=async(obj,name)=>{const buf=await new GLTFExporter().parseAsync(obj,{binary:true,maxTextureSize:1024});let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));await window.__save(name,'data:;base64,'+btoa(s))}
  await saveGlb(root,root.name+'.glb')
  const heroRoot=new T.Group();heroRoot.name=root.name+'_near';heroRoot.add(hero);await saveGlb(heroRoot,root.name+'_near.glb')
  // 3) Images pour les arbres lointains : deux vues réelles de chaque variante (toutes les aiguilles).
  const sc=new T.Scene();light(sc);const tm=new T.Mesh(geoT,twigMat);tm.applyMatrix4(M);tm.frustumCulled=false;sc.add(tm)
  for(const ch of root.children)if(ch.name!=='cards')sc.add(ch.clone())
  const Hh=box.max.y+.2,R=Math.max(box.max.x,-box.min.x,box.max.z,-box.min.z)+.1
  impostor.push({sc,Hh,R})
 }
 // Atlas : 3 variantes × 2 vues.
 const TW=340,TH=1024,imp=document.createElement('canvas');imp.width=TW*6;imp.height=TH;const ic=imp.getContext('2d')
 r.setSize(TW,TH,false)
 for(const [i,t] of impostor.entries())for(const v of [0,1]){
  const halfW=t.Hh/TH*TW/2,cam=new T.OrthographicCamera(-halfW,halfW,t.Hh,0,.1,60);cam.position.set(v?30:0,0,v?0:30);cam.lookAt(0,0,0);cam.updateProjectionMatrix()
  r.clear();r.render(t.sc,cam);ic.drawImage(c,(i*2+v)*TW,0)}
 await window.__save('fir_impostor.png',imp.toDataURL('image/png'))
 console.log('[bake]',JSON.stringify(report))
 console.log('[bake] impostor',JSON.stringify(impostor.map(t=>({H:+t.Hh.toFixed(2),R:+t.R.toFixed(2)}))))
},gltf)
await browser.close();files.close()

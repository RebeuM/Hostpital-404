// Prépare le squatteur à partir de raw/homeless_man.glb (doublesob, CC BY 4.0), livré figé en T et sans squelette :
// baisse les bras dans la géométrie, ajoute un petit squelett et une animation de repos, met le modèle à l'échelle (mètres, pieds à y=0).
// Usage : serveur sur 5179, puis OUT=<fichier.glb> CHROMIUM=<chrome> node scripts/bake-squatter.mjs
import {chromium} from 'playwright'
import fs from 'fs'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args:['--ignore-gpu-blocklist','--enable-gpu']})
const page=await browser.newPage()
page.on('pageerror',e=>console.log('[err]',e.message));page.on('console',m=>{if(m.text().startsWith('[bake]'))console.log(m.text())})
await page.goto('http://localhost:5179/')
await page.route('**/__h.glb',r=>r.fulfill({body:fs.readFileSync('raw/homeless_man.glb')}))
const b64=await page.evaluate(async()=>{
 const T=await import('/node_modules/.vite/deps/three.js').catch(()=>import('/node_modules/three/build/three.module.js'))
 const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
 const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
 const g=await new GLTFLoader().loadAsync('/__h.glb');let src;g.scene.traverse(c=>{if(c.isMesh)src=c})
 const H=1.78
 const ss=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)}
 const geo=src.geometry.clone(),P=geo.attributes.position,N=geo.attributes.normal,n=P.count
 // Coordonnées normalisées du fichier : hauteur 0..1, le personnage regarde vers +z.
 const SHOULDER={x:.112,y:.797,z:.035},ELBOW=.30,DOWN=T.MathUtils.degToRad(80),BEND=T.MathUtils.degToRad(24)
 const armTag=new Int8Array(n),armW=new Float32Array(n)
 const v=new T.Vector3(),nv=new T.Vector3(),q=new T.Quaternion(),Z=new T.Vector3(0,0,1),Y=new T.Vector3(0,1,0)
 for(let i=0;i<n;i++){
  v.set(P.getX(i),P.getY(i)+.5,P.getZ(i));nv.set(N.getX(i),N.getY(i),N.getZ(i))
  const s=Math.sign(v.x)||1,ax=Math.abs(v.x)
  // Bras seulement au-dessus de l'aisselle : le bas de la veste reste sur le torse.
  const w=ss(.092,.172,ax)*ss(.705,.748,v.y)
  armW[i]=w;armTag[i]=w>.02?s:0
  if(w>0){
   const pivot=new T.Vector3(s*ELBOW,.785,.03),e=ss(.27,.335,ax)
   if(e>0){q.setFromAxisAngle(Y,-s*BEND*e);v.sub(pivot).applyQuaternion(q).add(pivot);nv.applyQuaternion(q)}
   const S=new T.Vector3(s*SHOULDER.x,SHOULDER.y,SHOULDER.z)
   q.setFromAxisAngle(Z,-s*DOWN*w);v.sub(S).applyQuaternion(q).add(S);nv.applyQuaternion(q)
  }
  P.setXYZ(i,v.x*H,v.y*H,v.z*H);N.setXYZ(i,nv.x,nv.y,nv.z)
 }
 geo.computeBoundingBox()
 // Squelette minimal.
 const bone=(name,x,y,z,parent)=>{const b=new T.Bone();b.name=name;b.position.set(x,y,z);if(parent){parent.add(b);const w=parent.getWorldPosition(new T.Vector3());b.position.sub(w)}b.updateMatrixWorld(true);return b}
 const root=bone('root',0,0,0),hips=bone('hips',0,.5*H,.0,root),spine=bone('spine',0,.6*H,.0,hips),chest=bone('chest',0,.71*H,.01,spine)
 const head=bone('head',0,.868*H,.02,chest),armL=bone('armL',SHOULDER.x*H,SHOULDER.y*H,SHOULDER.z*H,chest),armR=bone('armR',-SHOULDER.x*H,SHOULDER.y*H,SHOULDER.z*H,chest)
 const bones=[root,hips,spine,chest,head,armL,armR],I={root:0,hips:1,spine:2,chest:3,head:4,armL:5,armR:6}
 const SI=new Uint16Array(n*4),SW=new Float32Array(n*4)
 for(let i=0;i<n;i++){
  const y=P.getY(i)/H,m={}
  const add=(k,w)=>{if(w>.001)m[k]=(m[k]||0)+w}
  const a=armTag[i]&&armW[i]>.02?armW[i]:0,rest=1-a
  if(a>0)add(armTag[i]>0?'armL':'armR',a)
  const he=ss(.855,.885,y)
  if(he>0)add('head',rest*he)
  const body=rest*(1-he)
  const c1=ss(.64,.73,y),s1=ss(.5,.6,y)*(1-c1),h1=ss(.38,.5,y)*(1-ss(.5,.6,y)),r1=1-c1-s1-h1
  add('chest',body*c1);add('spine',body*s1);add('hips',body*h1);add('root',body*Math.max(0,r1))
  const list=Object.entries(m).sort((p,q)=>q[1]-p[1]).slice(0,4),tot=list.reduce((t,e)=>t+e[1],0)||1
  list.forEach(([k,w],j)=>{SI[i*4+j]=I[k];SW[i*4+j]=w/tot})
 }
 geo.setAttribute('skinIndex',new T.BufferAttribute(SI,4));geo.setAttribute('skinWeight',new T.BufferAttribute(SW,4))
 const mesh=new T.SkinnedMesh(geo,src.material);mesh.name='squatter';mesh.frustumCulled=false
 const group=new T.Group();group.name='squatter_rig';group.add(root);group.add(mesh)
 group.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones),new T.Matrix4())
 // Repos : respiration, léger balancement, tête qui bouge lentement. Boucle de 7 s, périodes entières.
 const D=7,times=[];for(let i=0;i<=56;i++)times.push(D*i/56)
 const tw=2*Math.PI/D
 const qtrack=(b,fn)=>{const vals=[],e=new T.Euler(),qq=new T.Quaternion();for(const t of times){e.set(...fn(t));qq.setFromEuler(e);vals.push(qq.x,qq.y,qq.z,qq.w)}return new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,vals)}
 const clip=new T.AnimationClip('Idle_Standing',D,[
  qtrack(hips,t=>[0,Math.sin(tw*t)*.008,Math.sin(tw*t+1)*.01]),
  qtrack(spine,t=>[Math.sin(tw*2*t)*.009,Math.sin(tw*t+.5)*.012,Math.sin(tw*t+2)*.006]),
  qtrack(chest,t=>[Math.sin(tw*2*t+.4)*.016,0,Math.sin(tw*t+1.2)*.008]),
  qtrack(head,t=>[Math.sin(tw*t+.8)*.035+.03,Math.sin(tw*t+2.4)*.05,Math.sin(tw*2*t)*.012]),
  qtrack(armL,t=>[Math.sin(tw*2*t+1.1)*.02,0,Math.sin(tw*2*t+.4)*.012]),
  qtrack(armR,t=>[Math.sin(tw*2*t+.2)*.02,0,Math.sin(tw*2*t+1.4)*.012])
 ])
 const buf=await new GLTFExporter().parseAsync(group,{binary:true,animations:[clip],maxTextureSize:2048})
 console.log('[bake]',JSON.stringify({v:n,min:geo.boundingBox.min.toArray().map(x=>+x.toFixed(3)),max:geo.boundingBox.max.toArray().map(x=>+x.toFixed(3))}))
 let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)
})
fs.writeFileSync(process.env.OUT,Buffer.from(b64,'base64'));await browser.close()

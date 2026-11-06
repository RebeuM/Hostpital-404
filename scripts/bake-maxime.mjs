// Prépare Maxime à partir de raw/teenage_boy.glb (barathudaya27, CC BY 4.0), riggé mais figé en T et sans animation :
// transfère les clips de marche et de repos d'un autre personnage du jeu (person_jordan, CC0) vers son squelette.
// Usage : serveur sur 5179, puis OUT=<fichier.glb> CHROMIUM=<chrome> node scripts/bake-maxime.mjs
import {chromium} from 'playwright'
import fs from 'fs'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args:['--ignore-gpu-blocklist','--enable-gpu','--js-flags=--max-old-space-size=4096']})
const page=await browser.newPage()
page.on('pageerror',e=>console.log('[err]',e.message));page.on('console',m=>{if(m.text().startsWith('[bake]'))console.log(m.text())})
await page.route('**/__t.glb',r=>r.fulfill({body:fs.readFileSync('raw/teenage_boy.glb')}))
await page.goto('http://localhost:5179/')
const b64=await page.evaluate(async()=>{
 const T=await import('/node_modules/.vite/deps/three.js').catch(()=>import('/node_modules/three/build/three.module.js'))
 const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
 const {DRACOLoader}=await import('/node_modules/three/examples/jsm/loaders/DRACOLoader.js')
 const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
 const d=new DRACOLoader();d.setDecoderPath('/draco/');const l=new GLTFLoader();l.setDRACOLoader(d)
 const srcG=await l.loadAsync('/assets/models/person_jordan.glb'),tgtG=await new GLTFLoader().loadAsync('/__t.glb')
 const src=srcG.scene,tgt=tgtG.scene
 const byPrefix=(root)=>{const m={};root.traverse(o=>{if(o.isBone)m[o.name]=o});return m}
 const S=byPrefix(src),Tb=byPrefix(tgt)
 const tName=p=>Object.keys(Tb).find(n=>n===p||n.startsWith(p+'_'))
 // Cible ← source, du parent vers l'enfant ; `to` indique le point vers lequel pointe l'os (pour aligner les deux poses de repos).
 const fingers=(side,s)=>['Thumb','Index','Middle','Ring','Pinky'].flatMap(f=>[1,2,3].map(i=>[`${side}Hand${f}${i}`,`${f.toLowerCase()}_0${i}_${s}`,i<3?`${side}Hand${f}${i+1}`:null,i<3?`${f.toLowerCase()}_0${i+1}_${s}`:null]))
 const limb=(side,s)=>[
  [`${side}Shoulder`,`clavicle_${s}`,`${side}Arm`,`upperarm_${s}`],[`${side}Arm`,`upperarm_${s}`,`${side}ForeArm`,`lowerarm_${s}`],[`${side}ForeArm`,`lowerarm_${s}`,`${side}Hand`,`hand_${s}`],[`${side}Hand`,`hand_${s}`,`${side}HandMiddle1`,`middle_01_${s}`],
  ...fingers(side,s),
  [`${side}UpLeg`,`thigh_${s}`,`${side}Leg`,`calf_${s}`],[`${side}Leg`,`calf_${s}`,`${side}Foot`,`foot_${s}`],[`${side}Foot`,`foot_${s}`,`${side}ToeBase`,`ball_${s}`],[`${side}ToeBase`,`ball_${s}`,null,null]]
 const MAP=[['Hips','pelvis','Spine','spine_01'],['Spine','spine_01','Spine1','spine_02'],['Spine1','spine_02','Spine2','spine_03'],['Spine2','spine_03','Neck','neck_01'],['Neck','neck_01','Head','head'],['Head','head','HeadTop_End',null],...limb('Left','l'),...limb('Right','r')]
 // Corrections de pose, en degrés et en repère monde : coudes le long du corps, paumes vers les cuisses, buste détendu.
 const FIX={LeftArm:[0,0,-14],RightArm:[0,0,14],LeftForeArm:[0,-8,7],RightForeArm:[0,8,-7],LeftHand:[0,-45,6],RightHand:[0,45,-6],Spine2:[2,0,0],Neck:[-4,0,0],Head:[-3,0,0]}
 const rows=[]
 for(const [t,s,tc,sc] of MAP){const tb=Tb[tName(t)],sb=S[s];if(!tb||!sb){console.log('[bake] absent',t,s);continue};rows.push({key:t,t:tb,s:sb,tc:tc?Tb[tName(tc)]:null,sc:sc?S[sc]:null})}
 src.updateMatrixWorld(true);tgt.updateMatrixWorld(true)
 const wp=o=>o.getWorldPosition(new T.Vector3()),wq=o=>o.getWorldQuaternion(new T.Quaternion())
 // Pose de référence : la cible (en T) est orientée os par os comme la source au repos ; la rotation autour de l'os reste celle de la cible.
 const parentAlign=new Map()
 for(const r of rows){r.sRef=wq(r.s);r.tBind=wq(r.t);let al
  if(r.tc&&r.sc){const dt=wp(r.tc).sub(wp(r.t)).normalize(),ds=wp(r.sc).sub(wp(r.s)).normalize();al=new T.Quaternion().setFromUnitVectors(dt,ds)}
  else al=parentAlign.get(r.t.parent)||new T.Quaternion()
  parentAlign.set(r.t,al);r.tRef=al.clone().multiply(r.tBind)}
 const hipRow=rows[0],pRefS=wp(hipRow.s),pBindT=wp(hipRow.t),scaleH=pBindT.y/pRefS.y
 console.log('[bake] os',rows.length,'hanches',pBindT.y.toFixed(3),pRefS.y.toFixed(3))
 // Pour que la tête soit trouvée par le jeu (regard vers le joueur).
 const headBone=Tb[tName('Head')];headBone.name='head'
 const mixer=new T.AnimationMixer(src),clips=[]
 for(const [name,fps] of [['Idle_Standing',15],['Walk_Relaxed',30]]){
  const clip=srcG.animations.find(a=>a.name===name);const action=mixer.clipAction(clip);action.play()
  const n=Math.round(clip.duration*fps),times=[],Q=rows.map(()=>[]),P=[]
  for(let f=0;f<=n;f++){const t=clip.duration*f/n;times.push(t);action.time=t;mixer.update(0);src.updateMatrixWorld(true)
   rows.forEach((r,i)=>{
    const w=wq(r.s).multiply(r.sRef.clone().invert()).multiply(r.tRef)
    // Corrections de posture : l'animation d'origine écarte les coudes et avance la tête.
    const fix=FIX[r.key]||(r.key.startsWith('LeftHand')?FIX.LeftHand:r.key.startsWith('RightHand')?FIX.RightHand:null);if(fix)w.premultiply(new T.Quaternion().setFromEuler(new T.Euler(...fix.map(T.MathUtils.degToRad))))
    const parent=r.t.parent;parent.updateWorldMatrix(true,false);const pq=parent.getWorldQuaternion(new T.Quaternion())
    const local=pq.invert().multiply(w);r.t.quaternion.copy(local);r.t.updateMatrixWorld(true)
    if(i>0&&Q[i].length){const a=Q[i],m=a.length;if(a[m-4]*local.x+a[m-3]*local.y+a[m-2]*local.z+a[m-1]*local.w<0)local.set(-local.x,-local.y,-local.z,-local.w)}
    Q[i].push(local.x,local.y,local.z,local.w)
    if(i===0){const dp=wp(r.s).sub(pRefS).multiplyScalar(scaleH),world=pBindT.clone().add(dp);const lp=parent.worldToLocal(world);r.t.position.copy(lp);r.t.updateMatrixWorld(true);P.push(lp.x,lp.y,lp.z)}
   })
  }
  action.stop();const tracks=rows.map((r,i)=>new T.QuaternionKeyframeTrack(r.t.name+'.quaternion',times,Q[i]))
  tracks.push(new T.VectorKeyframeTrack(hipRow.t.name+'.position',times,P))
  clips.push(new T.AnimationClip(name,clip.duration,tracks))
 }
 console.log('[bake] clips',clips.map(c=>c.name+':'+c.duration.toFixed(1)).join(','))
 // Remet la pose de repos avant l'export.
 tgt.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose()});tgt.updateMatrixWorld(true)
 const buf=await new GLTFExporter().parseAsync(tgt,{binary:true,animations:clips,maxTextureSize:1024})
 let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)
})
fs.writeFileSync(process.env.OUT,Buffer.from(b64,'base64'));await browser.close()

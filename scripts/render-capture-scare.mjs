// Refait l'image du screamer de capture : le vrai modèle du monstre, en pleine animation d'attaque, rendu par le moteur
// (seul, sur fond noir, éclairé par en dessous, vu en contre-plongée), puis étalonné avec ImageMagick.
// Prérequis : playwright, ImageMagick (magick) ; serveur : npm run dev -- --port 5179. OUT=<fichier .webp> (défaut : public/assets/scare/monstre.webp).
import {chromium} from 'playwright'
import {execFileSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const URL=process.env.URL||'http://localhost:5179/',OUT=process.env.OUT||'public/assets/scare/monstre.webp'
const AT_MS=750,DIST=.5,BELOW=.3,SIDE=-.12
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const page=await (await browser.newContext({viewport:{width:1600,height:1000}})).newPage()
await page.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:false})))
await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal();g.getState().enterHospital();g.getState().closeModal();const r=window.__runtime;r.encounterIn=Infinity;r.ambientScareIn=r.dreadIn=r.laughIn=1e9
 g.setState({hasKey:true,sectorOpen:true,chapter:7,usb:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{morgue:true},chase:true,chaseTime:999,flashlight:false})})
await page.waitForTimeout(2700) // le monstre se transforme puis fixe sa proie
await page.evaluate(()=>{const r=window.__runtime;r.player.x=-4.55;r.player.z=42;r.player.yaw=Math.PI/2;r.look.yaw=Math.PI/2})
await page.waitForTimeout(250);await page.evaluate(()=>window.__game.getState().beginCapture());await page.waitForTimeout(AT_MS)
const png=await page.evaluate(({dist,below,side})=>{
 const s=window.__scene,gl=window.__gl,ch=s.getObjectByName('chaser'),V=window.__camera.position.constructor,PL=s.getObjectByProperty('type','PointLight').constructor
 let head=null,jaw=null;ch.updateMatrixWorld(true);ch.traverse(o=>{if(o.isBone&&o.name.startsWith('Head_')&&!head){head=new V();o.getWorldPosition(head)}if(o.isBone&&o.name.startsWith('Jaw_end')&&!jaw){jaw=new V();o.getWorldPosition(jaw)}})
 const p=window.__runtime.player,face=head.clone().lerp(jaw||head,.45),dir=new V(p.x-face.x,0,p.z-face.z).normalize()
 const cam=window.__camera.clone();cam.fov=46;cam.aspect=1.6;cam.updateProjectionMatrix()
 cam.position.copy(face).addScaledVector(dir,dist);cam.position.y-=below;cam.position.x+=side*dir.z;cam.position.z-=side*dir.x;cam.lookAt(face)
 const key=new PL('#ffe6cf',4.5,3,1.5),rim=new PL('#ff2410',7,4,1.4);key.position.copy(face).addScaledVector(dir,.55);key.position.y-=.65;rim.position.copy(face).addScaledVector(dir,-.7);rim.position.y+=.5;s.add(key,rim)
 const keep=new Set();for(let a=ch;a;a=a.parent)keep.add(a)
 const hidden=[],visit=o=>{for(const c of o.children){if(c===ch||c===key||c===rim)continue;if(keep.has(c))visit(c);else if(c.visible){hidden.push(c);c.visible=false}}};visit(s)
 const bg=s.background,fog=s.fog;s.background=null;s.fog=null;gl.setClearColor('#000000')
 gl.setSize(1600,1000,false);gl.render(s,cam);const url=gl.domElement.toDataURL('image/png')
 hidden.forEach(o=>{o.visible=true});s.background=bg;s.fog=fog;s.remove(key,rim)
 return url.slice(22)},{dist:DIST,below:BELOW,side:SIDE})
await browser.close()
const raw=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'h404-')),'visage.png');fs.writeFileSync(raw,Buffer.from(png,'base64'))
// Étalonnage : désaturé, contrasté, teinte sang, grain, vignette noire (sans -background black, la vignette serait blanche).
execFileSync('magick',[raw,'-crop','1240x1000+330+0','+repage','-colorspace','gray','-sigmoidal-contrast','9x38%','-colorspace','sRGB','-fill','#5a0b06','-tint','70','-attenuate','.55','+noise','Gaussian','-background','black','-vignette','0x130+0+0','-resize','1400x','-quality','82','-define','webp:method=6',OUT])
console.log('écrit :',OUT)

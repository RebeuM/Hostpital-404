// Banc de performance : temps d'image (sans limite de 60 i/s), appels de dessin, triangles, par qualité et par vue.
// La résolution est figée (window.__H404_FIXED_DPR) pour comparer les réglages à l'identique.
// MODE=gpu (carte graphique) | soft (SwiftShader : rendu logiciel, approximation d'une très petite machine). CPU=4 : processeur bridé.
// Q=minimal,low,medium,high · VIEWS=parvis,hall,couloir,patients,labo,morgue,fuite · W/H : taille de la fenêtre.
// Prérequis : playwright ; serveur : npm run dev -- --port 5179. CHROMIUM=<chemin d'un Chrome/Chromium> si besoin.
import {chromium} from 'playwright'
const MODE=process.env.MODE||'gpu',QUALITIES=(process.env.Q||'low,medium,high').split(','),MS=+process.env.MS||(MODE==='soft'?4000:2500)
const W=+process.env.W||1280,H=+process.env.H||720
const args=['--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit']
if(MODE==='soft')args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');else args.push('--enable-gpu','--use-angle=metal')
const VIEWS=(process.env.VIEWS||'parvis,hall,couloir,patients,labo,morgue,fuite').split(',')
const DEF={parvis:{out:true,x:0,z:-22,yaw:0,pitch:.05},hall:{x:0,z:-1,yaw:0,pitch:0},couloir:{x:0,z:18,yaw:0,pitch:0},patients:{x:-5.2,z:14.3,yaw:-Math.PI/2,pitch:0},labo:{x:9.5,z:31.5,yaw:-Math.PI/2,pitch:0},morgue:{x:-8,z:43,yaw:Math.PI/2,pitch:0},fuite:{chase:true,x:-8,z:40,yaw:Math.PI,pitch:0}}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args})
const rows=[]
for(const q of QUALITIES){
 const ctx=await browser.newContext({viewport:{width:W,height:H}});await ctx.addInitScript(q=>{localStorage.setItem('hospital404.settings',JSON.stringify({quality:q,jumpscares:false,muted:true}));window.__H404_FIXED_DPR=true},q)
 const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message))
 if(process.env.CPU){const c=await ctx.newCDPSession(page);await c.send('Emulation.setCPUThrottlingRate',{rate:+process.env.CPU})}
 await page.goto(process.env.URL||'http://localhost:5179/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:300000})
 await page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal();const r=window.__runtime;r.encounterIn=Infinity;r.ambientScareIn=r.dreadIn=r.laughIn=1e9})
 await page.waitForTimeout(1500)
 for(const v of VIEWS){const d=DEF[v]
  await page.evaluate(d=>{const g=window.__game,r=window.__runtime
   if(d.out){if(!g.getState().outside)g.setState({outside:true,entranceOpen:false})}
   else if(g.getState().outside){g.getState().enterHospital();g.getState().closeModal()}
   if(d.chase)g.setState({hasKey:true,sectorOpen:true,chapter:7,usb:true,chase:true,chaseTime:999,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{morgue:true}})
   Object.assign(r.player,{x:d.x,z:d.z,yaw:d.yaw,pitch:d.pitch});r.look.yaw=d.yaw;r.look.pitch=d.pitch;r.encounterIn=Infinity},d)
  await page.waitForTimeout(MODE==='soft'?2500:1200)
  const m=await page.evaluate(ms=>new Promise(res=>{const gl=window.__gl;gl.info.autoReset=false;gl.info.reset()
   const dts=[];let last=performance.now(),calls=0,tris=0,n=0;const end=last+ms
   const f=t=>{dts.push(t-last);last=t;calls+=gl.info.render.calls;tris+=gl.info.render.triangles;n++;gl.info.reset();if(t<end)requestAnimationFrame(f);else{gl.info.autoReset=true;dts.shift();dts.sort((a,b)=>a-b)
     res({avg:dts.reduce((a,b)=>a+b,0)/dts.length,p95:dts[Math.floor(dts.length*.95)]||0,calls:calls/n,tris:tris/n,programs:gl.info.programs.length,tex:gl.info.memory.textures,geo:gl.info.memory.geometries,dpr:gl.getPixelRatio()})}}
   requestAnimationFrame(t=>{last=t;requestAnimationFrame(f)})}),MS)
  rows.push({q,v,...m})
  console.log(`${q.padEnd(7)} ${v.padEnd(9)} ${m.avg.toFixed(1).padStart(6)} ms (${(1000/m.avg).toFixed(0).padStart(3)} i/s)  p95 ${m.p95.toFixed(1).padStart(6)}  appels ${m.calls.toFixed(0).padStart(4)}  triangles ${(m.tris/1000).toFixed(0).padStart(5)}k  dpr ${m.dpr.toFixed(2)}`)
 }
 if(errs.length)console.log('erreurs',errs.slice(0,3))
 await ctx.close()
}
for(const q of QUALITIES){const r=rows.filter(x=>x.q===q);console.log(`MOYENNE ${q.padEnd(7)} ${(r.reduce((a,b)=>a+b.avg,0)/r.length).toFixed(1)} ms · pire vue ${Math.max(...r.map(x=>x.avg)).toFixed(1)} ms`)}
await browser.close()

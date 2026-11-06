// Partie complète, sans aucune téléportation : un robot marche avec les vraies commandes et les vraies collisions, ouvre les portes, lit les dialogues,
// résout les quatre énigmes, prend la clé USB et fuit. Au clavier jusqu'à la bonne fin, au doigt jusqu'à la capture.
// Un robot ne remplace pas un joueur : il prouve que rien ne bloque, pas que c'est lisible ni agréable.
// Prérequis : playwright installé ; serveur : npm run dev -- --port 5179. Options : ONLY=clavier|doigt, OUT=<dossier de captures en cas d'échec>.
import {chromium} from 'playwright'
import fs from 'fs'
import {INTERACTIVES,GATES,ROOM_DOORS,gateBox,isOccupied,isDoorPassable,isGateOpen,closedDoorBetween,raycastTarget} from '../src/game/layout.js'
import {buildNavGrid,computeDistances,nextWaypoint,NAV_BOUNDS} from '../src/game/chaseNav.js'
const URL=process.env.URL||'http://localhost:5179/',OUT=process.env.OUT
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
let failed=0,total=0
const check=(ok,msg)=>{total++;console.log((ok?'PASS ':'FAIL ')+msg);if(!ok){failed++;process.exitCode=1}}
const SQL="SELECT * FROM patients WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018;"
class Blocked extends Error{}

async function play({name,device,ending}){
 console.log(`\n=== ${name} : ${ending==='good'?'jusqu’à la bonne fin':'jusqu’à la capture'} ===`)
 const touchMode=!!device.hasTouch
 const ctx=await browser.newContext(device)
 await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:false})))
 const page=await ctx.newPage()
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{const t=m.text();if(m.type()==='error'&&!t.includes('404'))errors.push(t.slice(0,200))})
 const cdp=await ctx.newCDPSession(page)
 const t0=Date.now(),say=m=>console.log(`  ${((Date.now()-t0)/1000).toFixed(0).padStart(4)} s  ${m}`)
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id}))})
 const tapAt=async(x,y,id=9)=>{await touch('touchStart',[[x,y,id]]);await page.waitForTimeout(30);await touch('touchEnd',[])}
 const tap=async sel=>{const b=await page.locator(sel).first().boundingBox();if(!b)throw new Blocked('introuvable à l’écran : '+sel);const x=b.x+b.width/2,y=b.y+b.height/2;if(touchMode)await tapAt(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(100)}
 const state=()=>page.evaluate(()=>{const s=window.__game.getState(),p=window.__runtime.player;return {phase:s.phase,modal:s.modal,dialog:s.dialog,dialogWalk:s.dialogWalk,near:s.near?.id||null,paused:s.paused,outside:s.outside,entranceOpen:s.entranceOpen,sectorOpen:s.sectorOpen,hasKey:s.hasKey,usb:s.usb,chase:s.chase,capture:s.capture,chapter:s.chapter,done:s.done,doorsOpened:s.doorsOpened,secretVisited:s.secretVisited,hiding:s.hiding,encounter:s.encounter,monsterDoor:s.monsterDoor,endingReason:s.endingReason,penalty:s.penalty,elapsed:s.elapsed,x:p.x,z:p.z,yaw:p.yaw}})
 const look=(yaw,pitch=0)=>page.evaluate(([y,p])=>{const l=window.__runtime.look;l.yaw=y;l.pitch=p},[yaw,pitch])
 const fail=async(msg,s)=>{const st=s||await state();if(OUT){fs.mkdirSync(OUT,{recursive:true});await page.screenshot({path:`${OUT}/${name}-blocage.png`})}throw new Blocked(`${msg} (x=${st.x?.toFixed(2)} z=${st.z?.toFixed(2)} acte=${st.chapter} dialogue=${st.dialog} modale=${st.modal})`)}
 // ----- Commandes
 const sx=device.viewport.width*.2,sy=device.viewport.height*.72
 let moving=false
 const move=async(on,run=false)=>{
  if(touchMode){
   if(on&&!moving){await touch('touchStart',[[sx,sy]]);await page.waitForTimeout(25)}
   if(on)await touch('touchMove',[[sx,sy-(run?95:50)]]);else if(moving)await touch('touchEnd',[])
  }else{
   if(on&&!moving)await page.keyboard.down('KeyW');else if(!on&&moving)await page.keyboard.up('KeyW')
   if(on&&run)await page.keyboard.down('ShiftLeft');else await page.keyboard.up('ShiftLeft')
  }
  moving=on
 }
 const act=async()=>{if(touchMode)await tap('.touch-interact');else await page.keyboard.press('e');await page.waitForTimeout(90)}
 const advance=async()=>{if(touchMode)await tapAt(device.viewport.width/2,device.viewport.height*.3);else await page.keyboard.press('e')}
 // ----- Marche : un chemin recalculé sur les vraies collisions, et les portes ouvertes en chemin.
 const grids=new Map()
 const gridFor=s=>{
  const ok=ROOM_DOORS.filter(d=>isGateOpen(d,s)),st={...s,doorsOpened:Object.fromEntries(ok.map(d=>[d,true]))}
  const key=JSON.stringify([st.sectorOpen,st.done,st.chase,ok,st.outside,st.entranceOpen])
  if(!grids.has(key))grids.set(key,buildNavGrid((x,z)=>isOccupied(x,z,st,.36),{...NAV_BOUNDS,cell:.2}))
  return grids.get(key)
 }
 const openDoor=async id=>{
  const g=GATES.find(x=>x.id===id),[cx,cy,cz]=gateBox(g);let s=await state()
  await move(false)
  for(let i=0;i<40&&!isDoorPassable(id,s);i++){
   await look(Math.atan2(cx-s.x,cz-s.z),Math.atan2(cy-1.68,Math.hypot(cx-s.x,cz-s.z)));await page.waitForTimeout(120)
   s=await state();if(s.near==='door_'+id)await act();s=await state()
  }
  if(!isDoorPassable(id,s))await fail(`la porte ${id} ne s’ouvre pas`,s)
  say(`porte ${id} ouverte`);await page.waitForTimeout(250)
 }
 const walkTo=async(tx,tz,{run=false,radius=.4,timeout=70000}={})=>{
  const end=Date.now()+timeout;let lastX=null,lastZ=null,lastAt=Date.now(),field=null,fieldGrid=null
  while(true){
   const s=await state()
   if(s.phase!=='playing'){await move(false);return s}
   if(s.capture){await move(false);return s}
   // Un dialogue qui fige le joueur, ou une pause : on arrête de marcher et on laisse la main à l'appelant.
   if((s.modal&&!s.dialogWalk)||s.paused){await move(false);await fail('un écran bloque la marche',s)}
   const d=Math.hypot(tx-s.x,tz-s.z)
   if(d<radius){await move(false);return s}
   if(Date.now()>end){await move(false);await fail(`trop long pour rejoindre (${tx},${tz})`,s)}
   const g=gridFor(s);if(g!==fieldGrid){field=computeDistances(g,tx,tz);fieldGrid=g}
   const w=nextWaypoint(g,field,s.x,s.z,tx,tz)
   if(w.reachable===false){await move(false);await fail(`aucun chemin vers (${tx},${tz})`,s)}
   const door=closedDoorBetween(s.x,s.z,w.x,w.z,s)
   // Une porte fermée sur le chemin : on s'en approche à portée de main, puis on l'ouvre.
   if(door&&ROOM_DOORS.includes(door)&&isGateOpen(door,s)){const gd=GATES.find(x=>x.id===door);if(Math.hypot(gd.x-s.x,gd.z-s.z)<2){await openDoor(door);lastAt=Date.now();continue}}
   await look(Math.atan2(w.x-s.x,w.z-s.z));await move(true,run)
   if(lastX===null||Math.hypot(s.x-lastX,s.z-lastZ)>.25){lastX=s.x;lastZ=s.z;lastAt=Date.now()}
   else if(Date.now()-lastAt>4000){await move(false);await fail(`bloqué en route vers (${tx},${tz})`,s)}
   await page.waitForTimeout(50)
  }
 }
 // L'endroit le plus proche par le chemin d'où la cible se vise pour de bon : c'est aussi ce que cherche un joueur.
 const standFor=async id=>{
  const s=await state(),g=gridFor(s),[cx,cy,cz]=INTERACTIVES.find(o=>o.id===id).hit,dist=computeDistances(g,s.x,s.z);let best=null
  for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){
   const d=dist[r*g.cols+c];if(d<0||(best&&d>=best.d))continue
   const x=g.xMin+(c+.5)*g.cell,z=g.zMin+(r+.5)*g.cell,dx=cx-x,dy=cy-1.68,dz=cz-z,l=Math.hypot(dx,dy,dz)
   if(l<=2.2&&raycastTarget(x,1.68,z,dx/l,dy/l,dz/l,{...s,_px:x})?.id===id)best={x,z,d}
  }
  if(!best)await fail(`aucun endroit atteignable d’où viser ${id}`,s)
  return best
 }
 const goAndAim=async id=>{const b=await standFor(id);await walkTo(b.x,b.z,{radius:.22});await aim(id)}
 const aim=async(id)=>{
  const it=INTERACTIVES.find(o=>o.id===id),[cx,cy,cz]=it.hit
  await move(false)
  for(let i=0;i<40;i++){const s=await state();await look(Math.atan2(cx-s.x,cz-s.z),Math.atan2(cy-1.68,Math.hypot(cx-s.x,cz-s.z)));await page.waitForTimeout(120);if((await state()).near===id)return}
  await fail(`impossible de viser ${id}`)
 }
 const finishDialogue=async(limit=120000)=>{
  const end=Date.now()+limit
  while(Date.now()<end){const s=await state();if(!(s.modal==='story'&&!s.dialogWalk)){await page.waitForTimeout(560);return}await advance();await page.waitForTimeout(140)}
  await fail('dialogue sans fin')
 }
 const enterAnswer=async(id,answer)=>{
  await page.locator('.puzzle-file').waitFor()
  if(touchMode){
   if(id==='lab'){
    await tap('.touch-keypad .long')
    for(const k of ['nom','=',"'",'V','A','S','S','E','U','R',"'",'AND','prenom','=',"'",'E','L','E','O','N','O','R','E',"'",'AND','annee_deces','=','2','0','1','8',';'])await tap(`.touch-keypad button:text-is("${k}")`)
   }else for(const k of answer)await tap(`.touch-keypad button:text-is("${k}")`)
   await tap('.puzzle-file .primary-btn')
  }else{await page.keyboard.type(answer,{delay:8});await page.keyboard.press('Enter')}
  await page.waitForTimeout(300)
 }
 const puzzle=async(id,answer)=>{
  await goAndAim(id);await act()
  let s=await state();if(s.modal!=='puzzle'||s.dialog!==id)await fail(`l’énigme ${id} ne s’ouvre pas`,s)
  await enterAnswer(id,answer);s=await state()
  if(!s.done[id])await fail(`réponse refusée à l’énigme ${id}`,s)
  say(`énigme ${id} résolue, acte ${s.chapter}`);await finishDialogue()
 }

 try{
  await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
  await page.evaluate(()=>{window.__events=[];window.__game.subscribe((s,p)=>{if(s.lastEvent&&s.lastEvent!==p.lastEvent)window.__events.push({type:s.lastEvent.type,at:performance.now()})})})
  // Menu et prologue, au vrai bouton.
  await tap('.menu-item:has-text("NOUVELLE")');await tap('.difficulty-card:has-text("Normale")');await tap('.difficulty-panel .primary-btn');await page.waitForTimeout(900)
  let s=await state();if(s.modal!=='prologue')await fail('le prologue ne démarre pas',s)
  for(let i=0;i<60&&(await state()).modal==='prologue';i++){await advance();await page.waitForTimeout(160)}
  await page.waitForTimeout(400);s=await state();check(s.modal===null&&s.outside,'prologue terminé, sur le parvis')
  say('parvis')
  // Parvis : tout droit jusqu'à la porte (la grille de navigation ne couvre que l'intérieur).
  await look(0)
  await move(true);await page.waitForFunction(()=>window.__runtime.player.z>-5.6,null,{timeout:30000}).catch(()=>{});await move(false)
  s=await state();if(s.z<=-5.7)await fail('n’atteint pas la porte de l’hôpital',s)
  await aim('hospital_door');await act();s=await state();check(s.entranceOpen,'la porte de l’hôpital s’ouvre');await look(0)
  await move(true);await page.waitForFunction(()=>!window.__game.getState().outside,null,{timeout:12000}).catch(()=>{});await move(false)
  s=await state();check(!s.outside&&s.dialog==='intro','entré dans l’hôpital : la porte claque, Maxime parle');say('dans le hall')
  // Acte I.
  await goAndAim('squatter');await act();s=await state();check(s.dialog==='squatter','acte I : on parle à l’homme de l’accueil, même pendant la discussion avec Maxime')
  await finishDialogue();s=await state();check(s.hasKey,'acte I : la clé du secteur est remise');say('clé du secteur')
  await goAndAim('sector');await act();s=await state();if(s.dialog!=='disappearance')await fail('le portail ne réagit pas',s)
  await finishDialogue();s=await state();check(s.sectorOpen&&s.chapter>=2,`acte I terminé : portail ouvert, Maxime a disparu (acte ${s.chapter})`);say('portail ouvert')
  // Actes II à V.
  await goAndAim('bed203');await act();s=await state();check(s.dialog==='bed203','acte II : la plaque du lit 203 se lit')
  await puzzle('patients','203');await puzzle('radio','0024');await puzzle('security','0600');await puzzle('lab',SQL)
  s=await state();check(s.done.patients&&s.done.radio&&s.done.security&&s.done.lab,'actes II à V : les quatre énigmes sont résolues')
  // Acte VI : on martèle comme le ferait un joueur pressé.
  await goAndAim('morgue');await act();s=await state();if(s.dialog!=='morgue')await fail('le téléphone et la clé USB ne réagissent pas',s)
  say('morgue : scène de la clé USB');await finishDialogue();s=await state()
  check(s.usb&&s.chase&&s.dialog===null,'acte VI : clé USB en main, la fuite commence, une seule scène')
  check(s.chapter===7,'final : la fuite')
  if(ending==='good'){
   say('fuite');s=await walkTo(0,-3.4,{run:true,radius:.6,timeout:100000})
   if(s.phase==='playing'&&!s.capture){await aim('exit');await act();await page.waitForTimeout(600)}
   else await page.waitForFunction(()=>window.__game.getState().phase==='ending',null,{timeout:6000}).catch(()=>{})
   s=await state();check(s.phase==='ending'&&s.endingReason==='exit',`bonne fin atteinte par la galerie secrète (${s.endingReason||'pas de fin'}, galerie vue : ${s.secretVisited})`)
   await page.locator('.end-mark.good').waitFor({timeout:4000}).catch(()=>{});check(await page.locator('.end-mark.good').count()===1,'écran GOOD END')
  }else{
   say('il attend le monstre');await page.waitForFunction(()=>window.__game.getState().capture,null,{timeout:40000}).catch(()=>{})
   s=await state();check(s.capture,'le monstre rattrape le joueur');await page.waitForFunction(()=>window.__game.getState().phase==='ending',null,{timeout:6000}).catch(()=>{})
   s=await state();check(s.phase==='ending'&&s.endingReason==='caught',`fin de capture (${s.endingReason})`)
   check(await page.locator('.end-mark:not(.good)').count()===1,'écran SAD END')
  }
  check(s.penalty===0,`aucune pénalité sur un parcours sans faute (${s.penalty} s)`)
  check(s.elapsed<30*60,`partie finie dans le temps : ${Math.round(s.elapsed)} s de chrono`)
  const ev=await page.evaluate(()=>window.__events)
  const doubled=ev.filter((e,i)=>!['ui','door-move','flashlight','slam','dread','item'].includes(e.type)&&ev.slice(Math.max(0,i-6),i).some(o=>o.type===e.type&&e.at-o.at<250)).map(e=>e.type)
  check(doubled.length===0,`aucun effet sonore doublé sur toute la partie (${ev.length} sons)${doubled.length?' → '+doubled.join(', '):''}`)
  // S'inscrire au classement, avec le temps réellement mis : le serveur le vérifie contre son horloge.
  const first=`Robot${'abcdefghij'[Date.now()%10]}${'klmnopqrst'[Math.floor(Date.now()/10)%10]}`,last=name==='clavier'?'Clavier':'Tactile'
  await page.locator('#scoreFirstName').waitFor({timeout:4000})
  if(touchMode)await tap('#scoreFirstName');else await page.click('#scoreFirstName')
  await page.keyboard.type(first,{delay:10})
  if(touchMode)await tap('#scoreLastName');else await page.click('#scoreLastName')
  await page.keyboard.type(last,{delay:10});await page.waitForTimeout(350)
  await tap('.score-form .primary-btn');await page.locator('.score-result').waitFor({timeout:8000}).catch(()=>{})
  const line=await page.locator('.score-result').textContent().catch(()=>'');check(/Tu es \d/.test(line||''),`classement : partie enregistrée (${(line||'échec').trim()})`)
  check(await page.locator('.ranking tr.me').count()===1&&(await page.locator('.ranking tr.me .ranking-name').textContent()).includes(last),'classement : le joueur se retrouve dans la liste')
  // Recommencer depuis l'écran de fin.
  await tap('.ending-screen .primary-btn');await page.waitForTimeout(600);s=await state();check(s.phase==='playing'&&s.modal==='prologue','RECOMMENCER relance une partie')
 }catch(e){
  if(!(e instanceof Blocked)&&!/Timeout|boundingBox/.test(e.message))throw e
  check(false,'partie interrompue : '+e.message.split('\n')[0])
 }
 check(errors.length===0,`aucune erreur console${errors.length?' → '+errors.slice(0,3).join(' | '):''}`)
 say('fin du parcours');await ctx.close()
}

const CLAVIER={name:'clavier',device:{viewport:{width:1280,height:720}},ending:'good'}
const DOIGT={name:'doigt',device:{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},ending:'sad'}
for(const r of [CLAVIER,DOIGT])if(!process.env.ONLY||process.env.ONLY===r.name)await play(r)
await browser.close()
console.log(`\n${total-failed}/${total} vérifications réussies`)
if(failed)console.log(`CONTROLES ECHOUES : ${failed}`)

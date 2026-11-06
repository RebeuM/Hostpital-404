// Bugs signalés par le propriétaire, à ne pas voir revenir : freeze à la surbrillance, scène de la clé USB relancée par une rafale de touches,
// son de la vidéo du menu pendant la partie, jeu trop sombre sur téléphone.
// Prérequis : playwright installé ; serveur : npm run dev -- --port 5179
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
import {chromium} from 'playwright'
import {GATES,INTERACTIVES,gateBox} from '../src/game/layout.js'
const URL=process.env.URL||'http://localhost:5179/'
const MAX_FRAME_MS=+process.env.MAX_FRAME_MS||150
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const DESKTOP={viewport:{width:1280,height:720}},PHONE_SIZE={viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}
let failed=0,total=0
// ONLY=surbrillance,usb,menu,luminosite,monstre,audio,capture,chat,rafale,prologue : ne lance que ces sections.
const run=n=>!process.env.ONLY||process.env.ONLY.split(',').includes(n)
const check=(ok,msg)=>{total++;console.log((ok?'PASS ':'FAIL ')+msg);if(!ok){failed++;process.exitCode=1}}
const open=async(device,settings)=>{
 const ctx=await browser.newContext(device)
 await ctx.addInitScript(s=>{localStorage.setItem('hospital404.settings',JSON.stringify({jumpscares:false,...s}))
  // Tout élément audio ou vidéo lancé par la page, même retiré du document depuis.
  window.__media=new Set();const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__media.add(this);return play.apply(this,arguments)}},settings)
 const page=await ctx.newPage()
 await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
 return {ctx,page}
}
const enterHospital=page=>page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal();g.getState().enterHospital();g.getState().closeModal();const r=window.__runtime;r.encounterIn=Infinity;r.ambientScareIn=r.dreadIn=r.laughIn=1e9})
const aim=(page,[x,z],[tx,ty,tz])=>page.evaluate(([x,z,tx,ty,tz])=>{const r=window.__runtime,y=Math.atan2(tx-x,tz-z),p=Math.atan2(ty-1.68,Math.hypot(tx-x,tz-z));r.player.x=x;r.player.z=z;r.player.yaw=y;r.player.pitch=p;r.look.yaw=y;r.look.pitch=p},[x,z,tx,ty,tz])
const programs=page=>page.evaluate(()=>window.__gl.info.programs.length)
// Mesure à la sortie réelle (enregistreur branché avant la destination) : partagée par les sections audio.
const METER=()=>{const proto=AudioNode.prototype,orig=proto.connect
 window.__toOut=[];window.__peak=0;window.__sum=0;window.__n=0
 proto.connect=function(dst,...r){
  if(dst instanceof AudioDestinationNode||dst instanceof DynamicsCompressorNode)window.__toOut.push(this.constructor.name+'→'+dst.constructor.name)
  if(dst instanceof AudioDestinationNode&&this!==dst.context.__tap){const c=dst.context
   if(!c.__tap){const tap=c.__tap=c.createScriptProcessor(1024,2,2),mute=c.createGain();mute.gain.value=0;orig.call(tap,mute);orig.call(mute,dst)
    tap.onaudioprocess=e=>{const b=e.inputBuffer;let s=0;for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<d.length;i++)s+=d[i]*d[i]}const r=Math.sqrt(s/(b.length*b.numberOfChannels));window.__peak=Math.max(window.__peak,r);window.__sum+=r*r;window.__n++}}
   orig.call(this,c.__tap)}
  return orig.call(this,dst,...r)}}
const db=v=>20*Math.log10(Math.max(v,1e-6))
// Crête et niveau moyen (énergie) sur la fenêtre : deux sons au plafond se départagent par leur énergie.
const measure=async(page,ms,action)=>{await page.evaluate(()=>{window.__peak=0;window.__sum=0;window.__n=0});if(action)await page.evaluate(action);await page.waitForTimeout(ms);return page.evaluate(()=>({peak:window.__peak,mean:Math.sqrt(window.__sum/Math.max(1,window.__n))}))}
const loudest=async(page,ms,action)=>(await measure(page,ms,action)).peak

if(run('surbrillance')){
// ----- Freeze : viser un objet ou une porte pour la première fois ne compile rien et ne fige pas l'image.
const FROM={tv:[-7.72,2.0],reception_pc:[-6.05,2.0],bed203:[-10,14.5],patients:[-6,16.6],radio:[5.6,16.6],security:[-8.5,26],lab:[10,35],note:[10.2,2]}
const TARGETS=[
 ...Object.entries(FROM).map(([id,from])=>({id,from,hit:INTERACTIVES.find(o=>o.id===id).hit})),
 ...GATES.filter(g=>!['sector','secret','entrance'].includes(g.id)).map(g=>({id:'porte '+g.id,door:true,from:g.axis==='x'?[g.x*(1-1.3/Math.abs(g.x||1.3)),g.z]:[g.x,g.z-1.3],hit:gateBox(g)}))
]
for(const [name,device,quality] of [['ordinateur, qualité moyenne',DESKTOP,'medium'],['ordinateur, qualité élevée',DESKTOP,'high'],['téléphone, qualité basse',PHONE_SIZE,'low']]){
 console.log(`\n=== Surbrillance : ${name} ===`)
 const {ctx,page}=await open(device,{quality})
 const atLoad=await programs(page)
 await enterHospital(page);await page.evaluate(()=>window.__game.setState({hasKey:true,sectorOpen:true}));await page.waitForTimeout(1500)
 const passes=await page.evaluate(n=>window.__gl.info.programs.slice(n).map(p=>p.name),atLoad)
 check(passes.length<=6&&passes.every(n=>/Material$/.test(n)&&!/Standard|Lambert|Phong/.test(n)),`en entrant dans l'hôpital, seules les passes de post-effets se compilent (${passes.length} : ${passes.join(', ')||'aucune'})`)
 await page.evaluate(()=>{window.__frames=[];let t=performance.now();const f=()=>{const n=performance.now();window.__frames.push(n-t);t=n;requestAnimationFrame(f)};requestAnimationFrame(f)})
 let worst=0,worstId='',grown=0,missed=[]
 for(const t of TARGETS){
  // On arrive en regardant le sol : le coût de la pièce n'est pas celui de la visée.
  await page.evaluate(([x,z])=>{const r=window.__runtime;r.player.x=x;r.player.z=z;r.player.pitch=-1.3;r.look.pitch=-1.3},t.from);await page.waitForTimeout(450)
  await page.evaluate(()=>{window.__frames.length=0});const before=await programs(page)
  await aim(page,t.from,t.hit)
  await page.waitForFunction(({id,door})=>{const n=window.__game.getState().near;return door?!!n:n?.id===id},{id:t.id,door:!!t.door},{timeout:2500}).catch(()=>missed.push(t.id))
  await page.waitForTimeout(300)
  const ms=await page.evaluate(()=>Math.max(...window.__frames));if(ms>worst){worst=ms;worstId=t.id}
  grown+=Math.max(0,await programs(page)-before)
 }
 check(missed.length===0,`toutes les cibles sont visées${missed.length?' → ratées : '+missed.join(', '):''}`)
 check(grown===0,`aucun shader compilé à la première visée (${grown} sur ${TARGETS.length} cibles)`)
 check(worst<MAX_FRAME_MS,`aucun à-coup à la visée : pire image ${Math.round(worst)} ms (${worstId})`)
 const beforeChase=await programs(page);await page.evaluate(()=>{window.__frames.length=0;window.__game.setState({chase:true,chaseTime:100,usb:true})});await page.waitForTimeout(1500)
 check(await programs(page)===beforeChase,'aucun shader compilé quand le monstre apparaît')
 await ctx.close()
}
}

if(run('usb')){
// ----- Clé USB : marteler la touche pendant et après la scène ne la relance jamais.
const toMorgue=async page=>{
 await enterHospital(page)
 await page.evaluate(()=>{window.__game.setState({hasKey:true,sectorOpen:true,chapter:6,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{morgue:true}});window.__seen={opens:0,both:0,items:0,chaseAt:null}
  window.__game.subscribe((s,p)=>{const w=window.__seen;if(s.dialog==='morgue'&&p.dialog!=='morgue')w.opens++;if(s.chase&&s.dialog==='morgue')w.both++;if(s.itemShown==='usb'&&p.itemShown!=='usb')w.items++;if(s.chase&&!p.chase)w.chaseAt=s.notice})})
 await aim(page,[-6.8,43.1],INTERACTIVES.find(o=>o.id==='morgue').hit)
 await page.waitForFunction(()=>!!window.__game.getState().near,null,{timeout:6000})
}
const verdict=async(page,label)=>{const r=await page.evaluate(()=>{const s=window.__game.getState();return {...window.__seen,chase:s.chase,dialog:s.dialog,notice:s.notice}})
 check(r.opens===1,`${label} : la scène de la clé USB ne se joue qu'une fois (${r.opens})`)
 check(r.items===1,`${label} : l'animation de la clé USB ne se joue qu'une fois (${r.items})`)
 check(r.both===0&&r.chase&&r.dialog===null,`${label} : jamais Adrien et le monstre ensemble`)
 check(r.notice===r.chaseAt,`${label} : l'objectif de fuite reste affiché`)}
// Marteler pendant toute la scène, puis encore une seconde (l'anti-rebond n'en dure qu'une demie).
const spam=async(page,press)=>{const end=Date.now()+25000;let chaseSince=null
 while(Date.now()<end){await press();await page.waitForTimeout(12)
  if(chaseSince===null&&await page.evaluate(()=>window.__game.getState().chase))chaseSince=Date.now()
  if(chaseSince!==null&&Date.now()-chaseSince>1000)return true}
 return false}
console.log('\n=== Clé USB : rafale de touches ===')
{const {ctx,page}=await open(DESKTOP,{quality:'low'});await toMorgue(page)
 check(await spam(page,()=>page.keyboard.press('e')),'clavier : la rafale dure au-delà du début de la poursuite');await verdict(page,'clavier');await ctx.close()}
{const {ctx,page}=await open(PHONE_SIZE,{quality:'low'});await toMorgue(page)
 const cdp=await ctx.newCDPSession(page),b=await page.locator('.touch-interact').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2
 // Pendant la scène, le bouton n'est plus affiché : on touche l'écran au même endroit, comme le ferait le joueur.
 check(await spam(page,async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}),'doigt : la rafale dure au-delà du début de la poursuite');await verdict(page,'doigt');await ctx.close()}
}

if(run('menu')){
// ----- Vidéo du menu : silencieuse dès qu'on quitte le menu ou la page.
console.log('\n=== Son de la vidéo du menu ===')
const menuVideo=page=>page.evaluate(()=>{const v=[...window.__media].find(e=>(e.currentSrc||e.src).includes('arriere-plan-menu'));return v&&{paused:v.paused,muted:v.muted,inPage:v.isConnected,t:v.currentTime}})
for(const [name,device] of [['ordinateur',DESKTOP],['téléphone',PHONE_SIZE]]){
 const {ctx,page}=await open(device,{quality:'low',muted:false})
 const tap=async txt=>{const b=await page.locator(`button:has-text("${txt}")`).first().boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;if(device.hasTouch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(350)}
 await page.waitForTimeout(600);await tap('OPTIONS');await page.locator('.close-x').first().waitFor();await tap('✕');await page.waitForTimeout(500)
 const inMenu=await menuVideo(page);check(inMenu&&!inMenu.paused&&!inMenu.muted,`${name} : la vidéo du menu joue, avec le son, après le premier geste`)
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(150)
 check((await menuVideo(page)).paused,`${name} : page en arrière-plan, la vidéo du menu se tait`)
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(250)
 check(!(await menuVideo(page)).paused,`${name} : retour sur la page, la vidéo reprend`)
 await tap('NOUVELLE');await tap('COMMENCER');await page.waitForTimeout(600);await tap('Passer');await page.waitForTimeout(1500)
 const a=await menuVideo(page);await page.waitForTimeout(800);const b=await menuVideo(page)
 check(a.paused&&a.muted&&!a.inPage,`${name} : en partie, la vidéo du menu est arrêtée et muette`)
 check(a.t===b.t,`${name} : en partie, la vidéo du menu n'avance plus`)
 check(await page.evaluate(()=>window.__audio.isMusicPlaying()),`${name} : la musique du jeu joue`)
 await ctx.close()
}
}

if(run('luminosite')){
// ----- Luminosité : lisible au téléphone sans toucher au réglage de l'ordinateur.
console.log('\n=== Luminosité (vue 3D, HUD masqué) ===')
const VIEWS=[[0,4,0],[-5.9,3.7,1.57],[5.6,16.6,0],[-6,24.5,-1.57],[5.6,28,1.57],[-6.8,41,1]]
const meanLum=async(device,quality)=>{const {ctx,page}=await open(device,{quality});await enterHospital(page)
 await page.evaluate(()=>{window.__game.setState({hasKey:true,sectorOpen:true,done:{patients:true,radio:true,security:true,lab:true}});const c=document.createElement('style');c.textContent='.objectives,.top-actions,.game-timer,.touch-actions,.touch-layer,.touch-coach,.touch-stick-hint,.inventory,.minimap-wrap,.interact-prompt,.toast,.crosshair,.portrait-tip,.stamina,.controls-hint,.hud-brand{display:none!important}';document.head.append(c)})
 const out=[];for(const [x,z,y] of VIEWS){await page.evaluate(([x,z,y])=>{const r=window.__runtime;r.player.x=x;r.player.z=z;r.player.yaw=y;r.player.pitch=.03;r.look.yaw=y;r.look.pitch=.03},[x,z,y]);await page.waitForTimeout(900)
  const shot=(await page.screenshot()).toString('base64')
  out.push(await page.evaluate(async b=>{const i=new Image();i.src='data:image/png;base64,'+b;await i.decode();const c=document.createElement('canvas');c.width=i.width>>2;c.height=i.height>>2;const g=c.getContext('2d');g.drawImage(i,0,0,c.width,c.height);const d=g.getImageData(0,0,c.width,c.height).data;let s=0;for(let k=0;k<d.length;k+=4)s+=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];return s/(d.length/4)},shot))}
 await ctx.close();return out.reduce((a,b)=>a+b)/out.length}
const phoneLum=await meanLum(PHONE_SIZE,'low'),desktopLum=await meanLum(DESKTOP,'medium')
check(phoneLum>=12&&phoneLum<=30,`téléphone : lisible mais sombre, ${phoneLum.toFixed(1)}/255 en moyenne`)
check(desktopLum<=9,`ordinateur : ambiance sombre conservée, ${desktopLum.toFixed(1)}/255 en moyenne`)
}

if(run('monstre')){
// ----- Monstre et portes (rapport qualité P02) : jamais à travers une porte fermée ni un mur.
console.log('\n=== Monstre et portes ===')
// Enregistre image par image ce que fait le vrai monstre : franchissement d'une porte fermée, passage dans un mur, capture à travers une porte. Les meubles ne comptent pas : il les bouscule.
const watchMonster=page=>page.evaluate(()=>{const L=window.__layout,G=window.__game,R=window.__runtime,w=window.__watch={frames:0,throughDoor:[],inWall:0,caughtThrough:[],breaks:[],morgueOpened:0,last:null}
 G.subscribe((s,p)=>{if(s.capture&&!p.capture){const d=L.closedDoorBetween(R.chaser.x,R.chaser.z,R.player.x,R.player.z,p);if(d)w.caughtThrough.push(d)}if(s.monsterDoor&&!p.monsterDoor)w.morgueOpened++;if(s.lastEvent?.type==='slam'&&s.lastEvent!==p.lastEvent)w.breaks.push(s.lastEvent.payload.sample)})
 const f=()=>{const s=G.getState(),c=R.chaser;if(s.chase&&c){w.frames++
   if(w.last){const d=L.closedDoorBetween(w.last.x,w.last.z,c.x,c.z,s);if(d)w.throughDoor.push(d)}
   if(L.WALLS.some(m=>Math.abs(c.x-m.x)<m.w/2&&Math.abs(c.z-m.z)<m.d/2)){w.inWall++;(w.wallAt||=[]).push([+c.x.toFixed(2),+c.z.toFixed(2)])}
   w.last={x:c.x,z:c.z}}window.__watchRaf=requestAnimationFrame(f)};f()})
const startChase=async(page,extra={})=>{await enterHospital(page);await page.evaluate(e=>{const g=window.__game;g.setState({hasKey:true,sectorOpen:true,chapter:7,usb:true,chase:true,chaseTime:600,secretVisited:false,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{patients:true,radio:true,security:true,lab:true},...e})},extra)}
const place=(page,x,z)=>page.evaluate(([x,z])=>{const r=window.__runtime;r.player.x=x;r.player.z=z},[x,z])
{const {ctx,page}=await open(DESKTOP,{quality:'low'});await startChase(page);await watchMonster(page)
 // Joueur dans le couloir, monstre dans la morgue : le chemin le plus court passe par sa porte condamnée.
 await place(page,0,42);await page.waitForFunction(()=>window.__watch.morgueOpened>0,null,{timeout:9000}).catch(()=>{})
 let w=await page.evaluate(()=>window.__watch)
 check(w.morgueOpened>0,'porte condamnée de la morgue : le monstre la force au lieu de la traverser fermée')
 check(w.breaks.includes('door-close'),'on l’entend frapper la porte')
 const state=await page.evaluate(()=>{const s=window.__game.getState();return {shut:window.__layout.isDoorShut('morgue',s),monsterDoor:s.monsterDoor}})
 check(!state.shut,'la porte est ouverte à l’image pendant son passage')
 await place(page,0,12) // Le joueur file vers le hall : le monstre ne l'attrape pas avant que la porte retombe.
 await page.waitForFunction(()=>window.__runtime.chaser.x>-1.6,null,{timeout:6000}).catch(()=>{})
 check(await page.evaluate(()=>window.__runtime.chaser.x>-1.6),'le monstre franchit le seuil et continue dans le couloir')
 await page.waitForFunction(()=>!window.__game.getState().monsterDoor,null,{timeout:6000}).catch(()=>{})
 check(await page.evaluate(()=>window.__layout.isDoorShut('morgue',window.__game.getState())),'puis la porte retombe, toujours condamnée pour le joueur')
 w=await page.evaluate(()=>window.__watch)
 check(w.throughDoor.length===0,`jamais à travers une porte fermée (${w.frames} images)${w.throughDoor.length?' → '+w.throughDoor.join():''}`)
 check(w.inWall===0,`jamais dans un mur (${w.inWall} images)${w.inWall?' → '+JSON.stringify(w.wallAt.slice(0,6)):''}`)
 await ctx.close()}
{const {ctx,page}=await open(DESKTOP,{quality:'low'});await startChase(page,{doorsOpened:{patients:true,radio:false,security:true,lab:true}});await watchMonster(page)
 // Joueur enfermé dans la radiologie, tout contre la porte fermée ; le monstre vient du couloir, après avoir forcé la morgue.
 await place(page,3.1,14)
 const atRadio=()=>window.__watch.radioBreaks>0||window.__game.getState().capture
 await page.evaluate(()=>{const w=window.__watch;w.radioBreaks=0;window.__game.subscribe((s,p)=>{if(s.lastEvent?.type==='slam'&&s.lastEvent!==p.lastEvent&&Math.abs(s.lastEvent.payload.z-14)<1)w.radioBreaks++})})
 await page.waitForFunction(atRadio,null,{timeout:40000}).catch(()=>{})
 const a=await page.evaluate(()=>({...window.__watch,capture:window.__game.getState().capture,dist:Math.hypot(window.__runtime.chaser.x-3.1,window.__runtime.chaser.z-14)}))
 check(a.radioBreaks>0&&!a.capture&&a.dist<3,`porte refermée : il s’arrête devant pour la forcer, à ${a.dist.toFixed(1)} m du joueur, sans l’attraper à travers`)
 await page.waitForTimeout(1500);check(await page.evaluate(()=>!window.__game.getState().capture),'à 1,5 s de frappe, le joueur est toujours libre derrière la porte')
 await page.waitForFunction(()=>window.__game.getState().doorsOpened.radio===true,null,{timeout:6000}).catch(()=>{})
 check(await page.evaluate(()=>window.__game.getState().doorsOpened.radio===true),'elle cède : la porte s’ouvre pour de bon')
 await page.waitForFunction(()=>window.__game.getState().capture,null,{timeout:8000}).catch(()=>{})
 const b=await page.evaluate(()=>({...window.__watch,capture:window.__game.getState().capture}))
 check(b.capture&&b.caughtThrough.length===0,'il attrape le joueur une fois la porte ouverte, pas avant')
 check(b.throughDoor.length===0&&b.inWall===0,`poursuite cohérente : ni porte fermée traversée, ni mur${b.inWall?' → '+b.inWall+' images : '+JSON.stringify(b.wallAt.slice(0,6)):''}`)
 await ctx.close()}
}

if(run('audio')){
// ----- Audio (rapport qualité P04) : une seule fois chaque effet, pas de boucle qui survit, pas de rafale au démarrage.
console.log('\n=== Audio ===')
{const {ctx,page}=await open(DESKTOP,{quality:'low',muted:false})
 await page.addScriptTag({content:`window.__loops=new Set();{const st=AudioBufferSourceNode.prototype.start,sp=AudioBufferSourceNode.prototype.stop;AudioBufferSourceNode.prototype.start=function(...a){if(this.loop)window.__loops.add(this);return st.apply(this,a)};AudioBufferSourceNode.prototype.stop=function(...a){window.__loops.delete(this);return sp.apply(this,a)}}`})
 await page.evaluate(()=>{window.__events=[];window.__game.subscribe((s,p)=>{if(s.lastEvent&&s.lastEvent!==p.lastEvent)window.__events.push({type:s.lastEvent.type,at:performance.now()})})})
 const events=()=>page.evaluate(()=>window.__events.splice(0))
 const doubles=l=>l.filter((e,i)=>l.slice(0,i).some(o=>o.type===e.type&&e.at-o.at<350)).map(e=>e.type)
 const loops=()=>page.evaluate(()=>window.__loops.size)
 await page.mouse.click(5,5);await page.evaluate(()=>window.__audio.initAudio())
 await enterHospital(page);await page.evaluate(()=>window.__game.setState({hasKey:true,sectorOpen:true,done:{patients:true,radio:true,security:true,lab:true}}));await page.waitForTimeout(1200);await events()
 const baseline=await loops();check(baseline>0,`des ambiances tournent en partie (${baseline} boucles)`)
 // Le joueur ouvre puis referme une porte, comme à la main.
 const g=[...await page.evaluate(()=>window.__layout.GATES)].find(x=>x.id==='radio')
 await page.evaluate(()=>window.__game.setState({encounter:true,near:{id:'door_radio',door:'radio',type:'door'}}));await page.evaluate(()=>window.__game.getState().interact());await page.waitForTimeout(500)
 let l=await events();check(l.filter(e=>e.type==='door-move').length===1&&l.some(e=>e.type==='latch'),`ouvrir une porte : un déclic et un seul son de porte (${l.map(e=>e.type).join(', ')})`)
 await page.evaluate(()=>{const r=window.__runtime;r.player.x=-1;r.player.z=14;window.__game.setState({near:{id:'close_radio',door:'radio',type:'door'}});window.__game.getState().interact()});await page.waitForTimeout(500)
 l=await events();check(l.filter(e=>e.type==='door-move').length===1&&!l.some(e=>e.type==='door-slam'),`refermer une porte : un seul claquement (${l.map(e=>e.type).join(', ')})`)
 await page.evaluate(()=>window.__game.setState({encounter:false}));await page.waitForTimeout(100);await events()
 // Début de la fuite, sans doublon.
 await page.evaluate(()=>{window.__game.setState({modal:'story',dialog:'morgue',dialogStep:9,dialogApplied:9,dialogWalk:false,usb:true});window.__game.getState().closeModal()});await page.waitForTimeout(700)
 l=await events();check(doubles(l).filter(t=>t!=='door-move').length===0&&l.filter(e=>e.type==='chase_start').length===1,`début de fuite : aucun effet doublé (${l.map(e=>e.type).join(', ')})`)
 // Retour au menu, nouvelle partie, plusieurs fois : ni boucle qui s'empile, ni rafale de portes.
 let firstTurn=0
 for(let i=1;i<=3;i++){
  await page.evaluate(()=>window.__game.getState().returnToMenu());await page.waitForTimeout(1600)
  check(await loops()===0,`tour ${i} : au menu, plus aucune boucle ne tourne`)
  check(await page.evaluate(()=>[...window.__media].filter(e=>!e.paused&&(e.currentSrc||e.src).includes('musique')).length===0),`tour ${i} : au menu, la musique du jeu est arrêtée`)
  await events();await page.evaluate(()=>{window.__game.setState({doorsOpened:{radio:true,lab:true}})})
  await enterHospital(page);await page.waitForTimeout(1500)
  l=await events();check(!l.some(e=>e.type==='door-move'),`tour ${i} : pas de rafale de portes au démarrage (${l.map(e=>e.type).join(', ')})`)
  const n=await loops();if(i===1)firstTurn=n;check(n<=firstTurn,`tour ${i} : les boucles ne s'empilent pas (${n}, ${firstTurn} au premier tour)`)
  check(await page.evaluate(()=>[...window.__media].filter(e=>!e.paused&&(e.currentSrc||e.src).includes('musique')).length)===1,`tour ${i} : une seule musique joue`)
 }
 // Fin de partie : tout se tait.
 await page.evaluate(()=>window.__game.getState().end('exit'));await page.waitForTimeout(1600);check(await loops()===0,'écran de fin : plus aucune boucle ne tourne')
 await ctx.close()}
}

// ----- Capture par le monstre : son visage en plein écran, le son le plus fort du jeu.
if(run('capture')){
console.log('\n=== Capture par le monstre ===')
// Analyseur branché sur la sortie : on mesure ce qui part réellement vers la carte son.
// Enregistreur branché sur la sortie : il lit chaque échantillon réellement envoyé à la carte son. Un analyseur ou la valeur d'un gain
// ne conviennent pas : Chrome cesse de les recalculer quand rien ne les traverse, et ils affichent alors un ancien état.
const ctx=await browser.newContext(DESKTOP);await ctx.addInitScript(METER);await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:true,volume:.7,muted:false})))
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.mouse.click(5,5);await page.evaluate(()=>window.__audio.initAudio())
await enterHospital(page);await page.evaluate(()=>window.__game.setState({hasKey:true,sectorOpen:true,chapter:7,usb:true,done:{patients:true,radio:true,security:true,lab:true}}));await page.waitForTimeout(1500)
const ambient=await measure(page,2000)
// Le screamer d'énigme le plus fort utilise le même son que la capture : c'est lui l'étalon.
const puzzle=await measure(page,1000,()=>window.__game.getState().fireScare(false,'fille'))
await page.waitForTimeout(1500)
const chase=await measure(page,3000,()=>window.__game.setState({chase:true,chaseTime:600})||window.__game.getState().emit('chase_start'))
// La vraie capture : le monstre attrape le joueur.
await page.evaluate(()=>{window.__seen={scare:null,at:0};const t0=performance.now();window.__game.subscribe((s,p)=>{if(s.scare&&!p.scare)window.__seen={scare:s.scare.variant,at:performance.now()-t0}})})
const t0=Date.now()
// Le joueur face au monstre, à portée de bras : c'est là qu'il attrape.
await page.evaluate(()=>{const r=window.__runtime,c=r.chaser;r.player.x=c.x-1.5;r.player.z=c.z;r.player.yaw=Math.PI/2;r.look.yaw=Math.PI/2;r.player.pitch=0;r.look.pitch=0});await page.waitForTimeout(150)
// Même fenêtre que pour « fille » : une seconde à partir du cri, qui part après le temps de lever les yeux.
await page.evaluate(()=>window.__game.getState().beginCapture());await page.waitForFunction(()=>window.__game.getState().scare,null,{timeout:2000}).catch(()=>{})
const capture=await measure(page,1000)
const seen=await page.evaluate(()=>({...window.__seen,img:document.querySelector('.screamer.anim-capture img')?.getAttribute('src')||null,pitch:window.__runtime.player.pitch}))
check(seen.scare==='capture'&&seen.at>=300&&seen.at<=700,`le visage du monstre surgit ${Math.round(seen.at)} ms après la saisie`)
check(seen.img==='/assets/scare/monstre.webp','c’est bien le visage du monstre, en plein écran')
check(seen.pitch>.2,`la caméra lève les yeux vers lui (${seen.pitch.toFixed(2)} rad)`)
const fmt=m=>`crête ${db(m.peak).toFixed(1)} dB, moyenne ${db(m.mean).toFixed(1)} dB`
console.log(`  ambiance : ${fmt(ambient)}\n  fuite : ${fmt(chase)}\n  screamer « fille » (même son) : ${fmt(puzzle)}\n  capture : ${fmt(capture)}`)
check(capture.mean>=puzzle.mean*Math.pow(10,-1/20),`la capture atteint le niveau du screamer le plus fort, au plafond comme lui (${db(capture.mean).toFixed(1)} dB contre ${db(puzzle.mean).toFixed(1)} dB en moyenne)`)
check(db(capture.mean)-db(Math.max(ambient.mean,chase.mean))>=8,`elle domine de loin l’ambiance et la fuite (+${(db(capture.mean)-db(Math.max(ambient.mean,chase.mean))).toFixed(1)} dB)`)
check(db(capture.peak)>=-6,`crête près du maximum possible sans saturer (${db(capture.peak).toFixed(1)} dB, plafond 0 dB)`)
await page.waitForFunction(()=>window.__game.getState().phase==='ending',null,{timeout:4000}).catch(()=>{})
const endedAfter=Date.now()-t0;check(await page.evaluate(()=>window.__game.getState().endingReason)==='caught'&&endedAfter<3200,`puis l’écran de fin (${endedAfter} ms)`)
// Le réglage « screamers » le coupe, et « couper le son » le fait taire.
await page.evaluate(()=>{const g=window.__game;g.getState().updateSettings({jumpscares:false});g.getState().newGame();g.getState().closeModal();g.getState().enterHospital();g.getState().closeModal();g.setState({chase:true,chaseTime:600})});await page.waitForTimeout(600)
await page.evaluate(()=>{window.__seen={scare:null};window.__game.subscribe((s,p)=>{if(s.scare&&!p.scare)window.__seen={scare:s.scare.variant}});window.__game.getState().beginCapture()});await page.waitForTimeout(1200)
check(await page.evaluate(()=>window.__seen.scare===null&&!document.querySelector('.screamer')),'screamers désactivés : pas de visage à la capture')
await page.waitForFunction(()=>window.__game.getState().phase==='ending',null,{timeout:3000}).catch(()=>{});check(await page.evaluate(()=>window.__game.getState().phase)==='ending','la partie se termine quand même')
await page.evaluate(()=>{const g=window.__game;g.getState().updateSettings({jumpscares:true,muted:true});g.getState().newGame();g.getState().closeModal();g.getState().enterHospital();g.getState().closeModal();g.setState({chase:true,chaseTime:600})})
await page.waitForFunction(()=>window.__audio.isMuted(),null,{timeout:3000});await page.waitForTimeout(700) // la coupure est appliquée, puis le volume s'éteint en un fondu de 0,3 s
const outputs=await page.evaluate(()=>[...new Set(window.__toOut)].sort().join(', '))
check(outputs==='DynamicsCompressorNode→AudioDestinationNode, GainNode→DynamicsCompressorNode',`tout le son passe par les deux bus de sortie, que l’enregistreur écoute (${outputs})`)
const muted=await loudest(page,1300,()=>window.__game.getState().beginCapture())
check(db(muted)<-60,`son coupé : la capture reste muette (${db(muted).toFixed(1)} dB)`)
await page.evaluate(()=>{const g=window.__game;g.getState().updateSettings({muted:false});g.getState().newGame();g.getState().closeModal();g.getState().enterHospital();g.getState().closeModal();g.setState({chase:true,chaseTime:600})})
await page.waitForFunction(()=>!window.__audio.isMuted(),null,{timeout:3000});await page.waitForTimeout(300)
await page.evaluate(()=>window.__game.getState().beginCapture());await page.waitForTimeout(600)
await page.evaluate(()=>window.__game.getState().updateSettings({muted:true}));await page.waitForFunction(()=>window.__audio.isMuted(),null,{timeout:3000})
await page.waitForTimeout(700) // le temps du fondu ; la remontée programmée tomberait ensuite, vers 2,4 s après le cri
const after=await loudest(page,2600)
check(db(after)<-60,`couper le son pendant le cri : il reste coupé, même quand le reste du jeu remonte (${db(after).toFixed(1)} dB)`)
check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
await ctx.close()
}

if(run('chat')){
// ----- Chat OIIA (demande du 6 novembre 2026) : E pour lui parler, il chante et tourne, un succès se débloque, une seule fois.
console.log('\n=== Chat OIIA et succès ===')
const ctx=await browser.newContext(DESKTOP);await ctx.addInitScript(METER);await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:true,volume:.7,muted:false})))
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>localStorage.removeItem('hospital404.achievements'))
await page.mouse.click(5,5);await page.evaluate(()=>window.__audio.initAudio())
await enterHospital(page);await page.waitForTimeout(1200)
const cat=INTERACTIVES.find(o=>o.id==='cat');await aim(page,[cat.x+1.3,cat.z],cat.hit);await page.waitForTimeout(500)
check((await page.evaluate(()=>window.__game.getState().near?.id))==='cat','le chat se vise : « Discuter avec le chat »')
const pose=()=>page.evaluate(()=>{const c=window.__scene.getObjectByName('oiia-cat');let q=null;c.traverse(o=>{if(!q&&o.name.startsWith('Muchkin'))q=o.quaternion.toArray().map(v=>+v.toFixed(3)).join()});return q})
const still=await pose();await page.waitForTimeout(400);check(still===await pose(),'au repos, le chat ne bouge pas')
const quiet=await measure(page,1200)
await page.keyboard.press('e')
const song=await measure(page,1500)
check(db(song.mean)>db(quiet.mean)+6,`E : il chante (${db(song.mean).toFixed(1)} dB contre ${db(quiet.mean).toFixed(1)} dB avant)`)
const a=await pose();await page.waitForTimeout(300);check(a!==await pose(),'il tourne pendant la chanson')
const toast=await page.evaluate(()=>document.querySelector('.achievement-toast')?.textContent||'')
check(/SUCCÈS DÉBLOQUÉ/.test(toast)&&/OIIA OIIA/.test(toast),`carte de succès affichée : « ${toast.slice(0,60)} »`)
check(!!JSON.parse(await page.evaluate(()=>localStorage.getItem('hospital404.achievements'))||'{}').oiia,'succès enregistré sur l’appareil')
const n=await page.evaluate(()=>window.__game.getState().eventCount);await page.keyboard.press('e');await page.waitForTimeout(200)
check((await page.evaluate(()=>window.__game.getState().eventCount))===n,'un E pendant la chanson ne la relance pas')
// Le piège : un peu avant la fin de la chanson, le plus gros screamer du jeu, à fond.
await page.evaluate(()=>{window.__seen=null;window.__game.subscribe((s,p)=>{if(s.scare&&!p.scare)window.__seen={variant:s.scare.variant,t:performance.now()}})})
const sinceSong=await page.evaluate(()=>performance.now()-(window.__runtime.catSongUntil-13100))
await page.waitForTimeout(Math.max(0,11300-sinceSong))
const scream=await measure(page,1500)
const seen=await page.evaluate(()=>window.__seen)
const at=seen?seen.t-(await page.evaluate(()=>window.__runtime.catSongUntil-13100)):null
check(seen?.variant==='capture'&&at>11000&&at<12300,`screamer de la capture ${at?(at/1000).toFixed(1)+' s':'absent'} après le début de la chanson (13,1 s)`)
check(db(scream.peak)>-4&&db(scream.mean)>-8,`screamer à fond, au plafond comme la capture (${db(scream.peak).toFixed(1)} dB en crête, ${db(scream.mean).toFixed(1)} dB en moyenne)`)
await page.evaluate(()=>window.__game.getState().returnToMenu());await page.waitForTimeout(400)
await page.evaluate(()=>[...document.querySelectorAll('.menu-item')].find(b=>b.textContent==='SUCCÈS')?.click());await page.waitForTimeout(300)
const panel=await page.evaluate(()=>document.querySelector('.achievements-panel')?.textContent||'')
check(/1 \/ 1/.test(panel)&&/OIIA OIIA/.test(panel),`menu SUCCÈS : « ${panel.replace(/\s+/g,' ').slice(0,70)} »`)
check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
await ctx.close()
}

if(run('rafale')){
// ----- Rafale de E (signalé le 6 novembre 2026) : un dialogue « en marchant » ne doit pas se relancer à chaque appui,
// une porte ouverte ne rejoue pas son loquet.
console.log('\n=== Rafale de E ===')
const {ctx,page}=await open(DESKTOP,{quality:'low'});const errors=[];page.on('pageerror',e=>errors.push(e.message))
await enterHospital(page);await page.waitForTimeout(800)
await page.evaluate(()=>{window.__ev=[];window.__opens=0;window.__game.subscribe((s,p)=>{if(s.lastEvent!==p.lastEvent)window.__ev.push(s.lastEvent.type);if(s.dialog&&s.dialog!==p.dialog)window.__opens++})})
const spam=async ms=>{const end=Date.now()+ms;while(Date.now()<end){await page.keyboard.press('e');await page.waitForTimeout(45)}}
for(const [id,from] of [['tv',[-8.32,1.46]],['reception_pc',[-6.05,-.65]],['note',[11.15,3.16]]]){
 await page.evaluate(()=>{const g=window.__game.getState();if(g.modal)g.closeModal();window.__ev=[];window.__opens=0})
 await aim(page,from,INTERACTIVES.find(o=>o.id===id).hit);await page.waitForTimeout(600)
 await page.evaluate(()=>{window.__ev=[];window.__opens=0});await spam(2500)
 const r=await page.evaluate(()=>({opens:window.__opens,ev:window.__ev.length}))
 check(r.opens<=2,`${id} : 2,5 s de rafale, dialogue ouvert ${r.opens} fois (${r.ev} événements)`)
}
await page.evaluate(()=>{const g=window.__game;if(g.getState().modal)g.getState().closeModal();g.setState({hasKey:true,sectorOpen:true,doorsOpened:{}});window.__ev=[]})
await aim(page,[-1.05,12.3],[-2.25,1.5,12.3]);await page.waitForTimeout(600);await page.evaluate(()=>{window.__ev=[]});await spam(1500)
const latches=await page.evaluate(()=>window.__ev.filter(e=>e==='latch').length)
check(latches===1,`porte : un seul loquet pour toute la rafale (${latches})`)
check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
await ctx.close()
}

if(run('prologue')){
// ----- Voix de Paul : chaque carte du prologue est lue, la suivante coupe la précédente, « Passer » la fait taire.
console.log('\n=== Prologue lu par Paul ===')
const ctx=await browser.newContext(DESKTOP);await ctx.addInitScript(METER);await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',volume:.7,muted:false})))
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.mouse.click(5,5);await page.evaluate(()=>{window.__audio.initAudio();window.__game.getState().newGame()})
let playing=false;try{await page.waitForFunction(()=>window.__audio.isVoicePlaying(),null,{timeout:5000});playing=true}catch{}
check(playing&&(await page.evaluate(()=>window.__game.getState().modal))==='prologue','carte 1 : Paul lit le prologue')
const lvl=await measure(page,1500);check(db(lvl.mean)>-40,`voix audible (${db(lvl.mean).toFixed(1)} dB en moyenne)`)
await page.keyboard.press('e');await page.waitForTimeout(150);await page.keyboard.press('e');await page.waitForTimeout(600)
check((await page.evaluate(()=>document.querySelector('.prologue-card footer')?.textContent||'')).startsWith('2 / 4')&&await page.evaluate(()=>window.__audio.isVoicePlaying()),'carte 2 : nouvelle prise lancée')
await page.evaluate(()=>document.querySelector('.prologue-skip').click());await page.waitForTimeout(300)
check(!(await page.evaluate(()=>window.__audio.isVoicePlaying()))||(await page.evaluate(()=>window.__game.getState().dialog))==='intro','« Passer le prologue » coupe Paul')
check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
await ctx.close()
}

await browser.close()
console.log(`\n${total-failed}/${total} vérifications réussies`)
if(failed)console.log(`CONTROLES ECHOUES : ${failed}`)

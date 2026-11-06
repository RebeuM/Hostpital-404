// Parcours complet piloté (Playwright) : menu, déplacements, proximité, énigmes, screamer, pause, sauvegarde, poursuite, capture, fin.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
// Parcours complet piloté (Playwright) : déplacements, proximité, énigmes, pause, sauvegarde, poursuite, fin.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
// Parcours complet piloté (Playwright) : déplacements, proximité, énigmes, pause, sauvegarde, poursuite, fin.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
import {chromium} from 'playwright'
import {targetCenter} from '../src/game/layout.js'
import fs from 'fs'
const URL=process.env.URL||'http://localhost:5179/'
const OUT=process.env.OUT||'./docs/screenshots/run';fs.mkdirSync(OUT,{recursive:true})
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const context=await browser.newContext({viewport:{width:1280,height:720}})
await context.addInitScript(()=>{localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low'}))})
const page=await context.newPage()
const logs=[];page.on('console',m=>{if(['error','warning'].includes(m.type())&&!m.text().includes('GPU stall'))logs.push(`[${m.type()}] ${m.text()}`)});page.on('pageerror',e=>logs.push('[pageerror] '+e.message+' '+(e.stack||'').slice(0,500)))
const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+' '+r.status())})
const click=sel=>page.evaluate(sel=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(sel));if(!el)throw new Error('no button '+sel);el.click()},sel)
const st=()=>page.evaluate(()=>{const s=window.__game.getState();const r=window.__runtime.player;return {phase:s.phase,paused:s.paused,modal:s.modal,dialog:s.dialog,chapter:s.chapter,hasKey:s.hasKey,sectorOpen:s.sectorOpen,usb:s.usb,near:s.near?.id||null,zone:s.zone,chase:s.chase,chaseTime:+s.chaseTime.toFixed(1),hasSave:s.hasSave,x:+r.x.toFixed(2),z:+r.z.toFixed(2),locked:!!document.pointerLockElement,elapsed:+s.elapsed.toFixed(1),notice:s.notice}})
const setPlayer=(x,z,yaw)=>page.evaluate(([x,z,yaw])=>{const r=window.__runtime.player;r.x=x;r.z=z;r.yaw=yaw;r.pitch=0;window.__runtime.look.yaw=yaw;window.__runtime.look.pitch=0;window.__game.setState({pointerLocked:true})},[x,z,yaw])
let checksFailed=0
const check=(cond,msg)=>{console.log((cond?'PASS ':'FAIL ')+msg);if(!cond){checksFailed++;process.exitCode=1;console.log('   logs:',logs.slice(-3).join(' | '))}}
process.on('uncaughtException',e=>{console.log('CRASH',e.message.split('\n')[0]);console.log('CONSOLE',logs.length);logs.slice(0,30).forEach(l=>console.log(' ',l));process.exit(1)})
const walk=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key)}
const walkUntil=async(key,cond,timeout=9000)=>{await page.keyboard.down(key);try{await page.waitForFunction(cond,null,{timeout})}catch{}await page.keyboard.up(key)}
const fps=await (async()=>{await page.waitForTimeout(100);return 0})()
const pressE=async()=>{await page.keyboard.press('e');await page.waitForTimeout(300)}
// Fait défiler un dialogue « bulle » avec la touche E (complète le texte, passe à la réplique suivante, attend le blackout).
// L'attente finale dépasse l'anti-rebond qui suit un dialogue : le script se téléporte, là où un joueur marche jusqu'à l'objet suivant.
const finishDialogue=async(max=90)=>{for(let i=0;i<max;i++){const s=await st();if(s.modal!=='story'){await page.waitForTimeout(520);return};await page.keyboard.press('e');await page.waitForTimeout(170)}}
// Se place face à un objet et attend que la détection de proximité le signale.
const approach=async(x,z,yaw,id)=>{await setPlayer(x,z,yaw);{const [tx,ty,tz]=targetCenter(id);const ay=Math.atan2(tx-x,tz-z),ap=Math.atan2(ty-1.68,Math.hypot(tx-x,tz-z));await page.evaluate(([y,p])=>{const r=window.__runtime;r.player.yaw=y;r.player.pitch=p;r.look.yaw=y;r.look.pitch=p},[ay,ap])}try{await page.waitForFunction(id=>window.__game.getState().near?.id===id,id,{timeout:8000})}catch{}const s=await st();check(s.near===id,`rayon sur la cible : ${id} (près=${s.near}, zone=${s.zone})`);return s}

let s0
await page.goto(URL,{waitUntil:'load'})
await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
console.log('fps (menu)',await page.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r((n/2).toFixed(1))};requestAnimationFrame(f)})))
try{await page.waitForFunction(()=>{const v=document.querySelector('.menu-video');return v&&!v.paused&&v.readyState>2&&v.videoWidth>0},null,{timeout:6000})}catch{}
const vid=await page.evaluate(()=>{const v=document.querySelector('.menu-video');return v?{playing:!v.paused&&v.readyState>2,w:v.videoWidth}:null});check(vid&&vid.playing&&vid.w>0,`vidéo d'arrière-plan du menu en lecture (${vid&&vid.w} px)`)
check((await page.locator('.menu-item').count())===7,'menu : 7 entrées (Nouvelle partie, Continuer, Classement, Succès, Options, Quitter, Commandes)')
for(let i=0;i<4;i++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForTimeout(250);check((await page.locator('.settings-panel').count())===1,'navigation clavier : flèches + Entrée ouvrent les Options')
await page.evaluate(()=>document.querySelector('.settings-panel .close-x').click());await page.waitForTimeout(150)
await click('NOUVELLE PARTIE');await page.waitForTimeout(250)
check(await page.locator('.difficulty-panel').count()===1,'le choix de la difficulté s’affiche avant la partie')
await page.click('.difficulty-card:has-text("Difficile")');await page.waitForTimeout(100);check((await page.evaluate(()=>window.__game.getState().settings.difficulty))==='hard','la difficulté choisie est retenue')
await page.click('.difficulty-card:has-text("Normale")');await click('COMMENCER');await page.waitForTimeout(500)
check((await st()).modal==='prologue'&&await page.locator('.prologue-card').count()===1,'nouvelle partie → prologue sur le parvis')
await page.keyboard.press('e');await page.waitForTimeout(80);await page.keyboard.press('e');await page.waitForTimeout(150);check((await page.locator('.prologue-card .file-tag').textContent()).includes('LES ANNÉES'),'E avance dans le prologue')
check(await page.evaluate(()=>window.__audio.isMusicPlaying()),'la musique de fond joue');await click('Passer le prologue');await page.waitForTimeout(250);s0=await st();check(s0.modal===null&&s0.paused===false&&s0.zone.includes('PARVIS')&&await page.locator('.prologue').count()===0,'le prologue se passe, le joueur est sur le parvis')
// Marche réelle jusqu'à l'entrée, E sur la porte, passage : la porte claque et le dialogue d'arrivée démarre.
await walkUntil('KeyW',()=>window.__runtime.player.z>-6.2);s0=await st();check(s0.z>-6.3&&s0.modal===null,`l'allée mène à la porte (z=${s0.z})`)
await page.evaluate(()=>{const r=window.__runtime;r.player.pitch=0;r.look.pitch=0;r.player.x=0;r.player.yaw=0;r.look.yaw=0});await page.waitForTimeout(300)
s0=await st();check(s0.near==='hospital_door',`rayon sur la porte (${s0.near})`)
await walk('KeyW',500);s0=await st();check(s0.z<=-4.7&&s0.modal===null,`porte fermée : passage bloqué (z=${s0.z})`)
await pressE();check(await page.evaluate(()=>window.__game.getState().entranceOpen)===true,'E ouvre la porte')
await walkUntil('KeyW',()=>window.__game.getState().outside===false);await page.waitForTimeout(300)
// Saut réel : la touche Espace soulève le joueur puis il retombe.
{const before=await st();const p=page.evaluate(()=>new Promise(res=>{let top=0;const t0=performance.now();const f=()=>{top=Math.max(top,window.__runtime.player.jump);if(performance.now()-t0<1000)requestAnimationFrame(f);else res({top,end:window.__runtime.player.jump})};requestAnimationFrame(f)}));await page.keyboard.press('Space');const j=await p;check(j.top>.4&&j.end===0,`Espace fait sauter, puis retombée (${j.top.toFixed(2)} m)`)
 check(before.modal==='story'&&await page.evaluate(()=>window.__game.getState().dialogWalk),'le dialogue d’arrivée laisse le contrôle')
 const z0=before.z;await walk('KeyS',500);const z1=(await st()).z;check(z1<z0-.2,`on marche pendant le dialogue (z ${z0} → ${z1})`)
 await page.evaluate(()=>{const r=window.__runtime.player;r.z=-1.9;r.x=0})}
let s=await st();check(s.phase==='playing'&&s.dialog==='intro','en franchissant la porte → dialogue d’introduction')
check(await page.locator('.speech-bubble .speaker-tag').count()===1&&(await page.locator('.speaker-tag').textContent())==='THOMAS','bulle de dialogue avec l’étiquette THOMAS')
await page.keyboard.press('e');await page.waitForTimeout(120);check((await page.locator('.dialogue-layer').getAttribute('data-complete'))==='1','E complète la réplique en cours')
await page.keyboard.press('e');await page.waitForTimeout(250);s=await st();check(s.dialog==='intro'&&(await page.locator('.speaker-tag').textContent())==='MAXIME','E passe à la réplique suivante (MAXIME)')
await page.evaluate(()=>{window.__lockCalls=0;const r=HTMLCanvasElement.prototype.requestPointerLock;HTMLCanvasElement.prototype.requestPointerLock=function(...a){window.__lockCalls++;return r.apply(this,a)}})
await finishDialogue();await page.waitForTimeout(300)
s=await st();check(s.modal===null&&s.paused===false&&await page.evaluate(()=>window.__lockCalls>0),'après le dialogue, le verrou de la caméra est demandé sans clic, sans mise en pause')
check(await page.getByText('Cliquer pour reprendre').count()===0,'aucune invite « cliquer pour reprendre »')
// Déplacement clavier réel : simulation de verrou, puis marche avant.
await setPlayer(0,-2,0);await page.waitForTimeout(100)
await walkUntil('KeyW',()=>window.__runtime.player.z>-1.2);s=await st();check(s.z>-1.2,`ZQSD/WASD : avance (z=${s.z})`)
console.log('fps (jeu)',await page.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r((n/2).toFixed(1))};requestAnimationFrame(f)})))
await walkUntil('ArrowLeft',()=>window.__runtime.player.x>0.3);s=await st();check(s.x>=0.3,`flèche gauche : pas de côté vers la gauche (face à +z, la gauche est +x ; x=${s.x})`)
await setPlayer(0,-2,0);await walkUntil('KeyD',()=>window.__runtime.player.x<-0.3);s=await st();check(s.x<=-0.3,`D : pas de côté vers la droite (x=${s.x})`)
await setPlayer(0,-2,0);await page.keyboard.down('ShiftLeft');const tr=Date.now();await walkUntil('KeyW',()=>window.__runtime.player.z>0.5);const runMs=Date.now()-tr;await page.keyboard.up('ShiftLeft');await setPlayer(0,-2,0);const tw=Date.now();await walkUntil('KeyW',()=>window.__runtime.player.z>0.5);const walkMs=Date.now()-tw;check(runMs<walkMs,`course plus rapide que la marche (${runMs} ms contre ${walkMs} ms pour 2,5 m)`)
// Collision : foncer dans le portail fermé.
await setPlayer(0,6.4,0);await walk('KeyW',4000);s=await st();check(s.z<=7.95&&s.z>6.5,`le portail fermé bloque (z=${s.z})`)
// Mur latéral.
await setPlayer(0,20,Math.PI/2);await walk('KeyW',4000);s=await st();check(s.x<2.0&&s.x>0.5,`le mur du couloir bloque (x=${s.x})`)
// Mobilier : comptoir de l'accueil (face nord à z=2,26, rayon du joueur 0,24).
await setPlayer(-6.4,3.6,Math.PI);await walk('KeyW',4000);s=await st();check(s.z>2.4&&s.z<2.7,`le comptoir d’accueil bloque (z=${s.z})`)
await page.screenshot({path:`${OUT}/01-accueil.png`})
// Lampe torche : F.
await page.keyboard.press('f');await page.waitForTimeout(100);check((await page.evaluate(()=>window.__game.getState().flashlight))===false,'F éteint la lampe');await page.keyboard.press('f')
// Pause : Échap (sans verrou réel, bascule directe) suspend le temps.
await page.keyboard.press('Escape');await page.waitForTimeout(200);s=await st();check(s.paused===true,'Échap met en pause')
check(await page.locator('.pause-panel').count()===1,'menu de pause affiché')
const e0=s.elapsed;await page.waitForTimeout(1500);s=await st();check(s.elapsed===e0,'le temps de jeu est suspendu en pause')
await click('RÉGLAGES');await page.waitForTimeout(200);check(await page.locator('.settings-panel').count()===1,'panneau de réglages ouvert depuis la pause')
await page.evaluate(()=>{const b=[...document.querySelectorAll('.seg button')].find(b=>b.textContent==='Basse');b.click()})
await page.evaluate(()=>document.querySelector('.settings-panel .close-x').click());await page.waitForTimeout(200)
await click('REPRENDRE');await page.waitForTimeout(200);s=await st();check(s.paused===false,'reprise depuis la pause')
// Acte I : squatteur (vraie détection de proximité), puis portail.
await approach(-5.9,3.7,Math.PI/2,'squatter');await pressE();s=await st();check(s.dialog==='squatter','E parle au squatteur')
for(let i=0;i<6;i++){await page.keyboard.press('e');await page.waitForTimeout(150)}
check(await page.locator('.item-get').count()===1&&(await page.locator('.item-get-label').textContent()).includes('Clé'),'animation « clé récupérée » affichée')
s=await st();check(s.hasKey===true,'la clé est dans l’inventaire au moment de l’animation')
await finishDialogue();s=await st();check(s.modal===null&&s.hasKey,'fin du dialogue du squatteur')
await approach(0,6.2,0,'sector');await pressE();s=await st();check(s.dialog==='disappearance'&&s.sectorOpen===false,'dialogue de la disparition ouvert, portail encore fermé')
await page.keyboard.press('e');await page.waitForTimeout(120);await page.keyboard.press('e');await page.waitForTimeout(400)
check(await page.locator('.blackout-veil').count()===1&&(await st()).sectorOpen===false,'écran noir : Maxime n’a pas encore disparu')
await page.waitForTimeout(2600);s=await st();check(s.sectorOpen===true&&s.chapter===2&&(await page.locator('.blackout-veil').count())===0,'lumière revenue : portail ouvert, Maxime a disparu')
await finishDialogue();await page.waitForTimeout(200)
await walkUntil('KeyW',()=>window.__runtime.player.z>8.6);s=await st();check(s.z>8.6,`le portail ouvert laisse passer (z=${s.z})`)
s=await st();check(s.hasSave===true,'sauvegarde automatique après la progression')
// Acte II : plaque 203 et tiroir sécurisé.
await approach(-10.0,14.5,-Math.PI/2,'bed203');await pressE();await finishDialogue();await page.waitForTimeout(200)
await approach(-6.0,16.6,0,'patients');await pressE();s=await st();check(s.modal==='puzzle'&&s.dialog==='patients','énigme des chambres ouverte')
const penalty0=await page.evaluate(()=>window.__game.getState().penalty);await page.fill('#puzzleAnswer','201');await click('VALIDER');await page.waitForTimeout(200);s=await st();check(s.modal==='puzzle','mauvaise réponse refusée')
const sc=await page.evaluate(()=>({overlay:document.querySelectorAll('.screamer').length,img:document.querySelector('.screamer img')?.naturalWidth||0,terminal:document.querySelectorAll('.terminal-scare').length,variant:window.__game.getState().scare?.variant,anim:document.querySelector('.screamer')?.className}))
check(sc.overlay===1&&(sc.img>0||sc.terminal===1)&&sc.variant,`screamer affiché à l'échec (variante ${sc.variant}, ${sc.img?sc.img+' px':'terminal'})`)
await page.waitForTimeout(1900);check((await page.evaluate(()=>document.querySelectorAll('.screamer').length))===0,'screamer disparu après sa durée (≤ 1,6 s)')
check(await page.locator('.error-line').count()===1,'message « ACCÈS REFUSÉ » affiché')
{const before=await page.evaluate(()=>{const s=window.__game.getState();return {penalty:s.penalty,error:s.penalties.error}});check(before.penalty-penalty0===60&&before.error===1,`une erreur coûte une seule minute, screamer compris (${before.penalty-penalty0} s)`)
 const shown=await page.locator('.puzzle-clock').textContent();check(/^\s*2[0-9]:[0-9]{2}/.test(shown),`minuteur visible pendant l’énigme (${shown.trim().slice(0,5)})`)
 await page.waitForTimeout(1800);check(await page.locator('.hint-box p').count()===0,'aucun indice affiché sans le demander')
 await page.click('.hint-btn');await page.waitForTimeout(150)
 const after=await page.evaluate(()=>{const s=window.__game.getState();return {penalty:s.penalty,hint:s.penalties.hint}});check(after.penalty-before.penalty===60&&after.hint===1&&await page.locator('.hint-box p').count()===1,`un indice demandé apparaît et coûte une minute (${after.penalty-before.penalty} s)`)}
await page.fill('#puzzleAnswer','203');await page.keyboard.press('Enter');await page.waitForTimeout(300);s=await st();check(s.chapter===3&&s.dialog==='patients','code 203 accepté (Entrée)')
await finishDialogue();await page.waitForTimeout(200)
await page.screenshot({path:`${OUT}/02-patients.png`})
// Acte III : coffre.
await approach(5.6,16.6,0,'radio');await pressE();await page.fill('#puzzleAnswer','0024');await click('VALIDER');await page.waitForTimeout(300);s=await st();check(s.chapter===4,'code 0024 accepté');await finishDialogue()
// Acte IV : sécurité.
await approach(-8.5,26.0,-Math.PI/2,'security');await pressE();await page.fill('#puzzleAnswer','0600');await click('VALIDER');await page.waitForTimeout(300);s=await st();check(s.chapter===5,'code 0600 accepté');await finishDialogue()
// Acte V : SQL.
await approach(10.0,35.0,0,'lab');await pressE();await page.fill('#puzzleAnswer',"SELECT * FROM patients WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018;");await click('VALIDER');await page.waitForTimeout(300);s=await st();check(s.chapter===6,'requête SQL acceptée');await finishDialogue()
await page.waitForTimeout(200)
// Journal / inventaire / carte.
await page.keyboard.press('j');await page.waitForTimeout(200);check(await page.locator('.journal-list article').count()>=8,'journal rempli sans doublon ('+await page.locator('.journal-list article').count()+' preuves)')
await page.keyboard.press('i');await page.waitForTimeout(200);check(await page.locator('.inventory-list article, .inventory-list .inventory-doc').count()===5,'inventaire : 5 objets avant la morgue (documents lisibles compris)')
await page.keyboard.press('m');await page.waitForTimeout(200);check(await page.locator('.minimap.large').count()===1,'carte agrandie')
await page.screenshot({path:`${OUT}/03-carte.png`})
await page.keyboard.press('Escape');await page.waitForTimeout(200);s=await st();check(s.paused===false&&(await page.locator('.journal-overlay').count())===0,'Échap ferme le journal sans mettre en pause')
// Sauvegarde / reprise : retour au menu puis CONTINUER.
await page.keyboard.press('Escape');await page.waitForTimeout(200);await click('MENU PRINCIPAL');await page.waitForTimeout(300);s=await st();check(s.phase==='menu','retour au menu')
check(await page.locator('button.menu-item:has-text("CONTINUER"):not([disabled])').count()===1,'bouton CONTINUER actif dans le menu')
await click('CONTINUER');await page.waitForTimeout(400);s=await st();check(s.phase==='playing'&&s.chapter===6&&s.paused===true,`reprise au chapitre ${s.chapter} (en pause, position ${s.x},${s.z})`)
await click('REPRENDRE');await page.waitForTimeout(200)
// Sauvegarde corrompue → nouvelle partie propre.
const saveRaw=await page.evaluate(()=>localStorage.getItem('hospital404.save'));check(JSON.parse(saveRaw).version===4,'sauvegarde versionnée (v4)')
// Acte VI : morgue, clé USB, poursuite.
await approach(-6.8,43.6,Math.PI,'morgue');await pressE();s=await st();check(s.dialog==='morgue','téléphone de Maxime et vidéo')
await finishDialogue();await page.waitForTimeout(300);s=await st();check(s.usb&&s.chase===true&&s.chapter===7,'clé USB récupérée, la poursuite commence')
check(await page.locator('.chase-warning').count()===1,'bandeau de fuite affiché')
// Adrien part de la porte de la morgue : on file aussitôt vers la galerie (ouverte uniquement pendant la fuite).
await setPlayer(-10.5,43,-Math.PI/2);await walkUntil('KeyW',()=>window.__runtime.player.x<-12.0);await page.waitForTimeout(300);s=await st();check(s.x<-12.0&&s.zone==='PASSAGE SECRET',`la galerie secrète est ouverte (x=${s.x}, ${s.zone})`)
await page.screenshot({path:`${OUT}/04-chase.png`})
await setPlayer(-13.25,30,0)
await page.keyboard.press('Escape');await page.waitForTimeout(300);const t1=(await st()).chaseTime;await page.waitForTimeout(2000);s=await st();check(Math.abs(s.chaseTime-t1)<.05,`chrono de fuite suspendu en pause (${t1}→${s.chaseTime})`)
await click('REPRENDRE');await page.waitForTimeout(1500);s=await st();check(s.chaseTime<t1-.5&&s.phase==='playing',`chrono de fuite reprend (${s.chaseTime})`)
await setPlayer(-13.25,2.8,Math.PI/2);await walkUntil('KeyW',()=>window.__runtime.player.x>-11.5);s=await st();check(s.x>-11.5,`sortie de la galerie vers l’accueil (x=${s.x})`)
await page.screenshot({path:`${OUT}/05-secret.png`})
await approach(0,-2.6,0,'exit');await pressE();await page.waitForTimeout(400);s=await st();check(s.phase==='ending'&&(await page.evaluate(()=>window.__game.getState().endingReason))==='exit','fin atteinte par la sortie');check((await page.locator('.end-mark').textContent()).includes('GOOD END'),'bonne fin affichée (GOOD END)')
{const r=await page.evaluate(()=>({rec:window.__game.getState().lastRecord,stored:JSON.parse(localStorage.getItem('hospital404.records')||'[]').length,shown:document.querySelector('.end-time-main strong')?.textContent}));check(r.rec?.ending==='exit'&&r.stored>=1&&/^\d\d:\d\d$/.test(r.shown||''),`temps enregistré et affiché en fin de partie (${r.shown})`)}
check(await page.locator('.end-mark').count()===1,'écran de fin affiché');await page.screenshot({path:`${OUT}/06-end.png`})
check((await page.evaluate(()=>localStorage.getItem('hospital404.save')))===null,'sauvegarde effacée après la fin')
await click('RECOMMENCER');await page.waitForTimeout(300);s=await st();check(s.chapter===1&&s.chase===false&&s.modal==='prologue','RECOMMENCER remet à zéro et relance le prologue')
// La machine à écrire suit la voix de Paul quand elle joue : on vérifie que le texte avance, pas une vitesse précise.
await page.waitForTimeout(1200);const typed1=((await page.locator('.prologue-card p').textContent())||'').length;await page.waitForTimeout(1000);const typed2=((await page.locator('.prologue-card p').textContent())||'').length
check(typed1>3&&typed2>typed1+5,`le texte du prologue défile (${typed1} puis ${typed2} caractères)`)
await page.keyboard.press('Escape');await page.waitForTimeout(200);s=await st();check(s.modal===null&&s.paused===false,'Échap passe le prologue sans mettre en pause')
await page.evaluate(()=>window.__game.getState().enterHospital());await page.waitForTimeout(200)
// Fin par capture : Thomas reste immobile sur le chemin d'Adrien.
await finishDialogue();await page.evaluate(()=>window.__game.setState({usb:true,done:{patients:true,radio:true,security:true,lab:true},sectorOpen:true,hasKey:true,chapter:7,chaseTime:110,paused:false}))
await page.evaluate(()=>window.__game.setState({chase:true}));await setPlayer(-8,43,0)
try{await page.waitForFunction(()=>window.__game.getState().phase==='ending',null,{timeout:15000})}catch{}
s=await st();check(s.phase==='ending','Adrien rattrape Thomas immobile → fin « capturé »')
await click('RECOMMENCER');await page.waitForTimeout(300);await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();g.enterHospital()});await page.waitForTimeout(200)
// Fin par capture (chrono).
await finishDialogue();await page.evaluate(()=>window.__game.setState({usb:true,done:{patients:true,radio:true,security:true,lab:true},sectorOpen:true,hasKey:true,chase:true,chapter:7,chaseTime:0.3,paused:false}))
await page.waitForTimeout(2500);s=await st();check(s.phase==='ending','chrono à zéro → capturé')
await click('RECOMMENCER');await page.waitForTimeout(300);await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();window.__game.setState({elapsed:1799.5,penalty:0})});await page.waitForTimeout(1500)
{const r=await page.evaluate(()=>({reason:window.__game.getState().endingReason,mark:document.querySelector('.end-mark')?.textContent||'',rec:window.__game.getState().lastRecord}));check(r.reason==='timeout'&&r.mark.includes('SAD END')&&r.rec?.ending==='timeout','minuteur à zéro : fin tragique, temps écoulé')}
// Sauvegarde corrompue (depuis l'écran de fin, rien n'est ré-écrit).
await page.evaluate(()=>{localStorage.setItem('hospital404.save','{corrompu');window.__game.getState().returnToMenu()});await page.waitForTimeout(300)
s=await st();check(s.phase==='menu'&&(await page.locator('button.menu-item:has-text("CONTINUER")[disabled]').count())===1,'sauvegarde corrompue ignorée : CONTINUER grisé')
// Sauvegarde incohérente (position dans un mur) → reprise à un point sûr.
await page.evaluate(()=>localStorage.setItem('hospital404.save',JSON.stringify({version:3,flags:{hasKey:true,sectorOpen:true,done:{patients:true,radio:true}},player:{x:2.25,z:20,yaw:0}})))
await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
check(await page.locator('button.menu-item:has-text("CONTINUER"):not([disabled])').count()===1,'sauvegarde réparable proposée');await click('CONTINUER');await page.waitForTimeout(300);s=await st()
check(s.chapter===4&&s.x===7&&s.z===15,`reprise réparée au chapitre ${s.chapter} en (${s.x}, ${s.z})`)
check(await page.locator('.pause-panel .warn-line').count()===1,'avertissement de sauvegarde réparée affiché')
console.log('CONSOLE',logs.length);logs.slice(0,30).forEach(l=>console.log(' ',l))
console.log('CONTROLES ECHOUES',checksFailed);console.log('REQUETES ECHOUEES',failed.length);failed.slice(0,30).forEach(l=>console.log(' ',l))
await browser.close()

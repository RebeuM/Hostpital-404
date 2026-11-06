// Parcours téléphone piloté (Playwright) : vrais événements tactiles via CDP, en paysage et en portrait.
// Vérifie la mise en page de chaque écran, le joystick, le regard à deux pouces, la course, les boutons, le clavier d'énigme et la mémoire des textures.
// Prérequis : playwright installé ; serveur : npm run dev -- --port 5179
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
import {chromium} from 'playwright'
import {targetCenter} from '../src/game/layout.js'
const URL=process.env.URL||'http://localhost:5179/'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const DEVICES=[
 {name:'iPhone paysage',w:844,h:390,ua:IPHONE,fov:[62,67]},
 {name:'Android portrait',w:360,h:640,ua:ANDROID,fov:[86,92]},
 {name:'iPhone portrait',w:390,h:844,ua:IPHONE,fov:[97,104]},
 {name:'petit paysage',w:640,h:360,ua:ANDROID,fov:[74,76]},
 // Barres de Safari visibles : la zone utile est nettement plus petite que l'écran.
 {name:'iPhone paysage, barres visibles',w:800,h:330,ua:IPHONE,fov:[57,61]},
 {name:'iPhone portrait, barres visibles',w:390,h:664,ua:IPHONE,fov:[85,88]}
]
let failed=0,total=0
const check=(ok,msg)=>{total++;console.log((ok?'PASS ':'FAIL ')+msg);if(!ok){failed++;process.exitCode=1}}
for(const d of DEVICES){
 console.log(`\n=== ${d.name} (${d.w}×${d.h}) ===`)
 const ctx=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:d.ua})
 await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:false})))
 const page=await ctx.newPage()
 const logs=[];page.on('pageerror',e=>logs.push(e.message));page.on('console',m=>{const t=m.text();if(m.type()==='error'&&!t.includes('404'))logs.push(t.slice(0,180));else if(t.includes('[prewarm]'))logs.push(t.slice(0,180))})
 const cdp=await ctx.newCDPSession(page)
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id}))})
 const tapAt=async(x,y)=>{await touch('touchStart',[[x,y]]);await page.waitForTimeout(40);await touch('touchEnd',[])}
 const tap=async sel=>{const b=await page.locator(sel).first().boundingBox();if(!b)throw new Error('introuvable : '+sel);await tapAt(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(120)}
 const g=(fn,arg)=>page.evaluate(fn,arg)
 const st=()=>g(()=>{const s=window.__game.getState(),p=window.__runtime.player;return {phase:s.phase,modal:s.modal,dialog:s.dialog,near:s.near?.id||null,paused:s.paused,flash:s.flashlight,journal:s.journalVisible,done:s.done,x:p.x,z:p.z,yaw:p.yaw,jump:p.jump,device:s.inputDevice,running:window.__runtime.stamina.running}})
 const place=(x,z,yaw,pitch=0)=>g(([x,z,yaw,pitch])=>{const r=window.__runtime;r.player.x=x;r.player.z=z;r.player.yaw=yaw;r.player.pitch=pitch;r.look.yaw=yaw;r.look.pitch=pitch},[x,z,yaw,pitch])
 // Aucun élément clé ne sort de l'écran et la page ne déborde pas.
 const inView=async(label,sels)=>{const r=await g(sels=>{const out=[];for(const s of sels)for(const e of document.querySelectorAll(s)){const c=getComputedStyle(e);if(c.display==='none'||c.visibility==='hidden')continue;const b=e.getBoundingClientRect();if(!b.width||!b.height)continue;if(b.left<-1||b.top<-1||b.right>innerWidth+1||b.bottom>innerHeight+1)out.push(`${s} [${[b.left,b.top,b.right,b.bottom].map(Math.round)}]`)}if(document.documentElement.scrollWidth>innerWidth+1)out.push('la page déborde');return out},sels);check(r.length===0,`${label} : rien hors de l'écran${r.length?' → '+r.slice(0,4).join(' | '):''}`)}
 const targets=async(label,sel,min=40)=>{const r=await g(([sel,min])=>[...document.querySelectorAll(sel)].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const b=e.getBoundingClientRect();return [e.getAttribute('aria-label')||e.textContent.trim().slice(0,18),Math.round(b.width),Math.round(b.height)]}).filter(([,w,h])=>w&&(w<min||h<min)),[sel,min]);check(r.length===0,`${label} : cibles d'au moins ${min} px${r.length?' → '+JSON.stringify(r.slice(0,4)):''}`)}

 await page.goto(URL,{waitUntil:'load'})
 await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
 check((await st()).device==='touch','le téléphone est reconnu comme tactile')
 // ----- Mémoire et rendu au menu
 const frame0=await g(()=>window.__gl.info.render.frame);await page.waitForTimeout(400);const frame1=await g(()=>window.__gl.info.render.frame)
 check(frame0===frame1,'aucun rendu 3D derrière le menu (batterie)')
 const tex=await g(()=>{const seen=new Map();window.__scene.traverse(o=>{for(const m of [].concat(o.material||[]))for(const k in m){const v=m[k];if(v&&v.isTexture&&v.image&&(v.image instanceof HTMLImageElement||v.image instanceof ImageBitmap||v.image instanceof HTMLCanvasElement)&&!seen.has(v.uuid))seen.set(v.uuid,[k,v.image.width,v.image.height,v.isCanvasTexture])}});let color=0,data=0,mo=0;for(const [k,w,h,made] of seen.values()){mo+=w*h*4*1.33;if(made)continue;if(['map','emissiveMap','alphaMap'].includes(k))color=Math.max(color,w,h);else data=Math.max(data,w,h)}return {n:seen.size,color,data,mo:Math.round(mo/1048576)}})
 check(tex.n>400&&tex.color<=1024&&tex.data<=1024&&tex.mo<500,`mémoire des textures maîtrisée : ${tex.n} textures, ${tex.mo} Mo, plus grandes ${tex.color}/${tex.data} px`)
 const big=await g(()=>{const seen=new Map();window.__scene.traverse(o=>{for(const m of [].concat(o.material||[]))for(const k of ['normalMap','roughnessMap','aoMap','metalnessMap']){const v=m[k];if(v?.image?.width&&!seen.has(v.uuid))seen.set(v.uuid,Math.max(v.image.width,v.image.height))}});return [...seen.values()].filter(s=>s>256).length});check(big===0,`cartes de relief limitées à 256 px (${big} au-delà)`)
 // ----- Menu
 const labels=await g(()=>[...document.querySelectorAll('.menu-item')].map(e=>e.textContent));check(!labels.includes('QUITTER')&&labels.includes('SUCCÈS')&&labels.length===6,'menu sans « Quitter », inutile dans un onglet de téléphone (SUCCÈS compris)')
 await inView('menu',['.menu-title img','.menu-item','.menu-copyright a']);await targets('menu','.menu-item',42)
 check(await page.locator('.menu-copyright a[href="/credits.html"]').isVisible(),'le lien des crédits reste accessible')
 check(await g(()=>!document.querySelector('.rotate-hint')),'aucun mur « tourne ton téléphone »')
 await tap('.menu-item:has-text("OPTIONS")');await page.waitForTimeout(150);await inView('options',['.settings-panel','.settings-panel .close-x']);await targets('options','.settings-panel button');await tap('.settings-panel .close-x')
 check(await page.locator('.settings-panel').count()===0,'le bouton de fermeture des options répond au doigt')
 await tap('.menu-item:has-text("COMMANDES")');await page.waitForTimeout(150);await inView('commandes',['.panel','.panel .close-x']);check(await page.locator('.touch-rows').count()===1,'commandes : la notice tactile s’affiche');await tap('.panel .close-x')
 await tap('.menu-item:has-text("NOUVELLE")');await page.waitForTimeout(200);await inView('difficulté',['.difficulty-panel','.difficulty-panel h2','.difficulty-card','.difficulty-panel .primary-btn'])
 await tap('.difficulty-panel .primary-btn');await page.waitForTimeout(800)
 check((await st()).modal==='prologue','toucher COMMENCER lance le prologue')
 await inView('prologue',['.prologue-card','.prologue-skip'])
 const tag0=await page.locator('.prologue-card .file-tag').textContent();await tapAt(d.w/2,d.h/2);await page.waitForTimeout(80);await tapAt(d.w/2,d.h/2);await page.waitForTimeout(250)
 check(tag0!==await page.locator('.prologue-card .file-tag').textContent(),'toucher l’écran fait avancer le prologue')
 await tap('.prologue-skip');await page.waitForTimeout(800)
 check((await st()).modal===null,'le prologue se passe au doigt')
 await inView('parvis',['.objectives','.top-actions','.touch-actions','.game-timer','.touch-btn'])
 await targets('commandes de jeu','.touch-btn,.top-actions button',44)
 // ----- Champ de vision
 const fov=await g(()=>window.__camera.fov);check(fov>=d.fov[0]&&fov<=d.fov[1],`champ de vision adapté à l'écran : ${fov.toFixed(1)}°`)
 // ----- Joystick et regard
 await g(()=>{const g=window.__game.getState();g.enterHospital();window.__game.getState().closeModal();window.__runtime.encounterIn=Infinity});await page.waitForTimeout(600)
 await place(0,1,0);await page.waitForTimeout(300)
 const sx=d.w*.2,sy=d.h*.72
 const a=await st();await touch('touchStart',[[sx,sy]]);await page.waitForTimeout(40);await touch('touchMove',[[sx,sy-50]]);await page.waitForTimeout(900);const b=await st();const walking=b.running
 check(b.z>a.z+.8,`le joystick fait avancer (${(b.z-a.z).toFixed(2)} m en 0,9 s)`)
 check(!walking,'pousser jusqu’à l’anneau marche, sans courir')
 check(await page.locator('.touch-stick').isVisible(),'le joystick apparaît sous le pouce')
 await touch('touchMove',[[sx,sy-90]]);await page.waitForTimeout(350);const c=await st();check(c.running,'pousser au-delà de l’anneau fait courir')
 check(await g(()=>document.querySelector('.touch-stick').classList.contains('running')),'l’anneau signale la course')
 // Second pouce pendant la marche : pas de zoom, on tourne tout en avançant.
 const rx=d.w*.72,ry=d.h*.42,yaw0=c.yaw
 await touch('touchMove',[[sx,sy-50,1],[rx,ry,2]]);await page.waitForTimeout(30)
 for(let i=1;i<=6;i++){await touch('touchMove',[[sx,sy-50,1],[rx-i*12,ry,2]]);await page.waitForTimeout(25)}
 await page.waitForTimeout(150);const e=await st()
 check(Math.abs(e.yaw-yaw0)>.1,`deux pouces : on regarde en marchant (${(e.yaw-yaw0).toFixed(2)} rad)`)
 check(e.z>c.z,'deux pouces : la marche continue pendant le regard')
 const zoom=await g(()=>visualViewport.scale);check(zoom===1,'pas de zoom de la page à deux doigts')
 await touch('touchEnd',[]);await page.waitForTimeout(300)
 const rest=await st();await page.waitForTimeout(350);const rest2=await st();check(Math.hypot(rest2.x-rest.x,rest2.z-rest.z)<.05,'lâcher le joystick arrête le joueur')
 check(!(await page.locator('.touch-stick').isVisible()),'le joystick disparaît au lâcher')
 const coach=await page.locator('.touch-coach').count();check(coach===0,'les aides de premier usage ont disparu')
 // ----- Boutons
 await place(0,1,0);const t0=(await st()).flash;await tap('.touch-torch');check((await st()).flash!==t0,'le bouton lampe répond');await tap('.touch-torch')
 const b0=await page.locator('.touch-jump').boundingBox();await touch('touchStart',[[b0.x+b0.width/2,b0.y+b0.height/2]]);await touch('touchEnd',[]);await page.waitForTimeout(160);check((await st()).jump>0,'le bouton saut fait sauter')
 await page.waitForTimeout(700)
 await tap('.touch-run');check(await page.locator('.touch-run[aria-pressed="true"]').count()===1,'le bouton course s’enclenche')
 await touch('touchStart',[[sx,sy]]);await page.waitForTimeout(30);await touch('touchMove',[[sx,sy-30]]);await page.waitForTimeout(350);check((await st()).running,'bouton course : on court sans pousser à fond')
 await touch('touchEnd',[]);await page.waitForTimeout(150);check(await page.locator('.touch-run[aria-pressed="true"]').count()===0,'lâcher le joystick relâche la course')
 // ----- Viser, interagir, dialogue
 // Le squatteur, à portée, visé trop haut et un peu à côté : au doigt, l'aide doit le trouver quand même.
 {const [tx,,tz]=targetCenter('squatter');const px=-5.9,pz=3.7;await place(px,pz,Math.atan2(tx-px,tz-pz)+.22,.1)}
 await page.waitForFunction(()=>window.__game.getState().near?.id==='squatter',null,{timeout:6000}).catch(()=>{})
 const n=await st();check(n.near==='squatter',`l’aide à la visée trouve la cible malgré un regard imprécis (${n.near})`)
 check(await page.locator('.touch-interact.on').count()===1,'le bouton « interagir » s’allume quand un objet est à portée')
 await inView('invite d’action',['.interact-prompt'])
 await tap('.touch-interact');await page.waitForTimeout(250);const dlg=await st();check(dlg.modal==='story','le bouton « interagir » ouvre le dialogue')
 await page.waitForTimeout(250);await inView('dialogue',['.speech-bubble']);const step0=await g(()=>window.__game.getState().dialogStep)
 await tapAt(d.w/2,d.h*.3);await page.waitForTimeout(100);await tapAt(d.w/2,d.h*.3);await page.waitForTimeout(300);check((await g(()=>window.__game.getState().dialogStep))>step0,'toucher l’écran fait avancer le dialogue')
 await g(()=>window.__game.getState().closeModal());await page.waitForTimeout(250)
 // ----- Énigmes : le clavier à l'écran remplace celui du téléphone
 await g(()=>window.__game.setState({modal:'puzzle',dialog:'patients',paused:false}));await page.waitForTimeout(350)
 check(await g(()=>document.getElementById('puzzleAnswer').readOnly),'énigme : le clavier du téléphone ne s’ouvre pas')
 await inView('énigme à code',['.touch-keypad','.touch-keypad button','.puzzle-file .modal-actions button','#puzzleAnswer'])
 await targets('clavier à code','.touch-keypad button',34)
 const doc=await g(()=>{const e=document.querySelector('.puzzle-doc');return e.scrollHeight>e.clientHeight?(e.scrollTop=e.scrollHeight,e.scrollTop>0):true});check(doc,'énigme : le document défile si nécessaire')
 for(const k of ['2','9'])await tap(`.touch-keypad button:text-is("${k}")`)
 await tap('.touch-keypad .erase');for(const k of ['0','3'])await tap(`.touch-keypad button:text-is("${k}")`)
 check((await page.inputValue('#puzzleAnswer'))==='203','énigme : saisie et correction au doigt')
 await tap('.puzzle-file .primary-btn');await page.waitForTimeout(300);check((await st()).done.patients,'énigme : VALIDER résout le code')
 await g(()=>window.__game.getState().closeModal());await page.waitForTimeout(200)
 await g(()=>window.__game.setState({modal:'puzzle',dialog:'lab',paused:false}));await page.waitForTimeout(350)
 await inView('énigme SQL',['.touch-keypad','.touch-keypad button','.puzzle-file .modal-actions button','#puzzleAnswer'])
 const typeKey=async k=>{const q=k===' '?'.touch-keypad .space':`.touch-keypad button:text-is("${k}")`;await tap(q)}
 await tap('.touch-keypad .long');for(const k of ['nom','=',"'",'V','A','S','S','E','U','R',"'",'AND','prenom','=',"'",'E','L','E','O','N','O','R','E',"'",'AND','annee_deces','=','2','0','1','8',';'])await typeKey(k)
 const sql=await page.inputValue('#puzzleAnswer');check(/select \* from patients where nom = 'vasseur' and prenom = 'eleonore' and annee_deces = 2018;/i.test(sql),'énigme SQL : la requête se compose au doigt');
 await tap('.puzzle-file .primary-btn');await page.waitForTimeout(300);check((await st()).done.lab,'énigme SQL : la requête est acceptée')
 await g(()=>window.__game.getState().closeModal());await page.waitForTimeout(200)
 // ----- Journal, carte, pause, fin
 await tap('.top-actions button[aria-label="Journal"]');await page.waitForTimeout(200);check((await st()).journal,'le bouton journal répond');await inView('journal',['.journal-card','.tabs button','.close-x']);await targets('onglets','.tabs button,.journal-card .close-x',44)
 await tap('.tabs button:has-text("Carte")');await page.waitForTimeout(200)
 const map=await page.locator('.minimap.large').boundingBox();check(map&&map.width>=180&&map.height>=150,`la carte reste lisible (${Math.round(map?.width)}×${Math.round(map?.height)})`)
 await tap('.journal-card .close-x');await page.waitForTimeout(200)
 await tap('.top-actions button[aria-label="Pause"]');await page.waitForTimeout(250);check((await st()).paused,'le bouton pause répond');await inView('pause',['.pause-panel','.pause-actions button']);await targets('pause','.pause-actions button',44)
 const f0=await g(()=>window.__gl.info.render.frame);await page.waitForTimeout(350);check(f0===await g(()=>window.__gl.info.render.frame),'la pause arrête le rendu 3D')
 await tap('.pause-actions .primary-btn');await page.waitForTimeout(300);check(!(await st()).paused,'REPRENDRE répond au doigt');const f1=await g(()=>window.__gl.info.render.frame);await page.waitForTimeout(200);check(await g(()=>window.__gl.info.render.frame)>f1,'le rendu reprend')
 // ----- Rotation en pleine partie
 const fovBefore=await g(()=>window.__camera.fov)
 await page.setViewportSize({width:d.h,height:d.w});await page.waitForTimeout(500)
 const rot=await g(()=>({fov:window.__camera.fov,aspect:window.__camera.aspect,cw:window.__gl.domElement.clientWidth,iw:innerWidth}))
 check(Math.abs(rot.aspect-d.h/d.w)<.02&&rot.cw===rot.iw&&Math.abs(rot.fov-fovBefore)>3,`rotation : image et champ de vision suivent (${fovBefore.toFixed(0)}° → ${rot.fov.toFixed(0)}°)`)
 await inView('après rotation',['.objectives','.top-actions','.touch-actions','.touch-btn','.game-timer'])
 await page.setViewportSize({width:d.w,height:d.h});await page.waitForTimeout(400)
 await g(()=>window.__game.getState().end('exit'));await page.waitForTimeout(500);await inView('fin',['.end-mark','.score-box','.ending-screen .pause-actions button']);await targets('fin','.ending-screen .pause-actions button',44)
 await tap('.ending-screen .outline-btn');await page.waitForTimeout(300);check((await st()).phase==='menu','retour au menu depuis la fin')
 check(logs.length===0,`aucune erreur console${logs.length?' → '+logs.slice(0,3).join(' | '):''}`)
 await ctx.close()
}
await browser.close()
console.log(`\n${total-failed}/${total} vérifications réussies`)
if(failed)console.log(`CONTROLES ECHOUES : ${failed}`)

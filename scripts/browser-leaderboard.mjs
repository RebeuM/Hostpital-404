// Classement en ligne, dans un vrai navigateur : inscription menu, erreurs, panne du serveur, téléphone.
// Prérequis : playwright installé ; serveur : npm run dev -- --port 5179 (base locale en mémoire, jamais la production).
import {chromium} from 'playwright'
const URL=process.env.URL||'http://localhost:5179/'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const DESKTOP={viewport:{width:1280,height:720}},PHONES=[['paysage',{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['portrait',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}]]
let failed=0,total=0
const check=(ok,msg)=>{total++;console.log((ok?'PASS ':'FAIL ')+msg);if(!ok){failed++;process.exitCode=1}}
const unique=()=>'abcdefghijklmnopqrstuvwxyz'.split('').sort(()=>Math.random()-.5).slice(0,6).join('')
const open=async(device=DESKTOP,prepare)=>{
 const ctx=await browser.newContext(device);await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low',jumpscares:false})))
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 if(prepare)await prepare(page)
 await page.goto(URL,{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
 return {ctx,page,errors}
}
// Partie terminée par une capture : pas de durée minimale, le test n'a pas à attendre.
const finish=async(page,reason='caught')=>{
 await page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal()})
 await page.waitForFunction(()=>window.__game.getState().runToken,null,{timeout:5000}).catch(()=>{})
 await page.waitForTimeout(2200)
 await page.evaluate(r=>{const g=window.__game;g.setState({elapsed:2,chapter:4});g.getState().end(r)},reason)
 await page.locator('.score-box').waitFor({timeout:4000}).catch(()=>{})
}
const fill=async(page,first,last)=>{await page.fill('#scoreFirstName',first);await page.fill('#scoreLastName',last)}
const inView=(page,sels)=>page.evaluate(sels=>sels.flatMap(s=>[...document.querySelectorAll(s)].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(b.left<-1||b.right>innerWidth+1)}).map(()=>s)),sels)

console.log('\n=== Inscription ===')
{
 const {ctx,page,errors}=await open(),name=unique()
 await finish(page)
 check(await page.locator('#scoreFirstName').count()===1,'le formulaire s’affiche à la fin, même sans s’être évadé')
 check((await page.locator('.score-note').textContent()).includes('visibles par tous'),'le joueur est prévenu que son nom sera public')
 // Noms refusés, sans quitter le formulaire.
 for(const [f,l] of [['','Dupont'],['<img src=x onerror=alert(1)>','Dupont'],['Jean','http://pub.fr'],['A','B']]){
  await fill(page,f,l);await page.click('.score-form .primary-btn');await page.waitForTimeout(120)
  check(await page.locator('.score-error').count()===1&&await page.locator('.score-result').count()===0,`nom refusé : « ${f} ${l} »`)
 }
 // Accents, tirets, apostrophes acceptés.
 await fill(page,`Éloïse-${name}`,"O'Néil");await page.click('.score-form .primary-btn');await page.locator('.score-result').waitFor({timeout:6000}).catch(()=>{})
 const line=await page.locator('.score-result').textContent().catch(()=>'');check(/Tu es \d/.test(line),`enregistré : ${line.trim()}`)
 check((await page.locator('.ranking tr.me .ranking-name').textContent()).trim()===`Éloïse-${name} O'Néil`,'le nom s’affiche tel qu’il a été écrit, sur la ligne du joueur')
 check(await page.evaluate(()=>JSON.parse(localStorage.getItem('hospital404.player')).lastName)==="O'Néil",'le nom est retenu pour la prochaine fois')
 // Nouvelle partie : prérempli.
 await page.click('.ending-screen .pause-actions .primary-btn');await page.waitForTimeout(300);await finish(page)
 check(await page.inputValue('#scoreLastName')==="O'Néil",'à la partie suivante, le nom est déjà rempli')
 // Une partie ne s'enregistre qu'une fois, même en insistant.
 const replay=await page.evaluate(async()=>{const s=window.__game.getState(),body=JSON.stringify({token:s.runToken,firstName:'Jean',lastName:'Double',time:2,penaltySeconds:0,ending:'caught',chapter:4,difficulty:'normal'});const post=()=>fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body}).then(r=>r.status);return [await post(),await post()]})
 check(replay[0]===201&&replay[1]===409,`le même jeton ne sert qu’une fois (${replay})`)
 // Un temps inventé, envoyé à la main, est refusé.
 const forged=await page.evaluate(async()=>{const {token}=await fetch('/api/run',{method:'POST'}).then(r=>r.json());const send=extra=>fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:'Faux',lastName:'Record',time:61,penaltySeconds:0,ending:'exit',chapter:7,difficulty:'normal',...extra})}).then(r=>r.status);return [await send({token}),await send({token:'faux.jeton'}),await send({})]})
 check(forged[0]===422&&forged[1]===401&&forged[2]===401,`temps falsifié et jeton inventé refusés (${forged})`)
 check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
 await ctx.close()
}
console.log('\n=== Menu ===')
{
 const {ctx,page,errors}=await open()
 await page.click('.menu-item:has-text("CLASSEMENT")');await page.locator('.ranking,.ranking-state').first().waitFor({timeout:6000})
 await page.locator('.ranking').waitFor({timeout:6000}).catch(()=>{})
 check(await page.locator('.ranking tbody tr').count()>0,'le classement s’ouvre depuis le menu')
 const pub=await page.evaluate(()=>fetch('/api/scores').then(r=>r.text()));check(!/ip_hash|run_id|player_key/.test(pub),'aucune donnée privée dans la réponse publique')
 await page.click('.leaderboard-panel .seg button:has-text("Difficile")');await page.waitForTimeout(500)
 check(await page.locator('.ranking-state:has-text("Personne")').count()===1,'filtre : rien en Difficile, message d’invitation')
 await page.click('.leaderboard-panel .seg button:has-text("Normale")');await page.locator('.ranking').waitFor({timeout:5000}).catch(()=>{})
 check(await page.locator('.ranking tbody tr').count()>0,'filtre : les parties en Normale')
 await page.click('.leaderboard-panel .close-x');check(await page.locator('.leaderboard-panel').count()===0,'le panneau se ferme')
 check(errors.length===0,'aucune erreur de page')
 await ctx.close()
}
console.log('\n=== Serveur en panne ===')
{
 const {ctx,page,errors}=await open(DESKTOP,p=>p.route('**/api/**',r=>r.abort()))
 await page.click('.menu-item:has-text("CLASSEMENT")');await page.locator('.ranking-state:has-text("indisponible")').waitFor({timeout:5000}).catch(()=>{})
 check(await page.locator('.ranking-state:has-text("indisponible")').count()===1,'menu : message clair, pas d’écran vide');await page.click('.leaderboard-panel .close-x')
 await page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal()});await page.waitForTimeout(800)
 const st=await page.evaluate(()=>({phase:window.__game.getState().phase,token:window.__game.getState().runToken}));check(st.phase==='playing'&&st.token===null,'sans serveur, la partie démarre quand même')
 await page.evaluate(()=>{const g=window.__game;g.setState({elapsed:2,chapter:4});g.getState().end('caught')});await page.locator('.score-box').waitFor({timeout:4000})
 await fill(page,'Jean','Horsligne');await page.click('.score-form .primary-btn');await page.locator('.score-error').waitFor({timeout:4000}).catch(()=>{})
 check(await page.locator('.score-error:has-text("indisponible")').count()===1,'fin de partie : message clair, le jeu ne plante pas')
 check(await page.inputValue('#scoreFirstName')==='Jean','le nom saisi n’est pas perdu')
 check(await page.locator('.ending-screen .pause-actions .primary-btn').isEnabled(),'on peut toujours recommencer')
 check(errors.length===0,`aucune erreur de page${errors.length?' → '+errors[0]:''}`)
 await ctx.close()
}
console.log('\n=== Sauvegarde ===')
{
 const {ctx,page}=await open()
 await page.evaluate(()=>{const g=window.__game;g.getState().newGame();g.getState().closeModal()});await page.waitForFunction(()=>window.__game.getState().runToken,null,{timeout:5000})
 const token=await page.evaluate(()=>window.__game.getState().runToken)
 await page.evaluate(()=>{const g=window.__game;g.getState().enterHospital();g.getState().closeModal();g.getState().persist();g.getState().returnToMenu()});await page.waitForTimeout(200)
 await page.evaluate(()=>window.__game.getState().continueGame());await page.waitForTimeout(200)
 check(await page.evaluate(()=>window.__game.getState().runToken)===token,'reprendre une sauvegarde garde le jeton de la partie : son début reste daté')
 await ctx.close()
}
console.log('\n=== Téléphone ===')
for(const [name,device] of PHONES){
 const {ctx,page,errors}=await open(device)
 const tap=async sel=>{const b=await page.locator(sel).first().boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(150)}
 // Le formulaire doit être atteignable sans défiler : aucun bouton collant ne le recouvre.
 const reachable=sel=>page.evaluate(sel=>{const e=document.querySelector(sel),b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return b.bottom<=innerHeight&&(hit===e||e.contains(hit))},sel)
 await tap('.menu-item:has-text("CLASSEMENT")');await page.locator('.ranking,.ranking-state').first().waitFor({timeout:6000});await page.waitForTimeout(300)
 check((await inView(page,['.leaderboard-panel','.ranking','.seg button','.close-x'])).length===0,`${name} : le classement tient dans l’écran`)
 const small=await page.evaluate(()=>[...document.querySelectorAll('.leaderboard-panel button')].filter(b=>b.getBoundingClientRect().height<40).length);check(small===0,`${name} : boutons assez grands`)
 await tap('.leaderboard-panel .close-x')
 await finish(page)
 const before=await page.evaluate(()=>{const r=document.querySelector('#scoreFirstName').getBoundingClientRect();return {w:r.width,h:r.height}});check(before.w>100&&before.h>=44,`${name} : champ assez grand (${Math.round(before.w)}×${Math.round(before.h)})`)
 check(await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#scoreFirstName')).fontSize)>=16),`${name} : police de 16 px, pas de zoom à la saisie sur iPhone`)
 for(const sel of ['#scoreFirstName','#scoreLastName','.score-form .primary-btn'])check(await reachable(sel),`${name} : ${sel} atteignable sans défiler`)
 await tap('#scoreFirstName');await page.keyboard.type('Touche'+unique());await tap('#scoreLastName');await page.keyboard.type('Mobile');await page.waitForTimeout(350)
 await tap('.score-form .primary-btn');await page.locator('.score-result').waitFor({timeout:6000}).catch(()=>{})
 check(/Tu es \d/.test(await page.locator('.score-result').textContent().catch(()=>'')),`${name} : inscription au doigt`)
 check((await inView(page,['.score-box','.ranking','.ending-screen .pause-actions button'])).length===0,`${name} : rien ne déborde`)
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} : la page ne déborde pas`)
 if(process.env.OUT){await page.screenshot({path:`${process.env.OUT}/classement-fin-${name}.png`});await page.locator('.ending-screen .pause-actions .outline-btn').click();await page.waitForTimeout(300);await page.locator('.menu-item:has-text("CLASSEMENT")').click();await page.locator('.ranking').waitFor({timeout:5000}).catch(()=>{});await page.waitForTimeout(200);await page.screenshot({path:`${process.env.OUT}/classement-menu-${name}.png`})}
 check(errors.length===0,`${name} : aucune erreur de page`)
 await ctx.close()
}
await browser.close()
console.log(`\n${total-failed}/${total} vérifications réussies`)
if(failed)console.log(`CONTROLES ECHOUES : ${failed}`)

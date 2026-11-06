// Vérifie chaque prise de personnage du manifeste : ouverture du dialogue à l’étape voulue, voix lancée, niveau,
// étiquette du bon personnage ; effets « enregistrement », animation d’objet, blackout, voix de fin, arrêt au menu.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
import {chromium} from 'playwright'
import {VOICES} from '../src/game/voices.js'
import {STORIES} from '../src/game/story.js'
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu','--autoplay-policy=no-user-gesture-required']})
const ctx=await browser.newContext({viewport:{width:1280,height:720}});await ctx.addInitScript(()=>{localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low'}))
 const proto=AudioNode.prototype,orig=proto.connect
 proto.connect=function(dst,...r){if(dst instanceof AudioDestinationNode){const c=dst.context;if(!c.__an){c.__an=c.createAnalyser();c.__an.fftSize=2048;window.__ac=c}orig.call(this,c.__an)}return orig.call(this,dst,...r)}
 window.__rms=()=>{const c=window.__ac;if(!c||!c.__an)return -1;const d=new Float32Array(c.__an.fftSize);c.__an.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length)}
 window.__peak=0;setInterval(()=>{const r=window.__rms();if(r>0)window.__peak=Math.max(window.__peak,r)},16);window.__take=()=>{const p=window.__peak;window.__peak=0;return p}})
const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,160))});page.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())})
await page.goto('http://localhost:5179/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('NOUVELLE'));b.click()});await page.waitForTimeout(150);await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('COMMENCER'));b.click()})
await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();g.enterHospital()});;await page.waitForTimeout(400)
await page.evaluate(()=>{window.__audio.stopVoice();window.__game.getState().closeModal()});await page.waitForTimeout(300)
let ok=0,total=0
for(const [id,takes] of Object.entries(VOICES)){
 if(id==='ending')continue
 for(const t of takes){
  total++
  await page.evaluate(([id,line])=>window.__game.setState({modal:'story',dialog:id,dialogStep:line,dialogApplied:line-1}),[id,t.line])
  let playing=false;try{await page.waitForFunction(()=>window.__audio.isVoicePlaying(),null,{timeout:4000});playing=true}catch{}
  await page.evaluate(()=>window.__take());await page.waitForTimeout(900)
  const lvl=20*Math.log10(await page.evaluate(()=>window.__take())||1e-9)
  const tag=await page.evaluate(()=>document.querySelector('.speaker-tag')?.textContent)
  const expected=STORIES[id].lines[t.line].speaker
  const good=playing&&lvl>-30&&tag===expected;if(good)ok++
  console.log((good?'PASS ':'FAIL ')+`${id}[${t.line}] ${t.file.padEnd(28)} étiquette=${tag} voix=${playing} niveau=${lvl.toFixed(1)} dBFS${t.fx?' fx='+t.fx:''}`)
  await page.evaluate(()=>{window.__audio.stopVoice();window.__game.setState({modal:null,dialog:null})});await page.waitForTimeout(200)
 }
}
// Animation d’objet : la clé du squatteur (étape 3) accorde l’objet et affiche la carte.
await page.evaluate(()=>window.__game.setState({hasKey:false,modal:'story',dialog:'squatter',dialogStep:3,dialogApplied:2}));await page.waitForTimeout(400)
const item=await page.evaluate(()=>({card:document.querySelectorAll('.item-get').length,label:document.querySelector('.item-get-label')?.textContent,hasKey:window.__game.getState().hasKey,ev:window.__game.getState().lastEvent?.type}))
console.log((item.card===1&&item.hasKey&&item.ev==='item'?'PASS ':'FAIL ')+`animation objet : ${item.label} (clé accordée=${item.hasKey}, événement=${item.ev})`)
await page.waitForTimeout(2700);console.log((await page.evaluate(()=>window.__game.getState().dialogStep))===4?'PASS animation objet : passage automatique à l’étape suivante':'FAIL animation objet : pas de passage automatique')
await page.evaluate(()=>window.__game.setState({modal:null,dialog:null}));await page.waitForTimeout(200)
// Blackout : voile noir, portail ouvert à la fin, voile retiré.
await page.evaluate(()=>window.__game.setState({sectorOpen:false,modal:'story',dialog:'disappearance',dialogStep:1,dialogApplied:0}));await page.waitForTimeout(500)
const b1=await page.evaluate(()=>({veil:document.querySelector('.blackout-veil')?.className,open:window.__game.getState().sectorOpen}))
await page.waitForTimeout(2600)
const b2=await page.evaluate(()=>({veil:document.querySelectorAll('.blackout-veil').length,open:window.__game.getState().sectorOpen,step:window.__game.getState().dialogStep}))
console.log((b1.veil==='blackout-veil dark'&&!b1.open&&b2.veil===0&&b2.open&&b2.step===2?'PASS ':'FAIL ')+`blackout : noir (${b1.veil}, portail fermé=${!b1.open}) puis lumière (portail ouvert=${b2.open}, étape ${b2.step})`)
await page.evaluate(()=>window.__game.setState({modal:null,dialog:null}));await page.waitForTimeout(200)
// Écran de fin : voix d'Adrien seule après ~2,2 s, puis arrêt au menu.
await page.evaluate(()=>window.__game.getState().end('caught'))
let endVoice=false;try{await page.waitForFunction(()=>window.__audio.isVoicePlaying(),null,{timeout:6000});endVoice=true}catch{}
console.log((endVoice?'PASS ':'FAIL ')+'fin : voix d’Adrien lancée (après ~2,2 s)')
await page.evaluate(()=>window.__game.getState().returnToMenu());await page.waitForTimeout(300);console.log((!(await page.evaluate(()=>window.__audio.isVoicePlaying()))?'PASS ':'FAIL ')+'menu : voix arrêtée')
console.log(`${ok}/${total} prises OK`);console.log('errors',errs);await browser.close()

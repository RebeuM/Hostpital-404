// Vérifie le dialogue d’introduction en bulle : voix de Thomas puis de Maxime (prises de personnages uniquement),
// texte tapé à la machine synchronisé, E complète puis avance, arrêt de la voix au changement de réplique, muet.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
import {chromium} from 'playwright'
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu','--autoplay-policy=no-user-gesture-required']})
const ctx=await browser.newContext({viewport:{width:1280,height:720}});await ctx.addInitScript(()=>{localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low'}))
 const proto=AudioNode.prototype,orig=proto.connect
 proto.connect=function(dst,...r){if(dst instanceof AudioDestinationNode){const c=dst.context;if(!c.__an){c.__an=c.createAnalyser();c.__an.fftSize=2048;window.__ac=c}orig.call(this,c.__an)}return orig.call(this,dst,...r)}
 window.__rms=()=>{const c=window.__ac;if(!c||!c.__an)return -1;const d=new Float32Array(c.__an.fftSize);c.__an.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length)}
 window.__peak=0;setInterval(()=>{const r=window.__rms();if(r>0)window.__peak=Math.max(window.__peak,r)},16);window.__take=()=>{const p=window.__peak;window.__peak=0;return p}})
const page=await ctx.newPage();const errs=[],requested=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,160))});page.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url());if(r.url().includes('/assets/voices/'))requested.push(r.url().split('/').pop())})
const check=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1}
const dB=v=>(20*Math.log10(v||1e-9)).toFixed(1)
const speaker=()=>page.evaluate(()=>document.querySelector('.speaker-tag')?.textContent||null)
const typed=()=>page.evaluate(()=>document.querySelector('.speech-text')?.textContent.replace('▮','').length||0)
await page.goto('http://localhost:5179/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('NOUVELLE'));b.click()});await page.waitForTimeout(150);await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('COMMENCER'));b.click()})
await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();g.enterHospital()});
await page.waitForSelector('.speech-bubble',{timeout:5000})
check((await speaker())==='THOMAS','réplique 1 : étiquette THOMAS')
try{await page.waitForFunction(()=>window.__audio.isVoicePlaying(),null,{timeout:4000})}catch{}
await page.evaluate(()=>window.__take());await page.waitForTimeout(900)
check(await page.evaluate(()=>window.__audio.isVoicePlaying()),'voix de Thomas en lecture');console.log('   niveau',dB(await page.evaluate(()=>window.__take())),'dBFS')
const t1=await typed();await page.waitForTimeout(700);const t2=await typed();check(t2>t1&&t2<await page.evaluate(()=>window.__game.getState&&document.querySelector('.speech-text')?.textContent.length+40),`machine à écrire en cours (${t1} → ${t2} caractères)`)
await page.keyboard.press('e');await page.waitForTimeout(150);check((await page.locator('.dialogue-layer').getAttribute('data-complete'))==='1'&&await page.evaluate(()=>window.__audio.isVoicePlaying()),'E complète le texte sans couper la voix')
await page.keyboard.press('e');await page.waitForTimeout(400);check((await speaker())==='MAXIME','E passe à la réplique de Maxime')
try{await page.waitForFunction(()=>window.__audio.isVoicePlaying(),null,{timeout:3000})}catch{}
await page.evaluate(()=>window.__take());await page.waitForTimeout(800);check(await page.evaluate(()=>window.__audio.isVoicePlaying()),'voix de Maxime en lecture');console.log('   niveau',dB(await page.evaluate(()=>window.__take())),'dBFS')
await page.keyboard.press('e');await page.waitForTimeout(100);await page.keyboard.press('e');await page.waitForTimeout(400)
check((await speaker())==='THOMAS'&&!(await page.evaluate(()=>window.__audio.isVoicePlaying())),'réplique 3 (non enregistrée) : texte seul, voix précédente coupée')
await page.evaluate(()=>window.__game.getState().closeModal());await page.waitForTimeout(300)
check(!(await page.evaluate(()=>window.__audio.isVoicePlaying()))&&(await page.locator('.speech-bubble').count())===0,'fermeture : bulle retirée, voix arrêtée')
await page.evaluate(()=>window.__game.getState().updateSettings({muted:true}));await page.evaluate(()=>window.__game.setState({modal:'story',dialog:'intro',dialogStep:0,dialogApplied:-1}));await page.waitForTimeout(900)
check(!(await page.evaluate(()=>window.__audio.isVoicePlaying())),'muet : aucune voix')
await page.evaluate(()=>window.__game.getState().updateSettings({muted:false}));await page.evaluate(()=>window.__game.setState({modal:null,dialog:null}))
check(!requested.some(f=>f.includes('narrateur')),'aucune prise de narrateur demandée ('+requested.join(', ')+')')
console.log('errors',errs);await browser.close()

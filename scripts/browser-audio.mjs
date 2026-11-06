// Mesure du niveau audio réellement envoyé à la sortie (analyseur Web Audio) pendant une partie, en Chromium headless.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
import {chromium} from 'playwright'
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu','--autoplay-policy=no-user-gesture-required']})
const ctx=await browser.newContext({viewport:{width:960,height:540}});await ctx.addInitScript(()=>{localStorage.setItem('hospital404.settings',JSON.stringify({quality:'low'}))
 // Intercepte dès le départ toute connexion vers la destination : un analyseur mesure le niveau réellement envoyé à la carte son.
 const proto=AudioNode.prototype,orig=proto.connect
 proto.connect=function(dst,...r){if(dst instanceof AudioDestinationNode){const c=dst.context;if(!c.__an){c.__an=c.createAnalyser();c.__an.fftSize=2048;window.__ac=c}orig.call(this,c.__an)}return orig.call(this,dst,...r)}
 window.__rms=()=>{const c=window.__ac;if(!c||!c.__an)return -1;const d=new Float32Array(c.__an.fftSize);c.__an.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length)}
 window.__peak=0;window.__sum=0;window.__n=0;setInterval(()=>{const r=window.__rms();if(r<0)return;window.__peak=Math.max(window.__peak,r);window.__sum+=r;window.__n++},16)
 window.__take=()=>{const o={peak:window.__peak,avg:window.__n?window.__sum/window.__n:0};window.__peak=0;window.__sum=0;window.__n=0;return o}})
const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await page.goto('http://localhost:5179/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('NOUVELLE'));b.click()});await page.waitForTimeout(150);await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('COMMENCER'));b.click()});await page.waitForTimeout(300)
await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();g.enterHospital();g.closeModal()});await page.waitForTimeout(300)
console.log('ctx state',await page.evaluate(()=>window.__ac?window.__ac.state:'none'))
const sample=async(label,ms)=>{await page.evaluate(()=>window.__take());await page.waitForTimeout(ms);const {peak,avg}=await page.evaluate(()=>window.__take());console.log(label.padEnd(28),'rms moyen',(20*Math.log10(avg||1e-9)).toFixed(1),'dB · pic',(20*Math.log10(peak||1e-9)).toFixed(1),'dBFS')}
await sample('ambiance (4 s)',4000)
await page.keyboard.down('KeyW');await sample('marche (pas)',2500);await page.keyboard.up('KeyW')
await page.evaluate(()=>window.__game.getState().emit('solved'));await sample('sfx solved',700)
await page.evaluate(()=>window.__audio.sfx('locked'));await sample('sfx locked (direct)',500)
await page.evaluate(()=>window.__audio.sfx('pickup'));await sample('sfx pickup (direct)',500)
await page.evaluate(()=>window.__audio.sfx('test'));await sample('test (direct)',1200)
await page.evaluate(()=>window.__game.getState().emit('door'));await sample('sfx porte',1200)
await page.evaluate(()=>window.__game.getState().emit('blackout'));await sample('blackout',1500)
await page.evaluate(()=>window.__game.getState().emit('chase_start'));await sample('poursuite (alarme+coeur)',2500)
await page.evaluate(()=>window.__audio.sfx('scream'));await sample('screamer (cri)',1300)
await page.evaluate(()=>window.__audio.sfx('ui'));await sample('ui (clic)',300)
await page.evaluate(()=>window.__audio.sfx('paper'));await sample('papier',700)
await page.evaluate(()=>window.__audio.sfx('locked'));await sample('verrou',700)
await page.evaluate(()=>{window.__audio.monsterStep(.5,3);setTimeout(()=>window.__audio.monsterRoar(-.5,4),300)});await sample('monstre (pas + cri)',1600)
console.log('échantillons chargés',await page.evaluate(()=>window.__audio.samplesLoaded()))
await page.evaluate(()=>{for(let i=0;i<4;i++)setTimeout(()=>window.__audio.footstep(['lino','tile','concrete'][i%3],i>1),i*450)});await sample('pas isolés (4)',2000)
await page.evaluate(()=>window.__game.getState().emit('ending'));await page.waitForTimeout(600)
await page.evaluate(()=>window.__game.getState().updateSettings({muted:true}));await page.waitForTimeout(400);await sample('muet',800)
await page.evaluate(()=>window.__game.getState().updateSettings({muted:false,volume:.3}));await page.waitForTimeout(400);await sample('volume 30 %',1500)
console.log('errors',errs);await browser.close()

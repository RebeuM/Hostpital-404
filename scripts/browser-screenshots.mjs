// Vérification navigateur (Playwright) : chargement, erreurs console, ressources manquantes, captures du rendu 3D.
// Prérequis : npx playwright install chromium ; serveur : npm run dev -- --port 5179
import {chromium} from 'playwright'
// CHROMIUM=<chemin d'un Chrome/Chromium> permet d'utiliser un navigateur déjà installé (ex. ~/Library/Caches/ms-playwright/chromium-*/…).
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--ignore-gpu-blocklist','--enable-gpu']})
const ctx=await browser.newContext({viewport:{width:1280,height:720}});await ctx.addInitScript(()=>localStorage.setItem('hospital404.settings',JSON.stringify({quality:'high'})))
const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))});page.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())})
await page.goto('http://localhost:5179/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game.getState().loaded,null,{timeout:120000})
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('NOUVELLE'));b.click()});await page.waitForTimeout(150);await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('COMMENCER'));b.click()});await page.waitForTimeout(400)
await page.evaluate(()=>{const g=window.__game.getState();g.closeModal();g.enterHospital();g.closeModal()});await page.waitForTimeout(300)
const all={sectorOpen:true,hasKey:true,done:{patients:true,radio:true,security:true,lab:true}}
const shots=[['w1-couloir',0,2,0,.1,all],['w2-accueil',-3.2,2.2,-1.2,.05,{}],['w3-chambres',-3.4,11.5,-Math.PI*.6,.05,all],['w4-radio',3.5,16.5,Math.PI*.55,.1,all],['w5-securite',-3.6,24.5,-Math.PI*.55,0,all],['w6-lab',4.5,33.5,Math.PI*.25,0,all],['w7-attente',3.2,-2.5,Math.PI*.4,0,{}],['w8-main',-9.8,15.1,-Math.PI/2,.1,all],['w9-plafond',0,10.5,0,.55,all],['w10-morgue',-3.4,43.5,-Math.PI*.6,-.05,all],['w11-secret',-13.25,12,0,0,all]]
for(const [n,x,z,yaw,pitch,extra] of shots){await page.evaluate(([x,z,yaw,pitch,extra])=>{const r=window.__runtime.player;r.x=x;r.z=z;r.yaw=yaw;r.pitch=pitch;window.__runtime.look.yaw=yaw;window.__runtime.look.pitch=pitch;window.__game.setState({paused:false,...extra})},[x,z,yaw,pitch,extra]);await page.waitForTimeout(1400);await page.screenshot({path:`shots2/${n}.png`})}
console.log('errors',errs);await browser.close()

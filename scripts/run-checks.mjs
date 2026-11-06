// Lance toutes les vérifications : tests Node, compilation, puis les parcours navigateur sur un serveur de développement démarré pour l'occasion.
// Distingue un souci d'installation (navigateur absent, port pris) d'un vrai échec du jeu. Usage : npm run check:all [-- nom nom ...]
import {spawn,spawnSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const PORT=5179,URL=`http://localhost:${PORT}/`
const ALL=[['tests','npm',['test'],false],['build','npm',['run','build'],false],['regressions','node',['scripts/browser-regressions.mjs'],true],['classement','node',['scripts/browser-leaderboard.mjs'],true],['mobile','node',['scripts/browser-mobile.mjs'],true],['partie','node',['scripts/browser-playthrough.mjs'],true],['ordinateur','node',['scripts/browser-check.mjs'],true]]
const wanted=process.argv.slice(2),STEPS=wanted.length?ALL.filter(s=>wanted.includes(s[0])):ALL
// Le navigateur attendu par Playwright, sinon le plus récent déjà installé sur la machine.
async function findBrowser(){
 if(process.env.CHROMIUM)return process.env.CHROMIUM
 const {chromium}=await import('playwright')
 try{if(fs.existsSync(chromium.executablePath()))return ''}catch{}
 const cache=path.join(os.homedir(),process.platform==='darwin'?'Library/Caches/ms-playwright':process.platform==='win32'?'AppData/Local/ms-playwright':'.cache/ms-playwright')
 if(fs.existsSync(cache))for(const dir of fs.readdirSync(cache).filter(d=>d.startsWith('chromium-')).sort().reverse()){
  for(const sub of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing','chrome-mac/Chromium.app/Contents/MacOS/Chromium','chrome-linux/chrome','chrome-win/chrome.exe']){const p=path.join(cache,dir,sub);if(fs.existsSync(p))return p}
 }
 return null
}
const needsBrowser=STEPS.some(s=>s[3])
let browser=''
if(needsBrowser){
 browser=await findBrowser()
 if(browser===null){console.error('INSTALLATION : aucun navigateur trouvé. Lance : npx playwright install chromium\n(ce n\'est pas un bug du jeu)');process.exit(2)}
}
let server=null
if(needsBrowser){
 if(await fetch(URL).then(()=>true).catch(()=>false))console.log(`Serveur déjà actif sur le port ${PORT}, réutilisé.`)
 else{
  server=spawn('npx',['vite','--port',String(PORT),'--strictPort'],{stdio:'ignore',detached:true})
  let up=false;for(let i=0;i<60&&!up;i++){await new Promise(r=>setTimeout(r,500));up=await fetch(URL).then(()=>true).catch(()=>false)}
  if(!up){console.error(`INSTALLATION : le serveur n'a pas démarré sur le port ${PORT} (ce n'est pas un bug du jeu)`);process.exit(2)}
 }
}
const results=[]
for(const [name,cmd,args] of STEPS){
 console.log(`\n########## ${name} ##########`)
 const t=Date.now(),r=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,...(browser?{CHROMIUM:browser}:{}),OUT:process.env.OUT||path.join(os.tmpdir(),'hospital404-checks')}})
 results.push([name,r.status===0,((Date.now()-t)/1000).toFixed(0)])
}
if(server)try{process.kill(-server.pid)}catch{}
console.log('\n===== BILAN =====');for(const [n,ok,s] of results)console.log(`${ok?'OK    ':'ECHEC '} ${n.padEnd(14)} ${s} s`)
process.exit(results.every(r=>r[1])?0:1)

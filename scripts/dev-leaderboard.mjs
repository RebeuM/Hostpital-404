// Classement local pour `npm run dev` et `npm run preview` : un vrai PostgreSQL embarqué, en mémoire. Rien ne touche la base de production.
import {PGlite} from '@electric-sql/pglite'
import {createLeaderboard,handleRun,handleScores} from '../api/_lib/leaderboard.js'
export async function devLeaderboard(){
 const pg=new PGlite();await pg.waitReady
 return createLeaderboard({db:{query:async(text,params)=>(await pg.query(text,params)).rows},secret:'secret-de-developpement'})
}
const readJson=req=>new Promise(resolve=>{let raw='';req.on('data',c=>{if(raw.length<4096)raw+=c});req.on('end',()=>{try{resolve(JSON.parse(raw))}catch{resolve(null)}})})
// Même comportement que les fonctions Vercel de api/.
export function leaderboardMiddleware(){
 let lb=null
 return async(req,res,next)=>{
  const url=new URL(req.url,'http://local')
  if(url.pathname!=='/api/scores'&&url.pathname!=='/api/run')return next()
  try{
   lb??=await devLeaderboard()
   const out=url.pathname==='/api/run'?handleRun(lb,{method:req.method}):await handleScores(lb,{method:req.method,query:Object.fromEntries(url.searchParams),body:req.method==='POST'?await readJson(req):null,ip:req.socket.remoteAddress||''})
   res.statusCode=out.status;res.setHeader('Content-Type','application/json');for(const [k,v] of Object.entries(out.headers||{}))res.setHeader(k,v)
   res.end(JSON.stringify(out.body))
  }catch(e){console.error('[classement local]',e);res.statusCode=503;res.end('{"error":"unavailable"}')}
 }
}

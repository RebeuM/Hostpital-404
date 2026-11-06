// Cœur du classement côté serveur, indépendant de l'hébergeur et du pilote de base : db.query(texte, paramètres) renvoie des lignes.
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto'
import {validateRun} from '../../src/game/leaderboard.js'
import {DIFFICULTY_IDS} from '../../src/game/difficulty.js'

export const LIST_LIMIT=50
const TOKEN_MAX_AGE_MS=30*24*3600*1000,CLOCK_SLACK_SECONDS=3,RATE_LIMIT_PER_HOUR=60
const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS leaderboard_runs(
   id BIGSERIAL PRIMARY KEY,
   run_id UUID NOT NULL UNIQUE,
   first_name TEXT NOT NULL,
   last_name TEXT NOT NULL,
   player_key TEXT NOT NULL,
   time_seconds INTEGER NOT NULL CHECK(time_seconds>=0),
   penalty_seconds INTEGER NOT NULL DEFAULT 0,
   ending TEXT NOT NULL,
   chapter SMALLINT NOT NULL,
   difficulty TEXT NOT NULL,
   ip_hash TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 'CREATE INDEX IF NOT EXISTS leaderboard_runs_player ON leaderboard_runs(player_key)',
 'CREATE INDEX IF NOT EXISTS leaderboard_runs_ip ON leaderboard_runs(ip_hash,created_at)'
]
// Ordre du classement : les évadés au temps, puis les autres selon l'acte atteint, puis au temps. Un joueur n'y figure qu'une fois, avec sa meilleure partie.
const ORDER="(ending='exit') DESC,CASE WHEN ending='exit' THEN 0 ELSE -chapter END,time_seconds,created_at"
const RANKED=`WITH best AS(
  SELECT DISTINCT ON(player_key) * FROM leaderboard_runs WHERE($1::text IS NULL OR difficulty=$1)
  ORDER BY player_key,${ORDER}
 ),ranked AS(
  SELECT *,ROW_NUMBER() OVER(ORDER BY ${ORDER}) AS rank,COUNT(*) OVER() AS total FROM best
 )`
// Seuls ces champs sortent de la base : jamais l'adresse (même chiffrée) ni l'identifiant de partie.
const toEntry=r=>({rank:Number(r.rank),firstName:r.first_name,lastName:r.last_name,time:r.time_seconds,ending:r.ending,chapter:r.chapter,difficulty:r.difficulty,at:new Date(r.created_at).getTime()})

export function createLeaderboard({db,secret,now=()=>Date.now()}){
 const sign=text=>createHmac('sha256',secret).update(text).digest('base64url')
 let ready=null
 // Table créée au premier besoin : aucune migration à lancer à la main.
 const ensure=()=>ready??=(async()=>{for(const q of SCHEMA)await db.query(q,[])})().catch(e=>{ready=null;throw e})
 // Jeton signé remis au lancement : il prouve l'heure de début de la partie, que le navigateur ne peut pas avancer.
 const issueToken=()=>{const payload=Buffer.from(JSON.stringify({id:randomUUID(),t:now()})).toString('base64url');return `${payload}.${sign(payload)}`}
 const readToken=token=>{
  if(typeof token!=='string'||token.length>300)return null
  const [payload,mac]=token.split('.');if(!payload||!mac)return null
  const expected=Buffer.from(sign(payload)),given=Buffer.from(mac)
  if(expected.length!==given.length||!timingSafeEqual(expected,given))return null
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString())}catch{return null}
  if(typeof data?.id!=='string'||!Number.isFinite(data.t)||now()-data.t>TOKEN_MAX_AGE_MS||data.t>now()+60000)return null
  return data
 }
 async function list(difficulty=null,limit=LIST_LIMIT){
  await ensure()
  const rows=await db.query(`${RANKED} SELECT * FROM ranked ORDER BY rank LIMIT $2`,[DIFFICULTY_IDS.includes(difficulty)?difficulty:null,Math.min(LIST_LIMIT,Math.max(1,limit|0))])
  return {entries:rows.map(toEntry),total:rows.length?Number(rows[0].total):0}
 }
 async function submit(body,ip=''){
  const token=readToken(body?.token);if(!token)return {status:401,body:{error:'invalid_token'}}
  const run=validateRun(body);if(run.error)return {status:run.error==='implausible'?422:400,body:{error:run.error}}
  // Le chrono du navigateur ne peut pas avoir avancé plus vite que l'horloge du serveur (les pénalités s'y ajoutent sans durer).
  if((now()-token.t)/1000+CLOCK_SLACK_SECONDS<run.time-run.penaltySeconds)return {status:422,body:{error:'implausible'}}
  await ensure()
  const ipHash=sign('ip:'+ip)
  const [{n}]=await db.query("SELECT COUNT(*)::int AS n FROM leaderboard_runs WHERE ip_hash=$1 AND created_at>now()-interval '1 hour'",[ipHash])
  if(n>=RATE_LIMIT_PER_HOUR)return {status:429,body:{error:'rate_limited'}}
  const saved=await db.query(`INSERT INTO leaderboard_runs(run_id,first_name,last_name,player_key,time_seconds,penalty_seconds,ending,chapter,difficulty,ip_hash)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(run_id) DO NOTHING RETURNING id`,[token.id,run.firstName,run.lastName,run.key,run.time,run.penaltySeconds,run.ending,run.chapter,run.difficulty,ipHash])
  if(!saved.length)return {status:409,body:{error:'already_saved'}}
  const [me]=await db.query(`${RANKED} SELECT * FROM ranked WHERE player_key=$2`,[null,run.key])
  const {entries,total}=await list()
  return {status:201,body:{rank:Number(me.rank),total,best:toEntry(me),entries}}
 }
 return {issueToken,readToken,list,submit}
}
// Traduit une requête HTTP. Cache court sur la lecture : une foule qui consulte le classement ne sollicite pas la base.
export async function handleScores(lb,{method,query={},body,ip}){
 if(method==='GET'){
  const {entries,total}=await lb.list(query.difficulty||null,Number(query.limit)||LIST_LIMIT)
  return {status:200,body:{entries,total},headers:{'Cache-Control':'public, s-maxage=15, stale-while-revalidate=60'}}
 }
 if(method==='POST')return {...await lb.submit(body,ip),headers:{'Cache-Control':'no-store'}}
 return {status:405,body:{error:'method_not_allowed'},headers:{Allow:'GET, POST'}}
}
export function handleRun(lb,{method}){
 if(method!=='POST')return {status:405,body:{error:'method_not_allowed'},headers:{Allow:'POST'}}
 return {status:201,body:{token:lb.issueToken()},headers:{'Cache-Control':'no-store'}}
}

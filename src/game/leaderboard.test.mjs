// Classement : vraies requêtes SQL sur un PostgreSQL embarqué (PGlite), horloge pilotée.
import test from 'node:test'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {createLeaderboard,handleScores,handleRun} from '../../api/_lib/leaderboard.js'
import {validName,cleanName,playerKey,validateRun,MIN_ESCAPE_SECONDS} from './leaderboard.js'

const pg=new PGlite();await pg.waitReady
let clock=1_000_000_000_000
const db={query:async(t,p)=>(await pg.query(t,p)).rows}
const lb=createLeaderboard({db,secret:'test',now:()=>clock})
const wipe=async()=>{await lb.list();await pg.query('DELETE FROM leaderboard_runs')}
// Une partie jouée pour de bon : le jeton est remis au début, l'horloge avance de la durée de jeu.
const play=async(first,last,{time=600,ending='exit',chapter=ending==='exit'?7:4,difficulty='normal',penaltySeconds=0,ip='1.1.1.1',extra={}}={})=>{
 const token=lb.issueToken();clock+=(time-penaltySeconds)*1000
 return lb.submit({token,firstName:first,lastName:last,time,penaltySeconds,ending,chapter,difficulty,...extra},ip)
}

test('noms : lettres de toutes les langues, ni lien ni code',()=>{
 for(const ok of ['Éloïse','Jean-Luc',"O'Neil",'Le Goff','Nguyễn','Ana María','St. John','Żaneta','李小'])assert.ok(validName(ok),ok)
 for(const bad of ['','A','<script>alert(1)</script>','http://x.fr','a@b.fr','Robert"); DROP TABLE x;--','123','-Jean','x'.repeat(41),null,42,{},['Jean']])assert.equal(validName(bad),false,String(bad))
 assert.equal(cleanName('  Jean   Luc  '),'Jean Luc')
 assert.equal(playerKey('Éloïse','DUPONT'),playerKey(' eloise ','Dupont'),'même personne, écrite autrement')
 assert.notEqual(playerKey('Jean','Dupont'),playerKey('Jeanne','Dupont'))
})
test('partie : les valeurs impossibles sont refusées',()=>{
 const run={firstName:'Jean',lastName:'Dupont',time:600,penaltySeconds:60,ending:'exit',chapter:7,difficulty:'normal'}
 assert.equal(validateRun(run).time,600)
 for(const [k,v] of [['time',-1],['time',1801],['time','600'],['time',1.5],['penaltySeconds',30],['penaltySeconds',-60],['penaltySeconds',660],['ending','win'],['chapter',0],['chapter',8],['difficulty','god']])assert.equal(validateRun({...run,[k]:v}).error,'invalid_run',`${k}=${v}`)
 assert.equal(validateRun({...run,chapter:3}).error,'implausible','on ne s’évade pas à l’acte III')
 assert.equal(validateRun({...run,time:MIN_ESCAPE_SECONDS+59}).error,'implausible','moins d’une minute de jeu réel, pénalités ôtées')
 assert.equal(validateRun({...run,firstName:'<b>'}).error,'invalid_name')
 assert.equal(validateRun(null).error,'invalid_run')
})
test('jeton : signature, falsification, expiration',()=>{
 const t=lb.issueToken();assert.ok(lb.readToken(t))
 const [p,m]=t.split('.')
 assert.equal(lb.readToken(`${Buffer.from(JSON.stringify({id:'x',t:0})).toString('base64url')}.${m}`),null,'contenu modifié')
 assert.equal(lb.readToken(`${p}.AAAA`),null,'signature fausse')
 for(const bad of [null,42,'','a.b.c'.repeat(100),'sans-point'])assert.equal(lb.readToken(bad),null)
 assert.equal(createLeaderboard({db,secret:'autre'}).readToken(t),null,'autre secret')
 clock+=31*24*3600*1000;assert.equal(lb.readToken(t),null,'trop vieux')
})
test('un temps plus court que l’horloge du serveur est refusé',async()=>{
 await wipe()
 const token=lb.issueToken();clock+=60_000
 const base={token,firstName:'Triche',lastName:'Rapide',time:200,penaltySeconds:0,ending:'exit',chapter:7,difficulty:'normal'}
 assert.equal((await lb.submit(base)).status,422,'200 s annoncées, 60 s écoulées')
 assert.equal((await lb.submit({...base,time:240,penaltySeconds:180})).status,201,'les pénalités s’ajoutent sans durer')
})
test('une partie ne s’enregistre qu’une fois',async()=>{
 await wipe()
 const token=lb.issueToken();clock+=600_000
 const run={token,firstName:'Jean',lastName:'Dupont',time:600,penaltySeconds:0,ending:'exit',chapter:7,difficulty:'normal'}
 assert.equal((await lb.submit(run)).status,201)
 assert.equal((await lb.submit(run)).status,409)
 assert.equal((await lb.list()).total,1)
})
test('sans jeton valide : rien en base',async()=>{
 await wipe()
 assert.equal((await lb.submit({firstName:'Jean',lastName:'Dupont',time:600,penaltySeconds:0,ending:'exit',chapter:7,difficulty:'normal'})).status,401)
 assert.equal((await lb.submit(null)).status,401)
 assert.equal((await lb.list()).total,0)
})
test('classement : évadés au temps, puis les autres selon l’acte, une ligne par personne',async()=>{
 await wipe()
 await play('Lent','Evadé',{time:900})
 await play('Rapide','Evadé',{time:300})
 await play('Capture','Tardive',{time:500,ending:'caught',chapter:7})
 await play('Capture','Precoce',{time:200,ending:'caught',chapter:2})
 await play('Temps','Ecoule',{time:1800,ending:'timeout',chapter:5})
 const {entries,total}=await lb.list()
 assert.deepEqual(entries.map(e=>e.firstName),['Rapide','Lent','Capture','Temps','Capture'])
 assert.deepEqual(entries.map(e=>e.rank),[1,2,3,4,5]);assert.equal(total,5)
 // La même personne rejoue, écrit son nom autrement : sa meilleure partie compte, et ses moins bonnes ne la dégradent pas.
 await play('Éloïse','Dupont',{time:700})
 let r=await play('ELOISE','dupont',{time:400});assert.equal(r.status,201);assert.equal(r.body.rank,2);assert.equal(r.body.best.time,400)
 r=await play('Eloïse','Dupont',{time:1200});assert.equal(r.body.rank,2,'moins bon : le rang ne bouge pas');assert.equal(r.body.best.time,400)
 r=await play('Eloïse','Dupont',{time:100,ending:'caught',chapter:1});assert.equal(r.body.best.ending,'exit','une capture ne remplace pas une évasion')
 assert.equal((await lb.list()).total,6)
})
test('filtre par difficulté, sans mélanger les rangs',async()=>{
 await wipe()
 await play('Facile','Un',{time:300,difficulty:'easy'});await play('Dure','Une',{time:800,difficulty:'hard'});await play('Dure','Deux',{time:700,difficulty:'hard'})
 const hard=await lb.list('hard');assert.deepEqual(hard.entries.map(e=>[e.rank,e.lastName]),[[1,'Deux'],[2,'Une']]);assert.equal(hard.total,2)
 assert.equal((await lb.list()).total,3);assert.equal((await lb.list('inconnue')).total,3,'filtre inconnu : ignoré')
})
test('la réponse publique ne contient ni adresse ni identifiant de partie',async()=>{
 await wipe();const r=await play('Jean','Prive',{ip:'9.9.9.9'})
 const text=JSON.stringify([r.body,await lb.list()])
 for(const secret of ['ip_hash','ipHash','9.9.9.9','run_id','player_key'])assert.ok(!text.includes(secret),secret)
 assert.deepEqual(Object.keys(r.body.best).sort(),['at','chapter','difficulty','ending','firstName','lastName','rank','time'])
 const [row]=(await pg.query('SELECT ip_hash FROM leaderboard_runs')).rows;assert.ok(!row.ip_hash.includes('9.9.9.9'),'adresse jamais stockée en clair')
})
test('trop d’enregistrements depuis une même connexion : limité, sans gêner les autres',async()=>{
 await wipe()
 for(let i=0;i<60;i++)assert.equal((await play('Jean','Boucle',{ip:'6.6.6.6',time:300})).status,201)
 assert.equal((await play('Jean','Boucle',{ip:'6.6.6.6',time:300})).status,429)
 assert.equal((await play('Autre','Personne',{ip:'7.7.7.7',time:300})).status,201)
})
test('une tentative d’injection SQL reste du texte, et le nom est refusé',async()=>{
 await wipe()
 const r=await play("Robert'); DROP TABLE leaderboard_runs;--",'Tables');assert.equal(r.status,400);assert.equal(r.body.error,'invalid_name')
 assert.equal((await handleScores(lb,{method:'GET',query:{difficulty:"x' OR 1=1;--"}})).status,200)
 assert.ok(Array.isArray((await lb.list()).entries),'la table existe toujours')
})
test('routes : méthodes et cache',async()=>{
 const get=await handleScores(lb,{method:'GET',query:{limit:'5'}});assert.equal(get.status,200);assert.match(get.headers['Cache-Control'],/s-maxage/)
 assert.equal((await handleScores(lb,{method:'DELETE'})).status,405)
 assert.equal(handleRun(lb,{method:'GET'}).status,405)
 const run=handleRun(lb,{method:'POST'});assert.equal(run.status,201);assert.ok(lb.readToken(run.body.token));assert.equal(run.headers['Cache-Control'],'no-store')
 const big=await lb.list(null,99999);assert.ok(big.entries.length<=50,'liste plafonnée')
})

// ---------- fonctions Vercel : réponses réelles, sans réseau ----------
const fakeRes=()=>({headers:{},code:0,payload:null,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.payload=b;return this}})
test('routes Vercel : sans base branchée, réponse propre ; avec, jeton remis sans appel réseau',async()=>{
 const saved={d:process.env.DATABASE_URL,p:process.env.POSTGRES_URL};delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL
 const scores=(await import('../../api/scores.js')).default,run=(await import('../../api/run.js')).default
 let res=fakeRes();await scores({method:'GET',query:{},headers:{}},res);assert.equal(res.code,503);assert.equal(res.payload.error,'unavailable')
 res=fakeRes();run({method:'POST',headers:{}},res);assert.equal(res.code,503,'pas de base, pas de jeton : le jeu continue sans classement')
 process.env.DATABASE_URL='postgresql://u:p@ep-test.eu-central-1.aws.neon.tech/db'
 res=fakeRes();run({method:'POST',headers:{}},res);assert.equal(res.code,201);assert.match(res.payload.token,/^[\w-]+\.[\w-]+$/);assert.equal(res.headers['Cache-Control'],'no-store')
 res=fakeRes();run({method:'GET',headers:{}},res);assert.equal(res.code,405)
 if(saved.d===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=saved.d
 if(saved.p!==undefined)process.env.POSTGRES_URL=saved.p
})
test('le pilote Neon offre bien l’appel utilisé par le serveur',async()=>{
 const {neon}=await import('@neondatabase/serverless')
 assert.equal(typeof neon('postgresql://u:p@ep-test.eu-central-1.aws.neon.tech/db').query,'function')
})

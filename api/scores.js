// GET : le classement. POST : enregistre une partie terminée.
import {handleScores} from './_lib/leaderboard.js'
import {leaderboard,clientIp,send} from './_lib/server.js'
export default async function handler(req,res){
 const lb=leaderboard();if(!lb)return send(res,{status:503,body:{error:'unavailable'}})
 try{send(res,await handleScores(lb,{method:req.method,query:req.query,body:req.body,ip:clientIp(req)}))}
 catch(e){console.error('[classement]',e?.message);send(res,{status:503,body:{error:'unavailable'}})}
}

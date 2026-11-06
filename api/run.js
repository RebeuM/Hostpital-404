// POST : remet le jeton signé d'une partie qui commence.
import {handleRun} from './_lib/leaderboard.js'
import {leaderboard,send} from './_lib/server.js'
export default function handler(req,res){
 const lb=leaderboard();if(!lb)return send(res,{status:503,body:{error:'unavailable'}})
 send(res,handleRun(lb,{method:req.method}))
}

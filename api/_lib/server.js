// Branche le classement sur l'hébergeur : base Neon (PostgreSQL) et fonctions Vercel.
import {createHash} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {createLeaderboard} from './leaderboard.js'

let instance=null
export function leaderboard(){
 if(instance)return instance
 const url=process.env.DATABASE_URL||process.env.POSTGRES_URL
 if(!url)return null
 const sql=neon(url)
 // Sans secret dédié, on en dérive un de l'adresse de la base : le classement marche dès que la base est branchée.
 const secret=process.env.LEADERBOARD_SECRET||createHash('sha256').update(url).digest('hex')
 return instance=createLeaderboard({db:{query:(text,params)=>sql.query(text,params)},secret})
}
export const clientIp=req=>String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket?.remoteAddress||''
export function send(res,{status,body,headers={}}){
 for(const [k,v] of Object.entries(headers))res.setHeader(k,v)
 res.status(status).json(body)
}

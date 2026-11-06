// Dialogue avec le classement en ligne. Une panne réseau ne doit jamais gêner la partie : tout échec se traduit par une valeur, pas une exception.
const PLAYER_KEY='hospital404.player'
export async function requestRunToken(){
 try{const r=await fetch('/api/run',{method:'POST'});if(!r.ok)return null;return (await r.json()).token||null}catch{return null}
}
export async function fetchLeaderboard(difficulty=null,{signal}={}){
 const r=await fetch('/api/scores'+(difficulty?`?difficulty=${difficulty}`:''),{signal})
 if(!r.ok)throw new Error('unavailable')
 return r.json()
}
export async function submitScore(run){
 try{
  const r=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(run)})
  const body=await r.json().catch(()=>({}))
  return r.ok?{ok:true,...body}:{ok:false,error:body.error||'unavailable'}
 }catch{return {ok:false,error:'unavailable'}}
}
// Le nom est retenu sur l'appareil : inutile de le retaper à chaque partie.
export function readPlayer(storage=globalThis.localStorage){
 try{const p=JSON.parse(storage?.getItem(PLAYER_KEY)||'null');return {firstName:typeof p?.firstName==='string'?p.firstName:'',lastName:typeof p?.lastName==='string'?p.lastName:''}}catch{return {firstName:'',lastName:''}}
}
export function savePlayer(firstName,lastName,storage=globalThis.localStorage){try{storage?.setItem(PLAYER_KEY,JSON.stringify({firstName,lastName}))}catch{}}

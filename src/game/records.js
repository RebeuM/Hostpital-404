// Temps de partie enregistrés en fin de partie (localStorage). Seules les parties menées jusqu'à la sortie sont classées.
export const RECORDS_KEY='hospital404.records'
const MAX_RECORDS=50
const valid=r=>r&&typeof r==='object'&&Number.isFinite(r.time)&&r.time>=0&&(r.ending==='exit'||r.ending==='caught'||r.ending==='timeout')&&Number.isFinite(r.at)

export function readRecords(storage=globalThis.localStorage){
 try{
  const data=JSON.parse(storage?.getItem(RECORDS_KEY)??'[]')
  return Array.isArray(data)?data.filter(valid):[]
 }catch{return []}
}
export const rankedRecords=records=>records.filter(r=>r.ending==='exit').sort((a,b)=>a.time-b.time||a.at-b.at)
export const bestTime=(records=readRecords())=>rankedRecords(records)[0]?.time??null

// Enregistre le temps et indique s'il bat le record. Un stockage indisponible n'empêche pas d'afficher le temps.
export function addRecord({time,ending,difficulty,penalties,at=Date.now()},storage=globalThis.localStorage){
 const record={time:Math.max(0,Number.isFinite(time)?time:0),ending,at,...(difficulty?{difficulty}:{}),...(penalties?{penalties}:{})}
 const before=readRecords(storage),best=bestTime(before)
 try{storage?.setItem(RECORDS_KEY,JSON.stringify([...before,record].slice(-MAX_RECORDS)))}catch{}
 return {...record,isBest:ending==='exit'&&(best===null||record.time<best)}
}
export function formatTime(seconds){
 const t=Math.floor(seconds),m=Math.floor(t/60),s=t%60
 return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

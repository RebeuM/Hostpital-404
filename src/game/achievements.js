// Succès : débloqués une fois pour toutes sur cet appareil, indépendamment de la sauvegarde de partie
// (une nouvelle partie ne les efface pas). Liste prévue : « quete secondaire et succes.pdf » du propriétaire ;
// seuls ceux dont la condition existe dans le jeu figurent ici.
export const ACHIEVEMENTS=[
 {id:'oiia',title:'OIIA OIIA',desc:'Discuter avec le chat de la salle d’attente.',secret:true}
]
export const ACHIEVEMENT_KEY='hospital404.achievements'
export const achievementById=id=>ACHIEVEMENTS.find(a=>a.id===id)||null
// { id: date de déblocage (ms) } ; tout ce qui n'est pas un succès connu daté est ignoré.
export function loadAchievements(storage=globalThis.localStorage){
 try{
  const raw=JSON.parse(storage?.getItem(ACHIEVEMENT_KEY)||'{}'),out={}
  if(raw&&typeof raw==='object')for(const a of ACHIEVEMENTS)if(Number.isFinite(raw[a.id]))out[a.id]=raw[a.id]
  return out
 }catch{return {}}
}
export function saveAchievements(map,storage=globalThis.localStorage){try{storage?.setItem(ACHIEVEMENT_KEY,JSON.stringify(map))}catch{}}

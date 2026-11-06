// Montée de l'angoisse : de petits événements pendant l'exploration, sans jamais montrer grand-chose.
// Le poids règle la fréquence relative ; jamais deux fois le même d'affilée.
export const DREAD_EVENTS=[
 {id:'stalker',weight:3},   // des pas dans le dos, qui s'arrêtent quand le joueur s'arrête
 {id:'noise',weight:3},     // un bruit quelque part dans le bâtiment
 {id:'flicker',weight:3},   // les néons lâchent quelques instants
 {id:'torch',weight:2},     // la torche faiblit
 {id:'breath',weight:1.5},  // une respiration juste derrière
 {id:'apparition',weight:1.5}, // une silhouette immobile, au loin, qui disparaît
 {id:'haunt',weight:3.5}   // le décor change dans le dos du joueur
]
export const dreadDelay=(random=Math.random,first=false)=>first?10+random()*12:18+random()*22
export function pickDread(lastId,random=Math.random){
 const pool=DREAD_EVENTS.filter(e=>e.id!==lastId),total=pool.reduce((t,e)=>t+e.weight,0)
 let r=random()*total
 for(const e of pool){r-=e.weight;if(r<0)return e.id}
 return pool[pool.length-1].id
}
export const canDread=s=>s.phase==='playing'&&!s.outside&&!s.modal&&!s.paused&&!s.chase&&!s.capture&&!s.encounter&&!s.hiding&&!s.blackout&&!s.scare&&!s.itemShown&&!s.journalVisible&&!s.settingsVisible
// Intensité d'une lumière qui défaille (1 = normale). Sans clignotement rapide si le joueur a réduit les animations.
export function flickerLevel(now,until,reduce=false){
 if(now>=until)return 1
 if(reduce)return .4
 const n=Math.floor(now/65),h=Math.sin(n*12.9898)*43758.5453,r=h-Math.floor(h)
 return r<.5?.04:r<.75?.35:.9
}
// Le monstre tout près : 0 au loin, 1 à portée de main ; sert au cœur, à l'écran et aux vibrations.
export const dangerLevel=dist=>Math.max(0,Math.min(1,(18-dist)/15))
export const heartPeriod=dist=>880-520*dangerLevel(dist)

// Rencontres avant la fin : après chaque énigme résolue, le monstre vient rôder une fois.
export const encounterDelay=(random=Math.random)=>10+random()*12
export const ENCOUNTER_LENGTH=32
// Trois façons de venir : il rôde, il attend immobile plus loin devant, ou on ne fait que l'entendre passer.
// La première rencontre apprend la règle, ensuite on ne sait plus à quoi s'attendre.
export const ENCOUNTER_KINDS=['prowl','ambush','false']
export function pickEncounterKind(last,played,random=Math.random){
 if(!played)return 'prowl'
 const pool=ENCOUNTER_KINDS.filter(k=>k!==last)
 return pool[Math.floor(random()*pool.length)%pool.length]
}
export const AMBUSH={minCells:35,maxCells:60,trigger:7,length:45,afterLength:14}
export const FALSE_ALARM={length:14,steps:.62,farDist:17,nearDist:4.5}
// Distance des pas d'une fausse alerte : ils approchent, passent tout près, puis s'éloignent.
export const falseAlarmDist=age=>{const t=Math.max(0,Math.min(1,age/FALSE_ALARM.length));return FALSE_ALARM.nearDist+(FALSE_ALARM.farDist-FALSE_ALARM.nearDist)*Math.abs(2*t-1)}
// Répit après une grosse frayeur : pour que la suivante surprenne encore.
export const RESPITE={dread:14,scare:25,laugh:20}
// Écart minimum entre deux événements (secondes) : empilés, ils s'annulent au lieu de faire peur.
export const EVENT_GAP=8
export const encounterLevel=s=>['patients','radio','security','lab'].filter(id=>s.done?.[id]).length
// Se retourner : quelques instants après des pas dans le dos, un demi-tour peut déclencher un screamer.
export const TURN_TRAP={chance:.45,ms:6500,angle:2.4}

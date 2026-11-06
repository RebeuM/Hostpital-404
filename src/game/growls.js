// Grognements pendant les énigmes : quel passage du fichier, d'où il vient et dans combien de temps le suivant.
// Le fichier contient trois grognements séparés par des silences (début et durée en secondes).
export const GROWL_SEGMENTS=[[0,6],[6.68,.72],[7.93,4.27]]
export function pickGrowl(random=Math.random){
 const [offset,duration]=GROWL_SEGMENTS[Math.floor(random()*GROWL_SEGMENTS.length)]
 // Le plus souvent loin, derrière les murs ; parfois tout près, pour surprendre.
 const close=random()<.28
 return {offset,duration,close,dist:close?1.6+random()*2.4:9+random()*17,pan:random()*2-1,rate:.88+random()*.18}
}
// Délai avant un grognement : assez long pour rester une surprise, jamais à intervalle régulier.
export const growlDelay=(random=Math.random,first=false)=>first?6+random()*9:15+random()*22

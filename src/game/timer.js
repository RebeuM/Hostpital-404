// Minuteur global : 30 minutes pour s'échapper, moins une minute par screamer subi, erreur commise ou indice utilisé.
// Le temps restant se déduit du temps écoulé et des pénalités : il n'y a qu'une seule source de vérité à sauvegarder.
export const GAME_TIME=30*60
export const PENALTY_SECONDS=60
export const PENALTY_REASONS=['scare','error','hint']
export const PENALTY_LABELS={scare:'Screamer',error:'Erreur',hint:'Indice'}
export const noPenalties=()=>({scare:0,error:0,hint:0})
export const timeUsed=s=>(s.elapsed||0)+(s.penalty||0)
export const timeLeft=s=>Math.max(0,GAME_TIME-timeUsed(s))
export const timerLevel=left=>left<=60?'critical':left<=300?'low':'normal'
// Un indice qui viderait le chrono n'est plus proposé.
export const canAffordHint=s=>timeLeft(s)>PENALTY_SECONDS

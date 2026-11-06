// Sauvegarde locale versionnée : sérialisation, validation stricte et position de reprise sûre.
import {normalizeFlags,emptyFlags} from './progression.js'
import {isOccupied,SAFE_SPOTS} from './layout.js'
import {DIFFICULTY_IDS} from './difficulty.js'
import {GAME_TIME,PENALTY_REASONS,noPenalties} from './timer.js'

export const SAVE_KEY='hospital404.save'
export const SAVE_VERSION=4
// Une reprise laisse toujours au moins une minute, et une ancienne sauvegarde sans minuteur en reçoit cinq.
const MIN_RESUME_TIME=60,MIGRATED_TIME=300
const FLAG_KEYS=['hasKey','sectorOpen','done','usb','chase','secretVisited','readNote','seen','chapter','chaseTime']

export function serializeSave(state,player){
 const flags={};for(const k of FLAG_KEYS)flags[k]=state[k]
 return {version:SAVE_VERSION,savedAt:Date.now(),runToken:state.runToken||null,flags,player:{x:player.x,z:player.z,yaw:player.yaw},elapsed:state.elapsed||0,penalty:state.penalty||0,penalties:state.penalties||noPenalties(),hintsUsed:state.hintsUsed||{},difficulty:state.settings?.difficulty||null}
}
function isObj(v){return v&&typeof v==='object'&&!Array.isArray(v)}
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0
// Renvoie {flags,player,elapsed,penalty,penalties,hintsUsed,difficulty,repaired:boolean} ou null si la sauvegarde est inexploitable.
export function parseSave(raw){
 if(typeof raw!=='string'||!raw)return null
 let data;try{data=JSON.parse(raw)}catch{return null}
 if(!isObj(data)||typeof data.version!=='number')return null
 if(data.version>SAVE_VERSION)return null
 if(data.version<SAVE_VERSION){data=migrate(data);if(!data)return null}
 if(!isObj(data.flags))return null
 let repaired=false
 const flagsIn=data.flags
 for(const k of ['hasKey','sectorOpen','usb','chase','secretVisited','readNote'])if(k in flagsIn&&typeof flagsIn[k]!=='boolean'){return null}
 if('done' in flagsIn&&!isObj(flagsIn.done))return null
 const before=JSON.stringify(normalizeInput(flagsIn))
 const flags=normalizeFlags(flagsIn)
 if(JSON.stringify(normalizeInput(flags))!==before)repaired=true
 // Pendant la poursuite, la reprise redémarre à l'entrée de la galerie avec le chrono complet.
 if(flags.chase){flags.chaseTime=110;flags.secretVisited=false}
 let player=null
 if(isObj(data.player)&&['x','z','yaw'].every(k=>typeof data.player[k]==='number'&&Number.isFinite(data.player[k]))){
  player={x:data.player.x,z:data.player.z,yaw:data.player.yaw}
 }
 const safe=SAFE_SPOTS[flags.chapter]||SAFE_SPOTS[1]
 if(!player||flags.chase||isOccupied(player.x,player.z,flags,.34)){player={...safe};if(!flags.chase)repaired=repaired||true}
 const penalty=Math.min(positive(data.penalty),GAME_TIME-MIN_RESUME_TIME)
 const elapsed=Math.min(positive(data.elapsed),GAME_TIME-MIN_RESUME_TIME-penalty)
 const penalties=noPenalties();if(isObj(data.penalties))for(const k of PENALTY_REASONS)penalties[k]=Math.floor(positive(data.penalties[k]))
 const hintsUsed={};if(isObj(data.hintsUsed))for(const [k,v] of Object.entries(data.hintsUsed))if(positive(v)>0)hintsUsed[k]=Math.floor(v)
 const difficulty=DIFFICULTY_IDS.includes(data.difficulty)?data.difficulty:null
 return {flags,player,elapsed,penalty,penalties,hintsUsed,difficulty,repaired,savedAt:typeof data.savedAt==='number'?data.savedAt:null,runToken:typeof data.runToken==='string'?data.runToken:null}
}
// Comparaison hors champs dérivés (chapter est recalculé, chaseTime est borné).
function normalizeInput(f){
 const e=emptyFlags();const o={}
 for(const k of Object.keys(e)){if(k==='chapter'||k==='chaseTime')continue;o[k]=k in f?f[k]:e[k]}
 return o
}
function migrate(data){
 // v1/v2 (anciennes éditions) stockaient inventaire et journal ; seuls les drapeaux sont conservés.
 if(data.version===1||data.version===2||data.version===3){
  const src=isObj(data.flags)?data.flags:data
  const flags={};for(const k of FLAG_KEYS)if(k in src)flags[k]=src[k]
  // v3 n'avait pas de minuteur : la partie reprend avec au moins cinq minutes.
  return {version:SAVE_VERSION,savedAt:data.savedAt,flags,player:data.player,elapsed:Math.min(positive(data.elapsed),GAME_TIME-MIGRATED_TIME)}
 }
 return null
}
export function readSave(storage=globalThis.localStorage){
 try{if(!storage)return null;return parseSave(storage.getItem(SAVE_KEY))}catch{return null}
}
export function writeSave(state,player,storage=globalThis.localStorage){
 try{if(!storage)return false;storage.setItem(SAVE_KEY,JSON.stringify(serializeSave(state,player)));return true}catch{return false}
}
export function clearSave(storage=globalThis.localStorage){
 try{storage?.removeItem(SAVE_KEY)}catch{}
}

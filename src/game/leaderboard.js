// Classement en ligne : règles communes au jeu et au serveur. Aucune dépendance au navigateur ni à la base.
import {DIFFICULTY_IDS} from './difficulty.js'
import {GAME_TIME,PENALTY_SECONDS} from './timer.js'
export const NAME_MIN=2,NAME_MAX=40
export const ENDINGS=['exit','caught','timeout']
// Un robot qui connaît toutes les réponses et ne lit aucun dialogue met une centaine de secondes : en dessous d'une minute, ce n'est pas une partie.
export const MIN_ESCAPE_SECONDS=60
const FINAL_CHAPTER=7
// Lettres de toutes les langues, espaces, tirets, apostrophes et points : ni lien, ni code.
const NAME_RE=/^\p{L}[\p{L}\p{M} '’.-]*$/u
export const cleanName=v=>typeof v==='string'?v.normalize('NFC').replace(/\s+/g,' ').trim():''
export function validName(v){const n=cleanName(v);return n.length>=NAME_MIN&&n.length<=NAME_MAX&&NAME_RE.test(n)}
// Une même personne n'occupe qu'une ligne, quelle que soit sa façon d'écrire son nom (« Éloïse DUPONT » et « eloise dupont »).
const keyPart=v=>cleanName(v).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}]/gu,'')
export const playerKey=(first,last)=>`${keyPart(first)}|${keyPart(last)}`
// Valide une partie envoyée par le navigateur. Renvoie la partie normalisée, ou {error}.
export function validateRun(run){
 if(!run||typeof run!=='object')return {error:'invalid_run'}
 if(!validName(run.firstName)||!validName(run.lastName))return {error:'invalid_name'}
 const {time,penaltySeconds,ending,chapter,difficulty}=run
 if(!ENDINGS.includes(ending)||!DIFFICULTY_IDS.includes(difficulty))return {error:'invalid_run'}
 if(!Number.isInteger(chapter)||chapter<1||chapter>FINAL_CHAPTER)return {error:'invalid_run'}
 if(!Number.isInteger(time)||time<0||time>GAME_TIME)return {error:'invalid_run'}
 if(!Number.isInteger(penaltySeconds)||penaltySeconds<0||penaltySeconds>time||penaltySeconds%PENALTY_SECONDS)return {error:'invalid_run'}
 // On ne sort qu'à la fin de la poursuite, et jamais en moins d'une minute de jeu réel.
 if(ending==='exit'&&(chapter!==FINAL_CHAPTER||time-penaltySeconds<MIN_ESCAPE_SECONDS))return {error:'implausible'}
 const firstName=cleanName(run.firstName),lastName=cleanName(run.lastName)
 return {firstName,lastName,key:playerKey(firstName,lastName),time,penaltySeconds,ending,chapter,difficulty}
}

// Classement en ligne : la liste commune à tous les joueurs, le panneau du menu et l'inscription en fin de partie.
import React,{useEffect,useMemo,useState} from 'react'
import {AlertTriangle,ArrowRight,Trophy} from 'lucide-react'
import {useGame} from '../game/store'
import {CHAPTERS} from '../game/layout'
import {DIFFICULTIES,DIFFICULTY_IDS} from '../game/difficulty'
import {formatTime} from '../game/records'
import {NAME_MAX,playerKey,validName} from '../game/leaderboard'
import {fetchLeaderboard,readPlayer,requestRunToken,savePlayer,submitScore} from '../game/leaderboardApi'

const ERROR_TEXT={
 invalid_name:'Vérifie ton prénom et ton nom : deux lettres au moins, sans chiffres ni symboles.',
 already_saved:'Cette partie est déjà enregistrée.',
 implausible:'Ce temps n’a pas pu être vérifié : la partie n’est pas classée.',
 invalid_token:'Cette partie n’a pas pu être vérifiée : elle a commencé hors connexion.',
 rate_limited:'Trop d’enregistrements depuis cette connexion. Réessaie plus tard.'
}
const UNAVAILABLE='Classement indisponible pour l’instant. Réessaie dans un moment.'
const rankLabel=n=>n===1?'1er':`${n}e`
const act=chapter=>(CHAPTERS[chapter]||'').split('·')[0].trim()
const result=e=>e.ending==='exit'?formatTime(e.time):`${act(e.chapter)} · ${e.ending==='timeout'?'temps écoulé':'capturé'}`
const keyOf=e=>playerKey(e.firstName,e.lastName)

export function RankingTable({entries,me,limit=entries.length}){
 const shown=entries.slice(0,limit)
 return <table className="ranking"><thead><tr><th>#</th><th>Joueur</th><th>Résultat</th><th>Difficulté</th><th className="ranking-date">Date</th></tr></thead>
  <tbody>{shown.map(e=><tr key={e.rank} className={(me&&keyOf(e)===me?'me ':'')+(e.ending==='exit'?'escaped':'')}>
   <td>{e.rank}</td><td className="ranking-name">{e.firstName} {e.lastName}</td><td className="ranking-result">{result(e)}</td><td>{DIFFICULTIES[e.difficulty]?.label}</td><td className="ranking-date">{new Date(e.at).toLocaleDateString('fr-FR')}</td>
  </tr>)}</tbody></table>
}
// Écran « Classement » du menu.
export function LeaderboardPanel({onClose}){
 const [filter,setFilter]=useState(null),[data,setData]=useState(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  const abort=new AbortController();setData(null);setFailed(false)
  fetchLeaderboard(filter,{signal:abort.signal}).then(setData).catch(()=>{if(!abort.signal.aborted)setFailed(true)})
  return()=>abort.abort()
 },[filter,attempt])
 const me=useMemo(()=>{const p=readPlayer();return validName(p.firstName)&&validName(p.lastName)?playerKey(p.firstName,p.lastName):null},[])
 const tabs=[[null,'Toutes'],...DIFFICULTY_IDS.map(d=>[d,DIFFICULTIES[d].label])]
 return <div className="panel paper leaderboard-panel" role="dialog" aria-label="Classement">
  <header><h2>Classement</h2><button className="close-x" onClick={onClose} aria-label="Fermer">✕</button></header>
  <div className="seg" role="group" aria-label="Difficulté">{tabs.map(([d,l])=><button key={l} className={filter===d?'on':''} aria-pressed={filter===d} onClick={()=>setFilter(d)}>{l}</button>)}</div>
  <div className="ranking-body" aria-live="polite">
   {failed?<div className="ranking-state"><AlertTriangle size={18}/><p>{UNAVAILABLE}</p><button className="outline-btn" onClick={()=>setAttempt(a=>a+1)}>RÉESSAYER</button></div>
    :!data?<p className="ranking-state">Chargement…</p>
    :!data.entries.length?<p className="ranking-state">Personne n’est encore inscrit ici. À toi d’ouvrir le classement.</p>
    :<><RankingTable entries={data.entries} me={me}/><p className="muted ranking-note">{data.total} joueur{data.total>1?'s':''}. Les évadés sont classés au temps, les autres selon l’acte atteint. Chacun n’apparaît qu’une fois, avec sa meilleure partie.</p></>}
  </div>
 </div>
}
// Inscription au classement, sur l'écran de fin.
export function ScoreForm({record}){
 const saved=useMemo(readPlayer,[])
 const [firstName,setFirst]=useState(saved.firstName),[lastName,setLast]=useState(saved.lastName)
 const [status,setStatus]=useState('idle'),[error,setError]=useState(''),[done,setDone]=useState(null)
 const submit=async e=>{
  e.preventDefault();if(status==='sending')return
  if(!validName(firstName)||!validName(lastName)){setError(ERROR_TEXT.invalid_name);return}
  setStatus('sending');setError('')
  const s=useGame.getState(),token=s.runToken||await requestRunToken()
  const out=await submitScore({token,firstName,lastName,time:Math.floor(record.time),penaltySeconds:s.penalty||0,ending:record.ending,chapter:s.chapter,difficulty:record.difficulty||s.settings.difficulty})
  if(out.ok){savePlayer(firstName.trim(),lastName.trim());setDone(out);setStatus('done');return}
  setStatus(out.error==='already_saved'?'done':'idle');setError(ERROR_TEXT[out.error]||UNAVAILABLE)
 }
 if(done){
  const me=playerKey(firstName,lastName),inTop=done.rank<=10
  return <section className="score-box" aria-label="Classement">
   <p className="score-result"><Trophy size={17}/> Tu es <strong>{rankLabel(done.rank)}</strong> sur {done.total} joueur{done.total>1?'s':''}{done.best.ending===record.ending&&done.best.time===Math.floor(record.time)?'':' avec ta meilleure partie'}.</p>
   <RankingTable entries={inTop?done.entries:[...done.entries.slice(0,9),done.best]} me={me} limit={10}/>
  </section>
 }
 return <section className="score-box" aria-label="Inscription au classement">
  <h3>Inscris-toi au classement</h3>
  <form className="score-form" onSubmit={submit} onFocus={e=>{if(e.target.tagName==='INPUT')setTimeout(()=>e.target.scrollIntoView?.({block:'center',behavior:'smooth'}),280)}}>
   <label>Prénom<input id="scoreFirstName" value={firstName} onChange={e=>setFirst(e.target.value)} maxLength={NAME_MAX} autoComplete="given-name" autoCapitalize="words" spellCheck="false" enterKeyHint="next"/></label>
   <label>Nom<input id="scoreLastName" value={lastName} onChange={e=>setLast(e.target.value)} maxLength={NAME_MAX} autoComplete="family-name" autoCapitalize="words" spellCheck="false" enterKeyHint="send"/></label>
   <button type="submit" className="primary-btn" disabled={status==='sending'||status==='done'}>{status==='sending'?'ENVOI…':'ENREGISTRER'} <ArrowRight size={16}/></button>
  </form>
  {error&&<p className="score-error" role="alert"><AlertTriangle size={14}/> {error}</p>}
  <p className="score-note">Ton prénom et ton nom seront visibles par tous dans le classement.</p>
 </section>
}

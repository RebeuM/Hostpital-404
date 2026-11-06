import React,{useEffect,useState} from 'react'
import {Trophy,Lock} from 'lucide-react'
import {useGame} from '../game/store'
import {ACHIEVEMENTS,achievementById} from '../game/achievements'

const fmtDate=ms=>new Date(ms).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
// Liste des succès (menu principal). Un succès secret garde son titre caché tant qu'il n'est pas débloqué.
export function AchievementsPanel({onClose}){
 const got=useGame(s=>s.achievements)
 const count=ACHIEVEMENTS.filter(a=>got[a.id]).length
 return <div className="panel paper achievements-panel" role="dialog" aria-label="Succès">
  <header><h2>Succès</h2><button className="close-x" onClick={onClose} aria-label="Fermer">✕</button></header>
  <p className="achievements-count">{count} / {ACHIEVEMENTS.length} débloqué{count>1?'s':''}</p>
  <ul className="achievement-list">
   {ACHIEVEMENTS.map(a=>{const at=got[a.id],hidden=a.secret&&!at
    return <li key={a.id} className={'achievement'+(at?' unlocked':'')}>
     <span className="achievement-icon" aria-hidden="true">{at?<Trophy size={20}/>:<Lock size={18}/>}</span>
     <div><strong>{hidden?'Succès secret':a.title}</strong><p>{hidden?'Continue d’explorer l’hôpital…':a.desc}</p>{at&&<small>Débloqué le {fmtDate(at)}</small>}</div>
    </li>})}
  </ul>
 </div>
}
// Carte « succès débloqué » en haut de l'écran, quelques secondes, sans bloquer le jeu.
export function AchievementToast(){
 const shown=useGame(s=>s.achievementShown)
 const [visible,setVisible]=useState(null)
 useEffect(()=>{
  if(!shown)return
  setVisible(shown);const t=setTimeout(()=>setVisible(null),5200);return()=>clearTimeout(t)
 },[shown])
 const a=visible&&achievementById(visible.id)
 if(!a)return null
 return <div className="achievement-toast paper" role="status" aria-live="polite" key={visible.at}>
  <span className="achievement-icon" aria-hidden="true"><Trophy size={22}/></span>
  <div><small>SUCCÈS DÉBLOQUÉ{a.secret?' · SECRET':''}</small><strong>{a.title}</strong><p>{a.desc}</p></div>
 </div>
}

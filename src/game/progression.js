// Progression dérivée des drapeaux de jeu : inventaire et journal sont calculés,
// jamais stockés, ce qui empêche toute duplication d'objets ou de preuves.
import {EVIDENCE} from './story.js'

export const PUZZLE_IDS=['patients','radio','security','lab']
export const CHAPTER_FOR_PUZZLE={patients:3,radio:4,security:5,lab:6}
// Objets de l'inventaire (étiquette, titre de l'animation « objet récupéré »).
// L'image de chaque objet est public/assets/items/<id>.png.
export const ITEMS={
 key:{label:'Clé du secteur des patients',caption:'CLÉ RÉCUPÉRÉE'},
 fiche203:{label:'Fiche patiente 203',caption:'DOCUMENT RÉCUPÉRÉ',doc:'fiche203-contenu.png'},
 rapport:{label:'Rapport H-404',caption:'DOCUMENT RÉCUPÉRÉ',doc:'rapport-contenu.png'},
 badge:{label:'Badge sécurité',caption:'BADGE RÉCUPÉRÉ'},
 dossier:{label:'Dossier 404-EM-2018',caption:'DOSSIER RESTAURÉ'},
 usb:{label:'Clé USB BACKUP_H404_FINAL',caption:'CLÉ USB RÉCUPÉRÉE'}
}

export function emptyFlags(){
 return {hasKey:false,sectorOpen:false,done:{},usb:false,chase:false,secretVisited:false,readNote:false,seen:{},chapter:1,chaseTime:110}
}
export function inventoryFor(f){
 const items=[];const add=id=>items.push({id,...ITEMS[id]})
 if(f.hasKey)add('key')
 if(f.done?.patients)add('fiche203')
 if(f.done?.radio)add('rapport')
 if(f.done?.security)add('badge')
 if(f.done?.lab)add('dossier')
 if(f.usb)add('usb')
 return items
}
export function journalFor(f){
 const j=[{id:'intro',title:'Entrée dans l’hôpital Charcot',body:'Thomas et Maxime recherchent le dossier d’Éléonore Vasseur, décédée ici en 2018.'}]
 if(f.seen?.reception_pc)j.push({id:'reception_pc',title:'Terminal d’accueil',body:'Accès aux dossiers patients refusé : autorisation requise.'})
 if(f.readNote)j.push({id:'note',title:'Note de service',body:EVIDENCE.note})
 if(f.hasKey)j.push({id:'squatter',title:'La clé du squatteur',body:EVIDENCE.squatter})
 if(f.sectorOpen)j.push({id:'disappearance',title:'Maxime a disparu',body:EVIDENCE.disappearance})
 if(f.seen?.bed203)j.push({id:'bed203',title:'Lit 203',body:EVIDENCE.bed203})
 if(f.done?.patients)j.push({id:'patients',title:'Fiche 203 — transfert en radiologie',body:EVIDENCE.patients})
 if(f.done?.radio)j.push({id:'radio',title:'Le coffre du médecin',body:EVIDENCE.radio})
 if(f.done?.security)j.push({id:'security',title:'Le chemin critique',body:EVIDENCE.security})
 if(f.done?.lab)j.push({id:'lab',title:'Dossier 404-EM-2018',body:EVIDENCE.lab})
 if(f.usb)j.push({id:'morgue',title:'Sauvegarde H-404',body:EVIDENCE.morgue})
 return j
}
export function solvedCount(f){return PUZZLE_IDS.filter(k=>f.done?.[k]).length}
// Vérifie la cohérence des drapeaux (les étapes s'enchaînent dans l'ordre du scénario) et les corrige.
export function normalizeFlags(input){
 const f={...emptyFlags(),...(input||{})}
 f.done={...(input?.done||{})};f.seen={...(input?.seen||{})}
 for(const k of Object.keys(f.done))if(!PUZZLE_IDS.includes(k)||f.done[k]!==true)delete f.done[k]
 for(const k of Object.keys(f.seen))if(f.seen[k]!==true)delete f.seen[k]
 if(!f.hasKey)f.sectorOpen=false
 if(!f.sectorOpen){f.done={};f.seen={...f.seen};delete f.seen.bed203}
 if(!f.done.patients){delete f.done.radio}
 if(!f.done.radio){delete f.done.security}
 if(!f.done.security){delete f.done.lab}
 if(!f.done.lab){f.usb=false}
 if(!f.usb){f.chase=false}
 if(!f.chase){f.secretVisited=false;f.chaseTime=110}
 f.chapter=chapterFor(f)
 if(typeof f.chaseTime!=='number'||!Number.isFinite(f.chaseTime))f.chaseTime=110
 f.chaseTime=Math.min(110,Math.max(0,f.chaseTime))
 return f
}
export function chapterFor(f){
 if(f.chase)return 7
 if(f.done?.lab)return 6
 if(f.done?.security)return 5
 if(f.done?.radio)return 4
 if(f.done?.patients)return 3
 if(f.sectorOpen)return 2
 return 1
}

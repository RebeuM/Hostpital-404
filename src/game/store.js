import {create} from 'zustand'
import {CAT,CHAPTERS,OBJECTIVES,START_POSITION,OUTSIDE_START,ROOM_DOORS,isGateOpen,isDoorPassable,hideSpot,GATES,SAFE_SPOTS,INTERACTIVES,isInteractiveAvailable,dynamicObstacles} from './layout.js'
import {addRecord} from './records.js'
import {requestRunToken} from './leaderboardApi.js'
import {STORIES,PUZZLES,validateAnswer} from './story.js'
import {emptyFlags,normalizeFlags,CHAPTER_FOR_PUZZLE,inventoryFor,journalFor} from './progression.js'
import {readSave,writeSave,clearSave} from './save.js'
import {loadSettings,saveSettings,sanitizeSettings,QUALITIES,QUALITY_LABELS} from './settings.js'
import {canDread,pickDread,dreadDelay,encounterDelay,encounterLevel,pickEncounterKind,TURN_TRAP,RESPITE,EVENT_GAP} from './dread.js'
import {difficultyOf} from './difficulty.js'
import {isTouchDevice} from './input.js'
import {pickScare,ambientScareDelay,canAmbientScare,ambientScareReady,laughDelay,CAPTURE_SCARE,CAPTURE_SCARE_DELAY,scareVariant} from './scares.js'
import {loadAchievements,saveAchievements,achievementById} from './achievements.js'
import {GAME_TIME,PENALTY_SECONDS,PENALTY_LABELS,noPenalties,timeLeft,timeUsed,canAffordHint} from './timer.js'

// Données mutées à chaque image (position, orientation) : hors de React, lues par le rendu et la mini-carte.
export const runtime={player:{x:START_POSITION.x,z:START_POSITION.z,yaw:START_POSITION.yaw,pitch:0,jump:0,vy:0},look:{yaw:START_POSITION.yaw,pitch:0},dialogClosedAt:-1e9,lastClosed:null,catSongUntil:0,lastSave:0,moonBaked:false,outdoorMix:1,ambientScareIn:ambientScareDelay(Math.random,true),laughIn:laughDelay(Math.random,true),dreadIn:dreadDelay(Math.random,true),lastDread:null,stamina:{value:1,exhausted:false,running:false},encounterSeen:-1,encounterIn:Infinity,turnTrapUntil:0,turnTrapYaw:0,trapLocker:null,hauntAsked:false,hauntMessages:0,flickerUntil:0,torchDipUntil:0,apparitionAsked:false,chaseDist:Infinity,lastScare:0,lastScareId:null,chaser:{x:0,z:0}}
export const SCARE_COOLDOWN_MS=12000
const TRAP_LOCKERS=['hide_accueil','hide_couloir','hide_couloir2','hide_securite','hide_morgue']
function resetThreats(){
 dynamicObstacles.clear()
 runtime.doorSoundsFrom=null // Les portes reprennent l'état de la partie : ce changement-là ne s'entend pas.
 Object.assign(runtime,{catSongUntil:0,catScareAt:0,timeWarned:0,calmUntil:0,encounterKind:null,encountersPlayed:0,stamina:{value:1,exhausted:false,running:false},encounterSeen:-1,encounterIn:Infinity,turnTrapUntil:0,hauntAsked:false,hauntMessages:0,chaseDist:Infinity,
  trapLocker:TRAP_LOCKERS[Math.floor(Math.random()*TRAP_LOCKERS.length)]})
}

const calm=()=>Date.now()<runtime.calmUntil
const markEvent=()=>{runtime.calmUntil=Date.now()+EVENT_GAP*1000}
const breathe=({dread=0,scare=0,laugh=0})=>{runtime.dreadIn=Math.max(runtime.dreadIn,dread);runtime.ambientScareIn=Math.max(runtime.ambientScareIn,scare);runtime.laughIn=Math.max(runtime.laughIn,laugh)}

const TRANSIENT={
 paused:false,achievementShown:null,modal:null,dialog:null,dialogStep:0,dialogApplied:-1,blackout:null,itemShown:null,journalVisible:false,journalTab:'journal',settingsVisible:false,near:null,notice:'',
 dialogWalk:false,outside:false,entranceOpen:false,doorsOpened:{},monsterDoor:null,runToken:null,doorRattle:null,lastRecord:null,shake:0,zone:'COULOIR PRINCIPAL',flashlight:true,endingReason:'',elapsed:0,lastEvent:null,resumeNotice:'',scare:null,failures:0,capture:false,hiding:null,encounter:false,penalty:0,penalties:noPenalties(),lastPenalty:null,hintsUsed:{}
}
function initialState(){
 return {phase:'menu',...emptyFlags(),...TRANSIENT,inputDevice:isTouchDevice()?'touch':'keyboard',settings:loadSettings(),achievements:loadAchievements(),hasSave:!!readSave(),loaded:false,prepared:false,assetErrors:[],eventCount:0}
}
export const isSimRunning=s=>s.phase==='playing'&&!s.paused&&(!s.modal||(s.modal==='story'&&s.dialogWalk))&&!s.journalVisible&&!s.settingsVisible&&!s.capture
// Ouverture d'un dialogue « bulle » : l'étape courante repart de zéro, aucun effet encore appliqué.
const INTERACT_AFTER_DIALOG_MS=500
// Un objet qu'on vient de quitter (dialogue lu jusqu'au bout, énigme refermée) ne se rouvre pas tout de suite :
// une rafale de E le relançait en boucle (signalé le 6 novembre 2026).
const REOPEN_SAME_MS=1200
const openDialogue=(id,extra={})=>({modal:'story',dialogWalk:!!STORIES[id]?.walkable,dialog:id,dialogStep:0,dialogApplied:-1,blackout:null,itemShown:null,...extra})
// Le serveur date le début de la partie : c'est ce qui permet de vérifier le temps annoncé à la fin. Sans réseau, on joue quand même.
let tokenRequest=0
const askRunToken=set=>{const id=++tokenRequest;requestRunToken().then(token=>{if(id===tokenRequest&&token)set({runToken:token})})}
export const useGame=create((set,get)=>({
 ...initialState(),
 // ---- cycle de vie --------------------------------------------------------
 newGame:()=>{
  resetThreats()
  clearSave()
  // La partie commence dehors : le prologue, puis le joueur marche jusqu'à l'entrée (enterHospital lance le dialogue).
  Object.assign(runtime.player,{x:OUTSIDE_START.x,z:OUTSIDE_START.z,yaw:OUTSIDE_START.yaw,pitch:OUTSIDE_START.pitch});Object.assign(runtime.look,{yaw:OUTSIDE_START.yaw,pitch:OUTSIDE_START.pitch})
  set({...emptyFlags(),...TRANSIENT,phase:'playing',outside:true,modal:'prologue',zone:'PARVIS DE L’HÔPITAL',hasSave:false})
  askRunToken(set)
  get().emit('start')
 },
 continueGame:()=>{
  resetThreats()
  const save=readSave()
  if(!save){set({notice:'Aucune sauvegarde valide. Nouvelle partie.'});get().newGame();return}
  Object.assign(runtime.player,{...save.player,pitch:0});Object.assign(runtime.look,{yaw:save.player.yaw,pitch:0})
  // À la reprise, les portes déjà déverrouillées sont retrouvées ouvertes.
  const doorsOpened=Object.fromEntries(ROOM_DOORS.filter(id=>isGateOpen(id,save.flags)).map(id=>[id,true]))
  // La difficulté est celle de la partie sauvegardée, pas le dernier choix fait au menu.
  if(save.difficulty&&save.difficulty!==get().settings.difficulty)get().updateSettings({difficulty:save.difficulty})
  tokenRequest++
  set({...emptyFlags(),...TRANSIENT,...save.flags,doorsOpened,runToken:save.runToken,phase:'playing',paused:true,elapsed:save.elapsed,penalty:save.penalty,penalties:save.penalties,hintsUsed:save.hintsUsed,hasSave:true,
   resumeNotice:save.repaired?'Sauvegarde partiellement réparée : position de reprise sûre.':''})
  get().emit('start')
 },
 returnToMenu:()=>{
  const s=get();if(s.phase==='playing')get().persist()
  set({phase:'menu',...TRANSIENT,hasSave:!!readSave()})
  get().emit('menu')
 },
 setPaused:(paused)=>set(s=>s.phase==='playing'&&s.paused!==paused?{paused}:s),
 togglePause:()=>set(s=>s.phase==='playing'?{paused:!s.paused,settingsVisible:false}:s),
 openSettings:(open=true)=>set({settingsVisible:open}),
 updateSettings:(partial)=>{
  const settings=sanitizeSettings({...get().settings,...partial});saveSettings(settings);set({settings})
 },
 // Qualité automatique (App.jsx) : un cran plus bas quand le jeu rame, avec un mot pour le joueur.
 lowerQuality:()=>{
  const s=get(),i=QUALITIES.indexOf(s.settings.quality);if(i<=0)return false
  const q=QUALITIES[i-1];get().updateSettings({quality:q})
  set({notice:`Qualité graphique abaissée automatiquement : ${QUALITY_LABELS[q]}. Modifiable dans les réglages.`});return true
 },
 setLoaded:(loaded)=>set({loaded}),
 setPrepared:(prepared)=>set({prepared}),
 reportAssetError:(id)=>set(s=>s.assetErrors.includes(id)?s:{assetErrors:[...s.assetErrors,id]}),
 // ---- interface -----------------------------------------------------------
 setNear:(near)=>set(s=>s.near?.id===near?.id?s:{near}),
 setInputDevice:(inputDevice)=>set({inputDevice}),
 setZone:(zone)=>set(s=>s.zone===zone?s:{zone}),
 notification:(notice)=>set({notice}),
 toggle:(key)=>set(s=>({[key]:!s[key]})),
 openJournal:(tab)=>set(s=>{
  if(s.phase!=='playing'||s.modal)return s
  if(s.journalVisible&&(!tab||tab===s.journalTab))return {journalVisible:false}
  return {journalVisible:true,journalTab:tab||s.journalTab}
 }),
 closeOverlays:()=>set({journalVisible:false,settingsVisible:false}),
 tickElapsed:(dt)=>{
  set(s=>({elapsed:s.elapsed+dt}))
  const s=get(),left=timeLeft(s)
  if(left<=0){
   // Un dernier screamer va jusqu'au bout avant l'écran de fin.
   if(!s.scare){s.emit('caught');s.end('timeout')}
   return
  }
  const level=left<=60?2:left<=300?1:0
  if(level>runtime.timeWarned){runtime.timeWarned=level;set({notice:level===2?'PLUS QU’UNE MINUTE.':'PLUS QUE CINQ MINUTES.'})}
 },
 // Retire une minute au chrono et sauvegarde tout de suite : recharger la page ne l'efface pas.
 applyPenalty:(reason)=>{
  const s=get();if(s.phase!=='playing'||!PENALTY_LABELS[reason])return
  set({penalty:s.penalty+PENALTY_SECONDS,penalties:{...s.penalties,[reason]:s.penalties[reason]+1},lastPenalty:{reason,at:Date.now()}})
  get().persist()
 },
 requestHint:()=>{
  const s=get(),id=s.dialog,hints=PUZZLES[id]?.hints
  if(s.modal!=='puzzle'||!hints)return false
  const used=s.hintsUsed[id]||0
  if(used>=hints.length||!canAffordHint(s))return false
  set({hintsUsed:{...s.hintsUsed,[id]:used+1}})
  get().applyPenalty('hint')
  return true
 },
 fireScare:(charged=true,variantId=null)=>{
  const nowMs=Date.now(),v=variantId?scareVariant(variantId):pickScare(runtime.lastScareId)
  runtime.lastScare=nowMs;if(!variantId)runtime.lastScareId=v.id;runtime.ambientScareIn=ambientScareDelay()*difficultyOf(get().settings).pace;breathe({dread:RESPITE.dread})
  markEvent();set({scare:{n:nowMs,variant:v.id,at:nowMs}});get().emit('scare',v.capture?{sound:v.sound,impact:true}:v.sound)
  if(charged)get().applyPenalty('scare')
 },
 // Le screamer caché dans la chanson du chat : à l'heure dite, ou pas du tout s'il ne peut plus tomber à temps
 // (énigme ouverte, pause) ; jamais si les screamers sont désactivés ou pendant une capture.
 tickCatScare:()=>{
  const at=runtime.catScareAt,now=performance.now();if(!at||now<at)return
  runtime.catScareAt=0
  const s=get();if(now-at>1500||!s.settings.jumpscares||s.phase!=='playing'||s.capture)return
  get().fireScare(false,CAPTURE_SCARE.id)
 },
 tickAmbientScare:(dt,zoneChanged)=>{
  const s=get();if(!canAmbientScare(s))return
  runtime.ambientScareIn-=dt
  if(!calm()&&ambientScareReady(runtime.ambientScareIn,zoneChanged))s.fireScare()
 },
 tickLaugh:(dt)=>{
  const s=get();if(!canAmbientScare(s))return
  runtime.laughIn-=dt
  if(runtime.laughIn<=0&&!calm()){runtime.laughIn=laughDelay();markEvent();s.emit('laugh')}
 },
 tickDread:(dt)=>{
  const s=get();if(!canDread(s))return
  runtime.dreadIn-=dt;if(runtime.dreadIn>0||calm())return
  markEvent()
  runtime.dreadIn=dreadDelay()*difficultyOf(s.settings).pace
  const id=pickDread(runtime.lastDread),now=performance.now();runtime.lastDread=id
  if(id==='flicker')runtime.flickerUntil=now+900+Math.random()*1700
  if(id==='stalker'&&Math.random()<TURN_TRAP.chance){runtime.turnTrapUntil=now+TURN_TRAP.ms;runtime.turnTrapYaw=runtime.player.yaw}
  if(id==='haunt')runtime.hauntAsked=true
  if(id==='torch')runtime.torchDipUntil=now+700+Math.random()*900
  if(id==='apparition')runtime.apparitionAsked=true
  s.emit('dread',id)
 },
 enterHiding:(id)=>{
  const h=hideSpot(id),p=runtime.player;if(!h)return
  // Une réplique ne doit pas continuer à défiler depuis la cachette : le E n'y aurait plus qu'un sens, sortir.
  if(get().modal==='story')get().closeModal()
  Object.assign(p,{x:h.out[0],z:h.out[1],yaw:h.yaw,pitch:0,jump:0,vy:0});Object.assign(runtime.look,{yaw:h.yaw,pitch:0})
  set({hiding:id,near:null});get().emit('door')
  // Un casier piégé par partie : on n'y est jamais seul.
  if(id===runtime.trapLocker){runtime.trapLocker=null;get().scareIfAllowed()}
 },
 leaveHiding:()=>{if(get().hiding){set({hiding:null});get().emit('door')}},
 // Screamer lié à une action du joueur : mêmes garde-fous que les autres.
 scareIfAllowed:()=>{
  const s=get();if(!s.settings.jumpscares||Date.now()-runtime.lastScare<=SCARE_COOLDOWN_MS)return false
  s.fireScare();return true
 },
 // Pendant la fuite, la morgue reste condamnée pour le joueur : elle ne s'ouvre que le temps du passage du monstre.
 monsterOpensDoor:(id)=>{if(get().chase&&id==='morgue')set({monsterDoor:id});else set(st=>({doorsOpened:{...st.doorsOpened,[id]:true}}))},
 monsterLeavesDoor:()=>set({monsterDoor:null}),
 tickEncounter:(dt)=>{
  const s=get();if(s.chase||s.outside||s.encounter)return
  const level=encounterLevel(s)
  if(runtime.encounterSeen<0)runtime.encounterSeen=level
  if(level>runtime.encounterSeen){runtime.encounterSeen=level;runtime.encounterIn=encounterDelay()}
  if(!canDread(s)||runtime.encounterIn===Infinity)return
  runtime.encounterIn-=dt
  if(runtime.encounterIn<=0&&!calm()){
   markEvent()
   const kind=pickEncounterKind(runtime.encounterKind,runtime.encountersPlayed)
   runtime.encounterIn=Infinity;runtime.encounterKind=kind;runtime.encountersPlayed++;runtime.flickerUntil=performance.now()+2200
   // L'embuscade ne s'annonce pas : la lumière vacille, puis plus rien.
   if(kind==='ambush')set({encounter:true});else set({encounter:true,notice:'Quelque chose marche dans les couloirs. Cache-toi.'})
   get().emit('encounter',kind)
  }
 },
 endEncounter:()=>{if(get().encounter){breathe(RESPITE);set({encounter:false})}},
 // Pris pendant une rencontre : pas de fin de partie, mais un réveil plus loin, et la peur d'y retourner.
 encounterCaught:()=>{
  const s=get(),spot=SAFE_SPOTS[s.chapter]||SAFE_SPOTS[1]
  Object.assign(runtime.player,{x:spot.x,z:spot.z,yaw:spot.yaw,pitch:0});Object.assign(runtime.look,{yaw:spot.yaw,pitch:0})
  breathe(RESPITE)
  set({encounter:false,hiding:null,notice:'Tu reprends connaissance. Il t’a laissé en vie. Pour l’instant.'})
  // Attrapé pendant une rencontre : même visage et même cri que la capture finale, mais on se réveille plus loin.
  runtime.lastScare=0;if(s.settings.jumpscares)get().fireScare(true,CAPTURE_SCARE.id);else get().emit('caught')
 },
 clearScare:()=>set(s=>s.scare?{scare:null}:s),
 emit:(type,payload=null)=>set(s=>({lastEvent:{type,payload,n:s.eventCount+1},eventCount:s.eventCount+1})),
 // Succès : un seul déblocage par appareil, annoncé par une carte et un carillon.
 unlockAchievement:(id)=>{
  const s=get();if(!achievementById(id)||s.achievements[id])return false
  const achievements={...s.achievements,[id]:Date.now()};saveAchievements(achievements)
  set({achievements,achievementShown:{id,at:Date.now()}});get().emit('achievement',id);return true
 },
 // ---- dialogues « bulle » -------------------------------------------------
 // L'interface fait avancer l'étape ; les effets d'une étape (objet remis, portail ouvert) sont appliqués une seule fois,
 // dans l'ordre, même si le joueur saute le dialogue (closeModal applique tout ce qui reste).
 setDialogStep:(step)=>set(s=>s.dialogStep===step?s:{dialogStep:step}),
 setBlackout:(phase)=>set(s=>s.blackout===phase?s:{blackout:phase}),
 setItemShown:(item)=>set(s=>s.itemShown===item?s:{itemShown:item}),
 applyStep:(index)=>{
  const s=get();if(s.modal!=='story')return
  const story=STORIES[s.dialog];if(!story)return
  let applied=s.dialogApplied
  for(let i=applied+1;i<=index&&i<story.lines.length;i++){
   const line=story.lines[i]
   if(line.item)get().grant(line.item)
   if(line.effect)get().applyEffect(line.effect)
   applied=i
  }
  if(applied!==s.dialogApplied)set({dialogApplied:applied})
 },
 grant:(item)=>{
  const s=get()
  if(item==='key'&&!s.hasKey)set({hasKey:true})
  if(item==='usb'&&!s.usb)set({usb:true})
  get().emit('item',item);get().persist()
 },
 applyEffect:(name)=>{
  if(name==='openSector'){set(s=>({sectorOpen:true,chapter:Math.max(s.chapter,2)}));get().persist()}
 },
 // ---- progression ---------------------------------------------------------
 closeModal:()=>{
  const s=get();const current=s.dialog
  if(current&&(s.modal==='story'||s.modal==='puzzle'))runtime.lastClosed={id:current,at:performance.now()}
  const story=s.modal==='story'?STORIES[current]:null
  if(story)get().applyStep(story.lines.length-1)
  const st=get()
  const reset={modal:null,dialogWalk:false,dialog:null,dialogStep:0,dialogApplied:-1,blackout:null,itemShown:null}
  // Le rayon de visée est gelé pendant un dialogue : la cible connue date d'avant. En marchant, elle reste à jour et sert à enchaîner sur un objet.
  if(!s.dialogWalk){reset.near=null;runtime.dialogClosedAt=performance.now()}
  if(current==='morgue'&&st.usb&&!st.chase){
    set({...reset,chase:true,chapter:7,notice:'COURS ! PASSAGE SECRET — À L’OUEST DE LA MORGUE',chaseTime:110,shake:st.shake+1,secretVisited:false})
    get().emit('chase_start');get().persist()
  }else set({...reset,...(story?.hint?{notice:'OBJECTIF — '+story.hint}:{})})
 },
 interact:()=>{
  const s=get();if(!isSimRunning(s)||s.modal)return
  if(s.hiding){get().leaveHiding();return}
  // Une rafale de E pour passer un dialogue ne doit pas le relancer, ni couvrir l'objectif qui vient de s'afficher.
  if(performance.now()-runtime.dialogClosedAt<INTERACT_AFTER_DIALOG_MS)return
  const id=s.near?.id
  // Ce rappel ne couvre jamais une information déjà affichée, comme l'objectif de la fuite.
  if(!id){if(!s.notice)set({notice:'Rien à portée. Approche-toi d’un objet et regarde-le.'});return}
  const emit=get().emit
  // La cible date du dernier rayon (jusqu'à 100 ms) : l'objet a pu devenir indisponible entre-temps.
  const spot=INTERACTIVES.find(o=>o.id===id)
  if(spot&&!isInteractiveAvailable(spot,s)){set({near:null});return}
  if(runtime.lastClosed?.id===id&&performance.now()-runtime.lastClosed.at<REOPEN_SAME_MS)return
  if(id==='squatter'){set(openDialogue('squatter'));emit('ui');return}
  if(id==='tv'||id==='reception_pc'||id==='bed203'){
   set(st=>({seen:{...st.seen,[id]:true},...openDialogue(id)}));emit(id==='tv'?'static':'ui');get().persist();return
  }
  if(id==='sector'){
   if(!s.hasKey){set({notice:'Le portail est verrouillé. Il te faut la clé du squatteur.',doorRattle:{id:'sector',at:performance.now()}});emit('locked');return}
   set(openDialogue('disappearance'));emit('latch');return
  }
  if(id==='hospital_door'){set({entranceOpen:true});emit('door');return}
  if(id.startsWith('hide_')){get().enterHiding(id);return}
  if(id.startsWith('close_')){
   const door=s.near.door,g=GATES.find(x=>x.id===door),p=runtime.player
   if(!isDoorPassable(door,s)){set({near:null});return}
   if(Math.abs(p.x-g.x)<.7){set({notice:'Recule : tu es dans l’encadrement.'});return}
   set(st=>({doorsOpened:{...st.doorsOpened,[door]:false}}));return
  }
  // La cible date du dernier rayon : une porte déjà ouverte (ou déjà fermée) ne rejoue pas son loquet à chaque E d'une rafale.
  if(id.startsWith('door_')){const door=s.near.door;if(isDoorPassable(door,s)){set({near:null});return}set(st=>({doorsOpened:{...st.doorsOpened,[door]:true}}));emit('latch');return}
  if(id.startsWith('locked_')){set({notice:s.chase?'Cette porte est condamnée. Passe par la galerie secrète, à l’ouest de la morgue.':'ACCÈS REFUSÉ — trouve la preuve nécessaire dans le secteur précédent.',doorRattle:{id:s.near.door,at:performance.now()}});emit('locked');return}
  if(PUZZLES[id]){
   if(s.done[id]){set({notice:'Cette énigme est déjà résolue.'});return}
   set({modal:'puzzle',dialog:id});emit('ui');return
  }
  if(id==='morgue'){
   if(!s.done.lab){set({notice:'Le laboratoire conserve le numéro de sauvegarde.'});return}
   set(openDialogue('morgue'));emit('pickup');return
  }
  if(id==='note'){set({readNote:true,...openDialogue('note')});emit('paper');get().persist();return}
  if(id==='cat'){
   // Une seule chanson à la fois : un E de plus pendant qu'il chante ne la relance pas.
   const now=performance.now();if(now<runtime.catSongUntil)return
   runtime.catSongUntil=now+CAT.songMs;runtime.catScareAt=now+CAT.scareMs;emit('oiia');get().unlockAchievement('oiia');return
  }
  if(id==='secret'){set({notice:'L’accès secret est dégagé. Suis la galerie sans te retourner.'});return}
  if(id==='exit'){
   if(!s.secretVisited){set({notice:'La sortie est condamnée ! Il faut passer par la galerie secrète.'});emit('locked');return}
   get().end('exit');return
  }
 },
 solve:(answer)=>{
  const s=get(),id=s.dialog
  if(s.modal!=='puzzle'||!PUZZLES[id])return false
  // Valider un champ vide n'est pas une erreur : ni pénalité ni screamer.
  if(typeof answer!=='string'||!answer.trim()){get().emit('deny');return false}
  if(!validateAnswer(id,answer)){
   const failures=s.failures+1;const nowMs=Date.now()
   set({notice:'ACCÈS REFUSÉ — une minute perdue.',failures})
   get().applyPenalty('error')
   // Screamer : à chaque échec, avec un délai minimal entre deux (réglable, désactivable dans les réglages).
   // L'erreur a déjà coûté sa minute : le screamer qu'elle provoque ne la compte pas une seconde fois.
   if(s.settings.jumpscares&&nowMs-runtime.lastScare>SCARE_COOLDOWN_MS)get().fireScare(false)
   else get().emit('deny')
   return false
  }
  set(st=>({done:{...st.done,[id]:true},chapter:CHAPTER_FOR_PUZZLE[id],...openDialogue(id),notice:PUZZLES[id].success}))
  get().emit('solved');get().persist()
  return true
 },
 markSecret:()=>{
  if(get().secretVisited)return
  set({secretVisited:true,notice:'Galerie secrète découverte — atteins l’entrée principale.'})
 },
 decrementChase:(dt)=>set(s=>isSimRunning(s)&&s.chase?{chaseTime:Math.max(0,s.chaseTime-dt)}:s),
 // Capture par le monstre : courte séquence (animation « Kill », voile rouge) avant l'écran de fin.
 beginCapture:()=>{
  const s=get();if(s.capture||s.phase!=='playing')return
  set({capture:true,hiding:null,modal:null,journalVisible:false,settingsVisible:false});get().emit('caught')
  // Il te tient : la caméra se lève vers lui, puis son visage remplit l'écran avec le cri le plus fort du jeu.
  // Le réglage des screamers le coupe comme les autres ; la partie se termine alors comme avant.
  const scream=s.settings.jumpscares
  if(scream)setTimeout(()=>{const g=get();if(g.capture&&g.phase==='playing')g.fireScare(false,CAPTURE_SCARE.id)},CAPTURE_SCARE_DELAY)
  setTimeout(()=>{if(useGame.getState().capture)get().end('caught')},scream?CAPTURE_SCARE_DELAY+CAPTURE_SCARE.duration:1700)
 },
 // Le joueur franchit la porte : elle claque derrière lui et le dialogue d'arrivée démarre.
 enterHospital:()=>{
  runtime.ambientScareIn=ambientScareDelay(Math.random,true)
  runtime.laughIn=laughDelay(Math.random,true)
  runtime.dreadIn=dreadDelay(Math.random,true)*difficultyOf(get().settings).pace
  const s=get();if(!s.outside)return
  set({outside:false,entranceOpen:false,...openDialogue('intro')});get().emit('door-slam')
 },
 end:(reason)=>{
  const s=get();if(s.phase==='ending')return
  clearSave()
  const lastRecord=addRecord({time:Math.min(GAME_TIME,timeUsed(s)),ending:reason,difficulty:s.settings.difficulty,penalties:s.penalties})
  set({lastRecord,phase:'ending',modal:null,dialog:null,blackout:null,itemShown:null,endingReason:reason,chase:false,capture:false,journalVisible:false,settingsVisible:false,paused:false,hasSave:false})
  get().emit('ending')
 },
 persist:()=>{
  const s=get();if(s.phase!=='playing'||s.outside)return false
  const ok=writeSave(s,runtime.player);if(ok){runtime.lastSave=Date.now();set({hasSave:true})}
  return ok
 },
 // ---- sélecteurs ----------------------------------------------------------
 story:()=>get().dialog?STORIES[get().dialog]:null,
 currentObjective:()=>OBJECTIVES[get().chapter]||'',
 currentAct:()=>CHAPTERS[get().chapter]||''
}))
export const selectInventory=s=>inventoryFor(s)
export const selectJournal=s=>journalFor(s)
export {normalizeFlags}

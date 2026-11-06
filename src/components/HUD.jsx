import {DIFFICULTIES,DIFFICULTY_IDS} from '../game/difficulty'
import {GAME_TIME,PENALTY_SECONDS,PENALTY_LABELS,timeLeft,timerLevel,canAffordHint} from '../game/timer'
import React,{useEffect,useMemo,useRef,useState,useCallback} from 'react'
import {useProgress} from '@react-three/drei'
import {Map as MapIcon,BookOpen,Flashlight,Volume2,VolumeX,Settings2,MousePointer2,ArrowRight,Pause,Play,Home,Package,BadgeCheck,AlertTriangle,Keyboard,Timer,Maximize,Delete} from 'lucide-react'
import {CHAPTERS,OBJECTIVES,ROOMS,SECRET,CORRIDOR,GATES,isGateOpen,INTERACTIVES,hideSpot} from '../game/layout'
import {useGame,runtime,isSimRunning} from '../game/store'
import {inventoryFor,journalFor,solvedCount,ITEMS} from '../game/progression'
import {PUZZLES,STORIES,PROLOGUE} from '../game/story'
import {QUALITIES,QUALITY_LABELS,RENDER_SCALES,FPS_CAPS,detectLayout,detectQuality,PHONE} from '../game/settings'
import {canFullscreen,enterGameScreen,toggleFullscreen,haptic} from '../game/phone'
import {initAudio,resumeAudio,sfx,audioState,playVoiceSequence,stopVoice} from '../game/audio'
import {VOICES,voiceUrl,voiceFor,prologueVoice} from '../game/voices'
import {formatTime,readRecords,rankedRecords,bestTime} from '../game/records'
import {SCARE_VARIANTS,CAPTURE_SCARE,scareVariant} from '../game/scares'
import TouchControls from './TouchControls'
import {LeaderboardPanel,ScoreForm} from './Leaderboard'
import {AchievementsPanel,AchievementToast} from './Achievements'
import {tapKey,KEY} from '../game/input'

function useFlags(){
 const hasKey=useGame(s=>s.hasKey),sectorOpen=useGame(s=>s.sectorOpen),done=useGame(s=>s.done),usb=useGame(s=>s.usb)
 const readNote=useGame(s=>s.readNote),seen=useGame(s=>s.seen),chase=useGame(s=>s.chase)
 return useMemo(()=>({hasKey,sectorOpen,done,usb,readNote,seen,chase}),[hasKey,sectorOpen,done,usb,readNote,seen,chase])
}
function useLayoutLabel(){
 const layout=useGame(s=>s.settings.layout)
 return (layout==='auto'?detectLayout():layout)==='azerty'?'ZQSD':'WASD'
}
// La touche d'action selon ce que le joueur utilise ; rien au tactile, où il suffit de toucher.
function ActionKey(){
 const d=useGame(s=>s.inputDevice)
 return d==='touch'?null:<kbd>{d==='gamepad'?'A':'E'}</kbd>
}
// Barre d'endurance : n'apparaît que lorsqu'on s'en sert. Mise à jour hors de React.
function StaminaBar(){
 const bar=useRef(),root=useRef()
 useEffect(()=>{let raf
  const loop=()=>{raf=requestAnimationFrame(loop);const st=runtime.stamina;if(!bar.current)return
   bar.current.style.transform=`scaleX(${st.value.toFixed(3)})`;root.current.classList.toggle('shown',st.value<.995);root.current.classList.toggle('out',st.exhausted)}
  loop();return()=>cancelAnimationFrame(raf)},[])
 return <div className="stamina" ref={root} aria-hidden="true"><i ref={bar}/></div>
}
function ReleasePointer(){
 useEffect(()=>{if(document.pointerLockElement)document.exitPointerLock()},[])
 return null
}
const fmtTime=formatTime
const PENALTY_TEXT=`− ${fmtTime(PENALTY_SECONDS)}`
// « − 01:00 · Erreur » : apparaît à chaque pénalité, puis s'efface tout seul.
function PenaltyFlash(){
 const last=useGame(s=>s.lastPenalty)
 if(!last||Date.now()-last.at>3500)return null
 return <span key={last.at} className="penalty-flash" role="status">{PENALTY_TEXT} · {PENALTY_LABELS[last.reason]}</span>
}
// Minuteur de la partie : ne se redessine qu'une fois par seconde.
function GameTimer(){
 const left=useGame(s=>Math.ceil(timeLeft(s))),chase=useGame(s=>s.chase)
 return <div className={'game-timer '+timerLevel(left)+(chase?' below-chase':'')} role="timer" aria-label="Temps restant"><Timer size={15}/> {fmtTime(left)}<PenaltyFlash/></div>
}
// Choix de la difficulté avant une nouvelle partie.
function DifficultyPanel({onBack,onStart}){
 const current=useGame(s=>s.settings.difficulty),update=useGame(s=>s.updateSettings)
 return <div className="panel paper difficulty-panel" role="dialog" aria-label="Choix de la difficulté"><span className="stamp">NOUVEAU DOSSIER</span>
  <header><h2>Difficulté</h2></header>
  <p className="muted">Tu as {GAME_TIME/60} minutes pour t’échapper. Chaque screamer subi, erreur commise ou indice utilisé retire une minute au chrono.</p>
  <div className="difficulty-list">{DIFFICULTY_IDS.map(d=><button type="button" key={d} className={'difficulty-card'+(current===d?' on':'')} aria-pressed={current===d} onClick={()=>update({difficulty:d})}><strong>{DIFFICULTIES[d].label}</strong><span>{DIFFICULTIES[d].hint}</span></button>)}</div>
  <div className="modal-actions"><button type="button" className="outline-btn" onClick={onBack}>RETOUR</button><button type="button" className="primary-btn" autoFocus onClick={onStart}>COMMENCER <ArrowRight size={17}/></button></div>
 </div>
}
// ---------------------------------------------------------------------------
// Prologue : texte sur le plan du parvis. Une touche ou un clic avance ; le bouton (ou Échap) passe tout.
function Prologue(){
 const closeModal=useGame(s=>s.closeModal),touch=useGame(s=>s.inputDevice==='touch')
 const [card,setCard]=useState(0),[typed,setTyped]=useState(0),[voiceDur,setVoiceDur]=useState(0)
 const text=PROLOGUE[card].text,done=typed>=text.length
 // Paul lit chaque carte (titre compris) ; la machine à écrire suit sa voix au lieu de son rythme fixe.
 useEffect(()=>{
  setVoiceDur(0)
  const v=useGame.getState().settings.muted?null:prologueVoice(card)
  if(!v)return
  const run=playVoiceSequence([{url:voiceUrl(v.file),gain:v.gain,key:card}],(k,dur)=>{if(k===card&&dur)setVoiceDur(dur)})
  return()=>run.stop()
 },[card])
 // Le texte finit aux trois quarts de la voix : on lit plus vite qu'on n'écoute, et Paul lit d'abord le titre de la carte.
 const step=voiceDur?Math.max(14,voiceDur*750/text.length):24
 useEffect(()=>{if(done)return;const t=setTimeout(()=>setTyped(n=>n+1),step);return()=>clearTimeout(t)},[typed,done,step])
 const advance=()=>{
  if(!done){setTyped(text.length);return}
  if(card+1>=PROLOGUE.length){stopVoice();closeModal();return}
  setCard(card+1);setTyped(0)
 }
 useEffect(()=>{
  const onKey=e=>{if(e.repeat||![' ','Enter','e','E'].includes(e.key))return;e.preventDefault();advance()}
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 })
 return <div className="prologue" onClick={advance}>
  <div className="prologue-bar top"/><div className="prologue-bar bottom"/>
  <button className="outline-btn prologue-skip" onClick={e=>{e.stopPropagation();stopVoice();closeModal()}}>Passer le prologue</button>
  <section className="prologue-card paper" key={card} aria-live="polite">
   <div className="file-tag">PROLOGUE · {PROLOGUE[card].tag}</div>
   <p>{text.slice(0,typed)}{!done&&<span className="blink-cursor">▮</span>}</p>
   <footer><span>{card+1} / {PROLOGUE.length}</span>{done&&<span className="prologue-next"><ActionKey/> {touch?'touche pour ':''}{card+1<PROLOGUE.length?'continuer':'entrer dans la nuit'}</span>}</footer>
  </section>
 </div>
}
function LoadingBar({compact=false}){
 const {active,progress,loaded,total,errors}=useProgress()
 const loadedFlag=useGame(s=>s.loaded),setLoaded=useGame(s=>s.setLoaded)
 const prepared=useGame(s=>s.prepared)
 useEffect(()=>{if(!active&&total>0&&prepared&&!loadedFlag)setLoaded(true)},[active,total,prepared,loadedFlag,setLoaded])
 useEffect(()=>{const t=setTimeout(()=>{if(!useGame.getState().loaded)setLoaded(true)},PHONE?120000:25000);return()=>clearTimeout(t)},[setLoaded])
 const pct=loadedFlag?100:Math.round(progress)
 return <div className={'loading'+(compact?' compact':'')+(loadedFlag&&!errors.length?' ready':'')} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
  <div className="loading-label"><span>{loadedFlag?'RESSOURCES PRÊTES':!active&&total>0?'PRÉPARATION DE LA SCÈNE':'CHARGEMENT DES RESSOURCES'}</span><span>{loadedFlag?`${total} fichiers`:`${loaded}/${total||'…'}`} · {pct}%</span></div>
  <div className="loading-track"><div style={{width:pct+'%'}}/></div>
  {errors.length>0&&<div className="loading-errors"><AlertTriangle size={14}/> {errors.length} ressource(s) introuvable(s) : un remplacement simplifié sera affiché.</div>}
 </div>
}
function SettingsPanel({onClose}){
 const settings=useGame(s=>s.settings),update=useGame(s=>s.updateSettings)
 const assetErrors=useGame(s=>s.assetErrors),inGame=useGame(s=>s.phase==='playing'),touch=useGame(s=>s.inputDevice==='touch')
 return <div className="panel paper settings-panel" role="dialog" aria-label="Réglages"><span className="stamp">RÉGLAGES</span>
  <header><h2>Réglages</h2><button className="close-x" onClick={onClose} aria-label="Fermer">✕</button></header>
  <div className="settings-grid">
   {inGame&&<div className="settings-note"><strong>Difficulté : {DIFFICULTIES[settings.difficulty].label}</strong><small>Elle se choisit au début d’une nouvelle partie.</small></div>}
   <label>Qualité graphique
    <div className="seg wrap">
     <button className={settings.autoQuality?'on':''} onClick={()=>update({autoQuality:true,quality:settings.autoQuality?settings.quality:detectQuality()})}>Auto</button>
     {QUALITIES.map(q=><button key={q} className={!settings.autoQuality&&settings.quality===q?'on':''} onClick={()=>update({quality:q,autoQuality:false})}>{QUALITY_LABELS[q]}</button>)}
    </div>
    <small>{settings.autoQuality?`Auto : choisie selon l’appareil et abaissée d’elle-même si le jeu rame (actuellement ${QUALITY_LABELS[settings.quality]}). `:''}{PHONE?'Sur téléphone, reste en Basse ou Minimale : les autres niveaux chauffent et risquent de faire planter la page.':'Minimale : vieux ordinateurs et petites cartes graphiques. Basse : sans ombres ni post-traitement. Élevée : ombres fines et anticrénelage.'}</small>
   </label>
   <label>Résolution du rendu
    <div className="seg wrap">{RENDER_SCALES.map(r=><button key={r} className={settings.renderScale===r?'on':''} onClick={()=>update({renderScale:r})}>{r?`${Math.round(r*100)} %`:'Auto'}</button>)}</div>
    <small>Auto : baisse d’elle-même quand le jeu ralentit. Moins de pixels calculés : bien plus fluide sur une petite carte graphique, image un peu plus douce.</small>
   </label>
   <label>Images par seconde
    <div className="seg">{FPS_CAPS.map(f=><button key={f} className={settings.fpsCap===f?'on':''} onClick={()=>update({fpsCap:f})}>{f?`${f} max`:'Illimité'}</button>)}</div>
    <small>30 max : moins de chauffe, de bruit de ventilateur et de batterie.</small>
   </label>
   <label className="check"><input type="checkbox" checked={settings.showFps} onChange={e=>update({showFps:e.target.checked})}/> Afficher le compteur d’images par seconde</label>
   <label>Volume général <output>{Math.round(settings.volume*100)} %</output>
    <input type="range" min="0" max="1" step=".02" value={settings.volume} onChange={e=>update({volume:+e.target.value})}/>
   </label>
   <label>{touch?'Sensibilité du regard':'Sensibilité de la souris'} <output>{settings.sensitivity.toFixed(2)}</output>
    <input type="range" min=".25" max="3" step=".05" value={settings.sensitivity} onChange={e=>update({sensitivity:+e.target.value})}/>
   </label>
   <label>Champ de vision <output>{settings.fov}°</output>
    <input type="range" min="60" max="100" step="1" value={settings.fov} onChange={e=>update({fov:+e.target.value})}/>
   </label>
   <label>Luminosité <output>{settings.brightness.toFixed(2)}</output>
    <input type="range" min=".5" max="1.4" step=".05" value={settings.brightness} onChange={e=>update({brightness:+e.target.value})}/>
   </label>
   <label className="check"><input type="checkbox" checked={settings.reduceMotion} onChange={e=>update({reduceMotion:e.target.checked})}/> Réduire les effets gênants (balancement, secousses, scintillement)</label>
   <label className="check"><input type="checkbox" checked={settings.muted} onChange={e=>update({muted:e.target.checked})}/> Couper le son</label>
   <label className="check"><input type="checkbox" checked={settings.jumpscares} onChange={e=>update({jumpscares:e.target.checked})}/> Screamers lors d’un échec aux énigmes (image soudaine et cri)</label>
   <div className="sound-test"><button type="button" className="outline-btn" onClick={()=>{initAudio();resumeAudio();sfx('test')}}><Volume2 size={16}/> TESTER LE SON</button><small>Joue un carillon et deux pas au volume choisi (état : {audioState()==='running'?'actif':audioState()==='suspended'?'suspendu':'non démarré'}).</small></div>
   <label className="check"><input type="checkbox" checked={settings.showMinimap} onChange={e=>update({showMinimap:e.target.checked})}/> Afficher la mini-carte</label>
   {!touch&&<label>Aide clavier
    <div className="seg">{[['auto','Auto'],['azerty','AZERTY'],['qwerty','QWERTY']].map(([v,l])=><button key={v} className={settings.layout===v?'on':''} onClick={()=>update({layout:v})}>{l}</button>)}</div>
    <small>Les deux dispositions fonctionnent toujours : ZQSD et WASD, ou les flèches.</small>
   </label>}
  </div>
  {assetErrors.length>0&&<p className="warn-line"><AlertTriangle size={14}/> Modèles remplacés par un volume simple : {assetErrors.join(', ')}</p>}
 </div>
}
const PAD_ROWS=[['Stick gauche','Se déplacer'],['Stick droit','Regarder'],['A','Interagir / valider'],['B','Sauter / retour'],['Gâchette','Courir'],['X','Lampe torche'],['Y','Journal'],['Select','Carte'],['Start','Pause']]
const TOUCH_ROWS=[['Pouce gauche','Se déplacer : un joystick apparaît sous le pouce. Au-delà de l’anneau, on court.'],['Pouce droit','Glisser pour regarder. Toucher l’écran en visant un objet revient à interagir.'],['Main','Interagir, parler, examiner. Le bouton s’allume quand un objet est à portée.'],['Pas','Courir sans pousser le joystick à fond, jusqu’à ce qu’on le lâche.'],['Flèches','Sauter'],['Lampe','Allumer ou éteindre la torche'],['En haut','Journal, carte, son, pause']]
function ControlsPanel({onClose}){
 const label=useLayoutLabel(),touch=useGame(s=>s.inputDevice==='touch')
 if(touch)return <div className="panel paper" role="dialog" aria-label="Commandes"><span className="stamp">NOTICE</span>
  <header><h2>Commandes</h2><button className="close-x" onClick={onClose} aria-label="Fermer">✕</button></header>
  <table className="controls-table touch-rows"><tbody>{TOUCH_ROWS.map(([k,v])=><tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
  {!canFullscreen()&&<p className="muted install-tip">Sur iPhone, ajoute le jeu à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil ») pour jouer en plein écran, sans les barres du navigateur.</p>}
 </div>
 const rows=[[label+' / flèches','Se déplacer'],['Souris','Regarder et viser les objets'],['Maj','Courir'],['Espace','Sauter'],['E','Interagir / parler / examiner'],['F','Lampe torche'],['J','Journal des preuves'],['I','Inventaire'],['M','Carte'],['Échap','Pause / fermer']]
 return <div className="panel paper" role="dialog" aria-label="Commandes"><span className="stamp">NOTICE</span>
  <header><h2>Commandes</h2><button className="close-x" onClick={onClose} aria-label="Fermer">✕</button></header>
  <table className="controls-table"><tbody>{rows.map(([k,v])=><tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
  <h3 className="controls-head">Manette</h3>
  <table className="controls-table"><tbody>{PAD_ROWS.map(([k,v])=><tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
 </div>
}
// Vidéo d'arrière-plan du menu, lue avec sa bande-son (volume et « couper le son » des réglages respectés).
// Les navigateurs refusent la lecture sonore automatique tant que la page n'a reçu aucun geste : on tente
// d'abord avec le son ; en cas de refus la vidéo démarre muette et retrouve le son au premier clic ou
// à la première touche (gestes reconnus comme activation utilisateur), sans recharger la vidéo.
function MenuVideo(){
 const ref=useRef()
 const volume=useGame(s=>s.settings.volume),muted=useGame(s=>s.settings.muted)
 useEffect(()=>{const v=ref.current;if(!v)return;v.volume=volume;if(!v.dataset.locked)v.muted=muted},[volume,muted])
 useEffect(()=>{
  const v=ref.current;if(!v)return
  let disposed=false
  const events=['pointerdown','keydown','touchend']
  const off=()=>events.forEach(e=>window.removeEventListener(e,unlock,true))
  const unlock=()=>{
   if(disposed)return
   v.muted=useGame.getState().settings.muted
   v.play().then(()=>{delete v.dataset.locked;off()}).catch(()=>{if(disposed)return;v.muted=true;v.play().catch(()=>{})})
  }
  // Une page restée au menu ne doit rien jouer en arrière-plan : elle s'entendrait par-dessus une partie lancée ailleurs.
  const onVisibility=()=>{if(disposed)return;if(document.hidden)v.pause();else v.play().catch(()=>{})}
  document.addEventListener('visibilitychange',onVisibility)
  v.volume=useGame.getState().settings.volume;v.muted=useGame.getState().settings.muted
  const attempt=v.play()
  if(attempt&&attempt.catch)attempt.catch(()=>{
   if(disposed)return
   v.dataset.locked='1';v.muted=true;v.play().catch(()=>{})
   events.forEach(e=>window.addEventListener(e,unlock,true))
  })
  // Le navigateur est censé couper une vidéo retirée de la page, mais pas tous aussi vite : on ne s'y fie pas.
  return()=>{disposed=true;off();document.removeEventListener('visibilitychange',onVisibility);v.muted=true;v.pause()}
 },[])
 return <video ref={ref} className="menu-video" poster="/menu/poster.webp" loop playsInline preload="auto" disablePictureInPicture aria-hidden="true">
  <source src="/menu/arriere-plan-menu.mp4" type="video/mp4"/><source src="/menu/arriere-plan-menu.webm" type="video/webm"/>
 </video>
}
// ---------------------------------------------------------------------------
function MainMenu(){
 const hasSave=useGame(s=>s.hasSave),loaded=useGame(s=>s.loaded)
 const newGame=useGame(s=>s.newGame),continueGame=useGame(s=>s.continueGame),touch=useGame(s=>s.inputDevice==='touch')
 const [panel,setPanel]=useState(null),[active,setActive]=useState(0),[quitNote,setQuitNote]=useState('')
 const start=fn=>{initAudio()
  // Au téléphone : plein écran et paysage, quand le navigateur le permet.
  if(useGame.getState().inputDevice==='touch')enterGameScreen()
  fn()}
 const quit=()=>{try{window.close()}catch{}setTimeout(()=>{if(!window.closed)setQuitNote('Le navigateur ne permet pas de fermer cet onglet depuis le jeu : ferme-le toi-même.')},150)}
 const items=[
  {label:'NOUVELLE PARTIE',run:()=>setPanel('difficulty'),disabled:!loaded},
  {label:'CONTINUER',run:()=>start(continueGame),disabled:!loaded||!hasSave},
  {label:'CLASSEMENT',run:()=>setPanel('leaderboard')},
  {label:'SUCCÈS',run:()=>setPanel('achievements')},
  {label:'OPTIONS',run:()=>setPanel('settings')},
  // Un onglet de téléphone ne se ferme pas depuis la page.
  ...(touch?[]:[{label:'QUITTER',run:quit}]),
  {label:'COMMANDES',run:()=>setPanel('controls')}
 ]
 useEffect(()=>{
  const onKey=e=>{
   if(panel)return
   if(e.key==='ArrowDown'){setActive(a=>(a+1)%items.length);e.preventDefault()}
   else if(e.key==='ArrowUp'){setActive(a=>(a+items.length-1)%items.length);e.preventDefault()}
   else if(e.key==='Enter'){const it=items[active];if(!it.disabled)it.run()}
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 })
 const best=bestTime()
 return <main className="start-menu cinematic">
   <MenuVideo/>
   <div className="menu-shade"/>
   <section className="menu-panel">
     <h1 className="menu-title"><img src="/menu/titre.webp" alt="HOSPITAL 404" draggable="false"/></h1>
     <nav className="menu-list" aria-label="Menu principal">
      {items.map((it,i)=><button key={it.label} className={'menu-item'+(i===active?' active':'')+(it.disabled?' disabled':'')} disabled={it.disabled} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onClick={it.run}>{it.label}</button>)}
     </nav>
     {quitNote&&<p className="menu-note">{quitNote}</p>}
     {best!==null&&<p className="menu-best"><Timer size={14}/> Meilleur temps {fmtTime(best)}</p>}
     <LoadingBar compact/>
   </section>
   <div className="menu-copyright"><span className="credit-ref">CHARCOT // INCIDENT REPORT No. 404</span><span><span className="credit-text">FICTION INTERACTIVE · ASSETS CC0 POLY HAVEN, AMBIENTCG, INNERSCENE, KENNEY, OPENGAMEART, FREESOUND · « HOMELESS MAN » PAR DOUBLESOB ET « TEENAGE BOY » PAR BARATHUDAYA27, CC BY 4.0, MODIFIÉS · MOBILIER : 47 MODÈLES SKETCHFAB SOUS CC BY 4.0 ET « HOSPITAL DOOR » PAR 4DIMENSION SOUS CC BY-SA 4.0, MODIFIÉS — </span><a href="/credits.html" target="_blank" rel="noopener">AUTEURS ET LIENS</a></span></div>
   {panel&&<div className="modal-shade">{panel==='settings'?<SettingsPanel onClose={()=>setPanel(null)}/>:panel==='leaderboard'?<LeaderboardPanel onClose={()=>setPanel(null)}/>:panel==='achievements'?<AchievementsPanel onClose={()=>setPanel(null)}/>:panel==='difficulty'?<DifficultyPanel onBack={()=>setPanel(null)} onStart={()=>start(newGame)}/>:<ControlsPanel onClose={()=>setPanel(null)}/>}</div>}
 </main>
}
function PauseMenu(){
 const resume=()=>useGame.getState().setPaused(false)
 const [panel,setPanel]=useState(null)
 const left=useGame(s=>Math.ceil(timeLeft(s))),penalty=useGame(s=>s.penalty),chapter=useGame(s=>s.chapter),resumeNotice=useGame(s=>s.resumeNotice)
 const persist=useGame(s=>s.persist),returnToMenu=useGame(s=>s.returnToMenu),chase=useGame(s=>s.chase),outside=useGame(s=>s.outside)
 const [saved,setSaved]=useState(false),touch=useGame(s=>s.inputDevice==='touch')
 return <div className="modal-shade pause-shade"><ReleasePointer/>
  {panel==='settings'?<SettingsPanel onClose={()=>setPanel(null)}/>:panel==='controls'?<ControlsPanel onClose={()=>setPanel(null)}/>:
  <div className="panel paper pause-panel" role="dialog" aria-label="Pause"><span className="stamp">EN ATTENTE</span>
   <header><div><div className="file-tag">PAUSE · {CHAPTERS[chapter]}</div><h2>Partie en pause</h2></div><Pause size={30}/></header>
   <p className="muted">Temps restant {fmtTime(left)}{penalty>0?` · ${penalty/60} min de pénalités`:''} · Les chronomètres et la progression sont suspendus.</p>
   {resumeNotice&&<p className="warn-line"><AlertTriangle size={14}/> {resumeNotice}</p>}
   <div className="pause-actions">
    <button className="primary-btn" onClick={resume} autoFocus><Play size={18}/> REPRENDRE</button>
    <button className="outline-btn" onClick={()=>setPanel('settings')}><Settings2 size={18}/> RÉGLAGES</button>
    <button className="outline-btn" onClick={()=>setPanel('controls')}><Keyboard size={18}/> COMMANDES</button>
    <button className="outline-btn" disabled={chase||outside} title={chase?'Impossible de sauvegarder pendant la fuite':outside?'Sauvegarde possible une fois entré dans l’hôpital':''} onClick={()=>{if(persist()){setSaved(true);setTimeout(()=>setSaved(false),1800)}}}><BadgeCheck size={18}/> {saved?'SAUVEGARDÉ':'SAUVEGARDER'}</button>
    {touch&&canFullscreen()&&<button className="outline-btn" onClick={toggleFullscreen}><Maximize size={18}/> PLEIN ÉCRAN</button>}
    <button className="outline-btn danger" onClick={returnToMenu}><Home size={18}/> MENU PRINCIPAL</button>
   </div>
  </div>}
 </div>
}
// Screamer : variante tirée au sort (image + animation + son), secousse de toute la page, puis disparition.
// Images chargées d'avance : un screamer doit apparaître instantanément.
for(const v of [...SCARE_VARIANTS,CAPTURE_SCARE]){if(v.image&&typeof Image!=='undefined')new Image().src=v.image}
function Screamer(){
 const scare=useGame(s=>s.scare),clear=useGame(s=>s.clearScare)
 const v=scare?scareVariant(scare.variant):null
 useEffect(()=>{
  if(!scare||!v)return
  const root=document.getElementById('root');root?.classList.add('quake')
  if(!useGame.getState().settings.reduceMotion)haptic(v.capture?[260,50,420,50,700]:[90,40,160])
  const t=setTimeout(()=>{clear();root?.classList.remove('quake')},v.duration)
  return()=>{clearTimeout(t);root?.classList.remove('quake')}
 },[scare,v,clear])
 if(!scare||!v)return null
 const style={'--d':v.duration+'ms'}
 return <div className={'screamer anim-'+v.anim} key={scare.n} style={style} aria-hidden="true">
  {v.image&&<img className="layer base" src={v.image} style={v.frame} alt=""/>}
  {v.image&&v.anim==='glitch'&&<><img className="layer slice1" src={v.image} style={v.frame} alt=""/><img className="layer slice2" src={v.image} style={v.frame} alt=""/><img className="layer slice3" src={v.image} style={v.frame} alt=""/></>}
  <div className="screamer-flash"/>
 </div>
}
// ---------------------------------------------------------------------------
// Saisie à la manette : un clavier à l'écran, parcouru avec la croix. Les mots de la requête SQL sont en un seul bouton.
const SQL_WORDS=['SELECT * FROM patients WHERE ','nom','prenom','annee_deces',' = ',' AND ',"'",';']
const SQL_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')
function PadKeyboard({kind,onInput,onErase}){
 const ref=useRef()
 useEffect(()=>{ref.current?.querySelector('button')?.focus()},[])
 const keys=kind==='sql'?SQL_CHARS:'1234567890'.split('')
 return <div className={'pad-keyboard '+kind} ref={ref}>
  {kind==='sql'&&<div className="pad-words">{SQL_WORDS.map(w=><button type="button" key={w} onClick={()=>onInput(w)}>{w.trim()}</button>)}</div>}
  <div className="pad-keys">{keys.map(k=><button type="button" key={k} onClick={()=>onInput(k.toLowerCase())}>{k}</button>)}
   {kind==='sql'&&<button type="button" className="wide" onClick={()=>onInput(' ')}>ESPACE</button>}
   <button type="button" className="wide" onClick={onErase}>⌫ EFFACER</button></div>
 </div>
}
// Saisie au doigt : le clavier du téléphone couvrirait la moitié de l'énigme, et ses apostrophes courbes ou sa majuscule automatique gênent le SQL.
const QWERTY_ROWS=['QWERTYUIOP','ASDFGHJKL_','ZXCVBNM'],AZERTY_ROWS=['AZERTYUIOP','QSDFGHJKLM','WXCVBN_']
function TouchKeypad({kind,onInput,onErase,onClear}){
 const layout=useGame(s=>s.settings.layout)
 const key=(label,value,cls='')=><button type="button" key={label} className={cls} onClick={()=>{haptic();onInput(value)}}>{label}</button>
 const erase=<button type="button" key="erase" className="erase" aria-label="Effacer" onClick={()=>{haptic();onErase()}}><Delete size={20}/></button>
 if(kind!=='sql')return <div className="touch-keypad digits">
  {'123456789'.split('').map(d=>key(d,d))}
  <button type="button" key="clear" className="clear" aria-label="Tout effacer" onClick={()=>{haptic();onClear()}}>C</button>
  {key('0','0')}{erase}
 </div>
 const rows=(layout==='auto'?detectLayout():layout)==='azerty'?AZERTY_ROWS:QWERTY_ROWS
 return <div className="touch-keypad sql">
  <div className="sql-words">{SQL_WORDS.map(w=>key(w.trim(),w,w.length>12?'long':''))}</div>
  <div className="sql-row">{'1234567890'.split('').map(d=>key(d,d))}</div>
  {rows.map(r=><div className="sql-row" key={r}>{r.split('').map(c=>key(c,c.toLowerCase()))}</div>)}
  <div className="sql-row">{key('ESPACE',' ','space')}{erase}</div>
 </div>
}
function PuzzleModal(){
 const device=useGame(s=>s.inputDevice),touch=device==='touch'
 const id=useGame(s=>s.dialog),solve=useGame(s=>s.solve),close=useGame(s=>s.closeModal)
 const notice=useGame(s=>s.notice),p=PUZZLES[id],scare=useGame(s=>!!s.scare)
 const left=useGame(s=>Math.ceil(timeLeft(s))),requestHint=useGame(s=>s.requestHint),canPay=useGame(canAffordHint)
 const hintsUsed=useGame(s=>s.hintsUsed[id]||0),hintsTotal=p?.hints?.length||0
 const [answer,setAnswer]=useState(''),sqlBox=useRef()
 useEffect(()=>setAnswer(''),[id])
 // Sur le clavier tactile, le champ ne reçoit pas le focus : il faut le faire défiler jusqu'au dernier caractère saisi.
 useEffect(()=>{if(sqlBox.current)sqlBox.current.scrollTop=sqlBox.current.scrollHeight},[answer])
 if(!p)return null
 const submit=e=>{e.preventDefault();solve(answer)}
 return <div className="modal-shade"><ReleasePointer/>
  <form className={'case-file paper puzzle-file kind-'+p.kind+(scare?' shaking':'')} role="dialog" aria-label={p.title} onSubmit={submit}><span className="stamp big">CONFIDENTIEL</span>
    <div className="puzzle-doc">
    <div className="file-top"><span>HÔPITAL CHARCOT / ARCHIVES</span><span>CONFIDENTIEL · H-404</span></div>
    <div className={'puzzle-clock '+timerLevel(left)} role="timer" aria-label="Temps restant"><Timer size={15}/> {fmtTime(left)}<PenaltyFlash/></div>
    <div className="file-tag">{p.tag}</div>
    <h2>{p.title}</h2><p>{p.description}</p>
    {p.terminal&&<pre className="green-terminal">{p.terminal}</pre>}
    {p.table&&<div className="puzzle-table"><div className="puzzle-head"><span>ID</span><span>Intervention</span><span>Durée</span><span>Dépendance</span></div>{p.table.map(r=><div key={r[0]}><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span></div>)}</div>}
    <div className="clue-box"><div className="clue-caption">NOTES TROUVÉES</div>{p.clues.map((c,i)=><p key={i}>— {c}</p>)}</div>
    {hintsTotal>0&&<div className="hint-box">
     {p.hints.slice(0,hintsUsed).map((h,i)=><p key={i}>Indice {i+1} : {h}</p>)}
     {hintsUsed<hintsTotal&&<button type="button" className="outline-btn hint-btn" disabled={!canPay} onClick={requestHint}>{canPay?`DEMANDER UN INDICE (${PENALTY_TEXT}) · ${hintsUsed+1}/${hintsTotal}`:'PLUS ASSEZ DE TEMPS POUR UN INDICE'}</button>}
    </div>}
    </div>
    <div className="puzzle-answer">
    <label htmlFor="puzzleAnswer">{p.question}</label>
    {p.kind==='sql'?<textarea id="puzzleAnswer" ref={sqlBox} value={answer} readOnly={touch} onChange={e=>setAnswer(e.target.value)} spellCheck="false" autoCapitalize="off" autoCorrect="off" rows={2} placeholder="SELECT * FROM patients WHERE ...;" autoFocus={device==='keyboard'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();solve(answer)}}}/>:
     <input id="puzzleAnswer" value={answer} readOnly={touch} onChange={e=>setAnswer(e.target.value.replace(/[^0-9]/g,''))} maxLength={p.maxLength} placeholder={p.placeholder} inputMode="numeric" autoComplete="off" autoFocus={device==='keyboard'}/>}
    {device==='gamepad'&&<PadKeyboard kind={p.kind} onInput={k=>setAnswer(a=>p.maxLength?(a+k).slice(0,p.maxLength):a+k)} onErase={()=>setAnswer(a=>a.slice(0,-1))}/>}
    {touch&&<TouchKeypad kind={p.kind} onInput={k=>setAnswer(a=>p.maxLength?(a+k).slice(0,p.maxLength):a+k)} onErase={()=>setAnswer(a=>a.slice(0,-1))} onClear={()=>setAnswer('')}/>}
    {notice?.startsWith('ACCÈS REFUSÉ')&&<div className="error-line">{notice}</div>}
    <div className="modal-actions"><button type="button" className="outline-btn" onClick={close}>RETOUR</button><button type="submit" className="primary-btn">{touch?'VALIDER':'VALIDER LA RÉPONSE'} <ArrowRight size={17}/></button></div>
    </div>
  </form>
 </div>
}
// ---------------------------------------------------------------------------
// Dialogue « bulle » façon Animal Crossing : une réplique à la fois, texte tapé à la machine (synchronisé sur la voix
// quand une prise existe), étiquette du personnage, E / Espace / Entrée / clic pour compléter puis passer à la suite.
// Les étapes spéciales (objet récupéré, blackout) sont rendues par ItemGet et BlackoutVeil à partir du magasin.
// ---------------------------------------------------------------------------
const speakerClass=name=>{const n=(name||'').toLowerCase()
 if(n.startsWith('thomas'))return 'thomas';if(n.includes('maxime'))return 'maxime'
 if(n.includes('terminal')||n.includes('haut-parleur')||n.includes('enregistrement'))return 'screen'
 if(n.includes('adrien')||n.includes('squatteur')||n.includes('delmas'))return 'adrien';return ''}
function Dialogue(){
 const id=useGame(s=>s.dialog),step=useGame(s=>s.dialogStep),walking=useGame(s=>s.dialogWalk)
 const story=STORIES[id],line=story?.lines[step]
 const text=line?.text||line?.terminal||''
 const [typed,setTyped]=useState(0),[voiceDur,setVoiceDur]=useState(0)
 const typedRef=useRef(0),openedAt=useRef(0)
 const complete=typed>=text.length
 const next=useCallback(()=>{
  const st=useGame.getState();if(st.modal!=='story')return
  const story=STORIES[st.dialog];const n=st.dialogStep+1
  stopVoice();if(!story||n>=story.lines.length)st.closeModal();else st.setDialogStep(n)
 },[])
 const advance=useCallback(()=>{
  const st=useGame.getState();if(st.modal!=='story')return
  const story=STORIES[st.dialog];const line=story?.lines[st.dialogStep];if(!line)return
  if(line.blackout)return
  if(line.item){if(Date.now()-openedAt.current>700)next();return}
  const len=(line.text||line.terminal||'').length
  if(typedRef.current<len){typedRef.current=len;setTyped(len);return}
  next()
 },[next])
 // Effets de l'étape courante : son, secousse, objet, blackout, voix.
 useEffect(()=>{
  if(!story||!line)return
  const st=useGame.getState();openedAt.current=Date.now();typedRef.current=0;setTyped(0);setVoiceDur(0)
  if(line.sfx)st.emit(line.sfx)
  if(line.shake)useGame.setState(s=>({shake:s.shake+1}))
  if(line.item){st.applyStep(step);st.setItemShown(line.item);const t=setTimeout(()=>{if(useGame.getState().dialogStep===step)next()},2600);return()=>{clearTimeout(t);useGame.getState().setItemShown(null)}}
  if(line.blackout){
   st.setBlackout('dark');st.emit('blackout');const d=line.blackout
   const t1=setTimeout(()=>{const g=useGame.getState();g.applyStep(step);g.setBlackout('flicker');g.emit('relight')},d-700)
   const t2=setTimeout(()=>{const g=useGame.getState();g.setBlackout(null);if(g.dialogStep===step)next()},d)
   return()=>{clearTimeout(t1);clearTimeout(t2);useGame.getState().setBlackout(null)}
  }
  st.applyStep(step)
  const v=st.settings.muted?null:voiceFor(id,step)
  if(v){const run=playVoiceSequence([{url:voiceUrl(v.file),gain:v.gain,fx:v.fx,key:step}],(k,dur)=>{if(k===step&&dur)setVoiceDur(dur)});return()=>run.stop()}
 },[id,step]) // eslint-disable-line react-hooks/exhaustive-deps
 // Machine à écrire : calée sur la durée de la voix quand elle est connue, sinon ~30 ms par caractère (4 s au plus).
 useEffect(()=>{
  if(!line||line.item||line.blackout)return
  const total=text.length;if(!total||typedRef.current>=total)return
  const ms=voiceDur?Math.max(12,voiceDur*920/total):Math.min(32,Math.max(16,3800/total))
  const iv=setInterval(()=>{const n=Math.min(total,typedRef.current+1);typedRef.current=n;setTyped(n);if(n>=total)clearInterval(iv)},ms)
  return()=>clearInterval(iv)
 },[id,step,voiceDur]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  const onKey=e=>{const t=e.target;if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)return
   // En marchant, seul E fait avancer : Espace saute et le clic sert à la souris.
   const walking=useGame.getState().dialogWalk
   // Caché, aucune touche ne fait avancer une réplique (état normalement impossible : la cachette ferme le dialogue).
   if(useGame.getState().hiding)return
   // En marchant, viser un AUTRE objet et appuyer sur E passe à cet objet : la discussion ne doit pas empêcher de jouer.
   // Viser l'objet dont on parle déjà fait simplement avancer la réplique : sinon chaque E relançait le même dialogue
   // depuis le début, son compris (bug signalé le 6 novembre 2026 en martelant E devant la télé ou un terminal).
   const near=useGame.getState().near
   if(walking&&(e.key==='e'||e.key==='E')&&!e.repeat&&near&&near.id!==useGame.getState().dialog){e.preventDefault();const g=useGame.getState();stopVoice();g.closeModal();g.interact();return}
   if(e.key==='e'||e.key==='E'||(!walking&&(e.key===' '||e.key==='Enter'))){if(e.repeat)return;if(!walking)e.preventDefault();advance()}}
  const onPointer=e=>{if(useGame.getState().dialogWalk||e.button!==0||e.target.closest?.('button,.top-actions,.modal-shade'))return;advance()}
  window.addEventListener('keydown',onKey);window.addEventListener('pointerdown',onPointer)
  return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('pointerdown',onPointer)}
 },[advance])
 // Dialogue en marchant : la réplique passe seule une fois lue, le joueur n'a rien à faire.
 useEffect(()=>{
  if(!complete||!walking||!line||line.item||line.blackout)return
  const t=setInterval(()=>{if(useGame.getState().paused)return;clearInterval(t);next()},Math.max(1700,text.length*42))
  return()=>clearInterval(t)
 },[complete,walking,id,step]) // eslint-disable-line react-hooks/exhaustive-deps
 if(!story||!line||line.item||line.blackout)return null
 const shown=text.slice(0,typed);const last=step+1>=story.lines.length
 return <div className={'dialogue-layer'+(walking?' walking':'')} data-dialog={id} data-step={step} data-complete={complete?1:0}>
  <div className={'speech-bubble paper'+(line.terminal?' is-terminal':'')} role="dialog" aria-live="polite" aria-label={line.speaker}>
   <div className={'speaker-tag '+speakerClass(line.speaker)}>{line.speaker}</div>
   <div className="speech-progress">{step+1} / {story.lines.length}</div>
   {line.terminal?<pre className="green-terminal speech-terminal">{shown}{!complete&&<span className="caret">▮</span>}</pre>
    :<p className="speech-text">{shown}{!complete&&<span className="caret">▮</span>}</p>}
   <div className={'speech-next'+(complete?' ready':'')}><ActionKey/> {last?'Terminer':'Continuer'} <span className="tri">▼</span></div>
  </div>
 </div>
}
// Visuel d'un objet : public/assets/items/<id>.png (préchargé pour éviter un trou à l'animation).
const itemImage=id=>`/assets/items/${id}.png`
Object.keys(ITEMS).forEach(id=>{new Image().src=itemImage(id)})
const ItemImage=({id})=><img className="item-image" src={itemImage(id)} alt="" draggable={false}/>
// Animation « objet récupéré » (clé, document, badge, clé USB) pendant un dialogue.
function ItemGet(){
 const id=useGame(s=>s.itemShown);const it=ITEMS[id]
 if(!it)return null
 return <div className="item-get" key={id} role="status" aria-label={it.caption+' : '+it.label}>
  <div className="item-get-rays"/>
  <div className="item-get-card paper"><span className="stamp">PIÈCE À CONVICTION</span>
   <div className="item-get-icon"><ItemImage id={id}/></div>
   <div className="item-get-caption">{it.caption}</div>
   <div className="item-get-label">{it.label}</div>
   <div className="item-get-hint"><ActionKey/> continuer</div>
  </div>
 </div>
}
// Voile noir du blackout : noir total puis scintillement quand la torche revient.
function BlackoutVeil(){
 const phase=useGame(s=>s.blackout)
 if(!phase)return null
 return <div className={'blackout-veil '+phase} aria-hidden="true"/>
}
// ---------------------------------------------------------------------------
const MX=v=>(v+16)*8.2,MZ=v=>(v+6)*4.45
function MapSvg({flags,large=false}){
 const marker=useRef()
 useEffect(()=>{
  let raf;const loop=()=>{const p=runtime.player;if(marker.current)marker.current.setAttribute('transform',`translate(${MX(p.x)},${MZ(p.z)}) rotate(${(-p.yaw)*180/Math.PI})`);raf=requestAnimationFrame(loop)}
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)
 },[])
 const areas=[CORRIDOR,...ROOMS,{...SECRET,secret:true}]
 return <svg className={'minimap'+(large?' large':'')} viewBox="0 0 290 255" aria-label="Carte de l'hôpital et position du joueur">
   <rect width="290" height="255" fill="#071316"/>
   {areas.map((r,i)=><rect key={i} x={MX(r.x-r.w/2)} y={MZ(r.z-r.d/2)} width={r.w*8.2} height={r.d*4.45} fill={r.secret?(flags.chase?'#4a2528':'#121a1c'):'#163034'} stroke={r.secret&&!flags.chase?'#2a3a3c':'#69827e'} strokeWidth={.65}/>)}
   {large&&ROOMS.map(r=><text key={r.id} x={MX(r.x)} y={MZ(r.z)} fill="#a9c3ba" fontSize="7" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{r.title}</text>)}
   {GATES.filter(g=>g.id!=='entrance').map(g=><rect key={g.id} x={MX(g.x)-2.5} y={MZ(g.z)-2.5} width="5" height="5" fill={isGateOpen(g.id,flags)?'#58d7ac':'#ed635b'}/>)}
   {INTERACTIVES.filter(o=>o.type==='puzzle'&&!flags.done[o.id]).map(o=><circle key={o.id} cx={MX(o.x)} cy={MZ(o.z)} r={2.2} fill="#e2bb77"/>)}
   <g ref={marker}><path d="M 0,7 L -5,-6 L 5,-6 Z" fill="#fff5cf" stroke="#f7b983" strokeWidth="1"/></g>
 </svg>
}
function Minimap(){
 const flags=useFlags()
 return <div className="minimap-wrap">
  <div className="minimap-label">PLAN · REZ-DE-CHAUSSÉE <span>N ↑</span></div>
  <MapSvg flags={flags}/>
  <div className="map-key"> <span className="green-dot"/> accessible <span className="red-dot"/> fermé <span className="gold-dot"/> énigme</div>
 </div>
}
function JournalOverlay(){
 const flags=useFlags(),tab=useGame(s=>s.journalTab),open=useGame(s=>s.openJournal),close=useGame(s=>s.closeOverlays)
 const journal=useMemo(()=>journalFor(flags),[flags]),inventory=useMemo(()=>inventoryFor(flags),[flags])
 const chapter=useGame(s=>s.chapter),[reading,setReading]=useState(null)
 return <div className="journal-overlay"><ReleasePointer/>
  <section className="journal-card paper"><span className="stamp">PIÈCES À CONVICTION</span>
   <header><div><div className="file-tag">ARCHIVES PERSONNELLES · {CHAPTERS[chapter]}</div><h2>Journal de Thomas</h2></div><button className="close-x" onClick={close} aria-label="Fermer">✕</button></header>
   <nav className="tabs">
    <button className={tab==='journal'?'on':''} onClick={()=>open('journal')}><BookOpen size={16}/> Journal <kbd>J</kbd></button>
    <button className={tab==='inventory'?'on':''} onClick={()=>open('inventory')}><Package size={16}/> Inventaire <kbd>I</kbd></button>
    <button className={tab==='map'?'on':''} onClick={()=>open('map')}><MapIcon size={16}/> Carte <kbd>M</kbd></button>
   </nav>
   {tab==='journal'&&<div className="journal-list">{journal.map((j,i)=><article key={j.id}><span>PREUVE {String(i+1).padStart(2,'0')}</span><h3>{j.title}</h3><p>{j.body}</p></article>)}</div>}
   {tab==='inventory'&&<div className="inventory-list">{inventory.length===0&&<p className="muted">Aucun objet pour l’instant.</p>}{inventory.map(it=>it.doc
    ?<button type="button" key={it.id} className="inventory-doc" onClick={()=>setReading(it)}><ItemImage id={it.id}/><div><h3>{it.label}</h3><small>Cliquer pour ouvrir le document</small></div></button>
    :<article key={it.id}><ItemImage id={it.id}/><div><h3>{it.label}</h3></div></article>)}</div>}
   {tab==='map'&&<div className="map-large"><MapSvg flags={flags} large/><p className="muted">Objectif : {OBJECTIVES[chapter]}</p></div>}
  </section>
  {reading&&<div className="doc-reader" role="dialog" aria-label={reading.label} onClick={()=>setReading(null)}>
   <img src={`/assets/items/${reading.doc}`} alt={reading.label} draggable={false}/>
   <button type="button" className="outline-btn" autoFocus onClick={()=>setReading(null)}>FERMER LE DOCUMENT</button>
  </div>}
 </div>
}
function Inventory(){
 const flags=useFlags();const items=useMemo(()=>inventoryFor(flags),[flags])
 return <div className="inventory">
  {Array.from({length:6},(_,i)=>{
   const item=items[i];const icon=!item?<span className="empty-slot">{i+1}</span>:<ItemImage id={item.id}/>
   return <div key={i} className={'slot '+(item?'has-item':'')} title={item?.label||'Emplacement vide'}>{icon}<span>{i+1}</span>{item&&<div className="item-label">{item.label}</div>}</div>
  })}
 </div>
}
function EndScreen(){
 const endingReason=useGame(s=>s.endingReason),newGame=useGame(s=>s.newGame),returnToMenu=useGame(s=>s.returnToMenu)
 const muted=useGame(s=>s.settings.muted),record=useGame(s=>s.lastRecord)
 const top=useMemo(()=>rankedRecords(readRecords()).slice(0,5),[record])
 // Sortie atteinte avec la clé USB : bonne fin. Capturé par Adrien : fin tragique.
 const good=endingReason==='exit',timedOut=endingReason==='timeout'
 const penalties=record?.penalties,penaltyCount=penalties?penalties.scare+penalties.error+penalties.hint:0
 useEffect(()=>{
  const lines=good?VOICES.endingGood:VOICES.ending
  if(!lines?.length||muted)return
  const t=setTimeout(()=>playVoiceSequence(lines.map(v=>({url:voiceUrl(v.file),gain:v.gain,fx:v.fx,key:v.line})),()=>{}),2200)
  return()=>{clearTimeout(t);stopVoice()}
 },[muted,good])
 return <div className={'ending-screen'+(good?' good':'')}><ReleasePointer/>
  <div className="end-terminal">HOSPITAL DATABASE<span className="blink-cursor">▮</span><pre>{good?`BACKUP_H404_FINAL — COPIED\nDOSSIER: 404-EM-2018\nPATIENT: ÉLÉONORE VASSEUR\nSTATUS: EVIDENCE SECURED\nACCESS: PUBLIC`:`NEW PATIENT REGISTERED\nPATIENT: THOMAS VASSEUR\nSTATUS: UNDER OBSERVATION\nDOSSIER: 404-EM-2018\nACCESS: RESTRICTED`}</pre></div>
  {good?<div className="end-mark good">GOOD END <span>FIN LIBRE — LA VÉRITÉ SORT DE CHARCOT</span></div>
       :<div className="end-mark">SAD END <span>FIN TRAGIQUE — LE DERNIER PATIENT</span></div>}
  {record&&<section className="end-time" aria-label="Temps de partie">
   <div className="end-time-main"><span>TEMPS UTILISÉ</span><strong>{fmtTime(record.time)}</strong>{record.isBest?<em>NOUVEAU RECORD</em>:record.ending!=='exit'&&<small>{timedOut?'Le temps est écoulé':'Thomas n’a pas atteint la sortie'}</small>}<small className="end-penalties">{penaltyCount?`Dont ${penaltyCount} min de pénalités : ${penalties.scare} screamer${penalties.scare>1?'s':''}, ${penalties.error} erreur${penalties.error>1?'s':''}, ${penalties.hint} indice${penalties.hint>1?'s':''}`:'Aucune pénalité'}</small></div>
   {top.length>0&&<ol className="end-records">{top.map(r=><li key={r.at} className={r.at===record.at?'current':''}><b>{fmtTime(r.time)}</b><span>{new Date(r.at).toLocaleDateString('fr-FR')}{DIFFICULTIES[r.difficulty]?` · ${DIFFICULTIES[r.difficulty].label}`:''}</span></li>)}</ol>}
  </section>}
  {record&&<ScoreForm key={record.at} record={record}/>}
  {good?<>
   <p>Thomas pousse la double porte et tombe dans la nuit froide du parvis. Maxime est là, adossé à la clôture, le visage en sang mais vivant : il est sorti par la galerie avant lui. Derrière la vitre, Adrien s’arrête sur le seuil. Il ne franchit pas la lumière.</p>
   <div className="end-line"><span className="speaker-tag maxime">MAXIME</span><blockquote>« Tu l’as ?… Alors ils ne pourront plus l’effacer. Ni elle, ni nous. »</blockquote></div>
   <p className="end-quote">« Il était venu chercher la vérité sur sa mère. Au matin, le dossier 404-EM-2018 était sur le bureau d’un juge. »</p>
  </>:<>
   <p>{timedOut?'Le temps est écoulé. La torche faiblit puis s’éteint, et dans le noir Thomas entend Adrien approcher sans se presser.':'Dans l’obscurité du passage, Adrien rattrape Thomas et reprend la clé USB.'}</p>
   <div className="end-line"><span className="speaker-tag adrien">ADRIEN</span><blockquote>« Je t’avais pourtant prévenu. Personne ne doit connaître la vérité. »</blockquote></div>
   <p className="end-quote">« Il était venu chercher la vérité sur sa mère. Il est devenu le prochain dossier oublié. »</p>
  </>}
  <div className="pause-actions row"><button className="primary-btn" onClick={()=>{initAudio();newGame()}}>RECOMMENCER</button><button className="outline-btn" onClick={returnToMenu}><Home size={18}/> MENU PRINCIPAL</button></div>
 </div>
}
// ---------------------------------------------------------------------------
// Compteur d'images par seconde (réglage) : lu deux fois par seconde dans runtime.fps, mesuré par le rendu.
function FpsMeter(){
 const on=useGame(s=>s.settings.showFps&&s.phase==='playing'),[fps,setFps]=useState(0),q=useGame(s=>s.settings.quality)
 useEffect(()=>{if(!on)return;const t=setInterval(()=>setFps(runtime.fps||0),500);return()=>clearInterval(t)},[on])
 if(!on)return null
 return <div className={'fps-meter'+(fps&&fps<30?' slow':'')} aria-hidden="true">{fps} i/s · {QUALITY_LABELS[q]}</div>
}
export default function HUD(){
 const phase=useGame(s=>s.phase),chapter=useGame(s=>s.chapter),paused=useGame(s=>s.paused)
 const near=useGame(s=>s.near),modal=useGame(s=>s.modal),zone=useGame(s=>s.zone)
 const flashlight=useGame(s=>s.flashlight),showMinimap=useGame(s=>s.settings.showMinimap),muted=useGame(s=>s.settings.muted)
 const done=useGame(s=>s.done),chase=useGame(s=>s.chase),chaseTime=useGame(s=>s.chaseTime),notice=useGame(s=>s.notice)
 const journalVisible=useGame(s=>s.journalVisible),settingsVisible=useGame(s=>s.settingsVisible),capture=useGame(s=>s.capture),outside=useGame(s=>s.outside),dialogWalk=useGame(s=>s.dialogWalk)
 const toggle=useGame(s=>s.toggle),openJournal=useGame(s=>s.openJournal)
 const label=useLayoutLabel(),device=useGame(s=>s.inputDevice),hiding=useGame(s=>s.hiding),encounter=useGame(s=>s.encounter)
 useEffect(()=>{document.body.classList.toggle('touch',device==='touch')},[device])
 useEffect(()=>{
  const onKey=e=>{
   const st=useGame.getState();const key=e.key.toLowerCase()
   if(st.phase!=='playing')return
   // Échap reste actif dans un champ de saisie : sinon on ne peut plus quitter une énigme au clavier.
   if(e.key==='Escape'){
    if(st.modal&&!st.dialogWalk){st.closeModal();return}
    if(st.journalVisible||st.settingsVisible){st.closeOverlays();return}
    // Si le pointeur était verrouillé, le navigateur le libère et la pause s'enclenche via pointerlockchange.
    if(!document.pointerLockElement)st.togglePause()
    return
   }
   const t=e.target;if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)return
   if(st.modal&&!st.dialogWalk)return
   if(key==='j'&&!st.paused&&!st.modal){st.openJournal('journal');return}
   if(key==='i'&&!st.paused&&!st.modal){st.openJournal('inventory');return}
   if(key==='m'&&!st.paused&&!st.modal){st.openJournal('map');return}
   if(!isSimRunning(st))return
   // Sans cela, le « e » qui ouvre une énigme s'écrit dans son champ de saisie.
   if(key==='e'&&!e.repeat&&!st.modal){e.preventDefault();st.interact()}
   if(key==='f'&&!e.repeat){st.toggle('flashlight');st.emit('flashlight')}
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 },[])
 useEffect(()=>{if(!notice)return;const timeout=window.setTimeout(()=>{if(useGame.getState().notice===notice)useGame.getState().notification('')},3600);return()=>clearTimeout(timeout)},[notice])
 if(phase==='menu')return <MainMenu/>
 if(phase==='ending')return <EndScreen/>
 if(modal==='prologue')return <Prologue/>
 const solved=solvedCount({done})
 const simRunning=!paused&&!modal&&!journalVisible&&!settingsVisible
 return <>
  <header className="hud-brand"><h1>HOSPITAL <strong>404</strong></h1><div className="brand-line">HÔPITAL CHARCOT <span>●</span> {zone}</div></header>
  <GameTimer/>
  <section className={'objectives'+(chase?' under-chase':'')}><div className="obj-caption"><span className="diamond">◇</span> {outside?'PROLOGUE · LE PARVIS':CHAPTERS[chapter]}</div>
    <div className="objective-main"><span className="obj-square"/>{outside?'Rejoins Maxime et entre dans l’hôpital.':OBJECTIVES[chapter]}</div>
    <div className="progress-label"><span>PREUVES RÉCUPÉRÉES</span><strong>{solved}/4</strong></div>
    <div className="progress-track"><div style={{width:solved*25+'%'}}/></div>
  </section>
  {showMinimap&&!outside&&<Minimap/>}
  <div className={'crosshair'+(near&&(simRunning||dialogWalk)?' on-target':'')}/>
  {near&&(simRunning||dialogWalk)&&<div className="interact-prompt" onClick={()=>tapKey(...KEY.interact)}><ActionKey/><div><strong>{near.label}</strong><small>{near.type==='locked'?'VERROUILLÉ':near.type==='door'?'OUVRIR':near.type==='puzzle'?'ÉNIGME':near.type==='talk'?'PARLER':'INTERAGIR'}</small></div></div>}
  <Inventory/>
  <div className="top-actions">
   <button title="Journal (J)" aria-label="Journal" onClick={()=>openJournal('journal')}><BookOpen size={18}/> Journal <kbd>J</kbd></button>
   <button title="Carte (M)" aria-label="Carte" onClick={()=>openJournal('map')}><MapIcon size={18}/> Carte <kbd>M</kbd></button>
   {device!=='touch'&&<button title="Lampe (F)" onClick={()=>{toggle('flashlight');useGame.getState().emit('flashlight')}} className={flashlight?'selected':''}><Flashlight size={17}/> <kbd>F</kbd></button>}
   <button title={muted?'Réactiver le son':'Couper le son'} aria-label={muted?'Réactiver le son':'Couper le son'} onClick={()=>useGame.getState().updateSettings({muted:!muted})} className={muted?'':'selected'}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
   <button title="Pause (Échap)" aria-label="Pause" onClick={()=>useGame.getState().togglePause()}><Pause size={17}/> <kbd>Échap</kbd></button>
  </div>
  {(modal!=='story'||dialogWalk)&&device!=='touch'&&<div className="controls-hint">{device==='gamepad'?<>Gâchette courir · B sauter · A {dialogWalk&&!near?'réplique suivante':'interagir'} · X torche · Start pause</>:<><MousePointer2 size={14}/> {label} se déplacer · Maj courir · Espace sauter · E {dialogWalk&&!near?'réplique suivante':'interagir'} · F torche · Échap pause</>}</div>}
  {device==='touch'&&(simRunning||dialogWalk)&&!capture&&<TouchControls/>}
  {notice&&!modal&&<div className="toast" key={notice}>{notice}</div>}
  {capture&&<div className="capture-veil"/>}
  {chase&&!capture&&<div className="chase-warning"><strong>FUITE EN COURS<span className="chase-long"> — ADRIEN APPROCHE</span></strong><span>{Math.ceil(chaseTime)} s</span></div>}
  <div className={'screen-vignette'+(chase?' chase-vignette':'')}/>
  {(chase||encounter)&&!capture&&<div className="danger-pulse"/>}
  <StaminaBar/>
  {hiding&&<div className={'hide-view '+(hideSpot(hiding)?.kind||'locker')} aria-hidden="true"/>}
  {hiding&&!modal&&<div className="interact-prompt hide-prompt" onClick={()=>tapKey(...KEY.interact)}><ActionKey/><div><strong>Sortir de la cachette</strong><small>NE FAIS AUCUN BRUIT</small></div></div>}
  {modal==='story'&&<Dialogue/>}
  {modal==='puzzle'&&<PuzzleModal/>}
  <ItemGet/>
  <AchievementToast/>
  <FpsMeter/>
  <BlackoutVeil/>
  <Screamer/>
  {journalVisible&&!modal&&<JournalOverlay/>}
  {paused&&!modal&&<PauseMenu/>}
 </>
}

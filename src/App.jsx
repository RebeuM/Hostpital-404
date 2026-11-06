import React,{useEffect,useRef,Suspense} from 'react'
import {Canvas,useFrame,useThree} from '@react-three/fiber'
import {useTexture} from '@react-three/drei'
import * as THREE from 'three'
import World from './components/World'
import Player from './components/Player'
import Effects,{POST_GAIN} from './components/Effects'
import HUD from './components/HUD'
import {preloadModels} from './components/Model'
import {ALL_TEXTURE_URLS} from './components/assets'
import {useGame,runtime} from './game/store'
import {flickerLevel} from './game/dread'
import {QUALITY_PRESETS,PHONE,PHONE_LIGHT} from './game/settings'
import {guardGestures,limitRendererTextures,limitTextureDecode,releaseOrientation} from './game/phone'
import {startGamepad,trackInputDevice} from './game/gamepad'
import {initAudio,loadSamples,setVolume,setMuted,stopVoice,stopCat,startAmbient,stopAmbient,suspendAudio,resumeAudio,sfx,startTv,stopTv,stopAlarm,stopHeartbeat,startAlarm,startHeartbeat,isAudioStarted,startWind,stopWind,setOutsideAudio,startMusic,stopMusic,setMusicPaused,startGrowls,stopGrowls} from './game/audio'

// Préchargement immédiat de toutes les ressources locales (la barre du menu reflète ce chargement).
if(PHONE)limitTextureDecode()
preloadModels();useTexture.preload(ALL_TEXTURE_URLS)

// Relie le moteur audio aux événements du jeu (démarré uniquement après un clic sur le menu).
function AudioDirector(){
 const phase=useGame(s=>s.phase),volume=useGame(s=>s.settings.volume),chase=useGame(s=>s.chase),muted=useGame(s=>s.settings.muted)
 const paused=useGame(s=>s.paused),modal=useGame(s=>s.modal),journal=useGame(s=>s.journalVisible),settings=useGame(s=>s.settingsVisible)
 useEffect(()=>{setVolume(volume)},[volume])
 useEffect(()=>{setMuted(muted)},[muted])
 useEffect(()=>{
  if(phase==='playing'){if(!isAudioStarted())initAudio();loadSamples();resumeAudio();startAmbient();startMusic();startWind();setOutsideAudio(useGame.getState().outside);startTv();if(chase){startAlarm();startHeartbeat()}}
  else{stopAmbient();stopMusic();stopWind();stopTv();stopAlarm();stopHeartbeat();stopCat();if(phase==='menu')stopVoice()}
 },[phase])
 useEffect(()=>{if(phase!=='playing')return;setMusicPaused(paused||settings);if(paused||settings)suspendAudio();else resumeAudio()},[paused,settings,phase])
 const encounter=useGame(s=>s.encounter)
 useEffect(()=>{if(!chase)stopAlarm();if(!chase&&!encounter)stopHeartbeat()},[chase,encounter])
 useEffect(()=>useGame.subscribe((s,prev)=>{if(s.outside!==prev.outside||s.phase!==prev.phase)setOutsideAudio(s.outside)}),[])
 // Pendant une énigme, des grognements au hasard. Le réglage des screamers les coupe aussi ; rien pendant un screamer.
 useEffect(()=>useGame.subscribe((s,prev)=>{
  const on=s.phase==='playing'&&s.modal==='puzzle'&&s.settings.jumpscares
  const was=prev.phase==='playing'&&prev.modal==='puzzle'&&prev.settings.jumpscares
  if(on&&!was)startGrowls(()=>{const g=useGame.getState();return !g.scare&&!g.paused})
  else if(!on&&was)stopGrowls()
 }),[])
 // Zustand 5 : subscribe(listener) reçoit (état, état précédent) ; on filtre ici le changement d'événement.
 useEffect(()=>useGame.subscribe((state,prev)=>{const ev=state.lastEvent;if(!ev||ev===prev.lastEvent)return;if(['start','menu'].includes(ev.type))return;sfx(ev.type,ev.payload)}),[])
 useEffect(()=>{
  const vis=()=>{if(document.hidden){suspendAudio();const st=useGame.getState();if(st.phase==='playing')st.setPaused(true)}}
  document.addEventListener('visibilitychange',vis);return()=>document.removeEventListener('visibilitychange',vis)
 },[])
 return null
}
function Renderer(){
 const quality=useGame(s=>s.settings.quality),brightness=useGame(s=>s.settings.brightness),fov=useGame(s=>s.settings.fov)
 const renderScale=useGame(s=>s.settings.renderScale),fpsCap=useGame(s=>s.settings.fpsCap)
 const preset=QUALITY_PRESETS[quality]
 // Rien à dessiner derrière la vidéo du menu ni l'écran de fin ; au téléphone, la pause économise aussi la batterie.
 const live=useGame(s=>s.phase==='playing'&&!(PHONE&&s.paused))
 const top=topDpr(preset)
 // Résolution choisie à la main : fixe ; sinon, la plage du préréglage et la résolution adaptative.
 const dpr=renderScale?Math.max(.3,top*renderScale):preset.dpr
 return <Canvas key={quality} frameloop={live&&!fpsCap?'always':'never'} shadows={preset.shadows?{type:THREE.PCFSoftShadowMap}:false} dpr={PHONE&&!renderScale?Math.min(1.25,window.devicePixelRatio||1):dpr}
   gl={{antialias:preset.antialias,alpha:false,powerPreference:'high-performance',stencil:false}}
   camera={{position:[0,1.68,-2],fov,near:.06,far:300}}
   onCreated={({gl,scene,camera})=>{gl.setClearColor('#040708');gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=brightness*EXPOSURE_DIM*PHONE_LIGHT.exposure;window.__scene=scene;window.__gl=gl;window.__camera=camera
    if(PHONE)limitRendererTextures(gl)
    // Perte du contexte graphique (courante au retour d'arrière-plan sur téléphone) : pause, pour ne pas se faire attraper à l'aveugle.
    gl.domElement.addEventListener('webglcontextlost',()=>useGame.getState().setPaused(true))}}>
   <ExposureSync brightness={brightness}/>
   {!renderScale&&<AdaptiveResolution dpr={preset.dpr} floor={Math.max(.4,top*preset.minScale)}/>}
   {live&&fpsCap>0&&<FrameLimiter fps={fpsCap}/>}
   <FrameMeter/>
   <AutoQuality/>
   <color attach="background" args={['#070d0e']}/>
   <fogExp2 attach="fog" args={['#030607',.042]}/>
   <Suspense fallback={null}>
    <World/>
    <Player/>
    <Effects/>
   </Suspense>
 </Canvas>
}
const topDpr=preset=>PHONE?Math.min(1.25,window.devicePixelRatio||1):Math.min(preset.dpr[1],window.devicePixelRatio||1)
// Résolution adaptative : si l'appareil décroche, on baisse la résolution plutôt que de saccader, jusqu'au plancher du préréglage.
// Un téléphone est bridé à 60 i/s : il remonte dès qu'il tient ce rythme (seuils d'un écran d'ordinateur inatteignables) et ne descend que sous 34 i/s.
// Avec une limite d'images (30 ou 60), le seuil de remontée suit cette limite.
const ADAPT=PHONE?{down:1/34,up:1/54,hold:6}:{down:1/42,up:1/75,hold:0}
function AdaptiveResolution({dpr,floor}){
 const setDpr=useThree(s=>s.setDpr),cap=useGame(s=>s.settings.fpsCap)
 const [,max]=dpr
 const top=PHONE?Math.min(1.25,window.devicePixelRatio||1):Math.min(max,window.devicePixelRatio||1)
 const stats=useRef({sum:0,n:0,current:top,holdUp:0})
 useEffect(()=>{runtime.renderAtFloor=false;return()=>{runtime.renderAtFloor=false}},[])
 useFrame((_,dt)=>{
  // Banc de mesure (scripts/browser-perf.mjs) : résolution figée pour comparer les réglages à l'identique.
  if(window.__H404_FIXED_DPR)return
  const a=stats.current;if(dt>.25)return
  a.sum+=dt;a.n++;a.holdUp=Math.max(0,a.holdUp-dt)
  if(a.sum<1.5)return
  const avg=a.sum/a.n;a.sum=0;a.n=0
  const down=cap?Math.max(ADAPT.down,1.25/cap):ADAPT.down,up=cap?1.08/cap:ADAPT.up
  if(avg>down&&a.current>floor){a.current=Math.max(floor,a.current*.85);a.holdUp=20;setDpr(a.current)}
  else if(avg<up&&!a.holdUp&&a.current<top){a.current=Math.min(top,a.current*1.1);a.holdUp=ADAPT.hold;setDpr(a.current)}
  runtime.renderAtFloor=a.current<=floor+.001
 })
 return null
}
// Limite d'images par seconde : le rendu n'avance que tous les 1/fps (moins de chauffe, de bruit et de batterie).
function FrameLimiter({fps}){
 const advance=useThree(s=>s.advance)
 useEffect(()=>{
  let raf=0,last=0
  // Cadence tenue sur la durée (last avance d'un pas) ; après un gros retard (onglet caché), on repart de zéro.
  const step=1000/fps,loop=t=>{raf=requestAnimationFrame(loop);const el=t-last;if(el<step-1)return;last=el>step*2?t:last+step;advance(t)}
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)
 },[fps,advance])
 return null
}
// Images par seconde mesurées (compteur des réglages et qualité automatique), sur une fenêtre glissante d'environ une seconde.
function FrameMeter(){
 const acc=useRef({t:0,n:0})
 useFrame((_,dt)=>{const a=acc.current;if(dt>.5)return;a.t+=dt;a.n++;if(a.t>=1){runtime.fps=Math.round(a.n/a.t);a.t=0;a.n=0}})
 return null
}
// Qualité automatique : si le jeu reste sous 24 i/s alors que la résolution est déjà au plancher, la qualité baisse d'un cran
// (la partie continue : seul le rendu est reconstruit). Jamais de remontée automatique, pour ne pas osciller.
const AUTO_LOW_FPS=24,AUTO_WINDOWS=4
function AutoQuality(){
 const acc=useRef({t:0,n:0,bad:0,skip:6})
 useFrame((_,dt)=>{
  const s=useGame.getState(),a=acc.current
  if(!s.settings.autoQuality||s.phase!=='playing'||s.paused||s.settingsVisible||s.settings.quality==='minimal')return
  // Les premières secondes compilent les programmes et chargent les textures : on ne juge pas.
  if(a.skip>0){a.skip-=Math.min(dt,.5);return}
  if(dt>.5)return
  a.t+=dt;a.n++;if(a.t<2)return
  const fps=a.n/a.t;a.t=0;a.n=0
  const floored=s.settings.renderScale>0||runtime.renderAtFloor||window.__H404_FIXED_DPR
  a.bad=fps<AUTO_LOW_FPS&&floored?a.bad+1:0
  if(a.bad>=AUTO_WINDOWS){a.bad=0;a.skip=10;s.lowerQuality()}
 })
 return null
}
// Avec les post-effets, three.js ignore l'exposition : le réglage Luminosité passe alors par un dernier effet (gain) du post-traitement.
// 1 au réglage par défaut correspondrait au rendu brut ; le jeu est volontairement plus sombre (DIM).
// Sans post-effets, le parvis ressort bien plus que l'intérieur : son exposition est réduite pour garder le même rendu entre qualités.
// L'ancien filtre CSS « brightness » sur le canevas coûtait une passe de composition à chaque image : il n'est plus utilisé.
const EXPOSURE_DIM=1.2,OUTDOOR_EXPOSURE=.5,CANVAS_DIM=.52,DEFAULT_BRIGHTNESS=.8
function ExposureSync({brightness}){
 const gl=useThree(s=>s.gl),post=useGame(s=>QUALITY_PRESETS[s.settings.quality].postprocessing)
 useEffect(()=>{gl.domElement.style.filter=''},[gl])
 useFrame(()=>{
  // Le gain porte aussi la panne de courant : néons, reflets et halos s'éteignent ensemble, ce que les seules lampes ne font pas.
  const level=flickerLevel(performance.now(),runtime.flickerUntil,useGame.getState().settings.reduceMotion)
  const flick=level<1?.16+.84*level:1
  gl.toneMappingExposure=brightness*EXPOSURE_DIM*PHONE_LIGHT.exposure*(1-(1-OUTDOOR_EXPOSURE)*runtime.outdoorMix)*(post?1:flick)
  // Le filtre CSS multipliait les valeurs affichées (sRVB) ; le gain agit avant l'encodage, d'où la puissance 2,2.
  POST_GAIN.value=post?Math.pow(brightness/DEFAULT_BRIGHTNESS*CANVAS_DIM*PHONE_LIGHT.exposure*flick,2.2):1
 })
 return null
}
class RenderBoundary extends React.Component{
 constructor(p){super(p);this.state={error:null}}
 static getDerivedStateFromError(error){return {error}}
 componentDidCatch(error){console.error('[render]',error)}
 render(){
  if(this.state.error)return <div className="fatal"><h2>Le rendu 3D a échoué</h2><p>{String(this.state.error?.message||this.state.error)}</p><p>Vérifie que WebGL est activé dans le navigateur, puis recharge la page.</p><button className="primary-btn" onClick={()=>location.reload()}>RECHARGER</button></div>
  return this.props.children
 }
}
export default function App(){
 useEffect(()=>{const a=startGamepad(),b=trackInputDevice();return()=>{a();b()}},[])
 useEffect(()=>{if(!PHONE)return
  const off=guardGestures()
  // De retour au menu, le téléphone reprend l'orientation que tient le joueur.
  const unsub=useGame.subscribe((s,prev)=>{if(s.phase==='menu'&&prev.phase!=='menu')releaseOrientation()})
  return()=>{off();unsub()}
 },[])
 return <div className="app-shell">
  <div id="game-viewport" className="game-viewport">
   <RenderBoundary><Renderer/></RenderBoundary>
  </div>
  <AudioDirector/>
  <HUD/>
 </div>
}

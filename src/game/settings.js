// Réglages utilisateur : valeurs par défaut, validation et persistance locale.
import {isTouchDevice} from './input.js'
import {DIFFICULTY_IDS} from './difficulty.js'
export const SETTINGS_KEY='hospital404.settings'
export const QUALITIES=['minimal','low','medium','high']
export const QUALITY_LABELS={minimal:'Minimale',low:'Basse',medium:'Moyenne',high:'Élevée'}
// Échelle de rendu : 0 = automatique (la résolution baisse d'elle-même si l'appareil décroche).
export const RENDER_SCALES=[0,.5,.6,.75,.85,1]
export const FPS_CAPS=[0,30,60]
export const LAYOUTS=['auto','azerty','qwerty']
export const DEFAULT_SETTINGS={
 quality:'medium',      // minimal | low | medium | high
 autoQuality:true,      // choisie selon l'appareil au premier lancement, abaissée d'elle-même si le jeu rame
 renderScale:0,         // 0 (auto) ou 0,5..1 : part de la résolution de l'écran réellement calculée
 fpsCap:0,              // 0 (illimité), 30 ou 60 images par seconde : moins de chauffe et de batterie
 showFps:false,         // compteur d'images par seconde
 volume:.7,             // 0..1
 sensitivity:1,         // 0.25..3
 reduceMotion:false,    // supprime le balancement de la caméra, les secousses et le scintillement
 layout:'auto',         // auto | azerty | qwerty (affichage des aides, les deux dispositions fonctionnent toujours)
 fov:75,                // 60..100
 showMinimap:true,
 muted:false,
 jumpscares:true,       // screamers (sursauts) lors d'un échec aux énigmes
 brightness:.8,         // 0.5..1.4, exposition du rendu
 difficulty:'normal'    // easy | normal | hard
}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v))
export function sanitizeSettings(input){
 const s={...DEFAULT_SETTINGS}
 if(!input||typeof input!=='object')return s
 if(QUALITIES.includes(input.quality))s.quality=input.quality
 // Une qualité enregistrée sans ce champ a été choisie à la main (anciennes versions) : on ne la change pas.
 if(typeof input.autoQuality==='boolean')s.autoQuality=input.autoQuality;else if('quality' in input)s.autoQuality=false
 if(RENDER_SCALES.includes(input.renderScale))s.renderScale=input.renderScale
 if(FPS_CAPS.includes(input.fpsCap))s.fpsCap=input.fpsCap
 if(typeof input.showFps==='boolean')s.showFps=input.showFps
 if(LAYOUTS.includes(input.layout))s.layout=input.layout
 if(DIFFICULTY_IDS.includes(input.difficulty))s.difficulty=input.difficulty
 if(typeof input.volume==='number'&&Number.isFinite(input.volume))s.volume=clamp(input.volume,0,1)
 if(typeof input.sensitivity==='number'&&Number.isFinite(input.sensitivity))s.sensitivity=clamp(input.sensitivity,.25,3)
 if(typeof input.fov==='number'&&Number.isFinite(input.fov))s.fov=clamp(Math.round(input.fov),60,100)
 if(typeof input.brightness==='number'&&Number.isFinite(input.brightness))s.brightness=clamp(input.brightness,.5,1.4)
 if(typeof input.reduceMotion==='boolean')s.reduceMotion=input.reduceMotion
 if(typeof input.showMinimap==='boolean')s.showMinimap=input.showMinimap
 if(typeof input.muted==='boolean')s.muted=input.muted
 if(typeof input.jumpscares==='boolean')s.jumpscares=input.jumpscares
 return s
}
export function loadSettings(storage=globalThis.localStorage){
 try{if(!storage)return {...DEFAULT_SETTINGS};const raw=storage.getItem(SETTINGS_KEY);return sanitizeSettings(raw?JSON.parse(raw):{quality:detectQuality(),autoQuality:true})}catch{return {...DEFAULT_SETTINGS}}
}
export function saveSettings(s,storage=globalThis.localStorage){
 try{storage?.setItem(SETTINGS_KEY,JSON.stringify(sanitizeSettings(s)));return true}catch{return false}
}
// Téléphone (matériel, pas la dernière commande utilisée) : mémoire, lumières et portée de vue réduites.
export const PHONE=isTouchDevice()
// Petit écran, souvent en pleine lumière : le noir qui fait peur sur un moniteur n'y laisse plus rien voir. L'hôpital reste sombre, mais lisible.
// Exposition 2,2 → 2,9 le 6 novembre 2026 : moins de nappes de brume éclairées en Basse, l'image avait perdu un quart de sa luminosité.
export const PHONE_LIGHT=PHONE?{exposure:2.9,fill:4,torch:.65}:{exposure:1,fill:1,torch:1}
// Tout ce qui dépend de la qualité est ici (et nulle part ailleurs dans le code) :
// antialias : anticrénelage du canevas, inutile avec les post-effets (la scène est dessinée dans une cible sans multiéchantillonnage) ;
// dpr : plage de résolution (multiple des pixels CSS) ; minScale : plancher de la résolution automatique ;
// lights : sources ponctuelles évaluées par pixel ; seeRooms : portée de vue en pièces ; fogPuffs : nappes de brume ;
// forest : densité de la forêt (cellule des sapins, portée des sapins détaillés, rangées proches, rideau de fond,
// sous-bois gardé 1 sur thin, feuilles au sol et soufflées, bancs de brume, subdivisions du terrain).
// Minimale vise une carte graphique intégrée ancienne ou un rendu logiciel : 60 à 85 % de la résolution, 2 lumières,
// aucune ombre ni post-effet, forêt clairsemée, ni brume au sol ni relief des textures (normalMaps) : mesurés en rendu
// logiciel dans le hall, la brume coûtait plus de la moitié de l'image (100 → 43 ms) et le relief encore 18 ms.
// thinProps : rochers, souches et troncs gardés 1 sur thinProps.
// roomReflections : reflets de la pièce procédurale (scene.environment) ; si faibles à l'écran (intensité 0,018) qu'on ne
// les voit pas, mais chaque pixel les échantillonne : retirés en Basse et Minimale (101 → 74 ms dans le hall en rendu logiciel).
// skyReflections : le ciel dans les flaques et les vitres du parvis.
const FOREST={
 minimal:{cell:9,meshRange:8,nearRange:0,backCell:8,thin:5,thinProps:3,leaves:90,blown:0,mist:3,terrain:72},
 low:{cell:7.5,meshRange:13,nearRange:0,backCell:6,thin:3,thinProps:2,leaves:260,blown:0,mist:10,terrain:110},
 medium:{cell:5.6,meshRange:20,nearRange:6,backCell:4.2,thin:1,thinProps:1,leaves:760,blown:180,mist:26,terrain:140},
 high:{cell:5.1,meshRange:30,nearRange:9,backCell:3.6,thin:1,thinProps:1,leaves:760,blown:320,mist:26,terrain:170}
}
export const QUALITY_PRESETS={
 minimal:{dpr:PHONE?[.7,1]:[.6,.85],minScale:.5,antialias:false,shadows:false,exteriorShadows:false,flashlightShadow:0,postprocessing:false,anisotropy:1,seeRooms:8,lights:2,fogPuffs:0,normalMaps:false,roomReflections:false,skyReflections:false,forest:FOREST.minimal},
 low:{dpr:PHONE?[1,1.6]:[1,1],minScale:.6,antialias:PHONE,shadows:false,exteriorShadows:false,flashlightShadow:0,postprocessing:false,anisotropy:PHONE?1:2,seeRooms:PHONE?9:12,lights:PHONE?3:4,fogPuffs:60,roomReflections:false,skyReflections:true,forest:FOREST.low},
 medium:{dpr:[1,1.35],minScale:.7,antialias:true,shadows:true,exteriorShadows:true,flashlightShadow:1024,postprocessing:true,noise:.045,smaa:false,anisotropy:4,lights:6,fogPuffs:280,roomReflections:true,skyReflections:true,forest:FOREST.medium},
 high:{dpr:[1,1.8],minScale:.7,antialias:false,shadows:true,exteriorShadows:true,flashlightShadow:1536,postprocessing:true,noise:.06,smaa:true,anisotropy:8,lights:8,fogPuffs:380,roomReflections:true,skyReflections:true,forest:FOREST.high}
}
// Qualité de départ, au premier lancement, d'après la carte graphique annoncée par le navigateur.
// Rendu logiciel ou très petite machine : Minimale ; téléphone ou puce graphique intégrée ancienne : Basse ; sinon Moyenne.
export function qualityForGpu(renderer='',{phone=false,cores=8,memory=8}={}){
 const r=String(renderer).toLowerCase()
 if(/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/.test(r)||cores<=2||memory<=2)return 'minimal'
 if(phone)return 'low'
 if(/intel.*(hd|uhd) graphics|intel\(r\) (hd|uhd)|gma|mali|adreno|powervr|videocore|radeon\(tm\) r[2-5]|radeon r[2-5]/.test(r))return 'low'
 return 'medium'
}
export function gpuRenderer(){
 try{
  if(typeof document==='undefined')return ''
  const gl=document.createElement('canvas').getContext('webgl2')||document.createElement('canvas').getContext('webgl')
  if(!gl)return 'software'
  const ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)
  gl.getExtension('WEBGL_lose_context')?.loseContext();return String(name||'')
 }catch{return ''}
}
export function detectQuality(){
 const nav=globalThis.navigator||{}
 return qualityForGpu(gpuRenderer(),{phone:PHONE,cores:nav.hardwareConcurrency||8,memory:nav.deviceMemory||8})
}
export function detectLayout(nav=globalThis.navigator){
 const lang=(nav?.language||'').toLowerCase()
 return lang.startsWith('fr')?'azerty':'qwerty'
}

// Téléphone : réglages et gestes propres au tactile. Rien ici ne dépend de React ni de three.js.
// Bâton virtuel : pixels sous le pouce → direction (x à droite, y en avant). Zone morte au centre ; dépasser nettement l'anneau fait courir.
export const STICK={radius:58,dead:.12,runAt:1.4}
export function stickVector(dx,dy,{radius,dead,runAt}=STICK){
 const dist=Math.hypot(dx,dy),r=dist/radius
 const knob=r>1?1/r:1
 const out={x:0,y:0,run:r>=runAt,knobX:dx*knob,knobY:dy*knob}
 if(r<dead)return out
 const mag=Math.min(1,(r-dead)/(1-dead))
 out.x=dx/dist*mag;out.y=-dy/dist*mag
 return out
}
const RAD=Math.PI/180
const halfTan=fov=>Math.tan(fov*RAD/2)
const fromHalfTan=t=>2*Math.atan(t)/RAD
const REF_ASPECT=16/9,REF_FOV=75
const PORTRAIT_H_FOV=58,PORTRAIT_MAX_FOV=104
// three.js fixe le champ vertical : un téléphone en long verrait trop large et tout y paraîtrait minuscule,
// et en portrait on regarderait par une fente. Le réglage reste celui d'un écran 16:9 ; ailleurs, on corrige.
export function viewFov(fov,aspect,touch=true){
 if(!touch||!(aspect>0))return fov
 if(aspect>REF_ASPECT)return fromHalfTan(halfTan(fov)*REF_ASPECT/aspect)
 if(aspect<1)return Math.max(fov,Math.min(PORTRAIT_MAX_FOV,fromHalfTan(halfTan(PORTRAIT_H_FOV)/aspect)))
 return fov
}
// La lampe et la main gardent la même place à l'écran, quelle que soit sa forme.
export function lampPose(base,fov,aspect){
 const refH=halfTan(REF_FOV),h=halfTan(fov)
 return {x:base.x*(h*aspect)/(refH*REF_ASPECT),y:base.y*h/refH,z:base.z}
}
// Mémoire : le budget d'un onglet de téléphone est très inférieur à celui d'un ordinateur. Sur un écran de cette taille,
// les couleurs à 512 px et les cartes de relief à 256 px ne se distinguent pas du 1K. Ciel et atlas d'arbres sont gardés plus grands.
export const TEXTURE_LIMIT={color:512,data:256,atlas:1024}
const COLOR_ROLES=new Set(['map','emissiveMap','alphaMap'])
export function textureLimit(role,size){
 if(size>=2000)return TEXTURE_LIMIT.atlas
 return COLOR_ROLES.has(role)?TEXTURE_LIMIT.color:TEXTURE_LIMIT.data
}
// Réduit une image déjà chargée, avant son envoi à la carte graphique. La source est partagée entre clones : un seul passage suffit.
export function shrinkTexture(tex,limit){
 const img=tex.image,w=img?.width,h=img?.height
 // Cibles de rendu et textures de données n'ont qu'un objet { largeur, hauteur } : rien à redessiner.
 if(!w||!h||!(img instanceof HTMLImageElement||img instanceof ImageBitmap))return false
 const big=Math.max(w,h);if(big<=limit)return false
 const k=limit/big,c=document.createElement('canvas')
 c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k))
 const g=c.getContext('2d',{willReadFrequently:true});if(!g)return false
 g.drawImage(img,0,0,c.width,c.height)
 img.close?.();tex.image=c;tex.needsUpdate=true
 return true
}
// drei envoie ses textures à la carte graphique dès qu'elles sont chargées : il faut les réduire juste avant, d'après le nom du fichier
// (diff = couleur, nor et arm = relief). Une fois envoyée, une texture garde sa taille : réduire après coup serait une erreur WebGL.
export function limitRendererTextures(gl){
 const init=gl.initTexture.bind(gl)
 gl.initTexture=tex=>{
  const img=tex.image
  if(img&&!gl.properties.get(tex).__webglTexture)shrinkTexture(tex,textureLimit(/\/(nor|arm)\.\w+$/.test(img.src||'')?'normalMap':'map',Math.max(img.width||0,img.height||0)))
  init(tex)
 }
}
// Sur Android, les textures des GLB sont décodées en ImageBitmap : les réduire dès le décodage évite le pic de mémoire au chargement.
// (Safari passe par des balises image, décodées à la demande et réduites par shrinkTexture.)
export function limitTextureDecode(max=TEXTURE_LIMIT.color,env=globalThis){
 const native=env.createImageBitmap;if(!native)return false
 env.createImageBitmap=async(source,...rest)=>{
  const bitmap=await native.call(env,source,...rest)
  const big=Math.max(bitmap.width,bitmap.height);if(big<=max)return bitmap
  const k=max/big,opts=rest.find(o=>o&&typeof o==='object')||{}
  const small=await native.call(env,bitmap,{premultiplyAlpha:opts.premultiplyAlpha,colorSpaceConversion:opts.colorSpaceConversion,resizeWidth:Math.max(1,Math.round(bitmap.width*k)),resizeHeight:Math.max(1,Math.round(bitmap.height*k)),resizeQuality:'medium'})
  bitmap.close?.();return small
 }
 return true
}
// Plein écran et paysage là où le navigateur le permet (Android). Sur iPhone, ces fonctions n'existent pas : l'installation sur l'écran d'accueil en tient lieu.
export const canFullscreen=()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen)
export function enterGameScreen(){
 if(!canFullscreen())return
 const go=document.fullscreenElement?Promise.resolve():document.documentElement.requestFullscreen({navigationUI:'hide'})
 go.then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{})
}
export function releaseOrientation(){try{screen.orientation?.unlock?.()}catch{}}
export function toggleFullscreen(){
 if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})
 else enterGameScreen()
}
// iOS ignore user-scalable=no : sans cela, le pouce gauche et le pouce droit posés ensemble déclenchent un zoom de la page.
export function guardGestures(doc=document){
 const stop=e=>e.preventDefault()
 const pinch=e=>{if(e.touches.length>1)e.preventDefault()}
 doc.addEventListener('gesturestart',stop);doc.addEventListener('gesturechange',stop);doc.addEventListener('dblclick',stop)
 doc.addEventListener('touchmove',pinch,{passive:false})
 doc.addEventListener('contextmenu',stop)
 return()=>{doc.removeEventListener('gesturestart',stop);doc.removeEventListener('gesturechange',stop);doc.removeEventListener('dblclick',stop);doc.removeEventListener('touchmove',pinch);doc.removeEventListener('contextmenu',stop)}
}
// Vibration (Android uniquement) : un appui bref pour les boutons, une secousse pour les screamers.
export function haptic(pattern=8){try{navigator.vibrate?.(pattern)}catch{}}

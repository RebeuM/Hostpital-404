import {canDread} from './dread.js'
// Variantes de screamer : image, animation, son, durée. Le magasin tire une variante au hasard
// (jamais deux fois la même d'affilée) à chaque échec d'énigme.
// Images et sons fournis par le propriétaire (dossier listes-screamer, sons égalisés et raccourcis) : public/assets/scare/ et public/assets/sounds/scares/.
// frame : hauteur et décalage de l'image par rapport à l'écran, réglés pour que le visage entier reste visible.
export const SCARE_VARIANTS=[
 {id:'masque',image:'/assets/scare/masque.webp',frame:{height:'96%',top:'2%'},anim:'zoom',sound:'scare-stab',duration:1300},
 {id:'yeux',image:'/assets/scare/yeux.webp',frame:{height:'130%',top:'-15%'},anim:'creep',sound:'scare-crow',duration:1600},
 {id:'chien',image:'/assets/scare/chien.webp',frame:{height:'110%',top:'-5%'},anim:'glitch',sound:'scare-fuzzy',duration:1300},
 {id:'cheveux',image:'/assets/scare/cheveux.webp',frame:{height:'106%',top:'0%'},anim:'slide',sound:'scare-shriek',duration:1400},
 {id:'fille',image:'/assets/scare/fille.webp',frame:{height:'190%',top:'-50%'},anim:'strobe',sound:'scare-jumpscare',duration:1600}
]
// Capture par le monstre : son propre visage (rendu du modèle du jeu, scripts/render-capture-scare.mjs) et le cri le plus fort.
// Hors du tirage au sort : il n'appartient qu'à ce moment-là.
export const CAPTURE_SCARE={id:'capture',image:'/assets/scare/monstre.webp',frame:{height:'104%',top:'-2%'},anim:'capture',sound:'scare-jumpscare',duration:1700,capture:true}
// Le temps que la caméra se lève vers lui avant que son visage ne remplisse l'écran.
export const CAPTURE_SCARE_DELAY=380
export const scareVariant=id=>id===CAPTURE_SCARE.id?CAPTURE_SCARE:SCARE_VARIANTS.find(v=>v.id===id)||SCARE_VARIANTS[0]
// Screamers surprises en jouant : le compte à rebours ne tourne que pendant l'exploration libre, et le screamer
// attend de préférence un changement de pièce, moment où le joueur regarde ailleurs.
export const ambientScareDelay=(random=Math.random,first=false)=>first?35+random()*35:55+random()*65
export const AMBIENT_SCARE_MAX_WAIT=15
export const canAmbientScare=s=>s.settings.jumpscares&&canDread(s)
export const ambientScareReady=(timer,zoneChanged)=>timer<=0&&(zoneChanged||timer<=-AMBIENT_SCARE_MAX_WAIT)
// Rire dans les environs : un point au hasard autour du joueur (devant, derrière, à gauche ou à droite), fixe dans le monde.
export const laughDelay=(random=Math.random,first=false)=>first?30+random()*40:50+random()*70
export function pickLaughSpot(x,z,random=Math.random){
 const angle=random()*Math.PI*2,dist=5+random()*8
 return {x:x+Math.sin(angle)*dist,y:1.2+random()*.6,z:z+Math.cos(angle)*dist,dist}
}
export function pickScare(previousId,random=Math.random){
 const pool=SCARE_VARIANTS.filter(v=>v.id!==previousId)
 return pool[Math.floor(random()*pool.length)%pool.length]
}

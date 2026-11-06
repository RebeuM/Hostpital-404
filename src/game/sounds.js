// Échantillons audio locaux (CC0, voir docs/ASSETS.md). Chargés après le premier geste utilisateur ;
// si un fichier manque, le moteur retombe sur la synthèse Web Audio.
export const SOUNDS_BASE='/assets/sounds/'
export const SAMPLE_SETS={
 // pas : plusieurs prises par surface, tirées au hasard sans répétition immédiate
 'step-tile':['footsteps/tile-1.mp3','footsteps/tile-2.mp3','footsteps/tile-3.mp3','footsteps/tile-4.mp3','footsteps/tile-5.mp3','footsteps/tile-6.mp3','footsteps/tile-7.mp3','footsteps/tile-8.mp3','footsteps/tile-9.mp3','footsteps/tile-10.mp3'],
 'step-lino':['footsteps/tile-1.mp3','footsteps/tile-2.mp3','footsteps/tile-3.mp3','footsteps/tile-4.mp3','footsteps/tile-5.mp3','footsteps/tile-6.mp3','footsteps/tile-7.mp3','footsteps/tile-8.mp3','footsteps/tile-9.mp3','footsteps/tile-10.mp3'],
 'step-concrete':['footsteps/concrete-1.mp3','footsteps/concrete-2.mp3','footsteps/concrete-3.mp3','footsteps/concrete-4.mp3'],
 'step-run':['footsteps/run-1.mp3','footsteps/run-2.mp3','footsteps/run-3.mp3','footsteps/run-4.mp3','footsteps/run-5.mp3','footsteps/run-6.mp3','footsteps/run-7.mp3','footsteps/run-8.mp3','footsteps/run-9.mp3','footsteps/run-10.mp3','footsteps/run-11.mp3','footsteps/run-12.mp3','footsteps/run-13.mp3','footsteps/run-14.mp3','footsteps/run-15.mp3','footsteps/run-16.mp3','footsteps/run-17.mp3'],
 // screamers (fournis par le propriétaire)
 'scare-stab':['scares/stab.mp3'],
 'scare-crow':['scares/crow.mp3'],
 'scare-fuzzy':['scares/fuzzy.mp3'],
 'scare-shriek':['scares/shriek.mp3'],
 'scare-jumpscare':['scares/jumpscare.mp3'],
 // effets (Kenney RPG Audio / Interface Sounds, qubodup Door Set)
 'door-open':['fx/door-open-1.mp3','fx/door-open-2.mp3'],
 'door-close':['fx/door-close-1.mp3','fx/door-close-2.mp3','fx/door-close-3.mp3'],
 'creak':['fx/creak-1.mp3','fx/creak-2.mp3','fx/creak-3.mp3'],
 'paper':['fx/paper-1.mp3','fx/paper-2.mp3','fx/paper-3.mp3'],
 'latch':['fx/latch.mp3'],'click':['fx/click.mp3'],'pickup':['fx/pickup.mp3'],
 'ui-click':['fx/ui-click.mp3'],'ui-confirm':['fx/ui-confirm.mp3'],'ui-error':['fx/ui-error.mp3'],'ui-glitch':['fx/ui-glitch.mp3'],
 // ambiance (nappes d'horreur TinyWorlds, râles lointains qubodup)
 'laugh':['ambient/laugh.mp3'],
 // chanson du chat « OIIA » (feliz-oiia-cat.mp3, fourni par le propriétaire)
 'oiia':['fx/oiia-cat.mp3'],
 'growl':['ambient/brvhrtz-zmbie-brvhrtz-622560.mp3'],
 'monster-transform':['fx/transformation-monstre-squatteur-mix.mp3'],
 'wind-pines':['ambient/wind-pines.mp3'],
 'wind-howl':['ambient/wind-howl.mp3'],
 'owl':['ambient/owl-1.mp3','ambient/owl-2.mp3'],
 'drone':['ambient/drone-1.mp3','ambient/drone-2.mp3'],
 'moan':['ambient/moan-1.mp3','ambient/moan-2.mp3'],
 // monstre de la poursuite
 'monster-step':['fx/monster-step-1.mp3','fx/monster-step-2.mp3','fx/monster-step-3.mp3']
}
export const sampleUrl=file=>`${SOUNDS_BASE}${file}`

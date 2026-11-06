// Voix enregistrées (ElevenLabs, fournies par le propriétaire) : fichiers dans public/assets/voices/.
// Seules les répliques des PERSONNAGES sont doublées : les prises *-narrateur-* et *-terminal-* ne sont plus lues.
// Chaque entrée associe une prise à une étape du dialogue (index dans STORIES[id].lines).
// gain : correction en dB pour aligner les prises à −16 LUFS (−16 − LUFS mesuré avec ffmpeg loudnorm, borné par −1,5 − pic vrai).
// fx : 'pa' (haut-parleur : bande étroite, écho) ou 'radio' (enregistrement : bande étroite, saturation légère).
// Livraison du 4 novembre 2026 : 35 nouvelles prises (Thomas, Maxime, squatteur). Reste à enregistrer : patients-hautparleur-1
// (étape 3 de `patients`, voix synthétique, fx 'pa'). Une réplique sans prise est simplement affichée (machine à écrire).
export const VOICES_BASE='/assets/voices/'
export const VOICES={
 intro:[
  {line:0,file:'intro-thomas-1.mp3',gain:4.1},
  {line:1,file:'intro-maxime-1.mp3',gain:2.0},
  {line:2,file:'intro-thomas-2.mp3',gain:7.5},
  {line:3,file:'intro-maxime-2.mp3',gain:6.5},
  {line:4,file:'intro-thomas-3.mp3',gain:1.5},
  {line:5,file:'intro-maxime-3.mp3',gain:1.9}
 ],
 squatter:[
  {line:0,file:'squatter-adrien-1.mp3',gain:3.3},
  {line:1,file:'squatter-thomas-1.mp3',gain:3.4},
  {line:2,file:'squatter-adrien-2.mp3',gain:3.6},
  {line:4,file:'squatter-thomas-2.mp3',gain:6.3},
  {line:5,file:'squatter-adrien-3.mp3',gain:4.7}
 ],
 disappearance:[
  {line:0,file:'disappearance-maxime-1.mp3',gain:0.4},
  {line:2,file:'disappearance-thomas-1.mp3',gain:-1.0},
  {line:4,file:'disappearance-thomas-2.mp3',gain:8.2}
 ],
 bed203:[
  {line:0,file:'bed203-thomas-1.mp3',gain:3.5},
  {line:1,file:'bed203-thomas-2.mp3',gain:3.4}
 ],
 patients:[
  {line:0,file:'patients-thomas-2.mp3',gain:3.1},
  {line:2,file:'patients-thomas-3.mp3',gain:3.9},
  {line:4,file:'patients-thomas-4.mp3',gain:1.5},
  {line:5,file:'patients-thomas-1.mp3',gain:6.7}
 ],
 radio:[
  {line:0,file:'radio-thomas-1.mp3',gain:5.7},
  {line:2,file:'radio-thomas-2.mp3',gain:1.5},
  {line:3,file:'radio-thomas-3.mp3',gain:2.3},
  {line:4,file:'radio-thomas-4.mp3',gain:-0.4},
  {line:5,file:'radio-hautparleur-1.mp3',gain:-0.9,fx:'pa'},
  {line:6,file:'radio-thomas-5.mp3',gain:0.1}
 ],
 security:[
  {line:0,file:'security-thomas-1.mp3',gain:1.6},
  {line:2,file:'security-thomas-2.mp3',gain:-0.7},
  {line:3,file:'security-thomas-3.mp3',gain:3.6},
  {line:4,file:'security-adrien-1.mp3',gain:5.7,fx:'pa'},
  {line:5,file:'security-thomas-4.mp3',gain:0.8}
 ],
 lab:[
  {line:2,file:'lab-thomas-1.mp3',gain:1.7},
  {line:3,file:'lab-thomas-2.mp3',gain:0.6},
  {line:4,file:'lab-maxime-1.mp3',gain:4.0,fx:'radio'},
  {line:5,file:'lab-thomas-3.mp3',gain:0.0}
 ],
 morgue:[
  {line:0,file:'morgue-thomas-1.mp3',gain:0.5},
  {line:1,file:'morgue-thomas-2.mp3',gain:-0.3},
  {line:3,file:'morgue-delmas-1.mp3',gain:12.5,fx:'radio'},
  {line:4,file:'morgue-adrien-1.mp3',gain:6.7,fx:'radio'},
  {line:5,file:'morgue-delmas-2.mp3',gain:5.6,fx:'radio'},
  {line:6,file:'morgue-thomas-3.mp3',gain:1.0},
  {line:7,file:'morgue-adrien-2.mp3',gain:3.3},
  {line:8,file:'morgue-thomas-4.mp3',gain:-0.4}
 ],
 note:[
  {line:0,file:'note-thomas-1.mp3',gain:2.5},
  {line:1,file:'note-thomas-2.mp3',gain:3.2}
 ],
 tv:[
  {line:0,file:'tv-thomas-1.mp3',gain:2.8},
  {line:1,file:'tv-thomas-2.mp3',gain:5.1}
 ],
 reception_pc:[
  {line:1,file:'reception_pc-thomas-1.mp3',gain:4.3}
 ],
 ending:[
  {line:0,file:'fin-adrien-1.mp3',gain:-0.1}
 ],
 // Bonne fin (sortie atteinte) : prises à enregistrer, voir docs/VOIX.md « Fin — GOOD END ».
 endingGood:[],
}
// Prologue : les quatre cartes lues par Paul (livrées le 6 novembre 2026, gains mesurés avec la même règle).
export const PROLOGUE_VOICES=[
 {card:0,file:'prologue-paul-1.mp3',gain:2.3},
 {card:1,file:'prologue-paul-2.mp3',gain:0.4},
 {card:2,file:'prologue-paul-3.mp3',gain:0.9},
 {card:3,file:'prologue-paul-4.mp3',gain:3.7}
]
export const prologueVoice=card=>PROLOGUE_VOICES.find(v=>v.card===card)||null
export const voiceUrl=file=>`${VOICES_BASE}${file}`
// Prise associée à une étape d'un dialogue (ou null).
export function voiceFor(id,line){return (VOICES[id]||[]).find(v=>v.line===line)||null}

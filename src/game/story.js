// Scénario officiel fourni : « Scénario Hostpital 404 », hôpital Charcot (docs/scenario-hostpital404.pdf).
// Dialogues « bulle » (façon Animal Crossing) : chaque entrée est une suite d'étapes lues une par une.
//   {speaker,text}            réplique d'un personnage (voix si une prise existe dans voices.js)
//   {speaker,terminal}        texte d'écran (police machine), jamais doublé
//   {item:'key'}              animation « objet récupéré » (voir progression.ITEMS)
//   {blackout:ms,effect}      écran noir : les lumières meurent, puis la torche revient (effet appliqué à la fin)
//   sfx / shake               son d'ambiance ou secousse au début de la réplique
// focus / focus2 : point que la caméra regarde pendant le dialogue (focus2 à partir de l'étape `from`).
// Plus aucun narrateur : tout passe par les personnages (Thomas, Maxime, le squatteur, les écrans).
// Prologue : affiché sur le parvis à chaque nouvelle partie, peut être passé.
export const PROLOGUE=[
 {tag:'MARS 2018',text:'Éléonore Vasseur entre à l’hôpital Charcot pour une intervention. Elle n’en ressortira jamais.'},
 {tag:'LES ANNÉES SUIVANTES',text:'À sa famille, on ne donne aucune explication. L’hôpital ferme ses portes, et le dossier d’Éléonore disparaît des archives.'},
 {tag:'AUJOURD’HUI',text:'Son fils, Thomas, veut comprendre. Cette nuit, il a franchi la clôture de Charcot avec son ami Maxime, qui l’attend devant l’entrée.'},
 {tag:'22:41 — PARVIS DE L’HÔPITAL',text:'Personne n’est entré ici depuis des années. C’est du moins ce que tout le monde croit.'}
]
// walkable : réflexion ou échange en passant, le joueur garde le contrôle. Les autres dialogues (face-à-face, révélations,
// objets récupérés, blackout) gardent la caméra sur la scène.
export const STORIES={
 intro:{walkable:true,tag:'22:48 / ACTE I',title:'Les portes de Charcot',focus:{x:1.1,y:1.55,z:-.6},lines:[
  {speaker:'THOMAS',text:'Maman est morte ici. Je dois comprendre pourquoi ils ont effacé son dossier.'},
  {speaker:'MAXIME',text:'Cet endroit est condamné depuis des années. Fais vite, Thomas…'},
  {speaker:'THOMAS',text:'Regarde ce hall… Des dossiers partout, et une télé qu’on entend encore grésiller quelque part.'},
  {speaker:'MAXIME',text:'Et il y a quelqu’un derrière le comptoir de l’accueil. Il nous observe depuis qu’on est entrés.'},
  {speaker:'THOMAS',text:'Je vais lui parler. Toi, va jeter un œil au portail, au fond du couloir.'},
  {speaker:'MAXIME',text:'D’accord. Mais ne traîne pas.'}
 ],hint:'Retrouve l’homme à l’accueil et parle-lui.'},
 squatter:{tag:'ACTE I / L’AVERTISSEMENT',title:'L’homme qui gardait les clés',focus:{x:-4.3,y:1.55,z:3.7},lines:[
  {speaker:'SQUATTEUR',text:'Vous n’avez rien à faire ici. Cet endroit est fermé depuis des années.'},
  {speaker:'THOMAS',text:'Je cherche un dossier médical. Celui de ma mère : Éléonore Vasseur.'},
  {speaker:'SQUATTEUR',text:'Éléonore… Vous feriez mieux de laisser cette histoire derrière vous. Mais puisque vous êtes là… prenez cette clé. Elle ouvre le secteur des patients.'},
  {item:'key'},
  {speaker:'THOMAS',text:'Pourquoi vous m’aidez ?'},
  {speaker:'SQUATTEUR',text:'Je ne vous aide pas. Je vous laisse choisir. Le portail est au fond du couloir.'}
 ],hint:'Le portail du secteur des patients se trouve au fond du hall, dans le couloir.'},
 disappearance:{tag:'23:06 / BLACKOUT',title:'Maxime a disparu',focus:{x:.9,y:1.55,z:6.9},focus2:{from:2,x:0,y:1.5,z:8.4},lines:[
  {speaker:'MAXIME',text:'Thomas ? Il y a quelqu’un derrière cette p…'},
  {blackout:2800,effect:'openSector'},
  {speaker:'THOMAS',text:'Maxime ?! Maxime ! Réponds-moi !',shake:true},
  {speaker:'TERMINAL',text:'ACCÈS AUX DOSSIERS PATIENTS : REFUSÉ — AUTORISATION REQUISE.'},
  {speaker:'THOMAS',text:'Le portail est ouvert… et l’entrée est condamnée. Je n’ai plus le choix : il faut que j’avance seul.'}
 ],hint:'Trouve le tiroir sécurisé dans la salle des patients (chambres 201–204).'},
 bed203:{walkable:true,tag:'ACTE II / LIT 203',title:'ÉLÉONORE VASSEUR — PATIENTE 203',lines:[
  {speaker:'THOMAS',text:'« ÉLÉONORE VASSEUR — PATIENTE 203 »… C’est ici. C’est la chambre de maman.'},
  {speaker:'THOMAS',text:'Et sur le mur, quelqu’un a écrit : « Les réponses se trouvent parfois sous vos yeux. Encore faut-il savoir regarder. »'}
 ],hint:'Le tiroir sécurisé réclame le numéro de chambre d’Éléonore.'},
 patients:{tag:'ACTE II / FICHE 203',title:'La chambre d’Éléonore',lines:[
  {speaker:'THOMAS',text:'Le tiroir s’ouvre. Une fiche d’hospitalisation : « Patiente Éléonore Vasseur. Transfert vers radiologie. Examens complémentaires demandés. Dossier incomplet. »'},
  {item:'fiche203'},
  {speaker:'THOMAS',text:'Des pages ont été arrachées… Attends. Il y a un souffle, derrière les rideaux.'},
  {speaker:'HAUT-PARLEUR',text:'Transfert de la patiente 203 vers la radiologie. Le personnel est prié de libérer le couloir.',sfx:'static'},
  {speaker:'THOMAS',text:'Il n’y a plus d’électricité ici depuis des années… Et sur l’oreiller du lit 203 : un bracelet médical. Au nom de Maxime.'},
  {speaker:'THOMAS',text:'Maxime… qu’est-ce qu’ils t’ont fait ?'}
 ],hint:'Va en RADIOLOGIE, de l’autre côté du couloir. La porte est maintenant ouverte.'},
 radio:{tag:'ACTE III / EXAMENS',title:'L’intervention suspendue',lines:[
  {speaker:'THOMAS',text:'Le coffre s’ouvre. Une radiographie de maman, un rapport médical, une prescription étrange… et une note signée du médecin-chef.'},
  {item:'rapport'},
  {speaker:'THOMAS',text:'« Intervention suspendue sur décision du médecin-chef. Patiente transférée vers le protocole expérimental H-404. » Un protocole expérimental ? Sur ma mère ?'},
  {speaker:'THOMAS',text:'Dernière page : « Les accès au protocole H-404 sont conservés dans le système de sécurité. »'},
  {speaker:'THOMAS',text:'L’ordinateur de radiologie vient de s’allumer tout seul… Il affiche une radiographie. Cette silhouette… c’est moi ?',sfx:'static',shake:true},
  {speaker:'HAUT-PARLEUR',text:'Le patient suivant est arrivé.'},
  {speaker:'THOMAS',text:'Il faut que je sorte d’ici. La salle de sécurité.'}
 ],hint:'Rejoins la salle de SÉCURITÉ pour obtenir les accès H-404.'},
 security:{tag:'ACTE IV / CAMÉRA 06',title:'Il nous regarde',lines:[
  {speaker:'THOMAS',text:'Code 0600 accepté. Les écrans redémarrent…'},
  {item:'badge'},
  {speaker:'THOMAS',text:'Maxime ! Sur la caméra 06, c’est lui : il court dans un couloir… et il disparaît derrière une porte.'},
  {speaker:'THOMAS',text:'Les portes du laboratoire viennent de se déverrouiller. Et sur cette autre caméra… le squatteur. Debout dans un couloir. Il regarde droit dans l’objectif.'},
  {speaker:'SQUATTEUR',text:'Tu aurais dû partir quand je t’en ai donné l’occasion.'},
  {speaker:'THOMAS',text:'Comment est-ce qu’il… Les écrans s’éteignent. Je dois continuer. Le laboratoire.',sfx:'static'}
 ],hint:'Entre au LABORATOIRE H-404, au fond du couloir sur la droite.'},
 lab:{tag:'ACTE V / DONNÉES EFFACÉES',title:'Le patient 404-EM-2018',lines:[
  {speaker:'TERMINAL',terminal:'RESULT FOUND\nPATIENT_ID: 404-EM-2018\nSTATUS: DELETED\nEXPERIMENT: H-404\nLAST MODIFICATION: 15/03/2018 - 03:42\nUSER: A.VASSEUR\nBACKUP: AVAILABLE'},
  {item:'dossier'},
  {speaker:'THOMAS',text:'Supprimé par « A.VASSEUR »… Vasseur. Comme nous. Qui est-ce ?'},
  {speaker:'THOMAS',text:'Extrait du rapport : « Les patients sélectionnés dans le protocole H-404 ont été soumis à des traitements expérimentaux sans autorisation médicale régulière. Plusieurs incidents ont été dissimulés afin de préserver les intérêts de l’établissement. »'},
  {speaker:'ENREGISTREMENT DE MAXIME',text:'Thomas, si tu entends ça, je suis dans la morgue. Il y a quelqu’un qui nous surveille depuis le début. J’ai trouvé quelque chose sur ta mère. Viens vite…'},
  {speaker:'THOMAS',text:'Maxime ! Tiens bon, j’arrive.'},
  {speaker:'TERMINAL',terminal:'BACKUP AVAILABLE\nLOCATION: MORGUE\nRESTORE ACCESS: DENIED'}
 ],hint:'La sauvegarde du dossier se trouve dans la MORGUE, au bout du couloir.'},
 morgue:{tag:'ACTE VI / BACKUP_H404_FINAL',title:'La vérité ne doit pas sortir',focus2:{from:7,x:-3.1,y:1.55,z:42.0},lines:[
  {speaker:'THOMAS',text:'Le téléphone de Maxime… Un message non envoyé : « J’ai compris. Le squatteur est l’ancien technicien informatique. C’est lui qui a supprimé les dossiers. Il sait que nous sommes ici. »'},
  {speaker:'THOMAS',text:'Et une clé USB marquée BACKUP_H404_FINAL. Sur le vieil ordinateur, une vidéo : le médecin-chef, Victor Delmas, face à un technicien.'},
  {item:'usb'},
  {speaker:'VICTOR DELMAS',text:'Le dossier d’Éléonore doit disparaître. Les résultats ne doivent jamais sortir de cet établissement.'},
  {speaker:'ADRIEN VASSEUR',text:'Et les autres patients ? On ne peut pas continuer comme ça.'},
  {speaker:'VICTOR DELMAS',text:'Tu as reçu tes instructions. Tu supprimes les données et tu ne poses plus de questions.'},
  {speaker:'THOMAS',text:'Cette voix… Le technicien, Adrien Vasseur : c’est le squatteur. C’est lui qui a tout effacé.'},
  {speaker:'ADRIEN',text:'Tu as trouvé ce que tu cherchais, Thomas. Maintenant, tu vas me donner cette clé.',sfx:'stinger',shake:true},
  {speaker:'THOMAS',text:'Jamais.'}
 ],hint:'COURS ! Les portes principales sont verrouillées : rejoins l’accueil par le passage secret, à l’ouest de la morgue.'},
 note:{walkable:true,tag:'DOCUMENT / SALLE D’ATTENTE',title:'Ancien logiciel Sainte-Catherine',lines:[
  {speaker:'THOMAS',text:'Une note de service… « Sainte-Catherine » : c’était le nom du logiciel d’archivage de l’hôpital Charcot. « Certains dossiers de recherche ont été déplacés dans un secteur isolé. »'},
  {speaker:'THOMAS',text:'Et au crayon, en dessous : « Ne jamais confier les sauvegardes à l’équipe de nuit. »'}
 ]},
 tv:{walkable:true,tag:'OBJET / ACCUEIL',title:'Le téléviseur',lines:[
  {speaker:'THOMAS',text:'Un vieux poste… il diffuse encore des parasites. Et là, entre deux grésillements : un couloir d’hôpital vide, filmé de haut.',sfx:'static'},
  {speaker:'THOMAS',text:'C’est ici ? Quelqu’un filme cet endroit ?… La neige est revenue.'}
 ]},
 reception_pc:{walkable:true,tag:'TERMINAL / ACCUEIL',title:'Terminal d’accueil',lines:[
  {speaker:'TERMINAL',terminal:'SYSTÈME D’ARCHIVAGE — HÔPITAL CHARCOT\n\nACCÈS AUX DOSSIERS PATIENTS : REFUSÉ\nAUTORISATION REQUISE'},
  {speaker:'THOMAS',text:'Le curseur clignote encore. Personne n’a éteint cette machine depuis des années.'}
 ]}
}
// Étape du dialogue de la morgue à partir de laquelle Adrien se tient devant la porte.
export const MORGUE_ADRIEN_STEP=7
// Point regardé par la caméra pendant un dialogue (null : la caméra reste en place).
export function focusFor(story,step){
 if(!story)return null
 if(story.focus2&&step>=story.focus2.from)return story.focus2
 return story.focus||null
}
export const PUZZLES={
 patients:{tag:'ACTE II · LOGIQUE ET OBSERVATION',title:'Quatre chambres, quatre patients',kind:'code',code:'203',placeholder:'___',maxLength:3,description:'Le tiroir sécurisé réclame le numéro de la chambre d’Éléonore Vasseur. Quatre fiches sont mélangées :',clues:[
  'Monsieur Bernard est en chambre 202.', 'Madame Laurent est en chambre 204.',
  'Éléonore n’est ni en chambre 201 ni en chambre 204.',
  'Éléonore est dans une chambre dont le numéro est supérieur à celui de Monsieur Bernard.',
  'Le patient Martin occupe la dernière chambre disponible.'
 ],hints:[
  'Monsieur Bernard occupe la 202 : cherche un numéro plus grand que 202.',
  'La chambre 204 est exclue pour Éléonore. Il ne reste qu’un seul numéro possible.'
 ],question:'Numéro de chambre d’Éléonore (3 chiffres)',success:'FICHE 203 RÉCUPÉRÉE — RADIOLOGIE OUVERTE'},
 radio:{tag:'ACTE III · MATHÉMATIQUES',title:'L’équation du médecin',kind:'code',code:'0024',placeholder:'____',maxLength:4,description:'Un petit coffre métallique est posé sur le bureau. Sur le tableau blanc, le médecin a laissé une équation :',clues:[
  '3(2X − 4) + 5 = 29', 'Pour ouvrir le coffre, multipliez la valeur de X par quatre.', 'Le résultat doit être saisi sur quatre chiffres.'
 ],hints:[
  'Développe et regroupe : 6X − 7 = 29, donc 6X = 36.',
  'X vaut 6. Multiplie par quatre et complète avec des zéros devant.'
 ],question:'Code du coffre (4 chiffres)',success:'RAPPORT MÉDICAL RÉCUPÉRÉ — SÉCURITÉ OUVERTE'},
 security:{tag:'ACTE IV · GESTION DE PROJET',title:'Le planning de maintenance',kind:'code',code:'0600',placeholder:'____',maxLength:4,description:'« Le système de sécurité a été désactivé. Pour retrouver l’accès aux archives, remettez les interventions dans le bon ordre, identifiez le chemin critique et calculez sa durée totale. »',table:[
  ['A','Diagnostic électrique','2 h','Aucune'],['B','Remplacement du générateur','3 h','A'],
  ['C','Réactivation des caméras','1 h','A'],['D','Test des accès sécurisés','1 h','B et C']
 ],clues:['Le chemin critique conditionne la fin des travaux.','Saisis la durée au format HH00 (par exemple 0300 pour trois heures).'],hints:['Deux chemins sont possibles : A → B → D et A → C → D.','Le chemin critique est le plus long : additionne les durées de A, B et D.'],question:'Durée du chemin critique (HH00)',success:'SÉCURITÉ RÉTABLIE — LABORATOIRE OUVERT'},
 lab:{tag:'ACTE V · CODE INFORMATIQUE',title:'HOSPITAL DATABASE',kind:'sql',description:'Le terminal relié au serveur central demande une authentification par requête SQL.',terminal:'HOSPITAL DATABASE\nACCESS DENIED\nDATABASE: PATIENTS\nPATIENT TO FIND:\n  NOM: VASSEUR\n  PRENOM: ELEONORE\n  ANNEE_DECES: 2018\nSQL QUERY REQUIRED',clues:[
  'Table : patients.', 'Colonnes : nom, prenom, annee_deces.'
 ],hints:[
  'La requête commence par SELECT * FROM patients : toutes les colonnes de la table.',
  'Ajoute WHERE puis trois conditions reliées par AND, le texte entre apostrophes.',
  "WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018 ;"
 ],question:'Saisis la requête SQL complète',success:'DOSSIER 404-EM-2018 — BACKUP À LA MORGUE'}
}
export function validateAnswer(id, answer){
 const puzzle=PUZZLES[id];if(!puzzle||typeof answer!=='string')return false
 if(puzzle.kind==='code')return answer.trim()===puzzle.code
 // Apostrophes courbes (claviers Mac), accents et ordre des conditions ne doivent pas faire échouer une requête correcte.
 const q=answer.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`´]/g,"'").replace(/[“”]/g,'"').trim().replace(/\s+/g,' ').replace(/\s*;$/,'').toLowerCase()
 const m=q.match(/^select \* from patients where (.+)$/);if(!m)return false
 const parts=m[1].split(/ and /);if(parts.length!==3)return false
 const wanted=[/^nom\s*=\s*['"]vasseur['"]$/,/^prenom\s*=\s*['"]eleonore['"]$/,/^annee_deces\s*=\s*['"]?2018['"]?$/]
 return wanted.every(w=>parts.some(c=>w.test(c)))
}
export const EVIDENCE={
 squatter:'Le squatteur reconnaît le nom d’Éléonore et remet la clé du secteur des patients.',
 disappearance:'Les néons se sont éteints ; Maxime a disparu derrière la porte. Le terminal de l’accueil refuse l’accès aux dossiers.',
 patients:'Chambre 203 : fiche incomplète, pages arrachées et bracelet de Maxime. Éléonore a été transférée en radiologie.',
 radio:'Équation 3(2X − 4) + 5 = 29 → X = 6 → code 0024. Intervention suspendue au profit du protocole H-404.',
 security:'Chemin critique A → B → D = 6 heures (code 0600). Caméras et accès du laboratoire réactivés. Le squatteur surveille.',
 lab:'Dossier 404-EM-2018 effacé le 15/03/2018 par A.VASSEUR ; sauvegarde disponible dans la morgue.',
 morgue:'USB BACKUP_H404_FINAL : Victor Delmas a ordonné à Adrien Vasseur de supprimer les preuves. Le squatteur est Adrien.',
 note:'Sainte-Catherine est le logiciel d’archivage de l’hôpital Charcot ; des dossiers ont été déplacés dans un secteur isolé.',
 bed203:'Plaque « ÉLÉONORE VASSEUR — PATIENTE 203 » et message sur le mur : « Les réponses se trouvent parfois sous vos yeux. »'
}

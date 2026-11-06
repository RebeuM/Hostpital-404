# Voix des dialogues — scripts ElevenLabs

Format : une prise par ligne de dialogue. Les balises entre crochets sont les balises audio d'ElevenLabs v3 (en anglais, placées juste avant le passage concerné, une ou deux par phrase au maximum). Réglages conseillés : Eleven v3, stabilité 0,3–0,5, langue française, un demi-seconde de silence au début et à la fin de chaque prise. Si une voix lit la balise à voix haute, la supprimer et garder la ponctuation.

**Intégration** : déposer les MP3 (44,1 kHz) dans `public/assets/voices/` sous le nom indiqué, puis ajouter la prise dans `src/game/voices.js` (dialogue, numéro de ligne, fichier). Le gain d'alignement se mesure avec `ffmpeg -i fichier.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -` (gain = −16 − input_i, borné par −1,5 − input_tp).

## Voix

| Voix | Profil |
|---|---|
| Thomas | homme, 25 ans, voix grave et contenue, émotion retenue, débit posé |
| Maxime | homme, 25 ans, voix plus claire, nerveuse, débit rapide |
| Narrateur | voix grave, lente, posée, presque murmurée |
| Squatteur / Adrien Vasseur | homme, 50 ans, voix rauque, usée, lente, menaçante sans crier |
| Terminal / haut-parleur | voix synthétique froide, monotone, légèrement saturée |
| Victor Delmas | homme, 60 ans, voix sèche, autoritaire, glaciale |

## Prologue — voix de Paul (6 novembre 2026)

Les quatre cartes du prologue (`PROLOGUE` dans `src/game/story.js`), lues par Paul : voix grave, lente, posée, presque murmurée. Le titre de chaque carte est lu en ouverture ; dates et heures sont écrites en toutes lettres pour qu'ElevenLabs ne les lise pas chiffre par chiffre. Fichiers : `public/assets/voices/prologue-paul-1.mp3` à `-4.mp3`. **Livrés et branchés le 6 novembre 2026** : `PROLOGUE_VOICES` dans `src/game/voices.js` (gains +2,3 / +0,4 / +0,9 / +3,7 dB, bornés par le pic), lecture par le composant `Prologue` de `src/components/HUD.jsx`, la machine à écrire suit la durée de chaque prise.

```
prologue-paul-1       (carte 1 — MARS 2018)
[low voice] Mars deux mille dix-huit. [pause] Éléonore Vasseur entre à l'hôpital Charcot pour une intervention. [pause] [slowly] Elle n'en ressortira jamais.

prologue-paul-2       (carte 2 — LES ANNÉES SUIVANTES)
[low voice] Les années suivantes. [pause] À sa famille, on ne donne aucune explication. [pause] L'hôpital ferme ses portes, [pause] et le dossier d'Éléonore disparaît des archives.

prologue-paul-3       (carte 3 — AUJOURD'HUI)
[low voice] Aujourd'hui. [pause] Son fils, Thomas, veut comprendre. [pause] Cette nuit, il a franchi la clôture de Charcot avec son ami Maxime, qui l'attend devant l'entrée.

prologue-paul-4       (carte 4 — 22:41, PARVIS DE L'HÔPITAL)
[whispers] Vingt-deux heures quarante et une. Parvis de l'hôpital. [pause] Personne n'est entré ici depuis des années. [pause] [slowly] C'est du moins ce que tout le monde croit.
```

## Mise à jour du 4 novembre 2026 — plus de narrateur, conversations en bulle

Les dialogues sont désormais des **conversations à deux voix affichées en bulle** (une réplique à la fois, texte tapé à la machine, E pour continuer). **Il n'y a plus de narrateur** : les prises `*-narrateur-*` ne sont plus lues (les fichiers restent dans `public/assets/voices/` mais ne figurent plus dans `src/game/voices.js`). Les 18 prises de personnages déjà livrées sont réutilisées telles quelles.

**État au 4 novembre 2026 (après-midi) : 35 des 36 répliques ci-dessous ont été livrées et branchées dans `src/game/voices.js` (gains mesurés).** Il ne reste à enregistrer que `patients-hautparleur-1` (voix synthétique du haut-parleur, étape 3 de `patients`, à déclarer avec `fx:'pa'`). Les quatre prises de terminaux (`disappearance-terminal-1`, `lab-terminal-1`, `lab-terminal-2`, `reception-terminal-1`) existent sur le disque mais ne sont plus lues : les écrans s'affichent en silence. Une réplique sans prise est simplement affichée en silence. Intégration : déposer le MP3 sous le nom indiqué, puis ajouter dans `src/game/voices.js` l'entrée `{line:<étape>,file:'<nom>.mp3',gain:<mesuré>}` (ajouter `fx:'pa'` pour le haut-parleur). L'étape est l'index de la réplique dans `STORIES[id].lines`.

### Introduction (`intro`)

```
intro-thomas-2        (étape 2)
[low voice] Regarde ce hall… [pause] Des dossiers partout, [pause] et une télé qu'on entend encore grésiller quelque part.

intro-maxime-2        (étape 3)
[nervous] [quietly] Et il y a quelqu'un derrière le comptoir de l'accueil. [pause] Il nous observe depuis qu'on est entrés.

intro-thomas-3        (étape 4)
[calm] Je vais lui parler. [pause] Toi, va jeter un œil au portail, au fond du couloir.

intro-maxime-3        (étape 5)
[nervous] D'accord. [pause] Mais ne traîne pas.
```

### Le squatteur (`squatter`)

```
squatter-thomas-1     (étape 1)
[tense] Je cherche un dossier médical. [pause] Celui de ma mère : [slowly] Éléonore Vasseur.

squatter-thomas-2     (étape 4)
[quietly] Pourquoi vous m'aidez ?

squatter-adrien-3     (étape 5)
[hoarse] [slowly] Je ne vous aide pas. [pause] Je vous laisse choisir. [pause] Le portail est au fond du couloir.
```

### Disparition de Maxime (`disappearance`) — l'étape 1 est l'écran noir (pas de voix)

```
disappearance-thomas-1    (étape 2)
[alarmed] [shouting] Maxime ?! [pause] Maxime ! [pause] Réponds-moi !

disappearance-thomas-2    (étape 4)
[shaky voice] Le portail est ouvert… [pause] et l'entrée est condamnée. [pause] [quietly] Je n'ai plus le choix : il faut que j'avance seul.
```

### Plaque du lit 203 (`bed203`)

```
bed203-thomas-1       (étape 0)
[quietly] « Éléonore Vasseur, patiente deux cent trois »… [pause] [shaky voice] C'est ici. C'est la chambre de maman.

bed203-thomas-2       (étape 1)
[low voice] Et sur le mur, quelqu'un a écrit : [pause] [slowly] « Les réponses se trouvent parfois sous vos yeux. Encore faut-il savoir regarder. »
```

### La chambre d'Éléonore (`patients`)

```
patients-thomas-2     (étape 0)
[calm, low voice] Le tiroir s'ouvre. [pause] Une fiche d'hospitalisation : [slowly] « Patiente Éléonore Vasseur. Transfert vers radiologie. Examens complémentaires demandés. [pause] Dossier incomplet. »

patients-thomas-3     (étape 2)
[low voice] Des pages ont été arrachées… [pause] [whispers] Attends. Il y a un souffle, derrière les rideaux.

patients-hautparleur-1 (étape 3, voix du terminal, effet haut-parleur)
[robotic, monotone] Transfert de la patiente deux cent trois vers la radiologie. [pause] Le personnel est prié de libérer le couloir.

patients-thomas-4     (étape 4)
[frightened] [quietly] Il n'y a plus d'électricité ici depuis des années… [pause] Et sur l'oreiller du lit deux cent trois : un bracelet médical. [pause] [shaky voice] Au nom de Maxime.
```

### L'intervention suspendue (`radio`)

```
radio-thomas-1        (étape 0)
[low voice] Le coffre s'ouvre. [pause] Une radiographie de maman, un rapport médical, une prescription étrange… [pause] et une note signée du médecin-chef.

radio-thomas-2        (étape 2)
[slowly] « Intervention suspendue sur décision du médecin-chef. Patiente transférée vers le protocole expérimental H quatre cent quatre. » [pause] [tense] Un protocole expérimental ? [pause] Sur ma mère ?

radio-thomas-3        (étape 3)
[low voice] Dernière page : [pause] « Les accès au protocole H quatre cent quatre sont conservés dans le système de sécurité. »

radio-thomas-4        (étape 4)
[alarmed] L'ordinateur de radiologie vient de s'allumer tout seul… [pause] Il affiche une radiographie. [pause] [whispers] Cette silhouette… c'est moi ?

radio-thomas-5        (étape 6)
[tense] Il faut que je sorte d'ici. [pause] La salle de sécurité.
```

### Il nous regarde (`security`)

```
security-thomas-1     (étape 0)
[calm] Code zéro six zéro zéro accepté. [pause] Les écrans redémarrent…

security-thomas-2     (étape 2)
[alarmed] Maxime ! [pause] Sur la caméra zéro six, c'est lui : il court dans un couloir… [pause] et il disparaît derrière une porte.

security-thomas-3     (étape 3)
[low voice] Les portes du laboratoire viennent de se déverrouiller. [pause] Et sur cette autre caméra… [whispers] le squatteur. Debout dans un couloir. [pause] Il regarde droit dans l'objectif.

security-thomas-4     (étape 5)
[frightened] Comment est-ce qu'il… [pause] Les écrans s'éteignent. [pause] [tense] Je dois continuer. Le laboratoire.
```

### Le patient 404-EM-2018 (`lab`)

```
lab-thomas-1          (étape 2)
[quietly] Supprimé par « A point Vasseur »… [pause] Vasseur. Comme nous. [pause] Qui est-ce ?

lab-thomas-2          (étape 3)
[low voice] Extrait du rapport : [slowly] « Les patients sélectionnés dans le protocole H quatre cent quatre ont été soumis à des traitements expérimentaux sans autorisation médicale régulière. [pause] Plusieurs incidents ont été dissimulés afin de préserver les intérêts de l'établissement. »

lab-thomas-3          (étape 5)
[urgent] Maxime ! [pause] Tiens bon, j'arrive.
```

### La vérité ne doit pas sortir (`morgue`)

```
morgue-thomas-1       (étape 0)
[low voice] Le téléphone de Maxime… [pause] Un message non envoyé : [slowly] « J'ai compris. Le squatteur est l'ancien technicien informatique. C'est lui qui a supprimé les dossiers. [pause] Il sait que nous sommes ici. »

morgue-thomas-2       (étape 1)
[calm, low voice] Et une clé U S B marquée « backup H quatre cent quatre final ». [pause] Sur le vieil ordinateur, une vidéo : [pause] le médecin-chef, Victor Delmas, face à un technicien.

morgue-thomas-3       (étape 6)
[shaky voice] Cette voix… [pause] Le technicien, Adrien Vasseur : c'est le squatteur. [pause] [quietly] C'est lui qui a tout effacé.

morgue-thomas-4       (étape 8)
[tense] [firmly] Jamais.
```

### Documents (`note`, `tv`, `reception_pc`)

```
note-thomas-1         (étape 0)
[calm, low voice] Une note de service… [pause] « Sainte-Catherine » : c'était le nom du logiciel d'archivage de l'hôpital Charcot. [pause] « Certains dossiers de recherche ont été déplacés dans un secteur isolé. »

note-thomas-2         (étape 1)
[whispers] Et au crayon, en dessous : [pause] « Ne jamais confier les sauvegardes à l'équipe de nuit. »

tv-thomas-1           (étape 0)
[low voice] Un vieux poste… il diffuse encore des parasites. [pause] Et là, entre deux grésillements : [pause] un couloir d'hôpital vide, filmé de haut.

tv-thomas-2           (étape 1)
[quietly] C'est ici ? [pause] Quelqu'un filme cet endroit ?… [pause] [whispers] La neige est revenue.

reception_pc-thomas-1 (étape 1)
[whispers] Le curseur clignote encore. [pause] Personne n'a éteint cette machine depuis des années.
```

### Prises déjà livrées et réutilisées (nouvelles étapes)

| Dialogue | Étape | Fichier |
|---|---|---|
| intro | 0, 1 | intro-thomas-1, intro-maxime-1 |
| squatter | 0, 2 | squatter-adrien-1, squatter-adrien-2 |
| disappearance | 0 | disappearance-maxime-1 |
| patients | 5 | patients-thomas-1 |
| radio | 5 | radio-hautparleur-1 |
| security | 4 | security-adrien-1 |
| lab | 4 | lab-maxime-1 |
| morgue | 3, 4, 5, 7 | morgue-delmas-1, morgue-adrien-1, morgue-delmas-2, morgue-adrien-2 |
| fin | — | fin-adrien-1 (fin-narrateur-1 n'est plus lu) |

Les terminaux ne sont plus doublés : leur texte s'affiche seul. Les prises `*-terminal-*` restent dans `public/assets/voices/` mais ne sont plus lues.

---

*Les sections suivantes sont les scripts d'origine, conservés pour référence ; les prises « narrateur » et les « consignes » n'y sont plus utilisées.*

## Acte I — Introduction (`intro`) — livré

*(Toutes les prises ci-dessous ont été livrées et intégrées ; ce document reste la référence pour toute régénération.)*

```
intro-thomas-1        (ligne 0)
[quietly] Maman est morte ici. [pause] [tense] Je dois comprendre pourquoi ils ont effacé son dossier.

intro-maxime-1        (ligne 1)
[nervous] Cet endroit est condamné depuis des années… [shaky voice] Fais vite, Thomas.

intro-narrateur-1     (ligne 2)
[calm, low voice] Sous la pluie, les deux amis entrent. [pause] Un téléviseur grésille. Des dossiers couvrent le sol. Les lumières fonctionnent par intermittence. [pause] [whispers] Un homme les observe depuis le bureau d'accueil.

intro-narrateur-2     (consigne)
[calm, low voice] Retrouve l'homme à l'accueil, [pause] et parle-lui.
```

## Acte I — Le squatteur (`squatter`)

```
squatter-adrien-1     (ligne 0)
[hoarse] [slowly] Vous n'avez rien à faire ici. [pause] Cet endroit est fermé depuis des années.

squatter-narrateur-1  (ligne 1)
[calm, low voice] Thomas explique qu'il cherche le dossier médical de sa mère. [pause] Quand il prononce le nom d'Éléonore Vasseur, [whispers] l'homme se fige.

squatter-adrien-2     (ligne 2)
[quietly] Éléonore… [long pause] [hoarse] Vous feriez mieux de laisser cette histoire derrière vous. [pause] Mais puisque vous êtes là… [sighs] prenez cette clé. Elle ouvre le secteur des patients.

squatter-narrateur-2  (ligne 3)
[calm, low voice] Il tend une vieille clé métallique.

squatter-narrateur-3  (consigne)
[calm, low voice] Le portail du secteur des patients se trouve au fond du hall, dans le couloir.
```

## Acte I — Disparition de Maxime (`disappearance`)

```
disappearance-maxime-1    (ligne 0)
[alarmed] Thomas ? [pause] [frightened] Il y a quelqu'un derrière cette p—

disappearance-narrateur-1 (ligne 1)
[low voice] Un bruit métallique. [pause] Les néons s'éteignent. [pause] Quand la torche se rallume, [whispers] Maxime a disparu. [pause] La porte s'est verrouillée derrière Thomas.

disappearance-terminal-1  (ligne 2)
[robotic, monotone] Bienvenue à Sainte-Catherine. [pause] Accès aux dossiers patients : refusé. [pause] Autorisation requise.

disappearance-narrateur-2 (ligne 3)
[calm, low voice] Thomas n'a plus le choix. [pause] Il doit avancer seul.

disappearance-narrateur-3 (consigne)
[calm, low voice] Trouve le tiroir sécurisé dans la salle des patients, [pause] chambres deux cent un à deux cent quatre.
```

## Acte II — Plaque du lit 203 (`bed203`)

```
bed203-narrateur-1    (ligne 0)
[low voice] Une plaque rouillée au-dessus du lit : [pause] Éléonore Vasseur, [pause] patiente deux cent trois. [pause] Thomas se trouve dans la bonne aile de l'hôpital.

bed203-narrateur-2    (ligne 1)
[whispers] Sur le mur, une inscription : [pause] « Les réponses se trouvent parfois sous vos yeux. [pause] Encore faut-il savoir regarder. »
```

## Acte II — La chambre d'Éléonore (`patients`)

```
patients-narrateur-1  (ligne 0)
[calm, low voice] Le tiroir s'ouvre. [pause] Fiche d'hospitalisation : [slowly] « Patiente Éléonore Vasseur. Transfert vers radiologie. Examens complémentaires demandés. [pause] Dossier incomplet. »

patients-narrateur-2  (ligne 1)
[low voice] Plusieurs pages ont été arrachées. [pause] [whispers] Un souffle derrière les rideaux… [pause] mais personne. [pause] Sur l'oreiller du lit deux cent trois : un bracelet médical au nom de Maxime.

patients-thomas-1     (ligne 2)
[shaky voice] Maxime… [pause] [quietly] qu'est-ce qu'ils t'ont fait ?

patients-narrateur-3  (consigne)
[calm, low voice] Va en radiologie, de l'autre côté du couloir. [pause] La porte est maintenant ouverte.
```

## Acte III — L'intervention suspendue (`radio`)

```
radio-narrateur-1     (ligne 0)
[calm, low voice] Le coffre contient une radiographie d'Éléonore, un rapport médical, une prescription inhabituelle, [pause] et une note signée du médecin-chef.

radio-narrateur-2     (ligne 1)
[slowly] « Intervention suspendue sur décision du médecin-chef. [pause] Patiente transférée vers le protocole expérimental H quatre cent quatre. » [pause] Dernière page : [whispers] « Les accès au protocole H quatre cent quatre sont conservés dans le système de sécurité. »

radio-narrateur-3     (ligne 2)
[low voice] L'ordinateur de radiologie s'allume brusquement. [pause] Il affiche une radiographie… [pause] [whispers] du joueur.

radio-hautparleur-1   (ligne 3)
[robotic, monotone] Le patient suivant [pause] est arrivé.

radio-narrateur-4     (consigne)
[calm, low voice] Rejoins la salle de sécurité pour obtenir les accès H quatre cent quatre.
```

## Acte IV — Il nous regarde (`security`)

```
security-narrateur-1  (ligne 0)
[calm, low voice] Code zéro six zéro zéro accepté. [pause] Les écrans redémarrent : Maxime apparaît sur une caméra, courant dans un couloir, [pause] avant de disparaître derrière une porte. [pause] Les portes du laboratoire se déverrouillent.

security-narrateur-2  (ligne 1)
[low voice] Une autre caméra montre le squatteur, debout dans un couloir. [pause] [whispers] Il regarde directement l'objectif.

security-adrien-1     (ligne 2)
[hoarse] [slowly] Tu aurais dû partir [pause] quand je t'en ai donné l'occasion.

security-narrateur-3  (ligne 3)
[calm, low voice] Les écrans s'éteignent. [pause] Thomas doit continuer.

security-narrateur-4  (consigne)
[calm, low voice] Entre au laboratoire H quatre cent quatre, au fond du couloir sur la droite.
```

## Acte V — Le patient 404-EM-2018 (`lab`)

```
lab-terminal-1        (ligne 0, le terminal lit son écran)
[robotic, monotone] Result found. [pause] Patient I D : quatre cent quatre, E M, deux mille dix-huit. [pause] Status : deleted. [pause] Experiment : H quatre cent quatre. [pause] Last modification : quinze mars deux mille dix-huit, trois heures quarante-deux. [pause] User : A point Vasseur. [pause] Backup : available.

lab-narrateur-1       (ligne 1)
[low voice] Extrait du rapport : [slowly] « Les patients sélectionnés dans le protocole H quatre cent quatre ont été soumis à des traitements expérimentaux sans autorisation médicale régulière. [pause] Plusieurs incidents ont été dissimulés afin de préserver les intérêts de l'établissement. »

lab-maxime-1          (ligne 2, enregistrement, légèrement saturé)
[whispers] [frightened] Thomas, si tu entends ça, [pause] je suis dans la morgue. [pause] Il y a quelqu'un qui nous surveille depuis le début. [pause] [shaky voice] J'ai trouvé quelque chose sur ta mère. [pause] Viens vite…

lab-terminal-2        (ligne 3)
[robotic, monotone] Backup available. [pause] Location : morgue. [pause] Restore access : denied.

lab-narrateur-2       (consigne)
[calm, low voice] La sauvegarde du dossier se trouve dans la morgue, [pause] au bout du couloir.
```

## Acte VI — La vérité ne doit pas sortir (`morgue`)

```
morgue-narrateur-1    (ligne 0)
[low voice] Le téléphone de Maxime affiche un message non envoyé : [pause] [slowly] « J'ai compris. Le squatteur est l'ancien technicien informatique. C'est lui qui a supprimé les dossiers. [pause] Il sait que nous sommes ici. »

morgue-narrateur-2    (ligne 1)
[calm, low voice] Une clé U S B marquée « backup H quatre cent quatre final ». [pause] Branchée sur le vieil ordinateur, une vidéo apparaît : [pause] le médecin-chef Victor Delmas discute avec le technicien Adrien Vasseur.

morgue-delmas-1       (ligne 2)
[cold] [slowly] Le dossier d'Éléonore doit disparaître. [pause] Les résultats ne doivent jamais sortir de cet établissement.

morgue-adrien-1       (ligne 3)
[nervous] Et les autres patients ? [pause] [quietly] On ne peut pas continuer comme ça.

morgue-delmas-2       (ligne 4)
[cold] Tu as reçu tes instructions. [pause] [sternly] Tu supprimes les données, [pause] et tu ne poses plus de questions.

morgue-narrateur-3    (ligne 5)
[low voice] Le squatteur n'est autre qu'Adrien Vasseur. [pause] [whispers] Un bruit derrière Thomas. [pause] Il est devant la porte.

morgue-adrien-2       (ligne 6)
[hoarse] [menacing] Tu as trouvé ce que tu cherchais, Thomas. [pause] [slowly] Maintenant, tu vas me donner cette clé.

morgue-narrateur-4    (consigne)
[urgent] [low voice] Cours ! [pause] Les portes principales sont verrouillées : rejoins l'accueil par le passage secret, [pause] à l'ouest de la morgue.
```

## Documents (`note`, `tv`, `reception_pc`)

```
note-narrateur-1      (ligne 0)
[calm, low voice] « Sainte-Catherine » était le nom du logiciel d'archivage de l'hôpital Charcot. [pause] Certains dossiers de recherche ont été déplacés dans un secteur isolé.

note-narrateur-2      (ligne 1)
[whispers] Une annotation au crayon : [pause] « Ne jamais confier les sauvegardes à l'équipe de nuit. »

tv-narrateur-1        (ligne 0)
[low voice] Un vieux poste diffuse des parasites. [pause] Entre deux grésillements, une image grise : un couloir d'hôpital vide, filmé de haut. [pause] [whispers] Puis la neige revient.

reception-terminal-1  (ligne 0)
[robotic, monotone] Bienvenue à Sainte-Catherine. [pause] Système d'archivage, hôpital Charcot. [pause] Accès aux dossiers patients : refusé. [pause] Autorisation requise.

reception-narrateur-1 (ligne 1)
[whispers] Le curseur clignote. [pause] Personne n'a éteint cette machine depuis des années.
```

## Fin — GOOD END (sortie atteinte, écran de fin, hors fenêtre de dialogue) — à enregistrer

Depuis le 5 novembre 2026, atteindre la sortie avec la clé USB donne une bonne fin (« FIN LIBRE — LA VÉRITÉ SORT DE CHARCOT ») ; la fin tragique reste réservée à la capture par Adrien. Les prises sont à déclarer dans `src/game/voices.js` (`endingGood`, lignes 0 et 1).

```
fin-maxime-1 (ligne 0)
[out of breath] [relieved] Tu l'as ?… [pause] Alors ils ne pourront plus l'effacer. [softly] Ni elle, ni nous.

fin-narrateur-2 (ligne 1)
[calm, low voice] [slowly] Il était venu chercher la vérité sur sa mère. [long pause] Au matin, le dossier 404-EM-2018 était sur le bureau d'un juge.
```

## Fin — SAD END (capture par Adrien, écran de fin, hors fenêtre de dialogue)

```
fin-adrien-1
[hoarse] [slowly] Je t'avais pourtant prévenu. [pause] [cold] Personne ne doit connaître la vérité.

fin-narrateur-1
[calm, low voice] [slowly] Il était venu chercher la vérité sur sa mère. [long pause] Il est devenu le prochain dossier oublié.
```

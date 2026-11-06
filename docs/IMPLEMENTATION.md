# HOSPITAL 404 — notes d’implémentation

Refonte de l’édition React Three Fiber en un jeu d’horreur et d’enquête FPS jouable du début à la fin, avec des ressources PBR et des modèles 3D sous licence CC0 intégrés localement. La pile (React 19, Vite 6, Three.js 0.180, R3F 9, Drei 10, postprocessing, Zustand 5) est conservée ; aucun moteur n’a été changé.

## 1. Audit de départ (ce qui a été corrigé)

| Défaut constaté | Correction |
|---|---|
| Décor uniquement procédural (canvas 512 px, boîtes), murs plats, pas de plinthes ni d’encadrements | Textures PBR réelles (couleur, normale, ARM) à l’échelle physique, murs en cinq bandes (plinthe, soubassement peint ou carrelé, main courante, partie haute, corniche), huisseries épaisses, double porte d’entrée, conduites, luminaires, décalcomanies d’humidité |
| Mobilier en boîtes grossières | 28 modèles glTF Poly Haven (lits, bureaux, armoires, chaises, chariots, extincteurs, luminaires, matériel de laboratoire…) placés depuis une liste unique qui sert aussi aux collisions |
| Aucune collision avec le mobilier, passage possible dans les meubles | Volumes de collision générés à partir des boîtes englobantes des modèles ; déplacement par sous-pas avec glissement le long des obstacles |
| Interaction au plus proche sans tenir compte du regard | Sélection combinant distance et champ de vision (`nearestObject(x, z, état, yaw)`) |
| `setPlayer` déclenchait un re-rendu React 10 fois par seconde (mini-carte) | Position et orientation dans un objet `runtime` hors React ; la mini-carte met à jour son marqueur par `requestAnimationFrame` |
| Pas de pause, pas de réglages, pas de sauvegarde | Menu de pause (Échap) qui suspend chronomètres, poursuivant et interactions ; réglages persistants ; sauvegarde locale versionnée et validée |
| Chronomètre de fuite qui continuait pendant les fenêtres | Toute fenêtre (dialogue, énigme, journal, réglages) ou perte du verrou de la souris suspend la simulation |
| Verrouillage de la souris via `PointerLockControls` peu contrôlable | Gestion manuelle : verrou à la demande, perte du verrou = pause, reprise automatique du verrou à la fermeture des fenêtres |
| Audio limité à trois oscillateurs | Moteur Web Audio synthétisé complet (ambiance, pas selon le sol, portes, interface, événements, alarme et battements pendant la fuite, téléviseur positionnel), démarré après un geste utilisateur, volume réglable, suspendu en pause, libéré proprement |
| Obscurité excessive compensée par le grain | Éclairage par pièce avec température chaude/froide, lumière hémisphérique, luminaires émissifs, lampe torche à ombres ; post-traitement modéré (bloom léger, vignettage, grain discret, SMAA en qualité élevée) |

### Deuxième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Les touches ZQSD sont inversées » | Le vecteur latéral était calculé avec le signe inversé (gauche ↔ droite) ; corrigé dans `Player.jsx` (droite = avant × haut = (−fz, fx)). Le contrôle navigateur vérifie désormais la gauche (flèche) et la droite (D) séparément |
| « Les personnages ne sont pas réalistes » | Personnages humains CC0 Innerscene (base MakeHuman, squelette animé, 7 clips) : Sam pour le squatteur/Adrien (idle, puis jog pendant la poursuite), Jordan pour Maxime (idle, puis derrière la vitre), et deux figures allongées (lit 201, table de la morgue). Nouveau composant `Character.jsx` (clonage du squelette, `useAnimations`, mixeur gelé en pause, repli en cas d'erreur) |
| « L'interface ne colle pas au thème horreur » | Refonte complète du style : dossiers médicaux en papier jauni taché avec tampons rouges tournés, typographie machine à écrire (Special Elite) et titres Anton, terminaux CRT verts avec scanlines, HUD en notes épinglées, inventaire en étiquettes de pièces à conviction, menu avec vignettage rouge, grain et scintillement du titre |
| « L'hôpital est vide, le mobilier ne ressemble pas à un hôpital » | Bibliothèque de mobilier hospitalier procédural (`Furniture.jsx`, 23 types) placée par pièce depuis `layout.FURNITURE` (64 éléments) avec collisions automatiques : lits d'hôpital à barrières et couvertures, brancards, tables de chevet, tablettes, rideaux sur rails, moniteurs de constantes, bouteilles d'oxygène, armoires à pharmacie, éviers, scialytique, casiers, comptoir d'accueil, bancs, distributeur, radiateurs, chariot d'urgence, chariot à linge, porte-tabliers, réfrigérateur et paillasse de laboratoire, balance de morgue. Les chambres passent à six lits avec rideaux |

### Troisième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Des portes invisibles » | Bug d'orientation des battants des portes de service : le groupe de chaque battant était tourné de +π/2, si bien que les battants fermés pointaient dans l'épaisseur du mur (invisibles, mais bloquants). Rotation corrigée à −π/2 ; les battants fermés barrent l'ouverture, s'ouvrent vers l'intérieur des pièces, et les hublots sont désormais en verre sombre dans un cadre mince (plus de bloc opaque) |
| « Des textures mal faites » | Sol du couloir, de l'accueil et de la salle d'attente : terrazzo vert d'hôpital (ambientCG Tiles042) à la place du linoléum à damier orange. Plafonds : dalles acoustiques (OfficeCeiling001 dans le couloir, OfficeCeiling005 avec dalles manquantes dans les pièces) à la place du stuc. Partie haute des murs : vieux plâtre à peinture écaillée (Plaster007) partout, en deux teintes, à la place des deux plâtres précédents. Coulures d'humidité en mélange multiplicatif (elles assombrissent le mur au lieu d'apparaître comme des rectangles clairs). Panneaux de portes assombris. Quatre jeux de textures inutilisés supprimés |
| « Niveau affiches, qu'est-ce qu'il y a à faire ? » | Système d'affiches remplaçables : chaque panneau, affiche, plaque, tableau blanc et radiographie porte un identifiant ; une image déposée dans `public/assets/signs/` et déclarée dans `src/components/signs.js` remplace le rendu automatique (retour au rendu automatique si le fichier manque). Cahier des charges complet pour un graphiste dans **`docs/AFFICHES.md`** : 46 visuels avec emplacement, dimensions physiques, ratio, résolution, textes obligatoires et style. Le circuit a été vérifié avec une image d'essai, retirée ensuite |

### Quatrième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Un screamer quand on échoue à une énigme » | À chaque mauvaise réponse : image plein écran d'Adrien (rendu in-engine du modèle Sam retravaillé : désaturation, contraste, teinte rouge, aberration chromatique, grain, vignette ; deux variantes alternées, dont une déformée) avec flash, zoom et secousses CSS pendant 1,15 s, cri synthétisé (impact grave, trois voix distordues à vibrato et balayage, aigus métalliques, réverbération), secousse du dossier. Délai minimal de 12 s entre deux screamers ; réglage « Screamers lors d'un échec » pour les désactiver ; respect de `prefers-reduced-motion` |
| « Le bruit des pas n'est pas un bruit de pas » | Synthèse refaite : impact du talon (souffle bref filtré 1,9–3,6 kHz selon le sol), corps (sinus à chute de hauteur 1,6× → 0,35× en 120 ms), pose de la semelle 70–110 ms plus tard, frottement léger, couinement occasionnel sur le terrazzo, enveloppes exponentielles, alternance gauche/droite par panoramique, envoi vers une réverbération de couloir (réponse impulsionnelle synthétique de 1,4 s). Course : plus fort et plus rapide |

### Cinquième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Les bruits de pas ne sont pas ouf » | Abandon de la synthèse pure : enregistrements CC0 (6 pas sur pierre de Fantozzi pour le carrelage et la course, 5 pas sur béton de Kenney pour le terrazzo et la galerie), prises tirées au hasard sans répétition, hauteur et niveau variés, panoramique alterné, réverbération du couloir, plus une couche grave synthétique pour le poids. La synthèse reste en repli si un fichier manque |
| « Pleins de variantes de screamer, avec cette image » | 8 variantes (`src/game/scares.js`) tirées au sort sans répétition immédiate : Adrien zoom (cri d'horreur), Adrien glitch (rugissement), chat stroboscope (cri féminin) et chat zoom (cri synthétique) avec l'image fournie, Maxime surgissant (râle fantomatique), patiente en négatif (zombie), corps rampant (monstre), terminal CRT « LE PATIENT SUIVANT EST ARRIVÉ » (parasites). Chaque variante a son animation CSS, sa durée et son son ; secousse de toute la page ; sons CC0 chargés après le premier clic avec repli synthétisé |

### Sixième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « J'ai le 3D du monstre » (`veritytm.glb`) | Modèle converti (matériaux éclairés, clips renommés, Draco + WebP) et intégré comme poursuivant à la place d'Adrien : clip Run pendant la fuite, orientation mesurée in-engine (−90°), échelle ×1,1, lumière rouge attachée. Nouvelle séquence de capture : à moins de 1,5 m, la simulation se fige, le monstre se tourne vers Thomas et joue « Kill », voile rouge puis noir, rugissement, puis écran de fin après 1,7 s ; la caméra se tourne vers le monstre. Pas lourds (tous les 0,8 m) et rugissements (toutes les 4 à 8 s) spatialisés : panoramique selon la direction, atténuation et filtrage passe-bas selon la distance |
| « Les sons sont encore pas ouf » | Remplacement de la quasi-totalité des sons synthétisés par des enregistrements CC0 (Kenney RPG Audio et Interface Sounds, qubodup Door Set, TinyWorlds Horror SFX, qubodup Ghost Moans) : interface, énigme résolue, mauvaise réponse, papier, ramassage, lampe, portes qui s'ouvrent (grincement + ouverture), verrou, claquements, nappes d'ambiance en boucle, grincements et râles lointains spatialisés. Pas plus présents (+3 dB). La synthèse ne sert plus que de repli et pour l'alarme, les battements, le blackout et le téléviseur |

### Septième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Refais le menu principal » (`exemple-menu.png`, `arriere-plan-menu.mp4`) | Menu cinématique : vidéo d'arrière-plan fournie (ré-encodée en MP4 H.264 + AAC 1,0 Mo et WebM VP9 + Opus 0,45 Mo, image d'attente ; d'abord sans piste audio, le son a été rétabli à la treizième passe), voile sombre à gauche, titre « HOSPITAL 404 » en image (police Impact érodée, « 404 » rouge, trace de peinture et éclaboussures, générée avec ImageMagick, `public/menu/titre.webp`), liste verticale NOUVELLE PARTIE · CONTINUER · OPTIONS · QUITTER · COMMANDES en Bebas Neue avec barre rouge sur l'entrée active, navigation souris et clavier (flèches, Entrée). CONTINUER grisé sans sauvegarde valide ; QUITTER tente de fermer l'onglet et explique sinon que le navigateur l'interdit. Les anciens boutons et le texte d'accroche sont retirés ; la barre de chargement reste |

### Huitième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Ajouter des voix, en commençant par l'introduction » | Lecteur de voix dans le moteur audio (`playVoiceSequence`) : prises décodées à la demande, lues l'une après l'autre avec 380 ms de silence, bus dédié soumis au volume et au muet, légère réverbération, interruptibles. Manifeste `src/game/voices.js` (dialogue → prises, gain de normalisation mesuré à −16 LUFS avec ffmpeg). La fenêtre de dialogue surligne la ligne en cours, propose « Passer la voix », coupe la voix à la fermeture ou en muet. Scripts ElevenLabs de tous les passages dans `docs/VOIX.md` |

### Neuvième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Trop de lumière » | Lumière ambiante et hémisphérique réduites de moitié, lumières de pièce et de couloir réduites de 35 à 45 %, luminaires moins émissifs, lampe torche moins puissante et plus étroite, exposition par défaut 1,1 → 0,95, brouillard légèrement plus dense et plus sombre |
| « Du vert au sol et sur les murs, c'est moche » | Sol du couloir, de l'accueil et de la salle d'attente : carreaux gris sales (ambientCG Tiles039) ; sol des chambres, de la radiologie et de la sécurité : terrazzo beige (Tiles110) ; laboratoire et morgue inchangés (carrelage gris usé). Soubassement des murs : peinture bleu-gris écaillée (PaintedPlaster002, teintée désaturée) à la place du vert. Textures vertes supprimées |

### Dixième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Améliore l'esthétique : textures, déplacement, objets » | **Réflexions** : environnement PMREM (pièce procédurale three.js, intensité 0,22) pour que carrelage, acier, verre et portes accrochent la lumière. **Salissures** : bande de crasse au pied de chaque mur (texture canvas), 23 taches au sol, 8 traces de mains sanglantes (canvas, usées), en plus des coulures. **Dégâts** : 7 dalles de plafond tombées avec trou noir et câbles pendants. **Mobilier** : les chaises de jardin de la salle d'attente remplacées par cinq bancs d'hôpital. **Déplacement** : lissage de la souris (~40 ms), champ de vision élargi de 6° en course, balancement latéral et vertical proportionnels à la vitesse, roulis dans les pas de côté ; tout cela désactivé par « réduire les effets gênants ». **Poursuite** : le monstre apparaît devant la porte de la morgue et joue sa transformation pendant 2,4 s avant de courir, ce qui laisse le temps de fuir après la vidéo |

### Onzième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « J'ai mis tous les MP3 » (50 prises ElevenLabs) | Manifeste `src/game/voices.js` généré automatiquement (gain d'alignement mesuré par fichier) : les 12 dialogues du jeu sont doublés ligne par ligne, plus les deux répliques de l'écran de fin (lues 2,2 s après son affichage). Effets de lecture : « haut-parleur » (bande étroite, légère saturation, écho) pour les terminaux Sainte-Catherine, le haut-parleur de la radiologie et le squatteur vu par caméra ; « enregistrement » (bande plus étroite, saturation) pour le message de Maxime et la vidéo Delmas/Vasseur. Les voix se coupent au retour au menu. Test unitaire : 50 prises référencées, une par ligne, fichiers présents, effets connus |

### Douzième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Il y a encore trop de lumière, ça doit être sombre, l'hôpital est abandonné » | Mesure in-engine (luminance moyenne de la vue, HUD exclu) en coupant les sources une à une : la **carte d'environnement** ajoutée à la dixième passe éclairait la scène comme un plafonnier (labo : 36 → 14 sans elle), bien plus que les lampes. Elle ne sert plus qu'aux reflets des surfaces brillantes (intensité 0,03 ; `envMapIntensity` élevé sur carrelage, acier et verre, très bas sur plâtre, béton et objets). **Lampes** : ambiance 0,035, hémisphère 0,09, chaque pièce ne garde qu'une source faible ou un néon mourant (−65 à −80 %), seuls 3 néons du couloir et 5 des pièces sont allumés, appliques de la galerie atténuées, panneaux et écrans moins émissifs. **Torche** : faisceau plus étroit (angle 0,33) et moins fort (15, décroissance 2) pour éclairer un cône et non toute la pièce, plus un halo de rebond très faible dans le dos. **Rendu** : exposition 0,8 (réglable 0,5–1,4), brouillard plus dense et plus noir, vignettage renforcé, seuil de bloom relevé. Luminance moyenne mesurée après : couloir 24, labo 24, accueil 25, chambres 29, morgue 24 (contre 36–45 avant) ; torche éteinte, une pièce est noire |

### Treizième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Pour le menu d'accueil, ne mute pas la musique de la vidéo d'arrière-plan » | La vidéo du menu avait été ré-encodée sans piste audio : `public/menu/arriere-plan-menu.mp4` (H.264 + AAC) et `.webm` (VP9 + Opus) sont régénérés depuis la source avec la bande-son. Composant `MenuVideo` (HUD.jsx) : lecture lancée avec le son, au volume des réglages et en respectant « Couper le son » ; si le navigateur refuse la lecture sonore automatique (aucun geste encore reçu), la vidéo démarre muette et retrouve le son au premier clic ou à la première touche, sans redémarrer. Vérifié en headless avec la politique stricte (`--autoplay-policy=user-gesture-required`) : muette avant le clic, sonore après, et les bascules du réglage « Couper le son » sont suivies |
| « Enlève ces particules comme des cubes, remplace-les par un vrai brouillard » | Les « cubes » étaient les grains de poussière (`points` sans texture : des carrés à l'écran). Supprimés et remplacés par `components/Fog.jsx` : 170 à 380 nappes de brume selon la qualité (quads instanciés orientés vers la caméra, texture canvas disque doux + bruit fractal), réparties au ras du sol dans le couloir, le passage de service et les salles, dérivant et respirant lentement. Matériau Lambert détourné dans `onBeforeCompile` : la brume est éclairée par la torche, les néons et les veilleuses (éclairage enveloppant), suit le brouillard de distance, et s'efface quand le joueur la traverse. Aucun fichier ajouté ; 60 i/s conservés en qualité élevée (headless GPU) |

### Quatorzième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Je ne veux plus les voix du narrateur, que les textes des personnages soient lus » | Toute narration retirée du scénario (`story.js`) : chaque dialogue est une suite de répliques de personnages (Thomas, Maxime, le squatteur, les terminaux, le haut-parleur, l'enregistrement de Maxime, la vidéo Delmas/Vasseur). Manifeste `voices.js` réduit aux 18 prises de personnages déjà livrées, réindexées sur les nouvelles étapes ; les 32 prises `*-narrateur-*` ne sont plus lues ni référencées (fichiers conservés). Les 36 nouvelles répliques sont scriptées « à enregistrer » dans `docs/VOIX.md` (nom de fichier, étape, balises) ; une réplique sans prise s'affiche en silence |
| « Une discussion entre deux personnages, un peu à la Animal Crossing : tu parles à la personne » | Nouveau système de dialogue en **bulle** (`Dialogue`, `HUD.jsx`) : une réplique à la fois, étiquette du personnage (couleur par voix), texte tapé à la machine dont la vitesse est calée sur la durée de la prise (`playVoiceSequence` renvoie la durée), E / Espace / Entrée / clic terminent la réplique puis passent à la suivante, compteur d'étapes, pointeur conservé. La caméra se tourne doucement vers l'interlocuteur (`focus` / `focus2` dans `story.js`, lissage dans `Player.jsx`). Les personnages (`Character.jsx`) acceptent `face` (le corps pivote vers Thomas pendant le dialogue) et `watch` (la tête — os `head` — suit Thomas s'il est devant et à moins de 7 m, et le corps se retourne à moins de 3 m). Maxime se tient à côté de Thomas pendant l'introduction, puis marche jusqu'au portail (`Walk_Relaxed`, composant `Maxime` de `World.jsx`) ; pour sa dernière réplique à la morgue, Adrien apparaît devant la porte face à Thomas, et la poursuite démarre au même endroit. Le magasin suit `dialogStep` / `dialogApplied` : les effets d'une étape sont appliqués une seule fois et dans l'ordre, même si le dialogue est sauté (`closeModal` applique le reste) |
| « Quand il te donne une clé, une animation « clé … récupérée » » | Étape `{item}` : carte papier « PIÈCE À CONVICTION » au centre (icône, rayons tournants, jingle `item`), titre « CLÉ RÉCUPÉRÉE » et nom de l'objet (`progression.ITEMS`) ; la clé du squatteur et la clé USB sont réellement accordées à cet instant (`store.grant`), l'emplacement d'inventaire se remplit en même temps ; même animation pour la fiche 203, le rapport H-404, le badge et le dossier après chaque énigme |
| « Au moment où Maxime disparaît : fond noir, plus de lumière, et bam il disparaît » | Étape `{blackout}` : voile noir total (`BlackoutVeil`), toutes les lumières, néons et appliques s'éteignent et la torche meurt (`store.blackout` lu par `Lights`, `Fixtures`, `Flashlight`), coup métallique et claquement ; 700 ms avant la fin, le portail s'ouvre et Maxime est retiré pendant le noir ; la torche revient en scintillant (animation `relight`, relais audio), puis Thomas appelle Maxime et le terminal Sainte-Catherine répond |
| « Revoir chaque pièce : textures, objets 3D » | Contrôle géométrique automatique des placements (boîte hors de la pièce, chevauchement de volumes, objet posé sans support) : corrigés le téléviseur de l'accueil à moitié hors du bureau, la chaise prise dans le comptoir (replacée derrière le bureau), les blocs-notes hors du bureau du laboratoire (sur la paillasse), le bac à déchets dans les casiers de la morgue. Ajouts par pièce : bras de radiographie suspendu au-dessus de la table (radiologie), panneaux de tête de lit avec prises et voyants (chambres), armoire à clés murale et gobelet (sécurité), plantes mortes (accueil, salle d'attente), table basse avec magazines (salle d'attente). Chaque pièce a été capturée sous deux ou trois angles pour vérification |
| « Minuteur global de 30 minutes » | `src/game/timer.js` : le temps restant se déduit du temps écoulé et des pénalités. Alertes à 5 et 1 minute, fin tragique à zéro (`end('timeout')`, non classée), une fois le dernier screamer terminé. Les anciennes sauvegardes reprennent avec au moins 5 minutes. |
| « −1 minute par screamer, erreur ou indice » | `applyPenalty` sauvegarde aussitôt. Une mauvaise réponse coûte une seule minute, screamer compris, pour que couper les screamers ne change pas le prix d'une erreur. Indices progressifs à la demande : les notes gratuites de l'énigme SQL donnaient la réponse, elles se limitent désormais à la table et aux colonnes. |
| « Option de choix de difficulté » | Panneau au lancement d'une nouvelle partie ; la difficulté est figée en jeu et enregistrée dans la sauvegarde. Le minuteur et les pénalités ne changent pas ; la fréquence des screamers, déjà réglée par la difficulté, change donc le temps réellement jouable. |
| « Plus sombre » | Mesure de luminance de la vue 3D, torche allumée, sur 11 vues : moyenne de 11,6 à 7,4 sur 255. Lumières de pièce −30 %, ambiante, hémisphérique et carte d'environnement −40 %, néons −35 %, parvis −30 %, vignette renforcée. Torche relevée de 15 à 17 pour rester l'outil principal. La qualité basse, sans post-effets, reçoit sa propre exposition pour donner le même rendu. |
| « Le dossier Objet3d remplace ce que tu as créé » | Comptoir en L (trois volumes de collision), casiers-cachettes, tables de chevet, chariots d'oxygène, coffre fermé puis ouvert, téléphone et clé USB de la morgue, scialytique au plafond : `scripts/bake-objet3d.mjs`. Les casiers sont décollés du mur de 3 cm (le soubassement traversait leur fond) ; la caméra de cachette passe juste devant la porte, car un vrai casier a des parois visibles depuis l'intérieur. Téléphone fixe, second smartphone et chat animé sont des ajouts de décor. |

### Quinzième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Le responsive du menu et du jeu sur téléphone doit être top et jouable » | Feuille `src/phone.css` : une mise en page par orientation, encoche respectée, boutons d'au moins 44 px. Le portrait n'est plus bloqué par « tourne ton téléphone » (impossible à contourner sur un iPhone à rotation verrouillée) : menu, jeu et fenêtres y fonctionnent. Champ de vision et main corrigés selon la forme de l'écran (`viewFov`, `lampPose`). |
| Commandes | Joystick flottant avec zone morte, course au-delà de l'anneau ou par bouton, regard à deux pouces, toucher pour agir, aide à la visée (`assistedTarget`), aides de premier usage, vibration sur Android, zoom et gestes du navigateur bloqués (`guardGestures`). |
| Énigmes | Clavier à l'écran (`TouchKeypad`) à la place de celui du téléphone, qui couvrait l'énigme ; document d'un côté, saisie toujours visible de l'autre. Mots-clés SQL en un seul bouton. |
| Mémoire | Mesuré en qualité basse : 2,2 Go de textures, sans compter leur copie en mémoire vive, de quoi faire planter un onglet de téléphone. Réduction avant envoi à la carte graphique (couleur 512 px, relief 256 px, ciel et atlas 1024 px) : 386 Mo. Comparaison visuelle à l'identique sur les trois chemins de chargement (ordinateur, Android par ImageBitmap, iPhone par balise image). |
| Batterie et fluidité | Aucun rendu 3D derrière le menu et l'écran de fin, ni en pause au téléphone. Trois lampes au lieu de quatre, portée de vue réduite, anticrénelage matériel, résolution adaptative calée sur 60 i/s (de 0,7 à 1,6 fois). Flou et filtres plein écran retirés. |
| Installation | `manifest.webmanifest` et balises Apple : plein écran depuis l'écran d'accueil, seule voie sur iPhone. |

### Seizième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Sur la fin, quand on récupère la clé USB et qu'on spamme, ça le fait 2 fois : le monstre apparaît, on a le SDF et le monstre en même temps » | Le rayon de visée est gelé pendant un dialogue : à sa fermeture, la cible restait « téléphone et clé USB » jusqu'au rayon suivant (100 ms), et un E de plus relançait la scène en pleine poursuite. `closeModal` oublie la cible, `interact` revérifie sa disponibilité et ignore les 500 ms qui suivent un dialogue. « Rien à portée » ne couvre plus un message affiché, comme l'objectif de la fuite. |
| « Toujours le freeze quand on passe la souris sur un objet en surbrillance et les portes » | Mesuré : jusqu'à 1 011 ms en qualité moyenne, avec des shaders compilés en jeu. Les surbrillances étaient compilées pour une sortie écran, alors qu'avec post-effets la scène se dessine dans une cible, sans tonemapping : un autre programme. `Prewarm` compile désormais pour la sortie réelle et garde les surbrillances dans son rendu de préparation. Après : 24 ms au pire, 0 shader à la visée sur les trois profils, et 128 programmes au chargement au lieu de plus de 300. |
| « Le jeu est trop sombre sur téléphone » | `PHONE_LIGHT` : exposition × 2,2 et lumières de fond × 4, vignettage réduit, sur téléphone seulement. Moyenne de 16/255 au lieu d'environ 5 ; l'ordinateur ne change pas (5,9/255). |
| « Pendant le jeu, j'entends le son de la vidéo du menu » | Non reproduit dans Chromium, où la vidéo s'arrêtait déjà en quittant le menu. Le MP4 ne figure dans aucun des 69 fichiers audio du jeu (corrélation au plus 0,23). Corrigé par précaution : arrêt et coupure explicites en quittant le menu, plus de relance après ce départ, silence quand la page passe en arrière-plan (un onglet resté au menu s'entendait par-dessus une partie). À confirmer à l'oreille. |

### Dix-septième passe (rapport de qualité du 5 novembre 2026)

Le rapport porte sur une version antérieure (56 tests, une seule fin). Chaque point a été revérifié sur le code actuel.

| Point du rapport | Constat et correction |
|---|---|
| P02, monstre près des portes | Reproduit par lecture et par mesure : pendant la fuite, le monstre franchissait la porte condamnée de la morgue alors qu'elle restait fermée à l'image, d'où sa disparition. Sa grille considère les portes ouvertes (il les enfonce) : il voyait et attrapait donc aussi le joueur à travers une porte fermée. Sans chemin connu, il filait tout droit à travers les murs. Il force désormais toute porte fermée, celle de la morgue s'ouvre le temps de son passage puis retombe pour le joueur ; `closedDoorBetween` coupe la vue et la capture. |
| P03, dialogue et cachette | Une réplique en marchant pouvait continuer depuis un casier : E faisait défiler le dialogue au lieu de faire sortir. On ne se cache plus pendant une discussion, sauf danger, et entrer dans une cachette ferme la discussion. Espace dans un casier ne fait plus sauter à la sortie. |
| P04, audio | Une porte qui bouge a maintenant une seule source de son, située dans l'espace. Avant : claquements doublés en refermant, sons à plein volume pour une porte lointaine, et rafale de portes en lançant ou reprenant une partie. Boucles et musique contrôlées sur trois cycles menu/partie, sans empilement. Le timbre reste à juger à l'oreille. |
| V01, portes | Bande photoluminescente discrète sur les montants, verte ou rouge selon le verrou. |
| V02, galerie | Petits feux au sol de part et d'autre du passage, pendant la fuite seulement. |
| V03, torche | Le faisceau compense la distance jusqu'à 3,2 m : une porte vue de près reste lisible au lieu de virer au blanc. |
| V04, screamers | « Masque » et « cheveux » avaient le menton coupé : recadrés. |
| T02, outillage | Playwright est une dépendance du projet ; `npm run check:all` démarre le serveur, trouve un navigateur installé et distingue un souci d'installation d'un échec du jeu. |
| T03, partie complète | `npm run check:playthrough` : aucune téléportation, vraies touches ou vrais événements tactiles, vraies collisions. Il a révélé un blocage que les anciens tests, qui se téléportaient, ne pouvaient pas voir : **le tiroir de l'acte II n'était accessible que par un passage de largeur quasi nulle** entre deux meubles. Une perfusion a été déplacée, et un test impose désormais de la marge pour chaque objectif. |
| T04, A03, mobilier | 192 meubles au sol contrôlés par calcul : aucun dans un mur, deux légers chevauchements corrigés, un faux positif (bureau dans le creux du comptoir en L). |
| P01, T01 | Tactile vérifié en émulation sur 6 formats, performances mesurées sur un Apple M4 Pro. **Aucun essai sur un vrai téléphone ni sur une machine modeste.** |
| A01, A02, A04, A05, A06 | Non traités : choix artistiques à arbitrer par le propriétaire. Les affiches attendent déjà leur réalisation (`docs/AFFICHES.md`). |

### Dix-huitième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Il faut un classement par rapport à tout le monde qui a joué. Les gens mettent leur nom et prénom et ça s'enregistre directement en base de données » | Fonctions Vercel `api/run.js` et `api/scores.js`, base PostgreSQL. Formulaire à la fin de toute partie, évasion ou non, entrée « Classement » au menu avec filtre par difficulté. Une seule ligne par personne, quelle que soit la façon d'écrire son nom. |
| Temps falsifiable | Le chrono tourne dans le navigateur : le serveur date le début de la partie par un jeton signé, conservé dans la sauvegarde, refuse un temps plus court que le temps écoulé, un jeton déjà utilisé et plus de 60 enregistrements par heure depuis une connexion. Un faux temps plausible reste possible après une vraie attente. |
| Panne | Sans réseau ou sans base, la partie se joue normalement et un message clair remplace le classement. |
| Tests | 14 tests sur un vrai moteur PostgreSQL embarqué (PGlite), parcours navigateur `check:leaderboard`, et le robot de la partie complète s'inscrit à la fin. Le pilote Neon lui-même ne se teste que sur une vraie base. |

### Dix-neuvième passe (retours du propriétaire)

| Retour | Correction |
|---|---|
| « Rajoute ce jumpscare » | `jumpscare.mp3` (0 dBFS en crête, le son le plus fort fourni) : déjà branché par une autre session sur le screamer « fille », avec un bus des screamers à fond et limité. Repris tel quel et vérifié. |
| « Quand on se fait attraper par le monstre, mets un screamer bien bien fort » | Nouvelle image : le visage du vrai monstre en pleine attaque, rendu par le moteur (`scripts/render-capture-scare.mjs`). 380 ms après la saisie, le temps que la caméra lève les yeux vers lui, il remplit l'écran avec `jumpscare.mp3` poussé de 6 dB avant le limiteur, un choc dans le grave, tout le reste du jeu baissé de 16 dB, et une vibration plus longue sur Android. Aussi à une capture pendant une rencontre. Le réglage « screamers » le coupe comme les autres. |
| Caméra pendant la capture | Elle fixait la poitrine du monstre (2,7 m de haut) : elle lève désormais les yeux vers son visage. |
| Mesure du son | Mesuré à la sortie réelle : capture à −4,7 dB en moyenne (plafond, comme le screamer « fille », qui partage le même son), ambiance −26,6 dB, fuite −15,2 dB. Couper le son, même en plein cri, rend tout muet. Piège de mesure : un analyseur ou la valeur d'un gain ne sont plus recalculés par Chrome quand rien ne les traverse, et affichent un état ancien ; le test lit donc chaque échantillon avec un enregistreur. |

### Vingtième passe (danseur caché du parvis)

- **Emmanuel danse derrière la voiture de droite** (`DANCER` dans `layout.js`, collision 0,6 × 0,6 m). Depuis l'arrivée, le toit de la voiture cache ses jambes : seuls sa tête et ses bras dépassent ; en avançant vers l'entrée, on le découvre en entier.
- **Danse procédurale** (`src/components/Dancer.jsx`) : le modèle n'a aucune animation. Chaque image, les os reprennent la pose en T puis tournent autour d'axes exprimés dans le repère du personnage : coudes d'abord (pliés dans la pose en T, ils suivent ensuite le bras), bras, torse, jambes. Trois figures de huit temps à 116 BPM (pointé disco, « raise the roof », bras de « running man »), fondues sur deux temps ; le corps descend quand les genoux plient pour garder les pieds au sol.
- **Coût** : 696 Ko (Draco, textures 512 px), calcul arrêté hors du parvis ou au-delà de 40 m ; `userData.beat` fige un temps pour les captures.

### Vingt et unième passe (lampe, chat OIIA, succès, prologue)

| Demande | Réalisation |
|---|---|
| « La lampe est trop basse » | Torche : intensité 17 → 45, cône 0,33 → 0,46 rad, portée 18 → 30 m (`BEAM_ON`, `BEAM_ANGLE`, `BEAM_RANGE` dans `Player.jsx`). L'atténuation près des surfaces reste en place : pas d'image brûlée contre un mur. |
| Chat « OIIA » : E pour discuter, il chante `feliz-oiia-cat.mp3` | Cible « Discuter avec le chat » (`CAT` et `INTERACTIVES` dans `layout.js`). E lance la chanson depuis le chat (son spatialisé, 13 s) ; il reste immobile au repos et tourne pendant la chanson (`Cat.jsx`), en terminant son tour. Un E de plus pendant qu'il chante ne relance rien ; la chanson s'arrête si l'on quitte la partie. |
| « Un succès de fait » | Système de succès (`achievements.js`) : enregistrés sur l'appareil, gardés d'une partie à l'autre, carte « SUCCÈS DÉBLOQUÉ » et carillon, entrée **SUCCÈS** du menu. Premier succès, secret : **OIIA OIIA**. Les 19 succès du PDF du propriétaire restent à brancher : ils demandent des conditions qui n'existent pas encore dans le jeu (quêtes secondaires, indices comptés par énigme, documents à collectionner). |
| Prologue : « j'ai mis les MP3 » | Les 4 prises de Paul sont lues carte par carte (`PROLOGUE_VOICES`), la machine à écrire suit la voix, la carte suivante ou « Passer le prologue » la coupe. |

| « Un peu avant la fin du son du chat, un gros screamer bien bien fort, à fond » | 11,5 s après le début de la chanson (13,1 s), le screamer de la capture : visage du monstre, son au plafond du limiteur, reste du jeu étouffé, chanson coupée net (`tickCatScare`, `CAT.scareMs`). Pas de screamer si l'option est désactivée ; s'il ne peut pas tomber à l'heure (énigme ouverte, pause), il est abandonné. |
| Textes des terminaux plus petits et moins gras, sans « Sainte-Catherine » | `.green-terminal` : 11 px, graisse normale, lueur réduite (10 px au téléphone). Étiquette « TERMINAL », écran d'accueil et objectif réécrits. La note de service garde le nom : Thomas le prononce dans sa prise enregistrée. |
| « Si on spam E, ça fait plusieurs fois l'énigme ou un truc » | Reproduit : devant la télé, le terminal d'accueil, la note ou le lit 203, chaque E fermait le dialogue « en marchant » et le relançait depuis le début, son compris (120 fois en 6 s). Viser l'objet dont on parle fait désormais avancer la réplique ; un objet qu'on vient de quitter (dialogue ou énigme) ne se rouvre pas avant 1,2 s ; une porte déjà ouverte ne rejoue plus son loquet (3 fois par rafale). |

Vérifié par `scripts/browser-regressions.mjs` (sections `chat`, `rafale` et `prologue`) et par quatre tests unitaires.

## 2. Architecture du code

```
src/
├── App.jsx                 Canvas (préréglages qualité), préchargement, liaison audio, garde-fou de rendu
├── main.jsx                Point d’entrée ; expose window.__game / window.__runtime pour le diagnostic
├── styles.css              Interface (menus, HUD, dossiers, journal, pause, réglages)
├── components/
│   ├── assets.js           Manifeste des ressources locales et tailles physiques des motifs
│   ├── materials.js        Matériaux PBR (useTexture), géométries à UV métriques, textures canvas (signalétique, écrans, radiographies)
│   ├── Model.jsx           Chargeur GLB (Draco local), clonage, repli procédural en cas d’erreur
│   ├── Props.jsx           Objets procéduraux : portes, matelas, perfusions, écrans, radiologie, morgue… (surfaces d'affiches remplaçables)
│   ├── signs.js            Registre des affiches fournies à la main (public/assets/signs)
│   ├── Furniture.jsx       Mobilier hospitalier procédural (lits, brancards, armoires, moniteurs, casiers…)
│   ├── Character.jsx       Personnages humains animés (GLB Innerscene, clips Idle/Jog…)
│   ├── World.jsx           Sols/plafonds, murs fusionnés par matériau, décalcomanies, luminaires, signalétique, pièces, poursuivant, lumières
│   ├── Player.jsx          Clavier (codes physiques : ZQSD = WASD), souris, verrou du pointeur, collisions par sous-pas, pas, lampe torche
│   ├── Fog.jsx             Brouillard volumétrique : nappes de brume instanciées, éclairées par la scène
│   ├── Effects.jsx         Post-traitement selon la qualité
│   └── HUD.jsx             Menu, chargement, HUD, pause, réglages, commandes, dialogues, énigmes, journal/inventaire/carte, fin
└── game/
    ├── layout.js           Plan, murs, portes, mobilier (PROPS), volumes (SOLIDS), colliders, interactifs, points de reprise, détection
    ├── modelBounds.js      Boîtes englobantes des GLB (générées)
    ├── story.js            Scénario officiel : dialogues, énigmes, validation des réponses
    ├── progression.js      Drapeaux → inventaire et journal dérivés (zéro duplication), normalisation
    ├── save.js             Sauvegarde v3 : sérialisation, validation stricte, migration, position de reprise sûre
    ├── settings.js         Réglages validés et persistés, préréglages de qualité
    ├── audio.js            Moteur Web Audio : échantillons CC0 + synthèse
    ├── sounds.js           Manifeste des échantillons (public/assets/sounds)
    ├── scares.js           Variantes de screamer
    ├── voices.js           Manifeste des voix enregistrées (public/assets/voices)
    ├── store.js            Zustand : cycle de vie, progression, pause, événements
    └── game.test.mjs       22 tests Node (plan, collisions, chemin de fuite, énigmes, progression, sauvegarde, réglages, pause)
```

### Décisions techniques

- **Collisions** : AABB 2D (murs, portes fermées, mobilier) + zones de sol autorisées. Les volumes du mobilier sont dérivés des boîtes englobantes réelles des GLB (`modelBounds.js`) et de l’orientation ; les objets posés sur une table n’ont pas de volume. Le déplacement est intégré en sous-pas de 50 ms maximum, ce qui reste stable à bas débit d’images et évite de traverser un mur de 26 cm.
- **Murs** : chaque segment produit cinq boîtes (UV en mètres) fusionnées par matériau avec `mergeGeometries` → 8 draw calls pour tous les murs. Le laboratoire et la morgue reçoivent un soubassement carrelé (Tiles133D), la galerie du béton nu.
- **Textures** : `repeat = 1 / taille physique` (ex. linoléum 1,99 m) ; cartes ARM utilisées comme `aoMap`, `roughnessMap` et `metalnessMap` ; WebP 1K pour un total de 5,2 Mo de textures et 5,8 Mo de modèles (Draco + WebP).
- **Éclairage** : 15 lumières ponctuelles (une à deux par pièce, quatre dans le couloir, deux dans la galerie), lumière hémisphérique et ambiante, lampe torche spot avec ombres (1024 px en qualité moyenne, 2048 px en élevée, aucune en basse), une ou deux lumières ponctuelles à ombres selon la qualité. Scintillement imperatif (`useFrame`), désactivable par « réduire les effets gênants ».
- **État** : `useGame` (Zustand) pour l’état réactif ; `runtime` (objet simple) pour la position, l’orientation et le verrou. `isSimRunning(state)` centralise la condition « le temps avance ».
- **Inventaire et journal** sont calculés à partir des drapeaux (`inventoryFor`, `journalFor`) : impossible d’obtenir deux clés ou deux fois la même preuve, y compris après une reprise de sauvegarde.
- **Sauvegarde** (`localStorage`, clé `hospital404.save`, version 4 : temps, pénalités, indices et difficulté) : écrite à chaque progression et toutes les 20 s (hors poursuite) ; à la lecture, types vérifiés, enchaînement des étapes normalisé, position rejetée si elle est dans un mur ou hors des sols (reprise au point sûr du chapitre), reprise pendant la poursuite remise à l’entrée de la galerie avec le chrono complet, versions 1–2 migrées (listes d’objets ignorées), JSON corrompu ignoré (le bouton « Continuer » disparaît). « Nouvelle partie » efface la sauvegarde et tout l’état transitoire.
- **Chargement** : préchargement de tous les GLB et textures dès le menu ; barre reliée à `useProgress` (gestionnaire de chargement three.js) ; un modèle illisible est remplacé par un volume simple et signalé dans les réglages ; une erreur de rendu affiche un écran explicite.
- **Verrou de la souris** : demandé au clic dans la scène ou via l’invite ; Échap (qui libère le verrou côté navigateur) déclenche la pause ; les fenêtres interactives libèrent le pointeur.
- **Clavier** : codes physiques `KeyW/KeyA/KeyS/KeyD` + flèches ; sur un clavier AZERTY, les touches Z/Q/S/D occupent ces positions physiques, donc ZQSD et WASD fonctionnent sans réglage (les valeurs `e.key` sont aussi acceptées). Le réglage « aide clavier » ne change que les libellés.

## 3. Scénario (conservé intégralement)

Hôpital Charcot, Thomas Vasseur et Maxime ; squatteur et clé ; disparition de Maxime ; message « BIENVENUE À SAINTE-CATHERINE » ; plaque « ÉLÉONORE VASSEUR — PATIENTE 203 » et inscription murale ; code **203** ; transfert vers la radiologie ; équation **3(2X − 4) + 5 = 29**, **X = 6**, coffre **0024**, protocole H-404 ; sécurité, planning A/B/C/D, chemin critique **A → B → D = 6 h**, code **0600**, caméras restaurées ; laboratoire, requête `SELECT * FROM patients WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018;`, dossier **404-EM-2018** supprimé par **A.VASSEUR**, enregistrement de Maxime ; morgue, téléphone de Maxime, clé USB **BACKUP_H404_FINAL**, vidéo Victor Delmas / Adrien Vasseur ; poursuite, portes principales verrouillées, passage secret ; **deux fins** depuis le 5 novembre 2026 : la sortie atteinte avec la clé USB donne **GOOD END — Fin libre, la vérité sort de Charcot** (Maxime attend dehors, Adrien reste sur le seuil, le dossier 404-EM-2018 arrive chez un juge ; chrono classé), la capture par Adrien donne **SAD END — Le dernier patient** (chrono non classé), qui est aussi la fin d'un minuteur écoulé.

## 4. Vérifications

Commandes exécutées sur macOS (Apple M4 Pro), Node 24.12, npm 11.6.

| Commande | Résultat |
|---|---|
| `npm test` | 27 tests, 0 échec (plan, portails, collisions mobilier, glissement, chemin de fuite libre, points de reprise, sélection par regard, énigmes, scénario, inventaire/journal, normalisation, sauvegarde (corruption, position invalide, poursuite, migration), réglages, magasin : parcours complet, pause, reprise, screamers, capture, voix de personnages, dialogues en bulle : effets appliqués une fois et dans l'ordre, blackout) |
| `npm run build` | OK — `dist/` : un bundle JS de 1,49 Mo (454 Ko gzip), CSS 18 Ko |
| `node scripts/browser-check.mjs` (Chromium headless accéléré GPU via Playwright, serveur `vite --port 5179`) | 76 vérifications réussies (dont bulle de dialogue, touche E, animation « clé récupérée », clé accordée, blackout puis portail ouvert, clé USB et poursuite) : chargement des 198 fichiers, 0 erreur console, 0 requête en échec ; déplacement ZQSD/WASD/flèches, course plus rapide que la marche, portail fermé/ouvert, mur et bureau bloquants, torche, pause et reprise (temps de jeu et chrono de fuite suspendus), réglages depuis la pause, détection de proximité réelle pour les 11 interactions, refus d’une mauvaise réponse, validation par Entrée, 4 énigmes, journal (8 preuves sans doublon), inventaire (5 puis 6 objets), carte, retour menu et « Continuer » au bon chapitre, sauvegarde v3, poursuite (bandeau, galerie ouverte, sortie par la galerie, fin par la sortie), capture par Adrien, capture par chrono, « Recommencer », sauvegarde corrompue ignorée, sauvegarde réparée avec avertissement |
| `node scripts/browser-playthrough.mjs` | Partie complète sans téléportation, au clavier jusqu'à la bonne fin et au doigt jusqu'à la capture. Un robot prouve que rien ne bloque, pas que c'est lisible ni agréable |
| `node scripts/browser-regressions.mjs` | Freeze à la surbrillance, scène de la clé USB sous une rafale, son de la vidéo du menu, luminosité, vrai monstre face aux portes, effets sonores |
| `node scripts/browser-mobile.mjs` | Parcours tactile (événements réels via CDP) sur 6 formats de téléphone, dont barres de Safari visibles : mise en page, joystick, deux pouces, boutons, énigmes au doigt, mémoire des textures, arrêt du rendu au menu et en pause, rotation en pleine partie |
| `node scripts/browser-screenshots.mjs` | Captures du rendu réel de chaque zone (`docs/screenshots/`), qualité élevée, 0 erreur console |
| `node scripts/browser-voices.mjs`, `browser-voices-all.mjs` | Dialogue d'introduction en bulle : voix de Thomas puis de Maxime (−17 dBFS), machine à écrire, E complète sans couper la voix, voix coupée au changement de réplique, muet, aucune prise de narrateur demandée ; 17/17 prises de personnages démarrent à la bonne étape avec la bonne étiquette (niveaux −6 à −20 dBFS, effets haut-parleur et enregistrement), animation d'objet (clé accordée, passage automatique), blackout (portail fermé pendant le noir, ouvert après), voix d'Adrien sur l'écran de fin, arrêt au menu |
| `node scripts/browser-audio.mjs` | Niveau audio mesuré à la sortie (analyseur Web Audio) : ambiance ≈ −28 dB RMS, pas −10 à −18 dBFS, interface −18, papier −11, verrou −11, énigme résolue −15, porte −15, monstre −10, blackout −9, poursuite −8, screamer −8 ; muet → silence ; volume 30 % → −6 dB |

Pour rejouer les vérifications navigateur : `npm i -D playwright && npx playwright install chromium`, lancer `npm run dev -- --port 5179` puis `npm run check:browser` (le script accepte `URL=` et `QUALITY=`). Si Playwright réclame un navigateur absent du cache, `CHROMIUM=<chemin d'un Chrome/Chromium>` force l'exécutable (par exemple `~/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`). Les deux erreurs console « 404 » de chaque parcours étaient la requête automatique de `/favicon.ico` ; une icône vide est maintenant déclarée dans `index.html`.

### Limites de la vérification

- Le verrouillage réel du pointeur et la souris ne peuvent pas être testés en headless : les scripts simulent l’état « verrouillé » via le magasin ; la rotation de la caméra à la souris a été vérifiée par le code mais pas par un test automatisé.
- Le son est vérifié par mesure de niveau (script `browser-audio.mjs`), pas à l’oreille : le timbre et l’équilibre restent à apprécier sur de vraies enceintes. Correctif important apporté après la première livraison : les sons d’événements ne jouaient jamais car `useGame.subscribe(sélecteur, handler)` exige le middleware `subscribeWithSelector` de Zustand 5 ; les niveaux ont aussi été remontés de 15 à 25 dB et un compresseur protège la sortie.
- **Le parcours téléphone est testé en émulation Chromium, jamais sur un vrai appareil** : vrais événements tactiles, formats et encoche simulés, mais ni Safari iOS réel, ni puce de téléphone, ni budget mémoire réel. Fréquence d'images, chauffe, retour arrière par le bord de l'écran et plantages éventuels restent à constater sur de vrais téléphones.
- Performances mesurées uniquement sur une machine Apple Silicon (60 i/s à 1280×720 en qualité basse en headless) ; sur une carte intégrée plus modeste, utiliser la qualité « Basse ».

## 5. Compromis de performance

### Passe d'optimisation du 6 novembre 2026 (« ça doit tourner sur n'importe quoi »)

Mesuré avec `npm run check:perf` (résolution figée, image non limitée), sur la carte graphique et en rendu logiciel SwiftShader (approximation d'une très petite machine, 960 × 540). Pire vue :

| | Avant | Après |
|---|---|---|
| Basse, carte graphique | 6,7 ms (fuite : 799 appels, 1,5 M triangles) | 2,4 ms (290 appels, 235 k) |
| Élevée, carte graphique | 8,9 ms (parvis : 4 M triangles) | 3,8 ms (1,3 M) |
| Basse, rendu logiciel, hall | 1 095 ms (1 i/s) | 64 ms (16 i/s) |
| Minimale (nouvelle), rendu logiciel, hall | — | 37 ms (27 i/s) |

Ce qui a compté, par ordre d'effet :
1. **Verre « transmission »** de l'horloge murale et du groupe électrogène : un seul à l'écran et three.js redessinait tout le décor opaque une seconde fois (592 → 333 appels dans le hall). Remplacé à la volée par une transparence simple (`Model.jsx`).
2. **Modèles allégés** (`scripts/optimize-models.mjs`, meshoptimizer, erreur bornée à 2 mm par mètre, vérifiés avant/après côte à côte) : 1,1 M → 436 k triangles au total ; Emmanuel 72 800 → 16 700, la torche 34 000 → 9 600. Le meuble à tiroirs et le banc en bois sont laissés intacts (reflets ondulés).
3. **Parvis caché pendant la fuite** sauf depuis le hall : la forêt et le décor extérieur étaient dessinés au fond de l'hôpital.
4. **Reflets de la pièce procédurale** (`scene.environment`, intensité 0,018, invisibles à l'œil) : échantillonnés à chaque pixel, retirés en Basse et Minimale. **Brume au sol** : 170 → 60 nappes en Basse, aucune en Minimale. **Relief des textures** coupé en Minimale.
5. **Terrain** de la forêt : grille resserrée près de la clairière, lâche au loin (115 k → 24 k triangles). Rochers, souches et troncs éclaircis en Basse et Minimale.
6. **Processeur** : les objets fusionnés par `StaticBatch` ne recalculent plus leur position à chaque image (1,1 → 0,7 ms avec un processeur bridé ×4). Le filtre CSS de luminosité du canevas (une passe de composition par image) est remplacé par un gain dans le post-traitement, ou par l'exposition sans post-traitement. L'ombre de la torche s'arrête à 16 m.
7. **Anticrénelage** du canevas retiré en Moyenne : avec le post-traitement, la scène est dessinée dans une cible sans multiéchantillonnage, il ne servait à rien.

Réglages ajoutés : qualité **Auto** (choisie au premier lancement d'après la carte graphique annoncée : rendu logiciel ou deux cœurs → Minimale, puce intégrée Intel/Mali/Adreno ou téléphone → Basse, sinon Moyenne ; abaissée d'un cran si le jeu reste sous 24 i/s alors que la résolution automatique est au plancher), **Minimale**, **résolution du rendu** (Auto, 50 à 100 %), **limite d'images** (illimité, 60, 30) et **compteur d'images par seconde**. Une qualité enregistrée par une version précédente est respectée (pas de passage en automatique). Tous les paramètres de qualité sont regroupés dans `QUALITY_PRESETS` (`settings.js`).

### Avant cette passe

- Draw calls : murs fusionnés (8), sols/plafonds (~24), ~100 objets GLB clonés (chacun 1 à 3 matériaux), objets procéduraux ; environ 400 appels par image en vue dégagée, ~250 k triangles.
- Ombres : uniquement la lampe torche (+1 à 2 lumières ponctuelles en qualité élevée) ; les luminaires sont émissifs sans source d’ombre.
- Lumières ponctuelles : 15 au total, ce qui reste raisonnable pour un rendu forward sur bureau ; la qualité « Basse » supprime ombres et post-traitement et fixe le DPR à 1.
- Textures : 1K WebP (5,2 Mo) ; modèles : Draco + WebP (5,8 Mo) ; chargement initial total ≈ 11 Mo + 1,5 Mo de JS.
- Mini-carte : SVG statique, seul le marqueur bouge (sans re-rendu React).

## 6. Limites restantes et pistes

- Les personnages sont des humains CC0 d'Innerscene (base MakeHuman) : corrects mais pas photoréalistes (visages génériques, vêtements de ville, pas de capuche ni d'expression). Le poursuivant suit un chemin fixe (morgue → galerie → accueil → entrée) à 2,1 m/s ; sans IA de navigation.
- Pas d’éclairage indirect précalculé (lightmaps) : l’indirect est simulé par la lumière hémisphérique et l’occlusion des textures.
- Les polices web (Google Fonts) sont facultatives ; pour un déploiement totalement hors ligne, les héberger dans `public/`.
- Le bundle JS unique (1,5 Mo) pourrait être découpé (three/postprocessing) pour accélérer le premier affichage.
- Téléphone : le premier chargement télécharge environ 55 Mo et prépare plus de 200 programmes graphiques ; il n'y a pas de cache hors ligne (service worker). Un chargement progressif par pièce le raccourcirait nettement.

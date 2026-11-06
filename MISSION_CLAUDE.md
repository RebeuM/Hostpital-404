# Mission : améliorer HOSPITAL 404 en un jeu 3D professionnel

Tu es un ingénieur senior en jeux vidéo et un directeur technique spécialisé dans les jeux 3D sur navigateur. Tu dois réaliser les modifications dans ce projet, pas simplement proposer un plan. Le propriétaire te confie l’implémentation et les vérifications.

## 1. Comprendre et respecter le projet

- Lis `README.md`, le scénario fourni dans `docs/`, les éventuelles instructions du dépôt et les fichiers existants dans `src/`.
- Pars de la base existante : React, Vite, Three.js, React Three Fiber, Drei, Postprocessing et Zustand. Cette pile convient au projet ; évite une migration de moteur sans bénéfice démontré.
- Fais un audit rapide des défauts visuels, techniques et de gameplay, puis commence directement les améliorations.
- Travaille uniquement dans le dossier de ce projet et, si nécessaire, dans un dossier temporaire. Ne modifie pas les réglages globaux de la machine. Ne déploie pas, ne publie pas et ne pousse pas de commit distant.
- Prends les décisions techniques courantes de façon autonome. Demande une précision uniquement lorsqu’elle est indispensable.

## 2. Objectif de qualité

Transformer la base en une expérience d’horreur et d’enquête FPS réaliste, cohérente, immersive et jouable du début à la fin. Le rendu doit ressembler à un hôpital abandonné crédible, avec une direction artistique soignée et des performances adaptées à un navigateur de bureau.

Privilégie les proportions, les matériaux, l’éclairage et la composition des décors. Ne cherche pas à masquer une scène pauvre avec une obscurité excessive, du grain ou du bloom. Ne promets pas un niveau AAA ou un photoréalisme que le résultat ne démontre pas.

## 3. Scénario à conserver

Le scénario officiel fourni dans le projet fait autorité. Préserve notamment :

- L’hôpital Charcot, Thomas Vasseur et Maxime.
- Le squatteur qui donne une clé, puis la disparition de Maxime.
- Les chambres des patients et le code **203**.
- Le dossier d’Éléonore Vasseur et son transfert vers la radiologie.
- L’équation **3(2X − 4) + 5 = 29**, la solution **X = 6**, puis le coffre **0024** et le protocole H-404.
- La sécurité, le chemin critique **A → B → D**, les **6 heures**, le code **0600** et la restauration des caméras.
- Le laboratoire et la requête SQL prévue dans le scénario : `SELECT * FROM patients WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018;`.
- Le dossier **404-EM-2018** supprimé par **A.VASSEUR**.
- La morgue, la clé USB, Victor Delmas et Adrien Vasseur ; Adrien est le squatteur.
- La poursuite par le passage secret, le retour à l’entrée et la fin **SAD END — Le dernier patient**.

Ne remplace pas ces éléments par un autre scénario et ne rends pas les énigmes insolubles lors de la refonte.

## 4. Textures et objets 3D sous licence adaptée

Recherche et intègre réellement des ressources externes adaptées à un rendu réaliste :

- Textures PBR de carrelage, plâtre dégradé, béton, métal oxydé, bois et tissu.
- Modèles 3D crédibles pour compléter le mobilier et les objets de l’hôpital : armoires, chaises, bureaux, éclairages, matériel médical ou accessoires compatibles avec le décor.
- Préfère les formats GLB/glTF pour les modèles et les textures de résolution raisonnable, généralement 1K ou 2K selon leur usage.

Sources à examiner en priorité :

- Poly Haven : https://polyhaven.com/ ; licence officielle : https://polyhaven.com/license
- ambientCG : https://ambientcg.com/ ; licence officielle : https://docs.ambientcg.com/license/

Vérifie la licence de chaque ressource retenue. Privilégie **CC0**, utilisable et redistribuable avec le jeu. Une ressource simplement présentée comme « gratuite » ne suffit pas. Si tu utilises une autre licence, vérifie explicitement qu’elle permet cet usage et inclus les mentions requises.

Télécharge les ressources dans `public/assets/` et utilise des chemins locaux. Aucun hotlink ni téléchargement d’asset tiers ne doit être nécessaire pendant une partie. Respecte les conditions des API utilisées, y compris les crédits éventuels. Ne télécharge pas des bibliothèques entières ni des fichiers inutilement lourds.

Crée `docs/ASSETS.md` indiquant, pour chaque ressource réellement intégrée : nom, auteur si disponible, URL source, licence, chemin local et éventuelles transformations. Préserve les fichiers de licence nécessaires.

Si une source est inaccessible, utilise une autre source autorisée ou un fallback procédural et documente honnêtement la limite. Ne présente pas un objet procédural comme un modèle externe téléchargé.

## 5. Décor et rendu

- Améliore l’architecture : épaisseur des murs, encadrements de portes, plinthes, plafonds, conduites, luminaires, signalétique et différences entre les secteurs.
- Ajoute une usure cohérente : salissures, traces d’humidité, peinture abîmée, papiers et accessoires placés avec intention.
- Applique correctement les matériaux PBR : colorimétrie, normales, rugosité, UV et échelle physique des motifs. Évite les répétitions trop visibles.
- Soigne les lits, chariots, bureaux et équipements existants ; complète-les avec les ressources téléchargées lorsque cela améliore le résultat.
- Travaille l’éclairage : contraste chaud/froid maîtrisé, lumière indirecte simulée ou précalculée si pertinent, ombres stables, lampe torche utile, points de repère lisibles.
- Utilise les effets avec modération : tone mapping, bloom léger, vignettage et brouillard. La scène et les indices doivent rester lisibles.
- Évite de multiplier les sources d’ombres dynamiques et les effets coûteux. Réutilise géométries et matériaux, et utilise l’instancing lorsque pertinent.

## 6. Gameplay et expérience utilisateur

- Vérifie les déplacements FPS, les commandes AZERTY/QWERTY, la souris, la course et la lampe torche.
- Rends les collisions fiables : murs, portes et objets importants ne doivent pas être traversables. Évite les blocages du joueur et les passages involontaires entre secteurs verrouillés.
- Les interactions doivent être claires, à portée raisonnable, et cohérentes avec ce que le joueur regarde.
- Fiabilise l’ouverture des portes et la progression du début à la fin, y compris la poursuite et la fin.
- Crée une interface française soignée : titre, objectifs, journal, inventaire, carte et énigmes lisibles.
- Ajoute un chargement lié à l’état réel des ressources et une gestion compréhensible des erreurs.
- Ajoute une pause qui suspend effectivement les chronomètres et la progression temporelle du jeu.
- Gère correctement le verrouillage de la souris, Échap, le retour à la partie et les dialogues. Le pointeur doit être disponible pour les interfaces interactives.
- Propose des réglages utiles : qualité graphique, volume, sensibilité et réduction des effets gênants si pertinent.
- Ajoute une sauvegarde locale et une reprise robustes : versionnement, validation des données, gestion d’une sauvegarde corrompue, absence de duplication d’objets ou de preuves, position de reprise sûre.
- Le bouton « Nouvelle partie » doit réellement réinitialiser la progression et les états transitoires.
- Évite les mises à jour React à chaque image pour des valeurs qui peuvent rester dans les références ou le moteur de rendu.

## 7. Audio

Améliore l’ambiance sonore et ajoute des retours utiles : pas, portes, interactions et événements narratifs. Utilise des sons locaux sous licence vérifiée ou de la synthèse Web Audio de qualité adaptée.

Respecte les règles d’autoplay : démarre l’audio après un geste utilisateur. Les réglages de volume doivent fonctionner et les ressources audio doivent être libérées proprement. N’impose pas un son brutal ou un volume excessif.

## 8. Vérifications obligatoires

- Exécute `npm test` et corrige les erreurs.
- Exécute `npm run build` et corrige les erreurs.
- Ajoute des tests utiles pour les mécanismes modifiés à risque : sauvegarde/reprise, progression, pause, collisions ou énigmes. Évite les tests qui ne font que recopier l’implémentation.
- Si un navigateur automatisable est disponible, vérifie le chargement, les erreurs console, les ressources manquantes, le lancement d’une partie, la pause, les réglages et la reprise. Inspecte aussi visuellement le rendu 3D réel.
- Vérifie autant que possible le parcours complet, les déverrouillages et la poursuite. Un build réussi ne prouve pas que le jeu est jouable ou visuellement réussi.
- Si certaines vérifications ne sont pas possibles, explique précisément lesquelles ; ne les annonce pas comme réussies.

## 9. Livrables

1. Le jeu amélioré dans les fichiers du projet, avec les assets nécessaires intégrés localement.
2. `docs/ASSETS.md` avec les sources et licences des ressources utilisées.
3. `docs/IMPLEMENTATION.md` avec les changements réels, les commandes et résultats de vérification, les compromis de performance et les limites restantes.
4. Le `README.md` actualisé pour refléter les commandes, réglages et fonctionnalités réellement disponibles.

Termine par un bilan bref en français et les commandes pour lancer le jeu. Continue l’implémentation jusqu’à obtenir un résultat concret, compilable et vérifié dans les limites de l’environnement.

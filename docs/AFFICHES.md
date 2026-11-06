# Affiches, panneaux et écrans à réaliser

**Plus aucun panneau n'est généré** : un panneau sans image n'apparaît pas (seuls les tableaux blancs restent, vierges). Les textes et dimensions ci-dessous servent de cahier des charges.

## Comment livrer

1. Produire l'image au **ratio exact** indiqué (largeur / hauteur en mètres), en **WebP** (qualité 85) ou PNG. Résolution conseillée : **1024 px sur le grand côté** (2048 px pour les grands tableaux et le graffiti). Pas de transparence sauf mention.
2. La nommer `<identifiant>.webp` et la déposer dans `public/assets/signs/`.
3. Déclarer l'identifiant dans `src/components/signs.js` :
   ```js
   export const SIGN_IMAGES={ 'poster-hygiene':'poster-hygiene.webp', 'tableau-equation':'tableau-equation.png' }
   ```
4. Lancer `npm run dev` : le panneau apparaît. Si le fichier manque ou est illisible, le panneau reste absent et une erreur est inscrite dans la console (pas de plantage).

Licence : fournir des créations originales ou des éléments CC0 ; noter la source dans `docs/ASSETS.md`.

## Direction artistique

- Hôpital public français des années 1990-2000, fermé en 2018, abandonné depuis : panneaux de signalétique émaillés ou plastifiés, affiches de prévention ministérielles, notes de service dactylographiées, tableaux blancs feutrés.
- Usure réelle : jaunissement, coins décollés, traces d'humidité, rouille sur les fixations, poussière. Pas de sang ni d'éléments « fantastiques » sur les documents administratifs : l'horreur vient de ce qu'ils révèlent.
- Couleurs du jeu : vert hôpital (#3f8a5c / #b9c8b5), papier jauni (#cfc2a5), encre (#1a1411), rouge tampon (#8c1711). Typo : Special Elite (machine à écrire) et Anton pour les titres, ou équivalent.
- Textes obligatoires : les mentions en **gras** doivent être lisibles telles quelles, elles font partie des énigmes et du scénario.

## Signalétique du couloir (plaques directionnelles, fond vert sombre, lettres claires)

| Identifiant | Emplacement | L × H (m) | Ratio | Texte obligatoire | Style |
|---|---|---|---|---|---|
| `dir-accueil` | couloir, mur ouest près de l'entrée | 1.20 × 0.75 | 1.60 | **ACCUEIL** · Hôpital Charcot | plaque émaillée, flèche |
| `dir-attente` | couloir, mur est | 1.20 × 0.75 | 1.60 | **SALLE D'ATTENTE** · Merci de patienter | plaque émaillée |
| `dir-patients` | couloir, mur ouest | 1.20 × 0.75 | 1.60 | **PATIENTS** · 201 202 203 204 | plaque émaillée |
| `dir-radiologie` | couloir, mur est | 1.20 × 0.80 | 1.50 | **RADIOLOGIE** · Réservé au personnel | plaque, pictogramme radiations |
| `dir-securite` | couloir, mur ouest | 1.15 × 0.80 | 1.44 | **SÉCURITÉ** · Vidéosurveillance | panneau d'avertissement jaune/rouge |
| `dir-h404` | couloir, mur est | 1.25 × 0.80 | 1.56 | **H-404** · Zone expérimentale · Accès réglementé | panneau d'avertissement |
| `dir-morgue` | couloir, mur ouest, fond | 1.15 × 0.82 | 1.40 | **MORGUE** · Accès limité | panneau d'avertissement |
| `warn-defense-entrer` | couloir, mur est, fond | 1.00 × 1.20 | 0.83 | **DÉFENSE D'ENTRER** · Personnel autorisé uniquement | panneau vertical |
| `sign-secteur-patients` | au-dessus du portail à double battant (z = 8) | 1.60 × 0.50 | 3.20 | **SECTEUR PATIENTS** · Accès contrôlé | bandeau métallique |
| `suspendu-accueil-attente` | panneau suspendu au plafond, face entrée | 1.70 × 0.45 | 3.78 | ← ACCUEIL · SALLE D'ATTENTE → | signalétique suspendue |
| `suspendu-secteurs` | même panneau, autre face | 1.70 × 0.45 | 3.78 | SECTEUR PATIENTS · RADIOLOGIE · SÉCURITÉ ↑ | signalétique suspendue |
| `bande-acces-restreint` | bandeau vertical à côté de chaque porte de service (×7, même image) | 0.30 × 1.00 | 0.30 | **ACCÈS RESTREINT** (texte vertical) | bande jaune/noire, rouille |
| `sign-sortie-condamnee` | double porte vitrée de l'entrée | 0.80 × 0.50 | 1.60 | **SORTIE CONDAMNÉE** | panneau vissé, chaînes |
| `plaque-accueil` … `plaque-morgue` | petite plaque à côté de chaque porte (7 fichiers : `plaque-accueil`, `plaque-attente`, `plaque-patients`, `plaque-radio`, `plaque-security`, `plaque-lab`, `plaque-morgue`) | 0.80 × 0.50 | 1.60 | nom de la salle (ACCUEIL, SALLE D'ATTENTE, CHAMBRES 201–204, RADIOLOGIE, SÉCURITÉ, LABORATOIRE H-404, MORGUE) · CHARCOT | plaque de porte |

## Affiches de prévention et documents (papier, fixés au mur)

| Identifiant | Emplacement | L × H (m) | Ratio | Texte obligatoire | Style |
|---|---|---|---|---|---|
| `poster-hygiene` | couloir, mur est (z = 12) | 0.90 × 1.15 | 0.78 | **HYGIÈNE** — Lavez-vous les mains | affiche de prévention années 2000, jaunie |
| `poster-silence` | couloir, mur ouest (z = 32) | 0.90 × 1.15 | 0.78 | **SILENCE** — Service de nuit | affiche |
| `poster-urgences` | salle d'attente, mur nord | 1.30 × 1.15 | 1.13 | **URGENCES** — En cas de danger composez le 15 | affiche ministérielle |
| `poster-examens` | radiologie, mur sud | 1.20 × 1.20 | 1.00 | **EXAMENS** — Radiologie · Patients | affiche informative (préparation à l'examen) |
| `accueil-admissions` | accueil, mur nord, au-dessus du comptoir | 2.00 × 0.65 | 3.08 | **ACCUEIL** — Informations patients · Admissions | bandeau |
| `note-de-service` | salle d'attente, mur est — **interactive** (le joueur la lit) | 0.95 × 1.20 | 0.79 | **NOTE DE SERVICE** — Archivage Sainte-Catherine — Direction ; corps de texte libre (ancien logiciel d'archivage, dossiers déplacés dans un secteur isolé) ; annotation manuscrite au crayon « Ne jamais confier les sauvegardes à l'équipe de nuit » | note dactylographiée punaisée |
| `tableau-chambres` | chambres, mur nord | 1.50 × 1.10 | 1.36 | **TABLEAU DES CHAMBRES** — BERNARD · VASSEUR · LAURENT · MARTIN (sans numéros : c'est l'énigme) | tableau d'affectation, étiquettes mélangées |
| `graffiti-reponses` | chambres, mur nord | 3.40 × 1.70 | 2.00 | « **Les réponses se trouvent parfois sous vos yeux. Encore faut-il savoir regarder.** » | inscription peinte/griffée directement sur le mur, **PNG avec transparence** |
| `sign-poste-securite` | sécurité, mur sud | 1.60 × 0.60 | 2.67 | **POSTE DE SÉCURITÉ** — Charcot · Surveillance | plaque |
| `warn-risque-biologique` | laboratoire, mur sud | 1.20 × 1.20 | 1.00 | **RISQUE BIOLOGIQUE** — Équipement obligatoire | panneau, pictogramme biohazard |
| `warn-protocole-h404` | laboratoire, mur nord | 1.45 × 1.20 | 1.21 | **PROTOCOLE H-404** — Expérimentations clandestines — Confidentiel | affiche interne tamponnée CONFIDENTIEL |
| `feuille-protocole` | laboratoire, feuille posée sur la paillasse | 0.42 × 0.30 | 1.40 | **PROTOCOLE H-404 — EXPÉRIMENTATIONS CLANDESTINES** ; liste de patients dont **Éléonore Vasseur** | feuille A4 paysage, tachée |
| `warn-chambre-froide` | morgue, mur nord | 1.30 × 1.15 | 1.13 | **CHAMBRE FROIDE** — Risque biologique | panneau |
| `sign-morgue-archives` | morgue, mur sud | 1.60 × 0.60 | 2.67 | **MORGUE** — Décès 2018 · Dossiers archivés | plaque |

## Étiquettes et plaques

| Identifiant | Emplacement | L × H (m) | Ratio | Texte obligatoire | Style |
|---|---|---|---|---|---|
| `plate-201` … `plate-204` | au-dessus des quatre lits, mur ouest des chambres (4 fichiers) | 0.50 × 0.26 | 1.92 | **201**, **202**, **203**, **204** | plaque métallique numérotée |
| `plate-eleonore` | au-dessus du lit 203 — **lue par le joueur** | 0.90 × 0.30 | 3.00 | **ÉLÉONORE VASSEUR — PATIENTE 203** | plaque rouillée, lettres gravées |
| `etiquette-tiroir` | armoire à tiroirs des chambres (énigme du code 203) | 0.50 × 0.20 | 2.50 | **TIROIR SÉCURISÉ** | étiquette plastique |
| `etiquette-systeme` | bureau de la sécurité (énigme 0600) | 0.44 × 0.20 | 2.20 | **SYSTÈME DÉSACTIVÉ** | étiquette collée sur le pupitre |

## Tableaux blancs (fond blanc, feutre)

| Identifiant | Emplacement | L × H (m) | Ratio | Texte obligatoire |
|---|---|---|---|---|
| `tableau-equation` | radiologie, mur nord | 2.30 × 1.35 | 1.70 | **3(2X − 4) + 5 = 29** — « Pour ouvrir le coffre, multipliez la valeur de X par quatre. Le résultat doit être saisi sur quatre chiffres. » (ne pas écrire la solution) |
| `tableau-planning` | sécurité, mur nord | 2.50 × 1.40 | 1.79 | **PROJET H-404 — RÉORGANISATION DES INSTALLATIONS** ; cartes de tâches : **A Diagnostic électrique 2 h (aucune dépendance) · B Remplacement du générateur 3 h (après A) · C Réactivation des caméras 1 h (après A) · D Test des accès sécurisés 1 h (après B et C)** ; consigne « remettre les interventions dans le bon ordre, identifier le chemin critique, calculer sa durée » (ne pas écrire 0600) |

## Radiographies (émissives, sur négatoscope)

| Identifiant | Emplacement | L × H (m) | Ratio | Contenu |
|---|---|---|---|---|
| `radio-1`, `radio-2`, `radio-3` | radiologie, mur est (3 fichiers) | 0.62 × 0.78 | 0.79 | radiographies de thorax / crâne / bassin, étiquette CHARCOT — RADIO n, fond bleu nuit |
| `radio-negatoscope` | radiologie, négatoscope lumineux (s'allume après l'énigme 203) | 1.10 × 0.90 | 1.22 | radiographie de thorax annotée **VASSEUR E. / 2018**, flèche sur une anomalie |

## Images du screamer

| Fichier | Taille | Contenu |
|---|---|---|
| `public/assets/scare/adrien-1.webp` | 1024 × 1024 | visage d'Adrien très proche, éclairé par en dessous, regard fixe |
| `public/assets/scare/adrien-2.webp` | 1024 × 1024 | même visage déformé / de biais, plus sombre |
| `public/assets/scare/maxime.webp` | 1024 × 1024 | Maxime, visage blême, regard vide |
| `public/assets/scare/patiente.webp` | 1024 × 1024 | la patiente du lit 201 vue de dessus, drap, pieds nus |
| `public/assets/scare/corps.webp` | 1024 × 1024 | le corps de la table d'autopsie, vu depuis les pieds |
| `public/assets/scare/chat.webp`, `chat-2.webp` | 1024 × 1024 | image fournie par le propriétaire (chat hurlant), brute et teintée |

Elles sont affichées plein écran (recadrage `cover`) pendant 1,2 à 1,6 s avec flash, zoom, stroboscope, glitch, négatif ou surgissement selon la variante (`src/game/scares.js`) ; pas de texte, sauf la variante « terminal » générée par le code. Les versions actuelles sont des captures du modèle 3D retravaillées : des illustrations dédiées au même nom de fichier les remplacent directement.

## Hors périmètre de ce document

Écrans (caméras de sécurité, terminaux), téléviseur de l'accueil, étiquettes des bacs à déchets et du distributeur : générés par le code et jugés suffisants. Le fond du menu (`public/charcot-night.webp`) peut être remplacé par une illustration dédiée au même nom de fichier (1672 × 941 px ou plus, même ratio).

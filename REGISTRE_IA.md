# Registre IA — HOSPITAL 404

Ce registre liste chaque usage d'un outil d'intelligence artificielle dans le projet : l'outil, ce qu'il a produit, où se trouve le résultat et ce que l'équipe a vérifié. Les lignes marquées _À COMPLÉTER_ doivent être remplies par l'équipe, qui seule sait comment certains fichiers ont été créés.

## Résumé

| Domaine | Outil d'IA | Part de l'IA | Contrôle humain |
|---|---|---|---|
| Code du jeu | Claude Code (Anthropic, modèles Claude Opus) | Forte : écriture et correction du code, des tests et des scripts de vérification, sur instructions de l'équipe | Consignes, choix de jeu, tests en jeu, relecture et validation de chaque passe |
| Documentation | Claude Code | Forte : README, LICENCES, docs/ASSETS.md, docs/IMPLEMENTATION.md, docs/VOIX.md, ce registre | Relecture, compléments (équipe, licences) |
| Voix des personnages | ElevenLabs | Totale pour le son ; textes écrits par l'équipe | Choix des voix, écoute de chaque prise |
| Images des objets d'inventaire et des documents | _À COMPLÉTER_ | _À COMPLÉTER_ | _À COMPLÉTER_ |
| Images des screamers, panneaux, vidéo du menu | _À COMPLÉTER_ | _À COMPLÉTER_ | _À COMPLÉTER_ |
| Scénario et énigmes | _À COMPLÉTER (IA ou non)_ | _À COMPLÉTER_ | _À COMPLÉTER_ |

## Détail des usages

### 1. Développement du jeu — Claude Code

- **Outil :** Claude Code, assistant de programmation d'Anthropic, utilisé dans le terminal sur le dépôt.
- **Période :** _À COMPLÉTER (dates de début et de fin)_.
- **Ce qu'il a fait :** écriture de la scène 3D (React Three Fiber), de l'interface, de la logique des énigmes, de la sauvegarde, de l'audio, du monstre, du classement en ligne ; recherche et intégration de ressources CC0 et CC BY avec vérification de leur licence ; tests Node et parcours automatisés dans le navigateur (Playwright).
- **Ce que l'équipe a fait :** scénario officiel, consignes de départ (`MISSION_CLAUDE.md`), retours après chaque passe (une vingtaine, voir `docs/IMPLEMENTATION.md`), choix artistiques, ressources fournies, tests de jeu.
- **Vérification :** `npm test` (tests automatiques), `npm run check:all` (compilation et partie complète dans Chromium), parties jouées par l'équipe et par un testeur (rapport de qualité du 5 novembre 2026).
- **Traces :** historique Git, `docs/IMPLEMENTATION.md`.

### 2. Voix — ElevenLabs

- **Outil :** ElevenLabs (synthèse vocale).
- **Résultat :** `public/assets/voices/*.mp3`, environ 50 prises, dont les 4 cartes du prologue lues par Paul (`prologue-paul-*.mp3`).
- **Entrée :** textes et indications de jeu d'acteur écrits pour chaque réplique dans `docs/VOIX.md`.
- **Vérification :** écoute de chaque prise par l'équipe ; synchronisation avec le texte testée par `npm run check:voices-all`.
- **Droits :** selon les conditions d'utilisation du compte ElevenLabs de l'équipe (_À COMPLÉTER : offre gratuite ou payante, l'offre gratuite impose une mention « ElevenLabs »_).

### 3. Images des objets et des documents

- **Fichiers :** `public/assets/items/` (clé, fiche patiente 203, rapport H-404, badge, dossier 404-EM-2018, clé USB, contenu de la fiche et du rapport), sources dans `images_objets_inventaire/` et `contenue-objet/`.
- **Outil :** _À COMPLÉTER (ex. ChatGPT / DALL·E, Midjourney, création à la main…)_.
- **Prompt ou méthode :** _À COMPLÉTER_.
- **Retouches :** redimensionnement à 256 px pour l'inventaire (fait par Claude Code) ; _autres retouches à compléter_.

### 4. Autres visuels et sons fournis par l'équipe

Screamers (`public/assets/scare/`), panneaux (`public/assets/signs/`), vidéo du menu (`public/menu/`), musique : _À COMPLÉTER — préciser pour chacun s'il a été généré par IA (outil, date) ou trouvé sur un site (lien, licence)._ Voir aussi la section « Licence à confirmer » de [LICENCES.md](LICENCES.md).

## Ce qui n'a pas été fait par IA

- Les modèles 3D, textures et sons tiers listés dans `docs/ASSETS.md` sont des œuvres d'auteurs humains, sous licence CC0 ou CC BY ; l'IA les a seulement cherchés, téléchargés et optimisés.
- _À COMPLÉTER : ce que l'équipe a créé entièrement elle-même._

## Engagements (à valider par l'équipe)

- Aucune donnée personnelle ni mot de passe n'a été fourni aux outils d'IA.
- Chaque contenu généré a été relu ou écouté par un membre de l'équipe avant d'être intégré.
- Les licences des ressources tierces ont été vérifiées à la source, pas déduites par l'IA ; les cas incertains sont signalés dans LICENCES.md.

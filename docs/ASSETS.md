# Ressources externes intégrées (`public/assets/`)

Toutes les ressources ci-dessous sont publiées sous licence **CC0 1.0 Universal** (domaine public) par leurs auteurs via Poly Haven ou ambientCG. La licence autorise l’usage, la modification et la redistribution, y compris dans un jeu commercial, sans attribution obligatoire ; les crédits sont donnés ici par courtoisie.

- Poly Haven — licence : <https://polyhaven.com/license> (« All assets … are licensed as CC0 »). Fichiers téléchargés via l’API officielle `api.polyhaven.com` (glTF 1K et textures JPG 1K).
- ambientCG — licence : <https://docs.ambientcg.com/license/> (« All ambientCG assets are provided under the Creative Commons CC0 1.0 Universal License »). Fichiers téléchargés via l’API v2 (`ambientcg.com/get?file=<ID>_1K-JPG.zip`).
- Texte de la licence : <https://creativecommons.org/publicdomain/zero/1.0/> (copie locale : `public/assets/LICENSE-CC0.txt`).

Aucune ressource n’est chargée depuis un serveur tiers pendant une partie : tout est servi depuis `public/assets/` (et le décodeur Draco depuis `public/draco/`, extrait de la bibliothèque three.js, licence MIT).

## Modèles 3D (Poly Haven, glTF → GLB optimisé)

Transformation commune : `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024` (512 px pour les petits objets marqués *), ce qui produit un GLB unique par modèle avec géométrie Draco et textures WebP. Dimensions, échelle (mètres) et matériaux d’origine conservés.

| Modèle | Auteur(s) | Source | Fichier local | Taille | Usage dans le jeu |
|---|---|---|---|---|---|
| Binder Notebook* | DaDrood | <https://polyhaven.com/a/binder_notebook> | `public/assets/models/binder_notebook.glb` | 114 Ko | classeurs de dossiers |
| Cardboard Box 01* | Rahul Chaudhary | <https://polyhaven.com/a/cardboard_box_01> | `public/assets/models/cardboard_box_01.glb` | 127 Ko | cartons |
| Chemistry Set | Jiří Ptáček | <https://polyhaven.com/a/chemistry_set> | `public/assets/models/chemistry_set.glb` | 437 Ko | verrerie de la paillasse du laboratoire |
| Classic Laptop | Arrangemonk | <https://polyhaven.com/a/classic_laptop> | `public/assets/models/classic_laptop.glb` | 291 Ko | ordinateurs portables anciens : terminal Sainte-Catherine, radiologie, sécurité, laboratoire, morgue |
| Clipboard* | ProgrammerOnCoffee | <https://polyhaven.com/a/clipboard> | `public/assets/models/clipboard.glb` | 74 Ko | porte-blocs sur les lits |
| Drawer Cabinet | Ulan Cabanilla | <https://polyhaven.com/a/drawer_cabinet> | `public/assets/models/drawer_cabinet.glb` | 206 Ko | armoires à tiroirs, dont le tiroir sécurisé de l’énigme 203 |
| Fire Alarm* | Slinc | <https://polyhaven.com/a/fire_alarm> | `public/assets/models/fire_alarm.glb` | 94 Ko | déclencheurs d’alarme incendie |
| Industrial Caged Sconce | Ulan Cabanilla | <https://polyhaven.com/a/industrial_caged_sconce> | `public/assets/models/industrial_caged_sconce.glb` | 429 Ko | appliques grillagées de la galerie secrète |
| Industrial Storage Cart | Jule Bielitz | <https://polyhaven.com/a/industrial_storage_cart> | `public/assets/models/industrial_storage_cart.glb` | 285 Ko | chariots médicaux |
| Korean Fire Extinguisher 01* | UM JOORIN | <https://polyhaven.com/a/korean_fire_extinguisher_01> | `public/assets/models/korean_fire_extinguisher_01.glb` | 213 Ko | extincteurs |
| Medical Box* | Ulan Cabanilla | <https://polyhaven.com/a/medical_box> | `public/assets/models/medical_box.glb` | 103 Ko | boîtes médicales |
| Metal Office Desk | Ulan Cabanilla | <https://polyhaven.com/a/metal_office_desk> | `public/assets/models/metal_office_desk.glb` | 159 Ko | bureaux d’accueil, des chambres, de la radiologie, de la sécurité, paillasses du laboratoire, bureau de la morgue |
| Metal Stool 01* | Ulan Cabanilla | <https://polyhaven.com/a/metal_stool_01> | `public/assets/models/metal_stool_01.glb` | 115 Ko | tabourets (chambres, radiologie, laboratoire, morgue) |
| Mounted Fluorescent Lights | Ulan Cabanilla | <https://polyhaven.com/a/mounted_fluorescent_lights> | `public/assets/models/mounted_fluorescent_lights.glb` | 180 Ko | luminaires fluorescents du couloir et des pièces (certains éteints) |
| Office Notepads* | Ulan Cabanilla | <https://polyhaven.com/a/office_notepads> | `public/assets/models/office_notepads.glb` | 21 Ko | blocs-notes sur les bureaux |
| Old Bed Frame | Luca B | <https://polyhaven.com/a/old_bed_frame> | `public/assets/models/old_bed_frame.glb` | 479 Ko | lits métalliques des chambres, de la radiologie, du laboratoire et du couloir (matelas et draps procéduraux ajoutés) |
| Plastic Monobloc Chair 01 | Kuutti Siitonen | <https://polyhaven.com/a/plastic_monobloc_chair_01> | `public/assets/models/plastic_monobloc_chair_01.glb` | 252 Ko | chaises de la salle d’attente et du couloir |
| Portable Generator | James Ray Cock | <https://polyhaven.com/a/portable_generator> | `public/assets/models/portable_generator.glb` | 531 Ko | générateur portable de la salle de sécurité (énigme du planning) |
| Power Box 01 | Rico Cilliers, Yann Kervran | <https://polyhaven.com/a/power_box_01> | `public/assets/models/power_box_01.glb` | 306 Ko | armoire électrique de la salle de sécurité |
| School Chair 01 | Ethan Place | <https://polyhaven.com/a/SchoolChair_01> | `public/assets/models/SchoolChair_01.glb` | 195 Ko | chaises de bureau |
| Steel Frame Shelves 01 | James Ray Cock | <https://polyhaven.com/a/steel_frame_shelves_01> | `public/assets/models/steel_frame_shelves_01.glb` | 163 Ko | rayonnages métalliques (accueil, sécurité, laboratoire) — placé avec un facteur 0,1 car le fichier source est en centimètres |
| Television 01 | Gabriel Radić | <https://polyhaven.com/a/Television_01> | `public/assets/models/Television_01.glb` | 206 Ko | téléviseur de l’accueil (parasites) |
| Trashbag* | Benny Weimer | <https://polyhaven.com/a/trashbag> | `public/assets/models/trashbag.glb` | 111 Ko | sacs poubelle |
| Vintage Microscope* | Luis José Fernández Rodríguez | <https://polyhaven.com/a/vintage_microscope> | `public/assets/models/vintage_microscope.glb` | 163 Ko | microscope du laboratoire |
| Wall Clock* | PierreB3D | <https://polyhaven.com/a/wall_clock> | `public/assets/models/wall_clock.glb` | 69 Ko | horloges murales |
| Wet Floor Sign 01* | Fran Calvente | <https://polyhaven.com/a/WetFloorSign_01> | `public/assets/models/WetFloorSign_01.glb` | 44 Ko | panneaux « sol glissant » |
| Wheelchair 01 | Garreth Dean | <https://polyhaven.com/a/wheelchair_01> | `public/assets/models/wheelchair_01.glb` | 413 Ko | fauteuils roulants (accueil, salle d’attente, chambres, morgue, couloir) |
| Worn Metal Rack | Luca B | <https://polyhaven.com/a/worn_metal_rack> | `public/assets/models/worn_metal_rack.glb` | 229 Ko | étagères usées (sécurité, laboratoire, morgue) |

## Textures PBR (Poly Haven, JPG 1K → WebP 1K)

Transformation commune : conversion `cwebp` (qualité 82 couleur / 85 normale / 80 ARM), cartes conservées : `diff` (couleur sRGB), `nor` (normale OpenGL), `arm` (R = occlusion ambiante, G = rugosité, B = métal). La taille physique du motif (`dimensions` de l’API) pilote la répétition à l’échelle réelle (voir `src/components/assets.js`).

| Texture | Auteur(s) | Source | Dossier local | Motif | Usage |
|---|---|---|---|---|---|
| Concrete Floor Worn 001 | Dimitrios Savva, Rico Cilliers | <https://polyhaven.com/a/concrete_floor_worn_001> | `public/assets/textures/concrete_floor_worn_001/` | 3.0 m | sol de la galerie secrète |
| Concrete Wall 006 | Dario Barresi, Charlotte Baglioni | <https://polyhaven.com/a/concrete_wall_006> | `public/assets/textures/concrete_wall_006/` | 2.0 m | parois de la galerie secrète |
| Worn Planks | Dimitrios Savva | <https://polyhaven.com/a/worn_planks> | `public/assets/textures/worn_planks/` | 1.4 m | main courante en bois des murs |
| Worn Tile Floor | Dimitrios Savva | <https://polyhaven.com/a/worn_tile_floor> | `public/assets/textures/worn_tile_floor/` | 2.0 m | sols carrelés des chambres, radiologie, sécurité, laboratoire, morgue |

## Textures PBR (ambientCG, JPG 1K → WebP 1K)

Les coulures (Leaking004) sont rendues en mélange multiplicatif. Transformation : conversion `cwebp` ; la carte `arm` est assemblée avec ImageMagick (R = AmbientOcclusion ou blanc, G = Roughness, B = Metalness ou noir) pour partager le même chargeur que les textures Poly Haven. Les autres fichiers des archives (Displacement, .blend, .usdc, .mtlx…) ne sont pas conservés.

| Texture | Source | Dossier local | Usage |
|---|---|---|---|
| PaintedPlaster002 | <https://ambientcg.com/a/PaintedPlaster002> | `public/assets/textures/PaintedPlaster002/` | soubassement peint bleu-gris écaillé des murs (couloir et pièces) ; couleur désaturée à 38 % (ImageMagick `-modulate`) |
| Tiles133D | <https://ambientcg.com/a/Tiles133D> | `public/assets/textures/Tiles133D/` | carrelage mural dégradé du laboratoire et de la morgue |
| Metal009 | <https://ambientcg.com/a/Metal009> | `public/assets/textures/Metal009/` | acier brossé (tables et tiroirs de la morgue, huisseries) |
| Metal021 | <https://ambientcg.com/a/Metal021> | `public/assets/textures/Metal021/` | panneaux des portes métalliques (acier oxydé, traces de coulures) |
| Fabric001 | <https://ambientcg.com/a/Fabric001> | `public/assets/textures/Fabric001/` | matelas, draps et oreillers |
| Leather032 | <https://ambientcg.com/a/Leather032> | `public/assets/textures/Leather032/` | cuir usé (réserve pour variantes de sièges) |
| Leaking004 | <https://ambientcg.com/a/Leaking004> | `public/assets/textures/Leaking004/` | décalcomanie de coulures d’humidité sur les murs (couleur + opacité → WebP RGBA 512 px) |
| Tiles039 | <https://ambientcg.com/a/Tiles039> | `public/assets/textures/Tiles039/` | sol en carreaux gris sales du couloir, de l’accueil et de la salle d’attente |
| Tiles110 | <https://ambientcg.com/a/Tiles110> | `public/assets/textures/Tiles110/` | sol en terrazzo beige des chambres, de la radiologie et de la sécurité (teinté) |
| Plaster007 | <https://ambientcg.com/a/Plaster007> | `public/assets/textures/Plaster007/` | partie haute des murs (vieux plâtre à peinture écaillée), deux teintes couloir / pièces |
| OfficeCeiling001 | <https://ambientcg.com/a/OfficeCeiling001> | `public/assets/textures/OfficeCeiling001/` | plafond en dalles acoustiques du couloir, de l’accueil et de la salle d’attente |
| OfficeCeiling005 | <https://ambientcg.com/a/OfficeCeiling005> | `public/assets/textures/OfficeCeiling005/` | plafond en dalles acoustiques (dalles manquantes) des autres pièces |

## Personnages 3D (Innerscene, Free Parts Library — CC0)

Source : bibliothèque gratuite d'Innerscene, <https://www.innerscene.com/tools/library/3d-parts/tag/people>. Chaque fiche porte la mention : « Public domain (CC0). Free to use, modify and redistribute for any purpose, including commercially, with no credit required. » Les corps, squelettes et peaux proviennent des assets CC0 MakeHuman/MPFB ; les animations sont des boucles originales (sans capture de mouvement). Fichiers téléchargés via `https://www.innerscene.com/api/library/<slug>/download` (GLB).

Transformation : `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024 --simplify false` (textures 4K/2K réduites à 1K, géométrie Draco, squelette et clips conservés). Les personnages animés partagent un même squelette et sept clips : Idle_Standing, Walk_Relaxed, Walk_Brisk, Jog, Run, Walk_Carry, Sit_Stand.

| Personnage | Fiche source (slug) | Fichier local | Taille | Usage dans le jeu |
|---|---|---|---|---|
| Sam — Locomotion collection (homme, tenue décontractée, 7 clips) | `locomotion-collection-sam-3d-person-animated-dc23800f` | `public/assets/models/person_sam.glb` | 1,9 Mo | Le squatteur (Adrien Vasseur) à l'accueil (Idle_Standing, vêtements assombris) et le poursuivant pendant la fuite (Jog) |
| Jordan — Locomotion collection (homme, tenue sport, 7 clips) | `locomotion-collection-jordan-3d-person-animated-911f1584` | `public/assets/models/person_jordan.glb` | 2,1 Mo | Maxime devant le portail du secteur patients, puis derrière la vitre de l'entrée pendant la fuite (Idle_Standing) |
| Carlos — lying flat (homme allongé, statique) | `carlos-3d-person-lying-flat-85f45ccb` | `public/assets/models/person_carlos_lying.glb` | 0,8 Mo | Corps sous un drap sur une table de la morgue |
| Mei Lin — lying flat (femme allongée, statique) | `mei-lin-3d-person-lying-flat-4444172e` | `public/assets/models/person_meilin_lying.glb` | 0,6 Mo | Patiente sous un drap dans le lit 201 |

Les fiches individuelles téléchargées au cours de la recherche (Sam relaxed walk `732f1206`, Sam run `fa008c06`, Maya idle `22b686d6`) ne sont pas intégrées : la collection « Locomotion » les regroupe.

## Monstre de la poursuite (fourni par le propriétaire)

`veritytm.glb` (racine du projet, export Sketchfab d'un modèle « verity », 21 000 triangles, 2 textures 1K, 8 clips : CIdle, CWalk, Idle, Kill, MonsterTransform, MonsterTransformReverse, Run, Walk) → `public/assets/models/monster.glb` (1,2 Mo). Transformations : matériaux « unlit » convertis en matériaux éclairés (rugosité 0,9, sans métal) pour réagir aux lumières du décor, noms de clips simplifiés, compression Draco, textures WebP 1K ; orientation (−90°) et échelle (×1,1) appliquées dans `World.jsx`. **Licence et origine à confirmer par le propriétaire** (modèle apporté par lui, non issu d'une source CC0 vérifiée ici).

## Squatteur (fourni par le propriétaire — CC BY 4.0, crédit obligatoire)

« Homeless man » par doublesob, <https://sketchfab.com/3d-models/homeless-man-7125635fc7ca4aca84fa0c260dc1b3d6>, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **Modèle modifié :** livré figé en T et sans squelette, `scripts/bake-squatter.mjs` lui baisse les bras, ajoute un squelette et une animation de repos, puis le compresse (`public/assets/models/squatter_homeless.glb`). Le crédit est affiché au menu principal. Il remplace « Sam » (Innerscene), dont le fichier reste dans le dossier des modèles sans être chargé.

## Maxime (fourni par le propriétaire — CC BY 4.0, crédit obligatoire)

« Teenage boy » par barathudaya27, <https://sketchfab.com/3d-models/teenage-boy-51ee38c36d414685ad304ccbe3b86185>, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **Modèle modifié :** riggé mais figé en T et sans animation, `scripts/bake-maxime.mjs` lui transfère les clips de repos et de marche de « Jordan » (Innerscene, CC0) avec des corrections de posture, puis le compresse (`public/assets/models/maxime_teen.glb`). Le crédit est affiché au menu principal. Il remplace « Jordan », dont le fichier reste dans le dossier des modèles sans être chargé.

« Emmanuel M. » par jamray747, <https://sketchfab.com/3d-models/emmanuel-m-0ede7d2d38454ad190f643315196ff26>, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Fourni par le propriétaire (`emmanuel_m..glb`, rangé dans `raw/emmanuel_m.glb`, 17,9 Mo, 72 800 triangles, 74 os, aucune animation). **Modèle modifié :** pieds posés au sol et centré, textures WebP 512 px, Draco (`scripts/bake-emmanuel.mjs`, 696 Ko). La danse n'existe pas dans le fichier : elle est calculée os par os par `src/components/Dancer.jsx`. Placé derrière la voiture bâchée de droite du parvis (`DANCER` dans `layout.js`).

## Mobilier hospitalier (Sketchfab — CC BY 4.0, crédit obligatoire)

36 modèles téléchargés via l'API Sketchfab (jeton du propriétaire dans `~/.sketchfab-token`, recherche `downloadable=true&license=by` ; aucun modèle hospitalier utile n'existe en CC0 sur la plateforme), tous sous [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **Modèles modifiés :** `scripts/sketchfab-props.mjs` (config `scripts/sketchfab-props.json`) les met à l'échelle en mètres, les recentre (sol à y=0), les tourne pour que la longueur suive l'axe z et découpe certains ensembles en plusieurs fichiers ; puis `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024` (`--simplify-ratio 0.25` pour l'appareil de radiographie, 100 000 triangles à l'origine). Poids total : ≈ 13 Mo pour 45 fichiers. Les auteurs sont crédités au menu principal (lien vers `public/credits.html`, qui liste titres, auteurs et liens). Ils remplacent une partie du mobilier procédural de `src/components/Furniture.jsx` (bancs, brancards, radiateurs, distributeur, éviers, armoires, frigo, chariots, moniteur) et les stockages/table couverte de la morgue, l'appareil de radiographie et les matelas du laboratoire (`World.jsx`).

| Modèle source | Auteur | Fichiers (`public/assets/models/`) | Lien |
|---|---|---|---|
| « X-ray machine FREE » | 66md66 | `xray_machine` | <https://sketchfab.com/3d-models/04a12382881b472aa6a8e8b8e4db7e50> |
| « Body Bag_Surgical Table_12_MB » | ahmagh2e | `surgical_table_bloody` | <https://sketchfab.com/3d-models/5e8ffc65c2d645eab4df67fd5c9955b2> |
| « morgue refrigerator-12MB » | ahmagh2e | `morgue_fridge` | <https://sketchfab.com/3d-models/3d582d8eabed42619ace30ab639c6e66> |
| « Sink mtal - 18MB » | ahmagh2e | `sink_metal_long` | <https://sketchfab.com/3d-models/e256921222054841af199dbfb1e1b5b0> |
| « Outdoor Vending Machines » | caboose3d | `vending_coke_a`, `vending_coke_b` | <https://sketchfab.com/3d-models/d0b81fdb4e514859bfcc95165144e8c7> |
| « Medical Cabinet » | conndavis20 | `medical_cabinet_glass` | <https://sketchfab.com/3d-models/f47142facdf14e1e92f91f916940cfb9> |
| « Hospital Trolley » | creative_beast | `hospital_trolley` | <https://sketchfab.com/3d-models/6fa14ba57e324d288b5a42632f19d97f> |
| « radiator old worn dirty » | dnte | `radiator_panel` | <https://sketchfab.com/3d-models/6d257d3075f74f7fabdf0b3b94301e6f> |
| « Adjustable Bedside Table » | EDIIIC | `overbed_table` | <https://sketchfab.com/3d-models/e3ef6fd54af440efa31984214dd6f11d> |
| « Game Prop: Mental Asylum Gurney » | eymori | `asylum_gurney` | <https://sketchfab.com/3d-models/43736bb6a0b64fe8a824542bdbace6bc> |
| « Horror Furniture Pack-Wooden Chairs Broken Bench » | Fevzi_Beydili | `bench_broken`, `bench_wood`, `bench_wood_back` | <https://sketchfab.com/3d-models/b94a96c2da6d47e593c857da07ee69e9> |
| « Mop Bucket & Safety Cones | Props » | gamico | `mop_bucket` | <https://sketchfab.com/3d-models/54a8250e1de8426e9cf2bf35fd099a10> |
| « Old Rusty Radiator - Game Ready Asset » | gravity_3d | `radiator_rust` | <https://sketchfab.com/3d-models/4a900e41cf4748eaafe77977a2d1ffa3> |
| « Hospital Stretcher » | gunnarcorrea | `hospital_stretcher` | <https://sketchfab.com/3d-models/a74239ec0dfe454a906c339071855d87> |
| « Old Medicine Cabinet » | jimthekiwifruit | `medicine_cabinet_old` | <https://sketchfab.com/3d-models/9a092f5d0f3a4373a21fe30bafbe5488> |
| « Hospital Curtain » | kann4u44 | `privacy_screen` | <https://sketchfab.com/3d-models/71a2237e87284bef85a5bce57599ecff> |
| « Old Rusty Ceiling Fan » | krishnoghosh230 | `ceiling_fan` | <https://sketchfab.com/3d-models/2d98789affce49ae93769b3a555ab559> |
| « Fridge » | lagesnpiet | `fridge_old_white` | <https://sketchfab.com/3d-models/c383302237e140668e0a52a9df1a10de> |
| « Retro CRT Computer (1990s Desktop PC) » | MadeByYeshe | `retro_pc` | <https://sketchfab.com/3d-models/ea9faf1298d24497b916c27a4ea38636> |
| « Hospital bed » | Mathilde Beuvin (mat_bvn) | `hospital_bed` (voir plus bas) | <https://sketchfab.com/3d-models/f2b3a71f48d040069fb144f76a1180d9> |
| « Medical Trash Bin » | Mountrise | `medical_bin` | <https://sketchfab.com/3d-models/46c76d82c3344b278df08757d3c078b4> |
| « Locker » | neverfollow81 | `lockers_blue` | <https://sketchfab.com/3d-models/41f55ae53fca41c3b861cebe5244b5dd> |
| « Medical Console » | OliverTriplett | `medical_console` | <https://sketchfab.com/3d-models/89065e109790417191467cfececf2c7c> |
| « Rusty Filing Cabinet » | pamikoe | `filing_cabinet_rusty` | <https://sketchfab.com/3d-models/619484b78fbe449ea5c0cdb68e8f2bd6> |
| « Waiting Chair » | ranahacs | `waiting_chairs` | <https://sketchfab.com/3d-models/3bd109dcaaab463b92e747ad6f95f46f> |
| « Low Poly Old Rusty Fridge - Game Ready » | rashad-brahimli | `fridge_rusty_open` | <https://sketchfab.com/3d-models/a964c61ec1fd402abdbf29a7f65933e0> |
| « Loker » | readmftah517 | `locker_rusty_open` | <https://sketchfab.com/3d-models/9df4faaa9ca448a1b02c8c1384a22c16> |
| « Oxygen Tank » | rohitparadkar | `oxygen_tank_lying` | <https://sketchfab.com/3d-models/42bd334c4fe247ed94e103f4fe157635> |
| « IV Stand and Bag » | Somar52 | `iv_stand_bag` | <https://sketchfab.com/3d-models/a93a8e70ecd2459c99e7812c6e09b88c> |
| « Drip stand » | sousinho | `drip_stand` | <https://sketchfab.com/3d-models/8405f7c926e242bb8078c9a37f6cebfe> |
| « Monitor with heart rate » | sousinho | `vitals_monitor` | <https://sketchfab.com/3d-models/2ef959da5773478383bc46e3bcbc3e8a> |
| « Paper debris » | sousinho | `paper_debris_a`, `paper_debris_b`, `paper_debris_c`, `paper_debris_d` | <https://sketchfab.com/3d-models/457624d2526744d8890d50d811ef45d7> |
| « Vintage First Aid Kit » | TheDarknesss | `first_aid_kit` | <https://sketchfab.com/3d-models/e325557d18ba4bf091b2ea430f6e5ba1> |
| « [v2] Laboratory biohazard box » | usedm | `biohazard_box` | <https://sketchfab.com/3d-models/ed61290e4af24ad28fe2a298967f7b70> |
| « Autopsy table » | windofglass | `autopsy_table`, `wrapped_corpse` | <https://sketchfab.com/3d-models/c56bae8cd45747fda74e2f0180f494a0> |
| « Deadbodies » | windofglass | `morgue_table_a`, `morgue_table_b`, `morgue_table_c` | <https://sketchfab.com/3d-models/93e6bd64835e4ae785d0d204ba3e901a> |

## Lit et porte (fournis par le propriétaire)

Fichiers d'origine dans `raw/`, préparés par `scripts/bake-bed-door.mjs`.

- **Lit, `hospital_bed.glb`** : « Hospital bed » par Mathilde Beuvin (mat_bvn), <https://sketchfab.com/3d-models/hospital-bed-f2b3a71f48d040069fb144f76a1180d9>, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **Modifié :** remis d'équerre (tourné de 17° dans le fichier), tête vers −z, hauteur ×1,3 (matelas à 53 cm au lieu de 41). 0,80 × 0,89 × 2,00 m, 126 Ko. C'est le seul lit du jeu.
- **Porte, `hospital_door.glb`** : « Hospital door » par 4dimension, <https://sketchfab.com/3d-models/hospital-door-8fbf4d24642e410ca2d645ae99a02398>, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). **Modifiée :** échelle ×1,1, recentrée sur son bâti, découpée en `door_frame`, `door_leaf_a` et `door_leaf_b` (origine sur la charnière), simplifiée de 15 843 à 1 248 triangles. 2,25 × 2,63 m, 270 Ko. **Partage à l'identique :** cette version modifiée doit rester diffusée sous CC BY-SA 4.0. Les vitres des hublots sont ajoutées par le code (`Props.jsx`). Les murs se resserrent autour d'elle et un linteau la surmonte (`DOOR_W`, `DOOR_H`, `LINTELS` dans `layout.js`).

## Objets du dossier `Objet3d/` (fournis par le propriétaire)

Sources (164 Mo, non versionnées, voir `.gitignore`) préparées par `scripts/bake-objet3d.mjs` : repère du jeu, compression Draco et WebP. Poids total : ≈ 2.9 Mo pour 15 fichiers. `hospital_trolley.glb` est le chariot déjà intégré plus haut, `hospital_bed.glb` et `hospital_door.glb` sont le lit et la porte de la section précédente.

Sous [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), crédit obligatoire, tous modifiés :

| Modèle source | Auteur | Fichiers (`public/assets/models/`) | Lien |
|---|---|---|---|
| « Bedside Table » | HASSAN | `bedside_cabinet` | <https://sketchfab.com/3d-models/bedside-table-c2886b535b2c432c81b937db872e0dc6> |
| « Cell phone » | alixor22 | `maxime_phone` | <https://sketchfab.com/3d-models/cell-phone-aaafe329f84248a1b2389952c21fd685> |
| « Game Locker » | amanpatel9725 | `locker_black` | <https://sketchfab.com/3d-models/game-locker-3c2bea736afa481aa2e74a568655b831> |
| « Metal School Lockers » | Zixel | `locker_blue_closed`, `locker_blue_open` | <https://sketchfab.com/3d-models/metal-school-lockers-7f1460adacd346a4a68c3e5f7a5d0d43> |
| « Oiiaioooooiai Cat!!!!! » | xman | `meme_cat` | <https://sketchfab.com/3d-models/oiiaioooooiai-cat-4e7be0cf4b9f426d83c0617b3ab61700> |
| « OutThere Reception Desk » | Gavin_McAllister | `reception_desk` | <https://sketchfab.com/3d-models/outthere-reception-desk-1dd504c110b24a3495272abede00c126> |
| « Oxygen Cylinder » | Alexander Troianovskyi | `oxygen_cart` | <https://sketchfab.com/3d-models/oxygen-cylinder-e7419671f8124cab870d7a1a4d68b180> |
| « Phone » | schmoldt.art | `landline_phone` | <https://sketchfab.com/3d-models/phone-eaa0a0cbce964b2099b955f5ea241eee> |
| « Safe » | Gnossiennes | `safe_closed`, `safe_open` | <https://sketchfab.com/3d-models/safe-7296e077b09b4d298d99d758ba57d710> |
| « SCHOOL LOCKER » | Lee Studio | `locker_row` | <https://sketchfab.com/3d-models/school-locker-1ea07e4cb6dc404fa5fa597a0211474d> |
| « Smart Phone (School Project) » | Ole Gunnar Isager | `smartphone_old` | <https://sketchfab.com/3d-models/smart-phone-school-project-5134059a9eb844c1b106e4cb7eafd88c> |

**Licence à confirmer par le propriétaire :** `surgical_lamp` (`Lampe_Chirurgicale_Hopital_Abandonne_LowPoly.glb`) et `usb_backup` (`Cle_USB_BACKUP_H404_FINAL.glb`) ne portent ni auteur ni licence dans leur fichier.

## Panneaux de signalétique (fournis par le propriétaire)

Images du dossier `panneaux/`, détourées et converties en WebP dans `public/assets/signs/`, déclarées dans `src/components/signs.js` : accueil, panneau suspendu du hall, secteur patients, radiologie, sécurité, H-404, morgue, défense d'entrer. **Origine et licence à confirmer** avant diffusion.

## Lampe torche (fournie par le propriétaire)

`Flashlight.fbx` (Cinema 4D, sans texture), fourni par le propriétaire du projet ; **licence non vérifiée, à confirmer avant toute diffusion**. Converti en `public/assets/models/flashlight.glb` : pièces regroupées en `body`, `bezel`, `button` et `glass`, optique vers -Z, longueur 0,24 m, compression Draco. Les matériaux sont définis dans `src/components/Player.jsx`. 

## Bras du joueur (OpenGameArt — CC0)

« fps arms (rigged only) », <https://opengameart.org/content/fps-arms-rigged-only>, licence CC0 indiquée sur la page. Fichier local : `public/assets/models/arm_right.glb` (45 Ko). `scripts/bake-arm.mjs` et `scripts/arm-pose.json` plient les doigts autour de la lampe, gardent le bras droit et figent la pose dans les sommets ; puis `gltf-transform optimize --compress draco --texture-compress webp --texture-size 1024 --simplify false`.

## Vent et nuit (Freesound — CC0)

Licence CC0 vérifiée sur chaque fiche. Sources : aperçus HQ (MP3) publics.

| Prise | Auteur | Source | Fichier local | Usage |
|---|---|---|---|---|
| Wind through Pine Trees by a lake | Moonlight Dancer | <https://freesound.org/s/264083/> | `public/assets/sounds/ambient/wind-pines.mp3` | vent dans les pins, portion de 42 s sans passant, boucle par fondu enchaîné |
| Howling Wind Ambience | DBlover | <https://freesound.org/s/405601/> | `public/assets/sounds/ambient/wind-howl.mp3` | couche des rafales |
| owl.wav | Anthousai | <https://freesound.org/s/398734/> | `public/assets/sounds/ambient/owl-1.mp3` | hibou lointain |
| Owl Hoot | Breviceps | <https://freesound.org/s/465697/> | `public/assets/sounds/ambient/owl-2.mp3` | hibou lointain |

## Musique et transformation (fournis par le propriétaire)

`public/assets/sounds/music/musique-arriere-plan-jeu.mp3` (musique de fond, en boucle) et `public/assets/sounds/fx/transformation-monstre-squatteur.mp3` (joué quand Adrien se transforme). **Origine et licence à confirmer.**

## Grognements des énigmes (fourni par le propriétaire)

`public/assets/sounds/ambient/brvhrtz-zmbie-brvhrtz-622560.mp3`, joué pendant les énigmes (trois passages, distance et direction au hasard). **Source et licence à confirmer** : le nom du fichier évoque un téléchargement Pixabay de l'auteur « brvhrtz », dont la licence n'est pas la CC0.

## Bruits de pas (Freesound — CC0)

Licence CC0 vérifiée sur chaque fiche. Sources : aperçus HQ (MP3) publics des fiches, découpés pas à pas (`ffmpeg`, passe-haut 45 Hz, niveau harmonisé, fondu de sortie), mono 44,1 kHz, 112 kb/s.

| Prise | Auteur | Source | Fichiers locaux | Usage |
|---|---|---|---|---|
| Footsteps_Boots_Tile_Mono | Nox_Sound | <https://freesound.org/s/530588/> | `public/assets/sounds/footsteps/tile-1…10.mp3` | marche sur lino et carrelage |
| Footsteps on concrete | florianreichelt | <https://freesound.org/s/459964/> | `public/assets/sounds/footsteps/concrete-1…4.mp3` | marche dans la galerie secrète |
| Footsteps while running on wood | florianreichelt | <https://freesound.org/s/459965/> | `public/assets/sounds/footsteps/run-1…17.mp3` | course |

## Extérieur : forêt, parvis et textures (Poly Haven, CC0)

Toutes les ressources viennent de <https://polyhaven.com> (licence CC0), téléchargées via `api.polyhaven.com/files/{id}` en 1K, puis réduites avec `gltf-transform optimize --compress draco --texture-compress webp`.

| Ressource | Identifiants Poly Haven | Fichiers locaux | Traitement |
|---|---|---|---|
| Sapins | `fir_tree_01` | `public/assets/models/fir_a…c.glb`, `public/assets/textures/forest/fir_impostor.webp` | 7,8 M de triangles au départ. `scripts/bake-forest.mjs` garde le tronc et les branches (allégés), remplace les aiguilles par des plaques tirées du scan et rend deux vues de chaque variante pour les arbres lointains |
| Sous-bois | `grass_medium_02`, `fern_02`, `shrub_04`, `rock_moss_set_01`, `tree_stump_01`, `dry_branches_medium_01`, `dead_tree_trunk_02` | `public/assets/models/` | allégés avec `--simplify` |
| Parvis | `covered_car`, `street_lamp_01`, `concrete_road_barrier_02`, `metal_trash_can`, `Barrel_01`, `rusted_wheel_rim_01`, `wooden_crate_01` | `public/assets/models/` | allégés si besoin |
| Ciel | `kloppenheim_02_puresky` | `public/assets/textures/sky/night.webp` | HDR 4K ramené en image, sert aussi aux reflets des vitres et du sol mouillé |
| Textures | `road_damaged`, `worn_asphalt`, `cracked_concrete_wall`, `forest_leaves_02`, `dirt`, `worn_brick_wall`, `dark_brick_wall`, `rusty_metal_02` | `public/assets/textures/<id>/` | JPG 1K → WebP |

## Sons enregistrés (CC0, OpenGameArt et Kenney)

Conversion commune : `ffmpeg` → mono, 44,1 kHz, MP3 112 kb/s, suppression des silences initiaux, fondus, normalisation `loudnorm` (−18 LUFS pas, −13/−14 LUFS cris). Chargés après le premier clic ; si un fichier manque, la synthèse Web Audio prend le relais.

| Son | Auteur | Source | Licence (page OpenGameArt / Kenney) | Fichiers locaux | Usage |
|---|---|---|---|---|---|
| RPG Audio — doorOpen_1/2, creak1–3, bookFlip1–3, metalLatch, metalClick, handleSmallLeather | Kenney | <https://kenney.nl/assets/rpg-audio> | CC0 | `public/assets/sounds/fx/door-open-*.mp3`, `creak-*.mp3`, `paper-*.mp3`, `latch.mp3`, `click.mp3`, `pickup.mp3` | ouverture des portes, grincements lointains, lecture de documents, porte verrouillée, lampe torche, ramassage |
| Interface Sounds — click_001, confirmation_001, error_004, glitch_001 | Kenney | <https://kenney.nl/assets/interface-sounds> | CC0 | `public/assets/sounds/fx/ui-*.mp3` | interface, énigme résolue, mauvaise réponse |
| Door Open, Door Close Set — DoorClose01–03 | qubodup | <https://opengameart.org/content/door-open-door-close-set> | CC0 | `public/assets/sounds/fx/door-close-1…3.mp3` | claquements (verrou, blackout, portes lointaines) |
| Horror SFX — horror_effect1/2 | TinyWorlds | <https://opengameart.org/content/horror-sfx> | CC0 | `public/assets/sounds/ambient/drone-1…2.mp3` (filtrées, −24 LUFS, 64 kb/s) | nappes d'ambiance en boucle |
| Ghost Monster Voice — moans 02, 04 | qubodup | <https://opengameart.org/content/ghost-monster-voice-moaning-growling> | CC0 | `public/assets/sounds/ambient/moan-1…2.mp3` (passe-bas 900 Hz) | râles lointains aléatoires |
| Fantozzi's Footsteps — StoneL1–3 ralentis (×0,55) et filtrés | Fantozzi | <https://opengameart.org/content/fantozzis-footsteps-grasssand-stone> | CC0 | `public/assets/sounds/fx/monster-step-1…3.mp3` | pas lourds du monstre pendant la poursuite |

Non retenus : « Different steps on wood, stone… » (une seule prise pierre, très faible), « Evil creature » (projet Audacity), « Metal footsteps on concrete » (pas métalliques), Kenney « UI Audio » (doublon).

## Rire dans les environs (fourni par le propriétaire)

`public/assets/sounds/ambient/laugh.mp3`, tiré de `scooby-doo-laugh-meme.mp3` (mono, volume égalisé). **Licence à confirmer** : d'après son nom, le son vient de Scooby-Doo, une œuvre protégée ; à remplacer avant toute publication si les droits ne sont pas acquis.

## Chanson du chat « OIIA » (fournie par le propriétaire)

`public/assets/sounds/fx/oiia-cat.mp3`, copie telle quelle de `feliz-oiia-cat.mp3` (13 s, stéréo 48 kHz). Jouée depuis le chat de la salle d'attente quand on lui parle (E). **Licence à confirmer** : son de mème, origine inconnue.

## Screamers (fournis par le propriétaire)

Cinq images et leurs sons du dossier `listes-screamer/`, convertis dans `public/assets/scare/` et `public/assets/sounds/scares/` (raccourcis, volume égalisé). **Origine et licence à confirmer** : les noms des fichiers audio évoquent Pixabay (freesound_community, kingcookiewastaken, nickype), et les images n'ont pas de source connue.

## Voix (fournies par le propriétaire, ElevenLabs)

`public/assets/voices/*.mp3` (50 prises, 12,8 Mo) : générées par le propriétaire avec ElevenLabs à partir des scripts de `docs/VOIX.md` (MP3 44,1 kHz mono, non modifiées ; gains d'alignement et effets appliqués à la lecture via `src/game/voices.js`). Droits d'usage selon les conditions ElevenLabs du compte du propriétaire.

## Menu principal (fichiers fournis par le propriétaire)

- `arriere-plan-menu.mp4` (racine, 1280 × 720, 10 s, H.264 + AAC) → `public/menu/arriere-plan-menu.mp4` (H.264 CRF 25 + AAC 128 kbit/s, `faststart` ; la bande-son est celle du menu) et `public/menu/arriere-plan-menu.webm` (VP9 + Opus, pour Chromium sans codecs propriétaires), `public/menu/poster.webp` (image d'attente). **Licence à confirmer par le propriétaire.**
- `exemple-menu.png` (racine) : maquette de référence, non distribuée.
- `public/menu/titre.webp` : titre généré avec ImageMagick (police système Impact, érosion par bruit, trace rouge), pas de ressource tierce.

## Autres fichiers

- `public/charcot-night.webp` : illustration du menu, déjà présente dans le projet d’origine (non modifiée).
- `public/draco/*` : décodeur Draco copié depuis `node_modules/three/examples/jsm/libs/draco/gltf/` (three.js, licence MIT) pour décoder les GLB sans CDN.
- Polices (Anton, Special Elite, IBM Plex Mono — licence SIL Open Font) : chargées depuis Google Fonts dans `index.html`, avec polices système de repli ; elles ne sont pas nécessaires au fonctionnement du jeu.

## Éléments procéduraux (pas des modèles téléchargés)

Mur d’écrans, table de radiographie, cuves du laboratoire, papiers au sol, flaques, débris, conduites, signalétique et tableaux (textures dessinées sur canvas) sont générés par le code (`src/components/Props.jsx`, `src/components/materials.js`). Une partie du mobilier reste procédurale (`src/components/Furniture.jsx`, habillée avec les textures PBR ci-dessus) : les rails et rideaux des chambres, le chariot à linge, le porte-tabliers, la paillasse du laboratoire, la balance de la morgue et les plantes. Le reste (brancards, sièges d'attente, distributeurs, radiateurs, éviers, armoires, réfrigérateurs, chariots, moniteur, casiers décoratifs, tiroirs réfrigérés et tables de la morgue, appareil de radiographie) vient des modèles Sketchfab CC BY listés plus haut, aucun modèle de mobilier médical CC0 de qualité suffisante n'ayant été trouvé sur Poly Haven, ambientCG, OpenGameArt, Kenney ni Sketchfab.

## Allègement des modèles (6 novembre 2026)

Tous les GLB de `public/assets/models` au-delà de 2 500 triangles sont passés par `scripts/optimize-models.mjs` (meshoptimizer, erreur bornée à 2 mm par mètre, 0,5 mm pour la torche) : 1,1 M → 436 k triangles au total, textures inchangées, géométrie recompressée en Draco. Le meuble à tiroirs et le banc en bois ne sont pas touchés. Après un nouveau passage d'un script de préparation (`bake-*.mjs`), relancer ce script.

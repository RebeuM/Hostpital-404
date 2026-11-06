import {ALL_SIGN_URLS} from './signs'
// Manifeste des ressources locales (public/assets). Aucun téléchargement tiers pendant une partie.
export const MODEL_BASE='/assets/models/'
export const TEXTURE_BASE='/assets/textures/'
export const DRACO_PATH='/draco/'

export const MODEL_IDS=[
 'wheelchair_01','metal_office_desk','industrial_storage_cart','steel_frame_shelves_01','worn_metal_rack',
 'drawer_cabinet','plastic_monobloc_chair_01','metal_stool_01','mounted_fluorescent_lights','industrial_caged_sconce',
 'korean_fire_extinguisher_01','fire_alarm','wall_clock','Television_01','classic_laptop','clipboard','medical_box',
 'chemistry_set','vintage_microscope','trashbag','cardboard_box_01','power_box_01','WetFloorSign_01','office_notepads',
 'portable_generator','SchoolChair_01','binder_notebook',
 // Personnages Innerscene (CC0) : animés (squelette + 7 clips) et figures allongées statiques.
 'squatter_homeless','maxime_teen','person_carlos_lying','person_meilin_lying',
 // Monstre de la poursuite fourni par le propriétaire (veritytm.glb, converti : matériaux éclairés, clips renommés).
 'monster','flashlight',
 // Bras tenant la lampe (OpenGameArt « fps arms », CC0, posé par scripts/bake-arm.mjs).
 'arm_right',
 // Extérieur : forêt et sous-bois (Poly Haven, CC0, allégés).
 'fir_a','fir_b','fir_c','fir_a_near','fir_b_near','fir_c_near','grass_medium_02','fern_02','shrub_04','rock_moss_set_01','tree_stump_01','dry_branches_medium_01','dead_tree_trunk_02',
 'covered_car','street_lamp_01','concrete_road_barrier_02','metal_trash_can','Barrel_01','rusted_wheel_rim_01','wooden_crate_01',
 // Objets fournis par le propriétaire (scripts/bake-objet3d.mjs).
 'surgical_lamp','bedside_cabinet','oxygen_cart','reception_desk','locker_black','locker_blue_closed',
 'locker_blue_open','locker_row','safe_closed','safe_open','landline_phone','maxime_phone',
 'smartphone_old','usb_backup','meme_cat',
 // Lit et porte fournis par le propriétaire (scripts/bake-bed-door.mjs).
 'hospital_bed','hospital_door',
 // « Emmanuel M. » (jamray747, Sketchfab, CC BY 4.0, scripts/bake-emmanuel.mjs) : danse procédurale (Dancer.jsx).
 'emmanuel',
 // Mobilier hospitalier Sketchfab (CC BY 4.0, auteurs dans docs/ASSETS.md et public/credits.html ; normalisés par scripts/sketchfab-props.mjs).
 'asylum_gurney','hospital_stretcher','drip_stand',
 'iv_stand_bag','lockers_blue','locker_rusty_open','morgue_fridge','morgue_table_a','morgue_table_b','morgue_table_c','surgical_table_bloody',
 'autopsy_table','wrapped_corpse','radiator_rust','radiator_panel','fridge_rusty_open','fridge_old_white','oxygen_tank_lying',
 'medicine_cabinet_old','medical_cabinet_glass','hospital_trolley','overbed_table','privacy_screen','medical_bin','biohazard_box','filing_cabinet_rusty',
 'retro_pc','medical_console','ceiling_fan','first_aid_kit','vitals_monitor','xray_machine','waiting_chairs','bench_broken',
 'bench_wood','bench_wood_back','mop_bucket','vending_coke_a','vending_coke_b','paper_debris_a','paper_debris_b','paper_debris_c',
 'paper_debris_d','sink_metal_long'
]
export const modelUrl=id=>`${MODEL_BASE}${id}.glb`

// Jeux de textures PBR : diff (sRGB), nor (normale OpenGL), arm (R = occlusion, G = rugosité, B = métal).
// `size` = taille physique du motif en mètres, utilisée pour répéter les textures à l'échelle réelle.
export const TEXTURE_SETS={
 floorHall:{dir:'Tiles039',size:1.2},
 floorRoom:{dir:'Tiles110',size:1.2},
 tile:{dir:'worn_tile_floor',size:2.0},
 plasterOld:{dir:'Plaster007',size:2.0},
 dado:{dir:'PaintedPlaster002',size:1.6},
 wallTiles:{dir:'Tiles133D',size:1.3},
 ceilingA:{dir:'OfficeCeiling001',size:1.2},
 ceilingB:{dir:'OfficeCeiling005',size:1.3},
 concrete:{dir:'concrete_wall_006',size:2.0},
 concreteFloor:{dir:'concrete_floor_worn_001',size:3.0},
 metalRusty:{dir:'Metal021',size:1.2},
 steel:{dir:'Metal009',size:1.0},
 wood:{dir:'worn_planks',size:1.4},
 fabric:{dir:'Fabric001',size:.8},
 leather:{dir:'Leather032',size:.6}
}
export const DECALS={leak:{dir:'Leaking004'}}
export const textureUrls=set=>['diff','nor','arm'].map(m=>`${TEXTURE_BASE}${set.dir}/${m}.webp`)
// Textures du parvis (Poly Haven, CC0) ; size = côté réel couvert par l'image, en mètres.
export const EXTERIOR_TEXTURE_SETS={
 asphalt:{dir:'road_damaged',size:4.5},
 path:{dir:'cracked_concrete_wall',size:3},
 forestFloor:{dir:'forest_leaves_02',size:3.5},
 dirt:{dir:'dirt',size:4},
 road:{dir:'worn_asphalt',size:4},
 facade:{dir:'cracked_concrete_wall',size:3.6},
 brick:{dir:'worn_brick_wall',size:2.2},
 plinth:{dir:'dark_brick_wall',size:1.8},
 rust:{dir:'rusty_metal_02',size:1.4}
}
export const FOREST_IMPOSTOR_URL=`${TEXTURE_BASE}forest/fir_impostor.webp`
export const SKY_URL=`${TEXTURE_BASE}sky/night.webp`
export const ALL_TEXTURE_URLS=[...Object.values(TEXTURE_SETS).flatMap(textureUrls),...Object.values(EXTERIOR_TEXTURE_SETS).flatMap(textureUrls),FOREST_IMPOSTOR_URL,SKY_URL,...ALL_SIGN_URLS,`${TEXTURE_BASE}${DECALS.leak.dir}/diff.webp`]
export const ALL_MODEL_URLS=MODEL_IDS.map(modelUrl)

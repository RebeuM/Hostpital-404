// Plan de l'hôpital Charcot : décor, portes, objets et collisions (unités en mètres).
// X : est/ouest, Z : profondeur (l'entrée est en z négatif, la morgue au fond en z élevé).
import {MODEL_BOUNDS} from './modelBounds.js'

export const ROOMS = [
  { id:'accueil', title:'ACCUEIL', x:-7.1, z:1.5, w:9.2, d:12, side:-1, door:2, tone:'#56716b' },
  { id:'attente', title:'SALLE D’ATTENTE', x:7.1, z:1.5, w:9.2, d:12, side:1, door:3.3, tone:'#597069' },
  { id:'patients', title:'CHAMBRES 201–204', x:-7.1, z:13, w:9.2, d:11, side:-1, door:12.3, tone:'#596c67' },
  { id:'radio', title:'RADIOLOGIE', x:7.1, z:14, w:9.2, d:11, side:1, door:14, tone:'#506a6a' },
  { id:'security', title:'SÉCURITÉ', x:-7.1, z:26, w:9.2, d:12, side:-1, door:26, tone:'#695f55' },
  { id:'lab', title:'LABORATOIRE H-404', x:9.8, z:31, w:14.6, d:15, side:1, door:30, tone:'#53726a' },
  { id:'morgue', title:'MORGUE', x:-7.1, z:42, w:9.2, d:13, side:-1, door:42, tone:'#58686a' }
]
export const SECRET = {x:-13.25, z:21.9, w:2.7, d:47, entranceZ:43, exitZ:2.8}
export const CORRIDOR = {x:0, z:22.75, w:4.5, d:54.7, zMin:-4.6, zMax:50.1}
export const SECTOR_Z = 8.32
export const WALL_T = .26
export const WALL_H = 3.25
// Porte hospitalière (scripts/bake-bed-door.mjs) : mêmes dimensions partout, les murs se resserrent autour d'elle et un linteau la surmonte.
export const DOOR_W = 2.254
export const DOOR_H = 2.625

const walls = []
const wall = (x,z,w,d,kind='wall')=>walls.push({ x,z,w,d,kind })
function splitAt(x,zMin,zMax,gap,gapWidth,kind){
 const lo=gap-gapWidth/2, hi=gap+gapWidth/2
 if(lo>zMin)wall(x,(zMin+lo)/2,WALL_T,lo-zMin,kind)
 if(hi<zMax)wall(x,(hi+zMax)/2,WALL_T,zMax-hi,kind)
}
function roomWalls(r){
 const xmin=r.x-r.w/2,xmax=r.x+r.w/2,zmin=r.z-r.d/2,zmax=r.z+r.d/2
 const kind=r.id==='lab'||r.id==='morgue'?'tiles':'wall'
 wall(r.x,zmin,r.w,WALL_T,kind)
 wall(r.x,zmax,r.w,WALL_T,kind)
 if(r.side<0){
   if(r.id==='accueil'||r.id==='morgue')splitAt(xmin,zmin,zmax,r.id==='accueil'?SECRET.exitZ:SECRET.entranceZ,DOOR_W,kind)
   else wall(xmin,r.z,WALL_T,r.d,kind)
 } else wall(xmax,r.z,WALL_T,r.d,kind)
}
ROOMS.forEach(roomWalls)
for(const side of [-1,1]){
 const arr=ROOMS.filter(r=>r.side===side).sort((a,b)=>a.door-b.door)
 let cursor=CORRIDOR.zMin
 for(const r of arr){
   // L'accueil et la salle d'attente s'ouvrent sur le couloir sans porte.
   const half=r.id==='accueil'||r.id==='attente'?1.29:DOOR_W/2
   const lo=r.door-half, hi=r.door+half
   if(lo>cursor)wall(side*2.25,(cursor+lo)/2,WALL_T,lo-cursor,'corridor')
   cursor=hi
 }
 if(cursor<CORRIDOR.zMax)wall(side*2.25,(cursor+CORRIDOR.zMax)/2,WALL_T,CORRIDOR.zMax-cursor,'corridor')
}
// Mur de l'entrée (avec la double porte vitrée condamnée) et fond du couloir.
for(const s of [-1,1])wall(s*(DOOR_W/2+2.375)/2,CORRIDOR.zMin,2.375-DOOR_W/2,WALL_T,'corridor')
// Cloison de part et d'autre de la porte du secteur patients, le couloir étant plus large qu'elle.
for(const s of [-1,1])wall(s*(DOOR_W/2+2.25)/2,SECTOR_Z,2.25-DOOR_W/2,WALL_T,'corridor')
wall(0,CORRIDOR.zMax,4.75,WALL_T,'corridor')
// Galerie secrète : parois en béton, ajourées uniquement devant les deux accès réels.
wall(SECRET.x-SECRET.w/2,SECRET.z,WALL_T,SECRET.d,'concrete')
wall(SECRET.x,SECRET.z-SECRET.d/2,SECRET.w+WALL_T,WALL_T,'concrete')
wall(SECRET.x,SECRET.z+SECRET.d/2,SECRET.w+WALL_T,WALL_T,'concrete')
{
 const xmin=SECRET.x+SECRET.w/2
 let secretSegments=[[SECRET.z-SECRET.d/2,SECRET.z+SECRET.d/2]]
 for(const p of [SECRET.exitZ,SECRET.entranceZ]){
  const next=[];for(const [a,b] of secretSegments){const lo=p-DOOR_W/2,hi=p+DOOR_W/2
    if(lo>a)next.push([a,Math.min(lo,b)])
    if(hi<b)next.push([Math.max(hi,a),b])
  }
  secretSegments=next.filter(([a,b])=>b-a>.05)
 }
 for(const [a,b] of secretSegments)wall(xmin,(a+b)/2,WALL_T,b-a,'concrete')
}
export const WALLS=walls

export const GATES = [
 ...ROOMS.filter(r=>!['accueil','attente'].includes(r.id)).map(r=>({id:r.id,x:r.side*2.25,z:r.door,axis:'x',w:DOOR_W})),
 {id:'sector',x:0,z:SECTOR_Z,axis:'z',w:DOOR_W},
 {id:'secret',x:-11.90,z:SECRET.entranceZ,axis:'x',w:DOOR_W},
 {id:'secret_exit',x:-11.90,z:SECRET.exitZ,axis:'x',w:DOOR_W},
 {id:'entrance',x:0,z:CORRIDOR.zMin,axis:'z',w:DOOR_W}
]
// Linteaux : le mur reprend au-dessus de chaque porte (pas de collision, ils passent au-dessus de la tête).
export const LINTELS=[
 ...ROOMS.filter(r=>!['accueil','attente'].includes(r.id)).map(r=>({x:r.side*2.25,z:r.door,w:WALL_T,d:DOOR_W,kind:'corridor'})),
 {x:0,z:SECTOR_Z,w:DOOR_W,d:WALL_T,kind:'corridor'},
 {x:0,z:CORRIDOR.zMin,w:DOOR_W,d:WALL_T,kind:'corridor'},
 // Passage secret : deux parois accolées, le béton de la galerie et le mur de la pièce.
 ...[[SECRET.exitZ,'wall'],[SECRET.entranceZ,'tiles']].flatMap(([z,kind])=>[{x:SECRET.x+SECRET.w/2,z,w:WALL_T,d:DOOR_W,kind:'concrete'},{x:-11.7,z,w:WALL_T,d:DOOR_W,kind}])
]

// ---------------------------------------------------------------------------
// Mobilier : chaque entrée décrit un modèle GLB (public/assets/models) ou un
// objet procédural, sa position, et sert aussi de volume de collision.
// ---------------------------------------------------------------------------
const PI=Math.PI
function prop(m,x,z,ry=0,o={}){
 const b=MODEL_BOUNDS[m];const s=o.s??1
 let w=.5,d=.5
 if(b){w=b.size[0]*s;d=b.size[2]*s;const q=Math.abs(((ry%PI)+PI)%PI);if(Math.abs(q-PI/2)<.4){[w,d]=[d,w]}}
 if(o.c)[w,d]=o.c
 return {m,x,z,ry,s,y:o.y??0,room:o.room||null,collide:o.collide??!o.onTable,shrink:o.shrink??.92,w,d,onTable:!!o.onTable,tag:o.tag||null}
}
const SHELF=.1 // steel_frame_shelves_01 est en centimètres
export const PROPS=[
 // --- ACCUEIL ---------------------------------------------------------------
 prop('metal_office_desk',-7.0,0.5,0,{room:'accueil'}),
 prop('Television_01',-7.72,0.42,PI*.08,{y:.79,onTable:true,tag:'tv'}),
 prop('classic_laptop',-6.05,0.55,PI*1.02,{y:.79,onTable:true,tag:'reception_pc'}),
 prop('office_notepads',-7.0,0.2,.3,{y:.79,onTable:true}),
 prop('SchoolChair_01',-6.6,-.45,0,{room:'accueil'}),
 prop('drawer_cabinet',-11.15,-1.4,PI/2,{room:'accueil'}),
 prop('drawer_cabinet',-11.15,-0.15,PI/2,{room:'accueil'}),
 prop('steel_frame_shelves_01',-11.1,-3.5,PI/2,{s:SHELF,room:'accueil'}),
 prop('cardboard_box_01',-10.4,-3.25,.4,{room:'accueil'}),
 prop('cardboard_box_01',-10.9,-3.75,-.2,{y:.34,collide:false}),
 prop('trashbag',-3.3,-3.6,0,{room:'accueil'}),
 prop('WetFloorSign_01',-5.6,-2.6,.6,{room:'accueil'}),
 prop('wheelchair_01',-9.4,6.3,PI*.9,{room:'accueil'}),
 prop('plastic_monobloc_chair_01',-8.0,4.6,PI*.85,{room:'accueil'}),
 prop('korean_fire_extinguisher_01',-3.0,-4.1,0,{room:'accueil'}),
 // Comptoir d'accueil en L, ouvert côté bureau : ses volumes de collision sont dans SOLIDS.
 prop('reception_desk',-5.9,1.2,0,{room:'accueil',collide:false}),
 // Rangée de casiers contre le mur ouest (cachette hide_accueil).
 prop('locker_row',-11.065,5.9,PI/2,{room:'accueil'}),
 prop('oxygen_cart',-10.25,7.1,.4,{room:'accueil'}),
 // Mobilier Sketchfab (CC BY) : brancard d'asile, sièges d'attente, distributeur, radiateur rouillé, classeur, armoire à pharmacie murale, débris.
 prop('asylum_gurney',-4.4,-1.9,PI/2,{room:'accueil'}),
 prop('waiting_chairs',-5.6,7.05,PI,{room:'accueil'}),
 prop('vending_coke_b',-3.1,6.84,PI,{room:'accueil'}),
 prop('radiator_rust',-8.6,7.23,0,{y:.12,room:'accueil'}),
 prop('mop_bucket',-3.05,-2.2,.4,{room:'accueil'}),
 prop('filing_cabinet_rusty',-10.3,-4.05,0,{room:'accueil'}),
 prop('medicine_cabinet_old',-11.6,1.3,PI/2,{y:1.35,collide:false}),
 prop('paper_debris_b',-6.4,4.3,.6,{collide:false}),prop('paper_debris_c',-8.9,-0.4,2.1,{collide:false}),
 prop('ceiling_fan',-7.1,4.5,0,{y:WALL_H-.02,collide:false}),
 // --- SALLE D'ATTENTE ------------------------------------------------------
 prop('plastic_monobloc_chair_01',10.3,-3.1,PI*.6,{room:'attente'}),
 prop('plastic_monobloc_chair_01',4.2,2.9,PI*1.3,{room:'attente'}),
 prop('wheelchair_01',7.6,6.3,PI*1.05,{room:'attente'}),
 prop('trashbag',10.9,-3.8,0,{room:'attente'}),
 prop('cardboard_box_01',10.9,6.8,.9,{room:'attente'}),
 prop('WetFloorSign_01',3.3,5.2,-.5,{room:'attente'}),
 prop('korean_fire_extinguisher_01',2.9,-4.1,0,{room:'attente'}),
 prop('drawer_cabinet',11.2,-1.2,-PI/2,{room:'attente'}),
 prop('waiting_chairs',5.2,-4.06,0,{room:'attente'}),prop('waiting_chairs',8.2,-4.06,0,{room:'attente'}),
 prop('bench_wood_back',5.3,-0.1,0,{room:'attente'}),prop('waiting_chairs',8.3,-0.1,0,{room:'attente'}),
 prop('bench_wood',8.3,2.3,PI,{room:'attente'}),prop('bench_broken',6.0,4.4,-.3,{room:'attente'}),
 prop('vending_coke_a',11.05,5.3,-PI/2,{room:'attente'}),
 prop('radiator_panel',7.0,7.33,0,{y:.25,room:'attente'}),
 prop('hospital_stretcher',3.35,-1.6,0,{room:'attente'}),
 prop('medical_bin',11.25,.4,0,{room:'attente'}),
 prop('oxygen_tank_lying',9.6,6.95,0,{room:'attente'}),
 prop('paper_debris_a',9.4,3.7,1.1,{collide:false}),prop('paper_debris_d',4.6,-2.2,.2,{collide:false}),
 prop('ceiling_fan',7.1,1.5,0,{y:WALL_H-.02,collide:false}),
 // --- CHAMBRES DES PATIENTS -------------------------------------------------

 prop('drawer_cabinet',-6.0,18.05,PI,{room:'patients',tag:'drawer203'}),
 prop('metal_office_desk',-4.3,9.3,PI/2,{room:'patients'}),
 prop('classic_laptop',-4.25,9.1,PI*1.5,{y:.79,onTable:true}),
 prop('medical_box',-4.4,10.1,.2,{y:.79,onTable:true}),
 prop('clipboard',-9.68,9.75,PI/2,{y:.54,onTable:true}),
 prop('clipboard',-10.6,14.5,PI/2,{y:.54,onTable:true}),
 prop('wheelchair_01',-4.0,13.2,-PI*.6,{room:'patients'}),
 prop('metal_stool_01',-9.1,12.9,0,{room:'patients'}),
 prop('trashbag',-3.1,17.7,0,{room:'patients'}),
 prop('industrial_storage_cart',-7.9,17.6,0,{room:'patients'}),
 prop('binder_notebook',-7.9,17.5,.3,{y:1.0,onTable:true}),
 ...[0,1,2].map(i=>prop('bedside_cabinet',-11.35,10.85+i*2.45,PI/2,{room:'patients'})),
 prop('smartphone_old',-11.35,15.75,.5,{y:.745,onTable:true}),
 prop('oxygen_cart',-11.3,17.9,.2,{room:'patients'}),
 // Lits 201-204, tête contre le mur ouest, puis les deux lits du centre (celui de z=14.7 sert de cachette).
 ...[0,1,2,3].map(i=>prop('hospital_bed',-10.5,9.6+i*2.45,PI/2,{room:'patients'})),
 prop('hospital_bed',-6.6,10.3,PI/2,{room:'patients'}),prop('hospital_bed',-6.6,14.7,PI/2,{room:'patients',tag:'hide_bed'}),
 prop('drip_stand',-9.0,8.8,0,{room:'patients'}),prop('drip_stand',-9.95,13.3,0,{room:'patients'}),prop('iv_stand_bag',-4.9,13.6,0,{room:'patients'}),
 prop('overbed_table',-6.6,12.5,PI/2,{room:'patients'}),
 prop('hospital_trolley',-9.2,15.65,PI/2,{room:'patients'}),
 prop('vitals_monitor',-9.2,15.65,PI/2,{y:.91,onTable:true}),
 prop('sink_metal_long',-3.13,16.0,-PI/2,{room:'patients'}),
 prop('radiator_rust',-9.6,18.23,0,{y:.12,room:'patients'}),
 prop('drip_stand',-5.5,11.4,0,{room:'patients'}),
 prop('iv_stand_bag',-8.2,13.9,0,{room:'patients'}),
 prop('privacy_screen',-8.3,16.6,.3,{room:'patients'}),
 prop('medicine_cabinet_old',-2.72,9.4,-PI/2,{y:1.5,collide:false}),
 prop('paper_debris_c',-7.3,11.9,.8,{collide:false}),prop('paper_debris_b',-4.9,17.0,2.4,{collide:false}),
 prop('ceiling_fan',-7.1,12.3,0,{y:WALL_H-.02,collide:false}),
 // --- RADIOLOGIE ------------------------------------------------------------
 prop('hospital_bed',9.6,12.7,PI/2,{room:'radio'}),
 prop('metal_office_desk',5.6,18.1,PI,{room:'radio'}),
 prop('classic_laptop',4.9,18.15,0,{y:.79,onTable:true,tag:'radio_pc'}),
 prop('clipboard',5.7,17.85,-.4,{y:.79,onTable:true}),
 prop('SchoolChair_01',5.3,16.9,0,{room:'radio'}),
 prop('drawer_cabinet',3.0,10.2,PI/2,{room:'radio'}),
 prop('drawer_cabinet',3.0,11.45,PI/2,{room:'radio'}),
 prop('metal_stool_01',8.2,10.1,0,{room:'radio'}),
 prop('industrial_storage_cart',10.8,10.0,PI/2,{room:'radio'}),
 prop('medical_box',10.8,10.0,0,{y:1.0,onTable:true}),
 prop('trashbag',11.2,18.9,0,{room:'radio'}),
 prop('cardboard_box_01',3.1,18.9,.3,{room:'radio'}),
 prop('medical_cabinet_glass',2.88,16.8,PI/2,{room:'radio'}),
 prop('oxygen_cart',11.3,8.9,-.5,{room:'radio'}),
 prop('asylum_gurney',7.4,10.6,0,{room:'radio'}),
 prop('hospital_trolley',4.4,12.6,0,{room:'radio'}),
 prop('radiator_panel',7.5,19.33,0,{y:.25,room:'radio'}),
 prop('xray_machine',9.8,17.0,0,{room:'radio'}),
 prop('drip_stand',6.0,12.4,0,{room:'radio'}),prop('iv_stand_bag',8.3,13.8,0,{room:'radio'}),
 prop('privacy_screen',8.0,15.2,.2,{room:'radio'}),
 prop('paper_debris_a',10.2,18.6,.4,{collide:false}),prop('paper_debris_d',5.2,14.8,1.9,{collide:false}),
 prop('ceiling_fan',7.1,14.0,0,{y:WALL_H-.02,collide:false}),
 // --- SÉCURITÉ --------------------------------------------------------------
 prop('metal_office_desk',-10.5,26.0,PI/2,{room:'security',tag:'security_desk'}),
 prop('retro_pc',-10.5,25.4,PI/2,{y:.79,onTable:true,tag:'security_pc'}),
 prop('binder_notebook',-10.5,26.6,PI*.55,{y:.79,onTable:true}),
 prop('SchoolChair_01',-9.3,26.0,-PI/2,{room:'security'}),
 prop('portable_generator',-9.6,30.6,PI*.15,{room:'security',tag:'generator'}),
 prop('worn_metal_rack',-4.2,30.4,-PI/2,{room:'security'}),
 prop('cardboard_box_01',-4.1,30.3,.1,{y:.72,collide:false}),
 prop('cardboard_box_01',-4.1,30.3,-.4,{y:1.3,collide:false}),
 prop('steel_frame_shelves_01',-5.5,21.2,PI,{s:SHELF,room:'security'}),
 prop('drawer_cabinet',-3.2,22.8,-PI/2,{room:'security'}),
 prop('trashbag',-11.0,21.0,0,{room:'security'}),
 prop('korean_fire_extinguisher_01',-11.2,22.4,PI/2,{room:'security'}),
 prop('radiator_panel',-4.6,20.17,0,{y:.25,room:'security'}),
 prop('landline_phone',-10.45,26.08,PI/2+.2,{y:.79,onTable:true}),
 // Deux casiers bleus contre le mur sud (cachette hide_securite).
 prop('locker_blue_closed',-7.62,31.624,PI,{room:'security'}),prop('locker_blue_open',-7.18,31.462,PI,{room:'security'}),
 prop('hospital_trolley',-3.2,23.95,-PI/2,{room:'security'}),
 prop('first_aid_kit',-3.2,23.95,-PI/2+.3,{y:.91,onTable:true}),
 prop('lockers_blue',-9.5,20.37,0,{room:'security'}),
 prop('filing_cabinet_rusty',-3.02,28.3,-PI/2,{room:'security'}),prop('filing_cabinet_rusty',-3.02,28.75,-PI/2,{room:'security'}),
 prop('locker_rusty_open',-10.85,31.52,0,{room:'security'}),
 prop('medicine_cabinet_old',-2.72,23.9,-PI/2,{y:1.5,collide:false}),
 prop('paper_debris_b',-6.8,23.4,.5,{collide:false}),prop('paper_debris_a',-9.2,29.0,2,{collide:false}),
 prop('ceiling_fan',-7.1,26.5,0,{y:WALL_H-.02,collide:false}),
 // --- LABORATOIRE -----------------------------------------------------------
 prop('metal_office_desk',6.4,27.6,0,{room:'lab'}),
 prop('metal_office_desk',8.4,27.6,0,{room:'lab'}),
 prop('chemistry_set',6.3,27.6,0,{y:.79,onTable:true}),
 prop('vintage_microscope',8.1,27.5,PI*.3,{y:.79,onTable:true}),
 prop('medical_box',9.0,27.7,.5,{y:.79,onTable:true}),
 prop('binder_notebook',7.3,27.9,-.4,{y:.79,onTable:true}),
 prop('metal_stool_01',6.4,26.5,0,{room:'lab'}),
 prop('metal_stool_01',8.6,26.6,0,{room:'lab'}),
 // Scialytique au plafond : sa tête principale tombe au-dessus du lit du milieu.
 prop('surgical_lamp',14.33,29.33,0,{y:WALL_H,collide:false}),
 prop('privacy_screen',14.6,31.0,PI/2+.15,{room:'lab'}),
 prop('oxygen_cart',16.65,36.3,.3,{room:'lab'}),prop('oxygen_cart',16.65,36.9,-.2,{room:'lab'}),
 // Lits du laboratoire, tête contre le mur est.
 ...[0,1,2].map(i=>prop('hospital_bed',15.9,25.5+i*3.6,-PI/2,{room:'lab'})),
 prop('metal_office_desk',10.0,36.6,PI,{room:'lab',tag:'lab_desk'}),
 prop('classic_laptop',10.0,36.6,0,{y:.79,onTable:true,tag:'lab_pc'}),
 prop('office_notepads',11.65,30.6,.15,{y:.945,onTable:true}),
 prop('steel_frame_shelves_01',3.1,34.6,PI/2,{s:SHELF,room:'lab'}),
 prop('worn_metal_rack',15.0,37.9,PI,{room:'lab'}),
 prop('industrial_storage_cart',6.2,32.6,PI*.1,{room:'lab'}),
 prop('drawer_cabinet',13.0,37.9,PI,{room:'lab'}),
 prop('cardboard_box_01',3.3,24.3,.7,{room:'lab'}),
 prop('trashbag',4.0,37.8,0,{room:'lab'}),
 prop('WetFloorSign_01',11.6,31.6,.4,{room:'lab'}),
 prop('korean_fire_extinguisher_01',2.9,24.2,PI/2,{room:'lab'}),
 prop('fridge_old_white',5.6,24.0,0,{room:'lab'}),
 prop('sink_metal_long',7.3,24.13,0,{room:'lab'}),
 prop('medical_cabinet_glass',9.2,23.88,0,{room:'lab'}),prop('medical_cabinet_glass',10.6,23.88,0,{room:'lab'}),
 prop('medical_bin',4.1,26.6,0,{room:'lab'}),prop('biohazard_box',3.5,25.5,.3,{room:'lab'}),
 prop('hospital_trolley',15.0,26.9,PI/2,{room:'lab'}),prop('vitals_monitor',15.0,26.9,PI/2,{y:.91,onTable:true}),
 prop('hospital_trolley',13.5,27.0,PI/2,{room:'lab'}),
 prop('drip_stand',14.3,33.6,0,{room:'lab'}),prop('drip_stand',16.2,27.3,0,{room:'lab'}),prop('iv_stand_bag',16.1,34.6,0,{room:'lab'}),
 prop('lockers_blue',2.87,36.8,PI/2,{room:'lab'}),
 prop('fridge_rusty_open',3.02,33.0,PI/2,{room:'lab'}),
 prop('medical_console',10.75,30.55,PI,{y:.945,onTable:true}),
 prop('first_aid_kit',6.2,32.5,.3,{y:1.0,onTable:true}),
 prop('paper_debris_b',9.8,33.4,.7,{collide:false}),prop('paper_debris_c',12.4,35.6,1.4,{collide:false}),prop('paper_debris_a',5.6,29.6,2.6,{collide:false}),
 prop('ceiling_fan',9.8,31.0,0,{y:WALL_H-.02,collide:false}),
 // --- MORGUE ----------------------------------------------------------------
 prop('metal_office_desk',-6.8,42.1,0,{room:'morgue',tag:'morgue_desk'}),
 prop('classic_laptop',-7.4,42.1,PI,{y:.79,onTable:true,tag:'morgue_pc'}),
 prop('worn_metal_rack',-4.0,37.0,-PI/2,{room:'morgue'}),
 prop('industrial_storage_cart',-9.9,38.3,0,{room:'morgue'}),
 prop('trashbag',-11.0,45.6,0,{room:'morgue'}),
 prop('wheelchair_01',-3.9,45.6,-PI*.5,{room:'morgue'}),
 prop('metal_stool_01',-5.3,43.6,0,{room:'morgue'}),
 prop('morgue_fridge',-9.55,47.69,0,{room:'morgue'}),
 // Casier noir contre le mur est (cachette hide_morgue).
 prop('locker_black',-2.79,47.4,-PI/2,{room:'morgue'}),
 prop('morgue_table_a',-9.6,40.2,0,{room:'morgue'}),
 prop('autopsy_table',-4.6,40.3,0,{room:'morgue'}),
 prop('surgical_table_bloody',-6.2,40.2,0,{room:'morgue'}),
 prop('morgue_table_b',-10.0,45.0,0,{room:'morgue'}),
 prop('sink_metal_long',-3.13,39.0,-PI/2,{room:'morgue'}),
 prop('hospital_trolley',-7.9,45.3,.2,{room:'morgue'}),
 prop('medical_bin',-11.2,36.6,0,{room:'morgue'}),
 prop('wrapped_corpse',-7.6,44.0,1.3,{room:'morgue'}),
 prop('drip_stand',-7.6,38.4,0,{room:'morgue'}),
 prop('privacy_screen',-11.0,41.0,PI/2,{room:'morgue'}),
 prop('medicine_cabinet_old',-9.0,35.72,0,{y:1.5,collide:false}),
 prop('paper_debris_c',-6.6,44.6,.3,{collide:false}),prop('paper_debris_a',-4.4,46.3,.9,{collide:false}),
 prop('ceiling_fan',-7.1,41.0,0,{y:WALL_H-.02,collide:false}),
 // --- COULOIR ---------------------------------------------------------------
 prop('korean_fire_extinguisher_01',-2.0,29.6,-PI/2,{room:'couloir'}),
 prop('wheelchair_01',-1.5,21.2,PI*.78,{room:'couloir'}),
 prop('industrial_storage_cart',1.35,24.2,PI/2,{room:'couloir'}),
 prop('hospital_bed',1.6,36.2,0,{room:'couloir'}),
 prop('WetFloorSign_01',0.9,10.4,-.3,{room:'couloir'}),
 prop('trashbag',-1.8,16.3,0,{room:'couloir'}),
 prop('cardboard_box_01',1.8,44.0,.5,{room:'couloir'}),
 prop('cardboard_box_01',1.7,47.6,-.3,{room:'couloir'}),
 prop('plastic_monobloc_chair_01',-1.75,33.0,PI*.55,{room:'couloir'}),
 // Casiers servant de cachettes : hall, deux dans le couloir, galerie secrète.
 prop('locker_blue_closed',1.874,-2.72,-PI/2,{room:'couloir'}),prop('locker_blue_open',1.712,-2.28,-PI/2,{room:'couloir'}),
 prop('locker_blue_closed',1.874,27.78,-PI/2,{room:'couloir'}),prop('locker_blue_open',1.712,28.22,-PI/2,{room:'couloir'}),
 prop('locker_black',-1.713,35.4,PI/2,{room:'couloir'}),
 prop('locker_black',-14.063,22,PI/2,{room:'secret'}),
 prop('oxygen_cart',-1.88,27.6,.5,{room:'couloir'}),
 prop('asylum_gurney',1.5,19.0,0,{room:'couloir'}),
 prop('hospital_stretcher',-1.55,38.6,0,{room:'couloir'}),
 prop('medical_bin',1.8,41.6,0,{room:'couloir'}),
 prop('hospital_trolley',1.6,6.0,PI/2,{room:'couloir'}),
 prop('vending_coke_b',-1.59,-3.3,PI/2,{room:'couloir'}),
 prop('lockers_blue',1.885,22.0,-PI/2,{room:'couloir'}),
 prop('radiator_panel',-2.08,10.5,PI/2,{y:.25,room:'couloir'}),prop('radiator_panel',2.08,46.0,-PI/2,{y:.25,room:'couloir'}),
 prop('bench_wood_back',-1.75,31.5,PI/2,{room:'couloir'}),
 prop('oxygen_tank_lying',1.35,16.5,.15,{room:'couloir'}),
 prop('drip_stand',1.5,10.9,0,{room:'couloir'}),
 prop('paper_debris_d',0.6,14.0,.4,{collide:false}),prop('paper_debris_b',-0.8,33.9,2,{collide:false}),prop('paper_debris_a',0.9,45.2,1.2,{collide:false}),
 // --- GALERIE SECRÈTE -------------------------------------------------------
 prop('cardboard_box_01',-14.1,10.0,.3,{room:'secret'}),
 prop('trashbag',-12.4,30.0,0,{room:'secret'}),
 prop('cardboard_box_01',-14.0,36.0,-.6,{room:'secret'})
]
// Mobilier hospitalier procédural (src/components/Furniture.jsx) : type, position, orientation, options.
// Tailles de collision (largeur x, profondeur z) avant rotation.
export const FURNITURE_SIZE={plant:[.4,.4],lowtable:[.8,.5],gurney:[.66,1.95],overbed:[.8,.4],medcab:[.9,.46],sink:[.52,.42],curtain:null,vitals:[.5,.5],biobin:[.52,.52],bench:[2.2,.55],radiator:[1.0,.12],crash:[.72,.52],vending:[.9,.76],linen:[.62,.82],aprons:[.5,.5],fridge:[.75,.7],labbench:[2.45,.78],scale:[.5,.5],trolley:[.9,.5]}
function furn(t,x,z,ry=0,o={}){
 let size=FURNITURE_SIZE[t];let w=0,d=0
 if(size){[w,d]=size;if(o.w&&(t==='bench'||t==='labbench'||t==='radiator'))w=o.w+(t==='labbench'?.05:0)
  const q=Math.abs(((ry%PI)+PI)%PI);if(Math.abs(q-PI/2)<.4){[w,d]=[d,w]}}
 return {t,x,z,ry,o,w,d,collide:!!size}
}
export const FURNITURE=[
 // Accueil : plante morte.
 furn('plant',-9.5,-4.0,0,{}),
 // Salle d'attente : plante morte et table basse.
 furn('plant',10.6,-.1,0,{}),furn('lowtable',3.4,1.0,.3,{}),
 // Chambres : rideaux des lits 201-204 et chariot à linge. Les têtes de lit numérotées sont sur le mur (World.jsx).
 ...[0,1,2,3].map(i=>furn('curtain',-10.4,9.6+i*2.45,PI/2,{drawn:[.2,.7,.95,.4][i]})),
 furn('linen',-4.4,15.7,.3,{}),
 // Radiologie : porte-tabliers plombés.
 furn('aprons',11.3,15.3,-PI/2,{}),
 // Laboratoire : seconde paillasse.
 furn('labbench',11.6,30.6,0,{w:2.4}),
 // Morgue : balance.
 furn('scale',-11.2,39.0,0,{}),
 // Couloir : chariot à linge.
 furn('linen',-1.7,45.2,0,{})
]
// Volumes procéduraux (sans modèle GLB) qui bloquent aussi le joueur.
export const SOLIDS=[
 {id:'xray_table',x:9.6,z:12.7,w:2.1,d:1.0},
 // Comptoir d'accueil en L : grande longueur, retour vers le sud et arrondi extérieur.
 {id:'reception_run',x:-6.42,z:1.755,w:3.04,d:1.01},{id:'reception_wing',x:-4.38,z:.97,w:1.04,d:1.66},{id:'reception_curve',x:-4.6,z:1.975,w:.6,d:.35},
 {id:'tank',x:12.6,z:24.4,w:.9,d:.9},{id:'tank2',x:14.6,z:24.4,w:.9,d:.9},
 {id:'monitor_wall',x:-11.35,z:26.0,w:.5,d:2.6},
 {id:'squatter',x:-4.3,z:3.7,w:.6,d:.6}
]
export const COLLIDERS=[
 ...PROPS.filter(p=>p.collide).map(p=>({x:p.x,z:p.z,w:p.w*p.shrink,d:p.d*p.shrink})),
 ...FURNITURE.filter(f=>f.collide).map(f=>({x:f.x,z:f.z,w:f.w*.94,d:f.d*.94})),
 ...SOLIDS.map(s=>({x:s.x,z:s.z,w:s.w,d:s.d}))
]

// Cachettes : casiers et dessous de lit. cam : où se place le regard ; out : où l'on ressort ; yaw : vers où l'on regarde.
const PI_2=Math.PI/2
export const HIDE_SPOTS=[
 {id:'hide_accueil',kind:'locker',hit:[-11.22,1,5.9,.35,1,1.3],cam:[-10.98,1.55,5.9],out:[-10.3,5.9],yaw:PI_2},
 {id:'hide_hall',kind:'locker',hit:[1.85,1,-2.5,.26,1,.46],cam:[1.62,1.55,-2.5],out:[1.05,-2.5],yaw:-PI_2},
 {id:'hide_couloir',kind:'locker',hit:[1.85,1,28,.26,1,.46],cam:[1.62,1.55,28],out:[1.05,28],yaw:-PI_2},
 {id:'hide_couloir2',kind:'locker',hit:[-1.82,1,35.4,.3,1,.55],cam:[-1.65,1.55,35.62],out:[-1.1,35.4],yaw:PI_2},
 {id:'hide_galerie',kind:'locker',hit:[-14.17,1,22,.3,1,.55],cam:[-14,1.55,22.22],out:[-13.4,22],yaw:PI_2},
 {id:'hide_securite',kind:'locker',hit:[-7.4,1,31.57,.46,1,.26],cam:[-7.4,1.55,31.37],out:[-7.4,30.5],yaw:Math.PI},
 {id:'hide_morgue',kind:'locker',hit:[-2.88,1,47.4,.3,1,.55],cam:[-2.85,1.55,47.18],out:[-4,47.4],yaw:-PI_2},
 {id:'hide_lit',kind:'bed',hit:[-6.6,.42,14.7,1.02,.42,.44],cam:[-6.6,.2,14.7],out:[-6.6,13.75],yaw:Math.PI}
]
export const hideSpot=id=>HIDE_SPOTS.find(h=>h.id===id)||null
function HIDE_SPOTS_TARGETS(){return HIDE_SPOTS.map(h=>({id:h.id,x:h.out[0],z:h.out[1],label:h.kind==='bed'?'Se cacher sous le lit':'Se cacher dans le casier',type:'hide',hit:h.hit}))}
// Le chat « OIIA » de la table basse (salle d'attente) : E le fait chanter (13 s) et tourner, et débloque un succès.
// Piège : 1,6 s avant la fin de la chanson, le plus gros screamer du jeu (celui de la capture), si les screamers sont activés.
export const CAT={x:3.4,y:.435,z:1.0,ry:2.2,songMs:13100,scareMs:11500}
export const INTERACTIVES=[
 {id:'squatter',x:-4.3,z:3.7,label:'Parler à l’homme de l’accueil',type:'talk',hit:[-4.3,.9,3.7,.42,.98,.42]},
 {id:'tv',x:-7.72,z:0.9,label:'Vieux téléviseur',type:'look',hit:[-7.72,1.02,.42,.4,.3,.34]},
 {id:'reception_pc',x:-6.05,z:0.95,label:'Terminal d’accueil',type:'look',hit:[-6.05,.93,.55,.32,.2,.28]},
 {id:'sector',x:0,z:7.1,label:'Ouvrir le portail du secteur patients',type:'gate',hit:[0,1.5,8.32,1.12,1.5,.25],door:'sector'},
 {id:'patients',x:-6.0,z:17.3,label:'Tiroir sécurisé — fiches des chambres',type:'puzzle',hit:[-6,.95,18.02,.62,.98,.32]},
 {id:'bed203',x:-9.9,z:14.9,label:'Plaque du lit 203',type:'look',hit:[-10.6,1.05,14.5,.98,.75,.62]},
 {id:'radio',x:5.6,z:17.3,label:'Coffre du médecin-chef',type:'puzzle',hit:[6.3,1.05,18.2,.3,.3,.28]},
 {id:'security',x:-9.4,z:26.0,label:'Panneau du système de sécurité',type:'puzzle',hit:[-10.6,1.2,25.9,.98,.98,.98]},
 {id:'lab',x:10.0,z:35.7,label:'Terminal de la base médicale',type:'puzzle',hit:[10,.95,36.6,.42,.26,.38]},
 {id:'morgue',x:-6.8,z:43.1,label:'Téléphone de Maxime et clé USB',type:'evidence',hit:[-6.18,.86,42.12,.32,.16,.32]},
 {id:'secret',x:-10.9,z:43,label:'Passage secret vers l’accueil',type:'gate',hit:[-11.9,1.5,43,.25,1.5,1.12],door:'secret'},
 {id:'exit',x:0,z:-3.4,label:'Sortie principale',type:'gate',hit:[0,1.4,-4.6,1.05,1.4,.3]},
 {id:'hospital_door',x:0,z:-5.4,label:'Entrer dans l’hôpital',type:'gate',hit:[0,1.45,-4.72,1.08,1.45,.32],door:'entrance'},
 {id:'note',x:11.1,z:2.0,label:'Lire la note de service',type:'evidence',hit:[11.46,1.9,2,.12,.42,.38]},
 {id:'cat',x:CAT.x,z:CAT.z,label:'Discuter avec le chat',type:'talk',hit:[CAT.x,CAT.y+.2,CAT.z,.3,.22,.3]},
 ...HIDE_SPOTS_TARGETS()
]
export const CHAPTERS=[
 '', 'ACTE I · LA RENCONTRE', 'ACTE II · LES PATIENTS', 'ACTE III · RADIOLOGIE',
 'ACTE IV · SÉCURITÉ', 'ACTE V · LABORATOIRE', 'ACTE VI · MORGUE', 'FINAL · LA FUITE'
]
export const OBJECTIVES={
 1:'Parle au squatteur dans l’accueil pour obtenir une clé.',
 2:'Retrouve la chambre d’Éléonore Vasseur dans le service des patients.',
 3:'Explore la radiologie et ouvre le coffre du médecin.',
 4:'Rétablis la sécurité et calcule le chemin critique.',
 5:'Retrouve la base de données H-404 au laboratoire.',
 6:'Récupère la sauvegarde dans la morgue.',
 7:'Échappe à Adrien par le passage secret et rejoins l’entrée.'
}
// Positions sûres de reprise, par chapitre (sol libre, hors collision).
export const SAFE_SPOTS={
 1:{x:0,z:-2,yaw:0},
 2:{x:0,z:6.4,yaw:0},
 3:{x:-5.2,z:14.3,yaw:-Math.PI/2},
 4:{x:7.0,z:15.0,yaw:-Math.PI/2},
 5:{x:-7.0,z:27.5,yaw:Math.PI/2},
 6:{x:9.5,z:31.5,yaw:-Math.PI/2},
 7:{x:-8.0,z:43.0,yaw:Math.PI/2}
}
export const START_POSITION=SAFE_SPOTS[1]
// Parvis extérieur : le joueur y commence, dos au portail, face à l'entrée de l'hôpital.
export const EXTERIOR_ZONE={xMax:15,zMin:-24.4,zMax:-4.8}
export const OUTSIDE_START={x:0,z:-23.6,yaw:0,pitch:.13,endZ:-20.6}
export const INSIDE_TRIGGER_Z=-3.7
// Relief de la forêt : plat sous le parvis et la route, de plus en plus bosselé en s'éloignant.
export function groundHeight(x,z){
 // Sous le bâtiment, le terrain reste bien sous les sols : sinon la terre de la forêt ressort à travers le carrelage.
 if(x>-19&&x<20&&z>-5.5&&z<53)return -1
 const dx=Math.max(0,Math.abs(x)-16.5),dz=Math.max(0,-26-z,z+3),d=Math.hypot(dx,dz)
 let k=Math.min(1,Math.max(0,(d-1.5)/12));k=k*k*(3-2*k)
 if(z<-24){let r=Math.min(1,Math.max(0,(Math.abs(x)-4)/6));k*=r*r*(3-2*r)}
 return k*(Math.sin(x*.07+1.2)*Math.cos(z*.06)*1.5+Math.sin(x*.19+z*.13)*.5+Math.sin(x*.41-z*.37)*.14+.5)
}
export const BOLLARDS=[[-2.6,-20.4,0],[2.6,-17.4,.3],[-2.6,-13.2,0],[2.6,-12,0],[-2.6,-8.6,0],[2.6,-7.8,-.16]]
export const LAMP_POSTS=[{x:-3.2,z:-15.5,ry:Math.PI/2},{x:3.4,z:-9.8,ry:-Math.PI/2}]
export const DEAD_TREES=[{x:8.6,z:-18.6},{x:11.8,z:-10.6},{x:-11.2,z:-20.4},{x:-12.4,z:-8.6},{x:13,z:-21.6}]
export const CARS=[{x:-7.6,z:-13,ry:.32},{x:7.5,z:-12.25,ry:1.55}]
// Easter egg : Emmanuel danse juste derrière la voiture de droite. Depuis l'arrivée, le toit cache ses jambes ;
// on ne voit que sa tête et ses bras qui dépassent, tournés vers le chemin.
export const DANCER={x:8.6,z:-10.4,ry:-2.3}
export const EXTERIOR_PROPS=[
 {m:'wheelchair_01',x:2.9,z:-13.2,ry:2.2},
 {m:'hospital_bed',x:6.4,z:-16.9,ry:1.15},
 {m:'plastic_monobloc_chair_01',x:-2.9,z:-10.4,ry:1},
 {m:'WetFloorSign_01',x:1.5,z:-8.3,ry:.5},
 {m:'trashbag',x:-3.1,z:-5.9,ry:0},{m:'trashbag',x:-3.7,z:-6.1,ry:1.4},{m:'trashbag',x:-3.5,z:-5.5,ry:2.6,s:.85},
 {m:'cardboard_box_01',x:-4.5,z:-5.8,ry:.3},{m:'cardboard_box_01',x:-4.45,z:-5.8,y:.34,ry:1.1,s:.85},{m:'cardboard_box_01',x:-5.3,z:-6.3,ry:2},
 {m:'portable_generator',x:-8.7,z:-5.9,ry:.2},
 {m:'drawer_cabinet',x:6.8,z:-5.4,ry:PI},
 {m:'industrial_storage_cart',x:4.6,z:-6.1,ry:.25},
 {m:'worn_metal_rack',x:9.4,z:-5.5,ry:PI},
 {m:'korean_fire_extinguisher_01',x:2.2,z:-5.3,ry:.8},
 {m:'metal_stool_01',x:-9.6,z:-6.3,ry:0},
 {m:'cardboard_box_01',x:10.8,z:-14.2,ry:.8},
 {m:'trashbag',x:10.1,z:-16.8,ry:.7},
 {m:'metal_trash_can',x:-2.6,z:-7.4,ry:1.1},{m:'metal_trash_can',x:-10.2,z:-5.6,ry:.2},
 {m:'Barrel_01',x:11.2,z:-6,ry:0},{m:'Barrel_01',x:12,z:-6.5,ry:1.3},
 {m:'wooden_crate_01',x:12.2,z:-7.7,ry:.5},{m:'wooden_crate_01',x:-12.6,z:-6.4,ry:2},
 {m:'rusted_wheel_rim_01',x:-4.1,z:-19.5,y:.08,rot:[Math.PI/2,0,.6]},{m:'rusted_wheel_rim_01',x:4.6,z:-20.4,y:.08,rot:[Math.PI/2,0,1.9]},
 {m:'concrete_road_barrier_02',x:-2.4,z:-26,ry:.06,tint:'#6d6c68'},{m:'concrete_road_barrier_02',x:0,z:-26.2,ry:-.05,tint:'#6d6c68'},{m:'concrete_road_barrier_02',x:2.5,z:-26,ry:.12,tint:'#6d6c68'},
 {m:'concrete_road_barrier_02',x:-6.8,z:-5.6,ry:.03,tint:'#6d6c68'},
 {m:'bench_broken',x:-9.5,z:-9.0,ry:.4},{m:'bench_wood',x:10.2,z:-8.8,ry:-.3}
]
export const EXTERIOR_COLLIDERS=(()=>{
 const out=EXTERIOR_PROPS.map(p=>{const b=MODEL_BOUNDS[p.m],s=p.s||1,c=Math.abs(Math.cos(p.ry||0)),n=Math.abs(Math.sin(p.ry||0));return {x:p.x,z:p.z,w:(b.size[0]*c+b.size[2]*n)*s,d:(b.size[0]*n+b.size[2]*c)*s}})
 for(const c of CARS){const k=Math.abs(Math.cos(c.ry)),n=Math.abs(Math.sin(c.ry));out.push({x:c.x,z:c.z,w:1.8*k+4.38*n,d:1.8*n+4.38*k})}
 for(const p of LAMP_POSTS)out.push({x:p.x,z:p.z,w:.35,d:.35})
 out.push({x:DANCER.x,z:DANCER.z,w:.6,d:.6})
 for(const t of DEAD_TREES)out.push({x:t.x,z:t.z,w:.45,d:.45})
 for(const x of [-2.35,2.35])out.push({x,z:-7.1,w:.2,d:.2})
 for(const [x,z] of BOLLARDS)out.push({x,z,w:.2,d:.2})
 return out
})()

export function isGateOpen(id, s){
 if(id==='sector'||id==='patients')return !!s.sectorOpen
 if(id==='radio')return !!s.done?.patients
 if(id==='security')return !!s.done?.radio
 if(id==='lab')return !!s.done?.security
 // Pendant la fuite, le joueur ne peut plus repasser par cette porte ; le monstre, si (s.monster).
 if(id==='morgue')return !!s.done?.lab && (!s.chase || !!s.monster)
 if(id==='secret'||id==='secret_exit')return !!s.chase
 if(id==='entrance')return !!s.entranceOpen
 return true
}
const FLOOR_AREAS=(()=>{
 const connectors=ROOMS.map(r=>({x:r.side*2.38,z:r.door,w:1.6,d:2.55}))
 connectors.push({x:-11.8,z:SECRET.entranceZ,w:1.5,d:2.45},{x:-11.8,z:SECRET.exitZ,w:1.5,d:2.45})
 const {xMax,zMin,zMax}=EXTERIOR_ZONE
 connectors.push({x:0,z:(zMin+zMax)/2,w:xMax*2,d:zMax-zMin},{x:0,z:CORRIDOR.zMin,w:DOOR_W,d:1.6})
 return [CORRIDOR,...ROOMS,SECRET,...connectors]
})()
// Obstacles apparus en cours de partie (le fauteuil hanté). Le monstre les bouscule : ils ne l'arrêtent pas.
export const dynamicObstacles=new Map()
export function isOccupied(x,z,s,radius=.32){
 if(!Number.isFinite(x)||!Number.isFinite(z))return true
 if(!s?.monster)for(const c of dynamicObstacles.values()){if(Math.abs(x-c.x)<c.w/2+radius*.75&&Math.abs(z-c.z)<c.d/2+radius*.75)return true}
 for(const w of WALLS){
  if(Math.abs(x-w.x)<w.w/2+radius&&Math.abs(z-w.z)<w.d/2+radius)return true
 }
 for(const g of GATES){if(isDoorPassable(g.id,s))continue
   const w=g.axis==='x'?.20:g.w, d=g.axis==='z'?.20:g.w
   if(Math.abs(x-g.x)<w/2+radius&&Math.abs(z-g.z)<d/2+radius)return true
 }
 for(const c of COLLIDERS){
  if(Math.abs(x-c.x)<c.w/2+radius*.75&&Math.abs(z-c.z)<c.d/2+radius*.75)return true
 }
 if(z<EXTERIOR_ZONE.zMax+1)for(const c of EXTERIOR_COLLIDERS){if(Math.abs(x-c.x)<c.w/2+radius*.75&&Math.abs(z-c.z)<c.d/2+radius*.75)return true}
 return !FLOOR_AREAS.some(r=>Math.abs(x-r.x)<r.w/2-.18&&Math.abs(z-r.z)<r.d/2-.18)
}
// Déplacement avec glissement le long des obstacles ; renvoie la position finale.
export function moveWithCollision(x,z,dx,dz,s,radius=.32){
 let nx=x,nz=z
 if(!isOccupied(x+dx,z,s,radius))nx=x+dx
 if(!isOccupied(nx,z+dz,s,radius))nz=z+dz
 return {x:nx,z:nz}
}
export function isInteractiveAvailable(p,s){
 if(p.type==='hide'&&(s.outside||s.hiding))return false
 // Une discussion en marchant : la cachette ne doit pas l'interrompre par inadvertance, sauf s'il y a du danger.
 if(p.type==='hide'&&s.modal&&!s.chase&&!s.encounter)return false
 if(p.id==='squatter'&&s.hasKey)return false
 if(p.id==='sector'&&s.sectorOpen)return false
 if(p.id==='morgue'&&s.usb)return false
 if(['patients','radio','security','lab'].includes(p.id)&&s.done?.[p.id])return false
 if(['exit','secret'].includes(p.id)&&!s.chase)return false
 if(p.id==='hospital_door'&&(!s.outside||s.entranceOpen))return false
 if(p.id==='bed203'&&!s.sectorOpen)return false
 // Un ordinateur ne s'active pas depuis la pièce voisine, à travers le mur.
 if(p.id==='patients'&&x_side(p,s)>-2.7)return false
 if(p.id==='radio'&&x_side(p,s)<2.7)return false
 if(p.id==='security'&&x_side(p,s)>-2.7)return false
 if(p.id==='lab'&&x_side(p,s)<2.7)return false
 if(p.id==='morgue'&&x_side(p,s)>-2.7)return false
 return true
}
function x_side(p,s){return s._px??p.x}
// Portes de pièces : déverrouillées par la progression, puis ouvertes à la main par le joueur.
export const ROOM_DOORS=['patients','radio','security','lab','morgue']
// Sans suivi des portes (doorsOpened absent, ex. validation d'une sauvegarde), seule la progression compte.
export function isDoorPassable(id,s){
 if(!isGateOpen(id,s))return false
 return !ROOM_DOORS.includes(id)||!s.doorsOpened||!!s.doorsOpened[id]
}
// Porte fermée à l'image. Le monstre qui force celle de la morgue, condamnée pour le joueur pendant la fuite, l'ouvre le temps de passer.
export const isDoorShut=(id,s)=>!isDoorPassable(id,s)&&s.monsterDoor!==id
// Première porte fermée sur le segment entre deux points : on ne voit ni n'attrape personne à travers.
export function closedDoorBetween(ax,az,bx,bz,s){
 for(const g of GATES){
  if(!isDoorShut(g.id,s))continue
  const [a0,a1,b0,b1,plane,mid]=g.axis==='x'?[ax,bx,az,bz,g.x,g.z]:[az,bz,ax,bx,g.z,g.x]
  if((a0-plane)*(a1-plane)>=0)continue
  const along=b0+(b1-b0)*(plane-a0)/(a1-a0)
  if(Math.abs(along-mid)<=g.w/2+.1)return g.id
 }
 return null
}
export const REACH=2.8
// Identifiant de la pièce fermée contenant ce point, ou null (couloir, galerie).
export const roomIdAt=(x,z)=>ROOMS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)?.id??null
// Pièces à dessiner : celle où l'on est, et celles dont une porte ouverte est assez proche pour qu'on voie dedans.
const SEE_THROUGH_DOOR=24
export function visibleRooms(x,z,s,yaw=null,range=SEE_THROUGH_DOOR){
 const out=new Set(),here=roomIdAt(x,z)
 if(here)out.add(here)
 for(const r of ROOMS){
  if(r.id===here)continue
  const gated=GATES.some(g=>g.id===r.id)
  if(!(!gated||isDoorPassable(r.id,s)))continue
  const dx=r.side*2.25-x,dz=r.door-z,d=Math.hypot(dx,dz)
  if(d>=range)continue
  // Porte nettement derrière le joueur : rien à voir de cette pièce. La marge évite toute apparition en tournant la tête.
  if(yaw!==null&&d>5&&(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d<-.3)continue
  out.add(r.id)
 }
 // Dans la galerie secrète ou à sa porte : l'accueil et la morgue se voient par ses deux extrémités.
 if(x<-9&&s.chase){out.add('accueil');out.add('morgue')}
 return out
}
export const gateBox=g=>g.axis==='x'?[g.x,1.5,g.z,.25,1.5,g.w/2]:[g.x,1.5,g.z,g.w/2,1.5,.25]
// Distance d'entrée du rayon dans une boîte centre/demi-tailles (méthode des plaques), ou null s'il la manque.
function rayBox(o,d,b,maxDist){
 let near=0,far=maxDist
 for(let i=0;i<3;i++){
  const lo=b[i]-b[i+3],hi=b[i]+b[i+3]
  if(Math.abs(d[i])<1e-9){if(o[i]<lo||o[i]>hi)return null;continue}
  let t1=(lo-o[i])/d[i],t2=(hi-o[i])/d[i];if(t1>t2)[t1,t2]=[t2,t1]
  near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null
 }
 return near
}
// Ce que le joueur vise : le rayon part de l'œil, s'arrête au premier mur ou à la première porte fermée,
// et renvoie la cible la plus proche sur son trajet. d = direction normalisée.
export function raycastTarget(ox,oy,oz,dx,dy,dz,s,maxDist=REACH){
 const o=[ox,oy,oz],d=[dx,dy,dz],st={...s,_px:ox}
 let best=null,bestT=Infinity
 const consider=(target,box)=>{const t=rayBox(o,d,box,maxDist);if(t!==null&&t<bestT){bestT=t;best=target}}
 for(const p of INTERACTIVES)if(isInteractiveAvailable(p,st))consider(p,p.hit)
 for(const g of GATES){
  if(['sector','secret','entrance'].includes(g.id))continue
  const box=gateBox(g)
  if(!isGateOpen(g.id,s))consider({id:'locked_'+g.id,label:'Porte verrouillée',type:'locked',door:g.id,hit:box},box)
  else if(!isDoorPassable(g.id,s))consider({id:'door_'+g.id,label:'Ouvrir la porte',type:'door',door:g.id,hit:box},box)
  // Quand le danger rôde, on peut refermer une porte derrière soi pour gagner quelques secondes.
  else if((s.chase||s.encounter)&&ROOM_DOORS.includes(g.id))consider({id:'close_'+g.id,label:'Fermer la porte',type:'door',door:g.id,hit:box},box)
 }
 if(!best)return null
 for(const w of WALLS){const t=rayBox(o,d,[w.x,WALL_H/2,w.z,w.w/2,WALL_H/2,w.d/2],bestT);if(t!==null&&t<bestT)return null}
 for(const g of GATES){if(g.id===best.door||isDoorPassable(g.id,s))continue
  const t=rayBox(o,d,gateBox(g),bestT);if(t!==null&&t<bestT)return null}
 return best
}
// Au doigt, viser au pixel près est pénible et l'on regarde rarement vers le bas : on tente le centre, puis de petits écarts (lacet, tangage en radians).
const AIM_ASSIST=[[0,0],[.07,0],[-.07,0],[0,-.08],[0,.07],[.14,0],[-.14,0],[0,-.17],[.1,-.17],[-.1,-.17],[0,-.28],[.12,-.28],[-.12,-.28],[0,-.4]]
export function assistedTarget(ox,oy,oz,yaw,pitch,s,maxDist=REACH){
 for(const [dy,dp] of AIM_ASSIST){
  const y=yaw+dy,p=pitch+dp,c=Math.cos(p)
  const hit=raycastTarget(ox,oy,oz,Math.sin(y)*c,Math.sin(p),Math.cos(y)*c,s,maxDist)
  if(hit)return hit
 }
 return null
}
// Centre de la cible d'identifiant donné (sert à viser dans les tests).
export function targetCenter(id){
 const it=INTERACTIVES.find(p=>p.id===id);if(it)return it.hit.slice(0,3)
 const g=GATES.find(g=>'locked_'+g.id===id||'door_'+g.id===id);return g?gateBox(g).slice(0,3):null
}
export function zoneName(x,z){
 if(z<EXTERIOR_ZONE.zMax)return 'PARVIS DE L’HÔPITAL'
 const r=ROOMS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)
 if(r)return r.title
 if(Math.abs(x-SECRET.x)<SECRET.w/2)return 'PASSAGE SECRET'
 return 'COULOIR PRINCIPAL'
}
export function roomAt(x,z){
 if(z<EXTERIOR_ZONE.zMax)return 'parvis'
 const r=ROOMS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)
 if(r)return r.id
 if(Math.abs(x-SECRET.x)<SECRET.w/2)return 'secret'
 return 'couloir'
}
// Lumières ponctuelles du parvis (le lampadaire proche a en plus un projecteur avec ombres, voir Exterior.jsx).
export const EXTERIOR_POINT_LIGHTS=[
 {p:[LAMP_POSTS[0].x,5,LAMP_POSTS[0].z],color:'#ffcfa0',strength:6,distance:9,decay:1.8,flick:'lamp',when:'outside'},
 {p:[LAMP_POSTS[1].x,4.68,LAMP_POSTS[1].z],color:'#ffd6ab',strength:16,distance:18,decay:1.7,flick:'dying',when:'outside'},
 {p:[0,2.9,-6.2],color:'#b9d6cf',strength:9,distance:9,decay:1.9,when:'outside'}
]

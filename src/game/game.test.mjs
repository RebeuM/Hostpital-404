import {DIFFICULTIES,DIFFICULTY_IDS,difficultyOf} from './difficulty.js'
import {GAME_TIME,PENALTY_SECONDS,timeLeft,timerLevel,noPenalties} from './timer.js'
import {scaleSenses,stepLunge,LUNGE} from './monsterBrain.js'
import {pickEncounterKind,falseAlarmDist,FALSE_ALARM,RESPITE} from './dread.js'
import {dynamicObstacles,assistedTarget,closedDoorBetween,isDoorShut,isInteractiveAvailable,ROOM_DOORS} from './layout.js'
import {STICK,stickVector,viewFov,lampPose,textureLimit,TEXTURE_LIMIT,limitTextureDecode} from './phone.js'
import {roomSoundOf,roomEventDelay,pickRoomEvent} from './roomSound.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {MODEL_BOUNDS} from './modelBounds.js'
import {EXTERIOR_PROPS,HIDE_SPOTS,WALLS,ROOMS,GATES,PROPS,COLLIDERS,INTERACTIVES,SAFE_SPOTS,isOccupied,isGateOpen,isDoorPassable,visibleRooms,groundHeight,raycastTarget,targetCenter,OUTSIDE_START,CARS,moveWithCollision,zoneName,roomAt} from './layout.js'
import {PUZZLES,STORIES,PROLOGUE,validateAnswer,focusFor,MORGUE_ADRIEN_STEP} from './story.js'
import {emptyFlags,normalizeFlags,inventoryFor,journalFor,chapterFor,solvedCount,ITEMS} from './progression.js'
import {parseSave,serializeSave,readSave,writeSave,clearSave,SAVE_VERSION} from './save.js'
import {sanitizeSettings,DEFAULT_SETTINGS,loadSettings,saveSettings,QUALITIES,QUALITY_PRESETS,qualityForGpu} from './settings.js'
import {useGame,runtime,isSimRunning} from './store.js'
import {addRecord,readRecords,rankedRecords,bestTime,formatTime,RECORDS_KEY} from './records.js'
import {buildNavGrid,computeDistances,nextWaypoint,hasLineOfSight,pathLength,NAV_BOUNDS} from './chaseNav.js'
import {DREAD_EVENTS,pickDread,dreadDelay,flickerLevel,dangerLevel,heartPeriod} from './dread.js'
import {radialDeadzone,lookCurve,nearestInDirection} from './gamepad.js'
import {stepStamina} from './stamina.js'
import {CHASE_SENSES,perceives,huntSpeed,sawHiding} from './monsterBrain.js'
import {SCARE_VARIANTS,CAPTURE_SCARE,CAPTURE_SCARE_DELAY,scareVariant,pickScare,canAmbientScare,ambientScareReady,ambientScareDelay,pickLaughSpot} from './scares.js'
import {VOICES,voiceFor,PROLOGUE_VOICES,prologueVoice} from './voices.js'
import {ACHIEVEMENTS,ACHIEVEMENT_KEY,loadAchievements,saveAchievements} from './achievements.js'
import {pickGrowl,growlDelay,GROWL_SEGMENTS} from './growls.js'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const flags=()=>({...emptyFlags()})
// Mémoire de stockage simulant localStorage.
function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}

// ---------------------------------------------------------------------------
test('Plan : 7 zones, 9 portails (dont l’entrée condamnée), murs typés',()=>{
 assert.equal(ROOMS.length,7);assert.equal(GATES.length,9)
 assert.ok(WALLS.length>40);assert.ok(WALLS.every(w=>['wall','corridor','tiles','concrete'].includes(w.kind)))
 assert.ok(WALLS.some(w=>w.kind==='tiles'),'le laboratoire et la morgue sont carrelés')
})
test('Portail du secteur : fermé puis ouvert après la rencontre',()=>{
 const s=flags()
 assert.equal(isOccupied(0,8.32,s),true);assert.equal(isOccupied(-2.25,12.3,s),true)
 s.sectorOpen=true
 assert.equal(isOccupied(0,8.32,s),false);assert.equal(isOccupied(-2.25,12.3,s),false)
})
test('Progression ordonnée : radiologie > sécurité > laboratoire > morgue',()=>{
 const s=flags();s.sectorOpen=true
 for(const [x,z,id,prereq] of [[2.25,14,'radio','patients'],[-2.25,26,'security','radio'],[2.25,30,'lab','security'],[-2.25,42,'morgue','lab']]){
  assert.equal(isOccupied(x,z,s),true,`${id} fermée`)
  s.done[prereq]=true
  assert.equal(isOccupied(x,z,s),false,`${id} ouverte`)
 }
})
test('Chemin de fuite dégagé : morgue → galerie → accueil → sortie',()=>{
 const s=flags();s.hasKey=true;s.sectorOpen=true;s.done={patients:true,radio:true,security:true,lab:true};s.usb=true;s.chase=true
 const path=[[-8,43],[-10.7,43],[-11.9,43],[-12.6,43],[-13.25,43],[-13.25,20],[-13.25,2.8],[-12.6,2.8],[-11.9,2.8],[-11.2,2.8],[-9,2.8],[-5,2.6],[-2.4,2.0],[-1,1.5],[0,-1],[0,-3.2]]
 for(const [x,z] of path)assert.equal(isOccupied(x,z,s,.32),false,`point libre (${x}, ${z})`)
})
test('Galerie secrète réservée à la fuite ; la morgue et l’entrée restent bloquées',()=>{
 const s=flags();s.done.lab=true
 assert.equal(isOccupied(-11.9,43,s),true);assert.equal(isOccupied(-11.9,2.8,s),true)
 s.chase=true
 assert.equal(isOccupied(-11.9,43,s),false);assert.equal(isOccupied(-11.9,2.8,s),false)
 assert.equal(isOccupied(-2.25,42,s),true,'la porte de la morgue se verrouille derrière Thomas')
 assert.equal(isGateOpen('entrance',s),false,'la double porte de l’entrée est condamnée')
})
test('Murs latéraux, extérieur et mobilier bloquent le joueur',()=>{
 const s=flags();s.sectorOpen=true
 assert.equal(isOccupied(2.25,20,s),true);assert.equal(isOccupied(0,20,s),false);assert.equal(isOccupied(100,100,s),true)
 assert.equal(isOccupied(NaN,3,s),true)
 const desk=PROPS.find(p=>p.m==='metal_office_desk')
 assert.equal(isOccupied(desk.x,desk.z,s),true,'le bureau d’accueil est solide')
 const laptop=PROPS.find(p=>p.m==='classic_laptop')
 assert.equal(laptop.collide,false,'les objets posés sur les tables n’ont pas de volume propre')
 assert.ok(COLLIDERS.length>60)
})
test('Glissement le long des obstacles : on ne traverse pas, on longe',()=>{
 const s=flags()
 // Face au mur est du couloir (x=2.25), un pas en diagonale avance en z sans franchir le mur.
 const r=moveWithCollision(1.7,0,.6,.3,s)
 assert.equal(r.x,1.7);assert.ok(r.z>0)
 const blocked=moveWithCollision(0,7.5,0,1.2,s)
 assert.equal(blocked.z,7.5,'le portail fermé arrête le mouvement')
})
test('Points de reprise sûrs et objets interactifs accessibles',()=>{
 for(const [ch,p] of Object.entries(SAFE_SPOTS)){
  const s=flags();if(+ch>=2)s.sectorOpen=true;if(+ch>=3)s.done.patients=true;if(+ch>=4)s.done.radio=true;if(+ch>=5)s.done.security=true;if(+ch>=6)s.done.lab=true;if(+ch>=7){s.usb=true;s.chase=true}
  assert.equal(isOccupied(p.x,p.z,s,.34),false,`position de reprise du chapitre ${ch} libre`)
 }
 const all=flags();all.sectorOpen=true;all.done={patients:true,radio:true,security:true,lab:true};all.chase=true
 for(const it of INTERACTIVES){
  let reachable=false
  for(let a=0;a<12&&!reachable;a++){const d=1.0;const x=it.x+Math.cos(a*Math.PI/6)*d,z=it.z+Math.sin(a*Math.PI/6)*d;if(!isOccupied(x,z,all,.32))reachable=true}
  assert.ok(reachable,`un emplacement libre existe à 1 m de « ${it.label} »`)
 }
})
// Rayon depuis l'œil vers un point visé.
const aim=(x,z,[tx,ty,tz],s)=>{const dx=tx-x,dy=ty-1.68,dz=tz-z,l=Math.hypot(dx,dy,dz);return raycastTarget(x,1.68,z,dx/l,dy/l,dz/l,s)}
test('Raycast : seule la cible visée, à portée et sans obstacle, est sélectionnée',()=>{
 const s=flags()
 assert.equal(aim(-6,3.7,targetCenter('squatter'),s)?.id,'squatter')
 assert.equal(raycastTarget(-6,1.68,3.7,-1,0,0,s),null,'dos tourné, rien n’est visé')
 assert.equal(raycastTarget(-6,1.68,3.7,0,1,0,s),null,'regard au plafond, rien n’est visé')
 assert.equal(aim(-9.5,3.7,targetCenter('squatter'),s),null,'trop loin')
 s.hasKey=true
 assert.equal(aim(-6,3.7,targetCenter('squatter'),s),null,'le squatteur ne se répète pas')
})
test('Raycast : les murs et les portes fermées arrêtent le rayon',()=>{
 const s={...flags(),sectorOpen:true}
 assert.equal(aim(-2.0,17.9,targetCenter('patients'),s),null,'le tiroir ne se vise pas à travers le mur du couloir')
 assert.equal(aim(.5,14,targetCenter('locked_radio'),s)?.id,'locked_radio','une porte verrouillée s’annonce')
 assert.equal(aim(.5,12.3,targetCenter('door_patients'),{...s,doorsOpened:{}})?.id,'door_patients')
 assert.equal(aim(-1.2,12.3,targetCenter('door_patients'),{...s,doorsOpened:{patients:true}}),null,'une porte ouverte n’est plus une cible')
})
test('Chaque cible se vise depuis un point libre devant elle',()=>{
 const all={...flags(),sectorOpen:true,chase:false,done:{}}
 for(const it of INTERACTIVES){
  if(['exit','secret','sector','squatter','hospital_door'].includes(it.id))continue
  let ok=false;const [cx,,cz]=it.hit
  for(let a=0;a<24&&!ok;a++)for(const d of [1.2,1.8,2.3]){const x=cx+Math.cos(a*Math.PI/12)*d,z=cz+Math.sin(a*Math.PI/12)*d
   if(isOccupied(x,z,{...all,hasKey:true},.32))continue
   if(aim(x,z,it.hit,{...all,hasKey:true})?.id===it.id){ok=true;break}}
  assert.ok(ok,`${it.id} visable`)
 }
})
test('Portes : déverrouillées par la progression, ouvertes à la main',()=>{
 const s={...flags(),sectorOpen:true,doorsOpened:{}}
 assert.equal(isGateOpen('patients',s),true);assert.equal(isDoorPassable('patients',s),false,'déverrouillée mais fermée')
 assert.equal(isOccupied(-2.25,12.3,s),true,'une porte fermée bloque le passage')
 s.doorsOpened.patients=true
 assert.equal(isDoorPassable('patients',s),true);assert.equal(isOccupied(-2.25,12.3,s),false)
 assert.equal(isDoorPassable('radio',{...s,doorsOpened:{radio:true}}),false,'ouvrir ne contourne pas le verrou')
 assert.equal(isDoorPassable('sector',s),true,'le portail s’ouvre avec l’histoire')
 s.chase=true;s.done={lab:true};s.doorsOpened.morgue=true
 assert.equal(isDoorPassable('morgue',s),false,'la morgue se referme pendant la fuite')
 assert.equal(isDoorPassable('secret',s),true)
})
test('Ouvrir une porte par interaction, porte verrouillée qui tremble',()=>{
 useGame.setState({phase:'playing',paused:false,modal:null,journalVisible:false,settingsVisible:false,capture:false,sectorOpen:true,chase:false,done:{},doorsOpened:{},doorRattle:null,near:{id:'door_patients',door:'patients',type:'door'}})
 useGame.getState().interact();assert.equal(useGame.getState().doorsOpened.patients,true)
 useGame.setState({near:{id:'locked_radio',door:'radio',type:'locked'}})
 useGame.getState().interact();assert.equal(useGame.getState().doorRattle.id,'radio');assert.equal(useGame.getState().doorsOpened.radio,undefined)
})
test('Records : classement des parties terminées, données corrompues ignorées',()=>{
 const st=memoryStorage()
 assert.equal(bestTime(readRecords(st)),null)
 assert.equal(addRecord({time:300,ending:'exit',at:1},st).isBest,true,'premier temps')
 assert.equal(addRecord({time:400,ending:'exit',at:2},st).isBest,false)
 assert.equal(addRecord({time:100,ending:'caught',at:3},st).isBest,false,'une capture ne bat pas le record')
 assert.equal(bestTime(readRecords(st)),300,'une capture n’est pas classée')
 assert.equal(readRecords(st).length,3,'la capture reste enregistrée')
 assert.equal(addRecord({time:250,ending:'exit',at:4},st).isBest,true)
 assert.deepEqual(rankedRecords(readRecords(st)).map(r=>r.time),[250,300,400])
 st.setItem(RECORDS_KEY,'{corrompu');assert.deepEqual(readRecords(st),[])
 st.setItem(RECORDS_KEY,JSON.stringify([{time:'x'},{time:5,ending:'exit',at:1}]));assert.equal(readRecords(st).length,1)
 assert.equal(formatTime(0),'00:00');assert.equal(formatTime(75.9),'01:15');assert.equal(formatTime(3725),'62:05')
})
test('Fin de partie : le temps est enregistré une seule fois',()=>{
 useGame.setState({phase:'playing',elapsed:123,lastRecord:null})
 useGame.getState().end('exit')
 const r=useGame.getState().lastRecord;assert.equal(r.time,123);assert.equal(r.ending,'exit')
 useGame.getState().end('caught');assert.equal(useGame.getState().lastRecord,r,'pas de second enregistrement')
})
test('Voix : les terminaux ne sont plus doublés',()=>{
 const all=Object.values(VOICES).flat()
 assert.equal(all.some(v=>/terminal/.test(v.file)),false)
 assert.equal(voiceFor('reception_pc',0),null);assert.equal(voiceFor('lab',0),null)
 assert.ok(voiceFor('lab',4),'l’enregistrement de Maxime reste doublé')
})
test('Parvis : accessible par la porte ouverte seulement, parcours libre jusqu’à l’entrée',()=>{
 const s={...flags(),outside:true,entranceOpen:false}
 assert.equal(isOccupied(0,-4.6,s),true,'porte fermée')
 assert.equal(isOccupied(0,-4.6,{...s,entranceOpen:true}),false,'porte ouverte')
 for(let z=OUTSIDE_START.z;z<-5.2;z+=.5)assert.equal(isOccupied(0,z,s,.32),false,`allée dégagée (${z})`)
 assert.equal(isOccupied(0,-25,s),true,'le portail extérieur ferme le parvis');assert.equal(isOccupied(16,-12,s),true)
 assert.equal(isOccupied(CARS[0].x,CARS[0].z,s),true,'la voiture est solide')
 assert.equal(aim(0,-7,targetCenter('hospital_door'),s)?.id,'hospital_door')
 assert.equal(aim(0,-7,targetCenter('hospital_door'),{...s,entranceOpen:true}),null,'porte ouverte : plus de cible')
 assert.equal(zoneName(0,-12),'PARVIS DE L’HÔPITAL')
})
// Ces parcours enchaînent les actions sans laisser passer de temps : on y retire l'anti-rebond, testé à part.
const withoutInteractGuard=t=>{Object.defineProperty(runtime,'dialogClosedAt',{configurable:true,get:()=>-1e9,set(){}});t.after(()=>{delete runtime.dialogClosedAt;runtime.dialogClosedAt=-1e9})}
test('Dialogues : on marche pendant certains, les face-à-face et révélations gardent la main',t=>{
 withoutInteractGuard(t)
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital()
 let s=useGame.getState();assert.equal(s.dialog,'intro');assert.equal(s.dialogWalk,true);assert.equal(isSimRunning(s),true,'on marche pendant l’arrivée')
 g.setNear({id:'squatter'});g.interact();assert.equal(useGame.getState().dialog,'intro','pas d’interaction pendant un dialogue en cours')
 g.closeModal();s=useGame.getState();assert.equal(s.dialogWalk,false)
 g.setNear({id:'squatter'});g.interact();s=useGame.getState();assert.equal(s.dialog,'squatter');assert.equal(s.dialogWalk,false);assert.equal(isSimRunning(s),false,'le face-à-face bloque')
 g.closeModal();g.setNear({id:'tv'});g.interact();s=useGame.getState();assert.equal(s.dialog,'tv');assert.equal(isSimRunning(s),true,'une réflexion ne bloque pas')
 g.closeModal()
 for(const [id,story] of Object.entries(STORIES))if(story.walkable)assert.ok(!story.lines.some(l=>l.item||l.blackout),`${id} : pas d’objet ni de blackout en marchant`)
})
test('Grognements : passages valides, lointains ou proches, délais irréguliers',()=>{
 let close=0,far=0;const seen=new Set()
 for(let i=0;i<400;i++){const g=pickGrowl();seen.add(g.offset);assert.ok(g.offset+g.duration<=14,'dans le fichier');assert.ok(Math.abs(g.pan)<=1)
  if(g.close){close++;assert.ok(g.dist<=4)}else{far++;assert.ok(g.dist>=9)}
  assert.ok(growlDelay(Math.random,true)>=6&&growlDelay()>=15)}
 assert.equal(seen.size,GROWL_SEGMENTS.length,'les trois grognements servent');assert.ok(close>0&&far>close,'surtout lointains')
})
test('Pièces dessinées : la sienne, et celles dont une porte ouverte est proche',()=>{
 const s={...flags(),sectorOpen:true,done:{},doorsOpened:{}}
 assert.ok(visibleRooms(-7,13,s).has('patients'),'on voit toujours sa pièce, porte fermée')
 assert.equal(visibleRooms(0,13,s).has('patients'),false,'porte fermée : rien à dessiner depuis le couloir')
 assert.ok(visibleRooms(0,13,{...s,doorsOpened:{patients:true}}).has('patients'))
 assert.ok(visibleRooms(0,3,s).has('accueil'),'l’accueil n’a pas de porte')
 assert.equal(visibleRooms(0,45,s).has('accueil'),false,'trop loin pour voir dedans')
 assert.ok(visibleRooms(-13.2,20,{...s,chase:true}).has('morgue'),'la galerie mène à la morgue')
 assert.ok(visibleRooms(0,-2,s,0).has('accueil'),'porte de côté, devant soi')
 assert.equal(visibleRooms(0,20,{...s,doorsOpened:{patients:true}},0).has('patients'),false,'porte loin derrière : pièce non dessinée')
 assert.ok(visibleRooms(0,20,{...s,doorsOpened:{patients:true}},Math.PI).has('patients'),'en se retournant, elle revient')
})
test('Énigme SQL : tolère apostrophes courbes, accents, casse et ordre des conditions',()=>{
 for(const q of ["SELECT * FROM patients WHERE nom = ’Vasseur’ AND prenom = ’Eleonore’ AND annee_deces = 2018 ;","select * from patients where prenom='Éléonore' and annee_deces=2018 and nom='vasseur'","SELECT *\nFROM patients\nWHERE nom=\"Vasseur\" AND prenom=\"Eleonore\" AND annee_deces='2018';"])assert.equal(validateAnswer('lab',q),true,q)
 for(const q of ["SELECT * FROM patients","SELECT nom FROM patients WHERE nom='Vasseur' AND prenom='Eleonore' AND annee_deces=2018","SELECT * FROM patients WHERE nom='Vasseur' AND prenom='Eleonore' AND annee_deces=2017","SELECT * FROM patients WHERE nom='Vasseur' AND prenom='Eleonore' AND annee_deces=2018 AND 1=1"])assert.equal(validateAnswer('lab',q),false,q)
})
test('Indices : un indice déjà lu reste lisible',()=>{
 const s={...flags(),sectorOpen:true,hasKey:true,readNote:true,seen:{tv:true,reception_pc:true,bed203:true}}
 assert.equal(aim(9.8,2,[11.54,1.9,2],s)?.id,'note','la feuille de la note se vise, et se relit')
 assert.equal(aim(-7.7,3,targetCenter('tv'),s)?.id,'tv')
 assert.equal(aim(-5.8,3,targetCenter('reception_pc'),s)?.id,'reception_pc')
 assert.equal(aim(-8.4,14.5,targetCenter('bed203'),s)?.id,'bed203')
})
test('Screamers surprises : seulement en exploration libre, au changement de pièce ou après une attente',()=>{
 const free={phase:'playing',settings:{jumpscares:true},outside:false,modal:null,paused:false,chase:false,capture:false,blackout:null,scare:null,journalVisible:false,settingsVisible:false}
 assert.equal(canAmbientScare(free),true)
 for(const k of [{outside:true},{modal:'story'},{modal:'puzzle'},{paused:true},{chase:true},{capture:true},{blackout:'dark'},{scare:{}},{journalVisible:true},{settingsVisible:true},{phase:'menu'},{settings:{jumpscares:false}}])assert.equal(canAmbientScare({...free,...k}),false,JSON.stringify(k))
 assert.equal(ambientScareReady(5,true),false);assert.equal(ambientScareReady(0,false),false);assert.equal(ambientScareReady(-1,true),true);assert.equal(ambientScareReady(-16,false),true)
 for(const r of [0,.5,.999]){assert.ok(ambientScareDelay(()=>r,true)>=35);assert.ok(ambientScareDelay(()=>r)>=55)}
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();runtime.ambientScareIn=.05
 useGame.getState().tickAmbientScare(.1,false);assert.equal(useGame.getState().scare,null,'attend un changement de pièce')
 useGame.getState().tickAmbientScare(.1,true);assert.ok(useGame.getState().scare,'se déclenche au changement de pièce');assert.ok(runtime.ambientScareIn>=55,'le suivant est reprogrammé')
 useGame.getState().clearScare()
})
test('Rire 3D : autour du joueur dans toutes les directions, jamais sur lui, et seulement en exploration libre',()=>{
 const seen=new Set();for(let i=0;i<400;i++){const s=pickLaughSpot(10,20);const d=Math.hypot(s.x-10,s.z-20);assert.ok(d>=5&&d<=13,`distance ${d}`);seen.add((s.x>10?'E':'O')+(s.z>20?'N':'S'))}
 assert.equal(seen.size,4,'devant, derrière, à gauche et à droite')
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();runtime.laughIn=.05
 const n=useGame.getState().eventCount
 useGame.setState({modal:'story'});useGame.getState().tickLaugh(.1);assert.equal(useGame.getState().eventCount,n,'pas pendant un dialogue')
 useGame.setState({modal:null});useGame.getState().tickLaugh(.1);assert.equal(useGame.getState().lastEvent.type,'laugh');assert.ok(runtime.laughIn>=50,'le suivant est reprogrammé')
})
const MONSTER_SPEED=2.75
test('Monstre : il rejoint le joueur partout, sans traverser les murs',()=>{
 const s={sectorOpen:true,hasKey:true,chase:true,monster:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{patients:true,radio:true,security:true,lab:true,morgue:true}}
 const g=buildNavGrid((x,z)=>isOccupied(x,z,s,.28))
 const walk=(px,pz,x=-3,z=42)=>{const f=computeDistances(g,px,pz);for(let i=0;i<4000;i++){if(Math.hypot(px-x,pz-z)<1.3)return {x,z,t:i*.05};const w=nextWaypoint(g,f,x,z,px,pz);assert.ok(w.reachable,`chemin vers (${px}, ${pz})`);const dx=w.x-x,dz=w.z-z,l=Math.hypot(dx,dz)||1,st=Math.min(l,.1375);x+=st*dx/l;z+=st*dz/l}assert.fail(`n'atteint pas (${px}, ${pz})`)}
 // Partout où le joueur peut réellement aller : il se déplace pas à pas depuis le couloir, passage secret et morgue compris.
 const f0=computeDistances(g,-3,42),open={...s,monster:false},step=.1,key=(x,z)=>Math.round(x/step)+','+Math.round(z/step)
 const seen=new Set([key(0,30)]),q=[[0,30]]
 while(q.length){const [x,z]=q.pop();for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(seen.has(k)||isOccupied(nx,nz,open,.32))continue;seen.add(k);q.push([nx,nz]);assert.ok(Number.isFinite(pathLength(g,f0,nx,nz)),`joueur hors de portée en (${nx.toFixed(1)}, ${nz.toFixed(1)})`)}}
 assert.ok(seen.size>50000,`${seen.size} positions testées`)
 for(const [x,z] of [[-13.25,20],[0,0],[-8,2.8],[10,31],[0,30]])walk(x,z)
 // Pas de prise à travers un mur : joueur dans le passage secret, monstre juste de l'autre côté.
 assert.equal(hasLineOfSight(g,-11.75,20,-10.6,20),false,'le mur du passage bloque la vue')
 assert.equal(hasLineOfSight(g,0,10,0,11.2),true,'vue dégagée dans le couloir')
 // Le chemin de fuite reste gagnable en courant ; à la marche, le monstre rattrape le joueur.
 const flee=(speed,hesitate=0,level=DIFFICULTIES.normal)=>{
  const lunge={left:0,wait:4}
  const route=[[-8,43],[-13.25,43],[-13.25,2.8],[-7,2.8],[-2.3,2],[0,-3.2]]
  let stam={value:1,exhausted:false},px=-6,pz=42.5,leg=0,mx=-3,mz=42,wait=2.4,t=0,lost=hesitate,closest=Infinity,field=computeDistances(g,px,pz),replan=0
  while(leg<route.length&&t<60){
   const dt=.05;t+=dt
   if(lost>0)lost-=dt;else{const [gx,gz]=route[leg],dx=gx-px,dz=gz-pz,l=Math.hypot(dx,dz);stam=stepStamina(stam,dt,{wantsRun:speed>3,moving:true,seconds:level.staminaSeconds});if(l<.15)leg++;else{const st=Math.min(l,(stam.running?speed:2.3)*dt);px+=st*dx/l;pz+=st*dz/l}}
   if(wait>0){wait-=dt;continue}
   replan-=dt;if(replan<=0){replan=.25;field=computeDistances(g,px,pz,field)}
   const w=nextWaypoint(g,field,mx,mz,px,pz),dx=w.x-mx,dz=w.z-mz,l=Math.hypot(dx,dz)||1,boost=level.lunge?stepLunge(lunge,dt,true,pathLength(g,field,mx,mz),()=>0):1,st=Math.min(l,MONSTER_SPEED*level.monster*boost*dt);mx+=st*dx/l;mz+=st*dz/l
   const d=Math.hypot(px-mx,pz-mz);closest=Math.min(closest,d)
   if(d<1.5&&hasLineOfSight(g,mx,mz,px,pz))return {caught:true,t,closest}
  }
  return {caught:false,t,closest}
 }
 const run=flee(3.9),hesitant=flee(3.9,1.5),slow=flee(2.3)
 assert.equal(run.caught,false,`en courant : ${JSON.stringify(run)}`)
 assert.equal(hesitant.caught,false,`en courant après 1,5 s d'hésitation : ${JSON.stringify(hesitant)}`)
 assert.equal(slow.caught,true,`à la marche : ${JSON.stringify(slow)}`)
 console.log('fuite',JSON.stringify({run,hesitant,slow}))
 // Chaque mode reste gagnable en courant franchement, jamais à la marche ; le pire cas suppose qu'il voit toujours le joueur et bondit dès qu'il peut.
 for(const id of DIFFICULTY_IDS){
  const level=DIFFICULTIES[id],a=flee(3.9,0,level),b=flee(3.9,1,level),c=flee(2.3,0,level)
  console.log('fuite '+id,JSON.stringify({net:a,hesite:b,marche:c}))
  assert.equal(a.caught,false,`${id} en courant`);assert.equal(b.caught,false,`${id} après 1 s d'hésitation`);assert.equal(c.caught,true,`${id} à la marche`)
 }
})
test('Difficulté : réglage validé, normale par défaut, sens mis à l’échelle',()=>{
 assert.equal(sanitizeSettings({}).difficulty,'normal');assert.equal(sanitizeSettings({difficulty:'hard'}).difficulty,'hard');assert.equal(sanitizeSettings({difficulty:'x'}).difficulty,'normal')
 assert.equal(difficultyOf({}),DIFFICULTIES.normal)
 const hard=scaleSenses(CHASE_SENSES,DIFFICULTIES.hard);assert.ok(hard.speed>CHASE_SENSES.speed&&hard.hearRun>CHASE_SENSES.hearRun);assert.equal(hard.sight,CHASE_SENSES.sight)
 assert.equal(scaleSenses(CHASE_SENSES,DIFFICULTIES.normal).speed,CHASE_SENSES.speed)
 assert.ok(DIFFICULTIES.easy.monster*CHASE_SENSES.speed>2.3,'même en facile, il rattrape un joueur qui marche')
 assert.ok(DIFFICULTIES.hard.monster*CHASE_SENSES.speed*LUNGE.factor<3.9,'même lancé, il reste moins rapide que la course')
})
test('Rencontres : la première rôde, puis jamais deux fois le même comportement',()=>{
 assert.equal(pickEncounterKind(null,0),'prowl')
 const seen=new Set();let last='prowl'
 for(let i=1;i<300;i++){const k=pickEncounterKind(last,i);assert.notEqual(k,last);seen.add(k);last=k}
 assert.equal(seen.size,3)
 assert.equal(falseAlarmDist(0),FALSE_ALARM.farDist);assert.equal(falseAlarmDist(FALSE_ALARM.length/2),FALSE_ALARM.nearDist);assert.equal(falseAlarmDist(FALSE_ALARM.length),FALSE_ALARM.farDist)
 const l={left:0,wait:0};assert.equal(stepLunge(l,.05,false,8),1,'il ne bondit pas sans voir');assert.equal(stepLunge(l,.05,true,30),1,'ni de trop loin');assert.equal(stepLunge(l,.05,true,8),LUNGE.factor);assert.equal(l.count,1)
 l.left=0;assert.equal(stepLunge(l,.05,true,8),1,'il reprend son souffle entre deux bonds')
})
test('Répit : pas de nouvelle alerte juste après une rencontre, le fauteuil bloque le passage',()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 runtime.dreadIn=1;runtime.ambientScareIn=1;runtime.laughIn=1;useGame.setState({encounter:true});useGame.getState().endEncounter()
 assert.equal(runtime.dreadIn,RESPITE.dread);assert.equal(runtime.ambientScareIn,RESPITE.scare);assert.equal(runtime.laughIn,RESPITE.laugh)
 const s=useGame.getState();let z=10;while(isOccupied(1.55,z,s,.35)||isOccupied(-1,z,s))z+=.5
 dynamicObstacles.set('chair',{x:1.55,z,w:.7,d:.7})
 assert.equal(isOccupied(1.55,z,s),true);assert.equal(isOccupied(1.55,z,{...s,monster:true}),false,'le monstre le bouscule');assert.equal(isOccupied(-1,z,s),false,'on passe à côté')
 s.newGame();assert.equal(dynamicObstacles.size,0,'nouvelle partie : plus de fauteuil')
})
test('Écart minimum : deux événements ne s’empilent jamais',()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 runtime.dreadIn=.05;runtime.laughIn=.05;useGame.getState().tickDread(.1);assert.equal(useGame.getState().lastEvent.type,'dread')
 useGame.getState().tickLaugh(.1);assert.equal(useGame.getState().lastEvent.type,'dread','le rire attend')
 runtime.calmUntil=0;useGame.getState().tickLaugh(.1);assert.equal(useGame.getState().lastEvent.type,'laugh','puis il arrive')
})
test('Sons par lieu : chaque lieu a son identité, sans répéter le même bruit',()=>{
 for(const r of [...ROOMS.map(r=>r.id),'couloir','secret']){const sound=roomSoundOf(r);assert.ok(sound,r);assert.ok(sound.events.length>0);const d=roomEventDelay(sound,()=>.5);assert.ok(d>=sound.every[0]&&d<=sound.every[1])
  let last=null;for(let i=0;i<40;i++){const e=pickRoomEvent(sound,last);assert.notEqual(e,last);last=e}}
 assert.equal(roomSoundOf('parvis'),null,'dehors, le vent suffit')
})
test('Monstre : hors de vue, il prend le plus court chemin vers le joueur, sans trajet imposé',()=>{
 const s={sectorOpen:true,hasKey:true,chase:true,monster:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{patients:true,radio:true,security:true,lab:true,morgue:true}}
 const g=buildNavGrid((x,z)=>isOccupied(x,z,s,.28))
 // Longueur réellement parcourue, comparée à la distance à vol d'oiseau, dans un même espace dégagé hors de portée de vue directe.
 const travel=(x,z,px,pz)=>{const f=computeDistances(g,px,pz);let len=0;for(let i=0;i<6000&&Math.hypot(px-x,pz-z)>1;i++){const w=nextWaypoint(g,f,x,z,px,pz),dx=w.x-x,dz=w.z-z,l=Math.hypot(dx,dz)||1,st=Math.min(l,.14);x+=st*dx/l;z+=st*dz/l;len+=st}return len}
 const a=travel(0,10,0,45),b=travel(0,45,10,31),c=travel(-7,42,-8,2.8)
 assert.ok(a<36.5,`couloir ${a.toFixed(1)} m pour 35 m`)
 const direct=pathLength(g,computeDistances(g,10,31),0,45);assert.ok(b<direct*1.1,`vers le laboratoire ${b.toFixed(1)} m (${direct.toFixed(1)})`)
 const gallery=pathLength(g,computeDistances(g,-8,2.8),-7,42);assert.ok(c<gallery*1.1,`morgue vers accueil ${c.toFixed(1)} m (${gallery.toFixed(1)})`)
 // Deux joueurs à des endroits différents : le monstre ne prend pas le même premier virage.
 const start=[0,30],wp=(px,pz)=>nextWaypoint(g,computeDistances(g,px,pz),start[0],start[1],px,pz)
 const n=wp(-7,42),e=wp(10,31),o=wp(7,14);assert.ok(new Set([n,e,o].map(w=>w.x.toFixed(1)+','+w.z.toFixed(1))).size===3,'trois destinations, trois directions')
 // Le joueur change d'avis : le monstre fait demi-tour au lieu de finir son trajet.
 const f1=computeDistances(g,0,48),f2=computeDistances(g,0,8)
 assert.ok(nextWaypoint(g,f1,-7,26,0,48).z>25,'il part vers le nord');assert.ok(nextWaypoint(g,f2,-7,26,0,8).z<27,'puis vers le sud')
})
test('Angoisse : événements variés, seulement en exploration, jamais deux fois de suite',()=>{
 let last=null;const seen=new Set()
 for(let i=0;i<500;i++){const id=pickDread(last);assert.notEqual(id,last);seen.add(id);last=id}
 assert.equal(seen.size,DREAD_EVENTS.length)
 assert.ok(dreadDelay(()=>0)>=18&&dreadDelay(()=>.999)<=40)
 assert.equal(flickerLevel(10,5),1);assert.equal(flickerLevel(1,5,true),.4)
 assert.equal(dangerLevel(40),0);assert.equal(dangerLevel(3),1);assert.ok(heartPeriod(3)<heartPeriod(30))
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();runtime.dreadIn=.05
 useGame.setState({modal:'puzzle'});useGame.getState().tickDread(.1);assert.ok(runtime.dreadIn>0,'pas pendant une énigme')
 useGame.setState({modal:null});useGame.getState().tickDread(.1);assert.equal(useGame.getState().lastEvent.type,'dread')
})
test('Manette : zone morte, regard progressif, navigation dans les menus',()=>{
 assert.deepEqual(radialDeadzone(.1,.1),{x:0,y:0});assert.ok(Math.abs(radialDeadzone(1,0).x-1)<1e-9);assert.ok(radialDeadzone(.3,0).x<.3)
 assert.ok(Math.abs(lookCurve(.5))<.5);assert.equal(lookCurve(-1),-1)
 const items=[{x:0,y:100},{x:100,y:0},{x:-100,y:0},{x:0,y:-100},{x:10,y:300}]
 assert.equal(nearestInDirection({x:0,y:0},items,'down'),0);assert.equal(nearestInDirection({x:0,y:0},items,'right'),1);assert.equal(nearestInDirection({x:0,y:0},items,'left'),2);assert.equal(nearestInDirection({x:0,y:0},items,'up'),3)
 assert.equal(nearestInDirection({x:0,y:-100},[{x:0,y:-300}],'down'),-1)
})
test('Endurance : la course s’épuise, puis il faut souffler avant de recourir',()=>{
 let s={value:1,exhausted:false};let t=0
 while(!s.exhausted&&t<30){s=stepStamina(s,.1,{wantsRun:true,moving:true});t+=.1}
 assert.ok(t>10&&t<14,`${t.toFixed(1)} s de course`)
 assert.equal(stepStamina(s,.1,{wantsRun:true,moving:true}).running,false,'à bout de souffle')
 let w=0;while(s.exhausted&&w<30){s=stepStamina(s,.1,{wantsRun:true,moving:true});w+=.1}
 assert.ok(w>3,`repos ${w.toFixed(1)} s`);assert.equal(stepStamina(s,.1,{wantsRun:true,moving:true}).running,true)
 assert.ok(stepStamina({value:.1,exhausted:false},1,{hidden:true}).value>stepStamina({value:.1,exhausted:false},1,{moving:true}).value,'caché, le souffle revient plus vite')
})
test('Portes : un battant qui s’ouvre ne traverse aucun meuble',()=>{
 const LEN=1.08,ANGLE=Math.PI*.48
 for(const g of GATES){
  const ry=g.id==='entrance'?Math.PI/2:g.axis==='x'?(g.x>0?0:Math.PI):-Math.PI/2
  for(const dir of [1,-1])for(let a=0;a<=ANGLE;a+=ANGLE/24)for(let t=0;t<=1;t+=.05){
   const lz=-dir*g.w/2+dir*Math.cos(a)*LEN*t,lx=Math.sin(a)*LEN*t
   const x=g.x+lx*Math.cos(ry)+lz*Math.sin(ry),z=g.z-lx*Math.sin(ry)+lz*Math.cos(ry)
   assert.ok(!COLLIDERS.some(c=>Math.abs(x-c.x)<c.w/2&&Math.abs(z-c.z)<c.d/2),`porte ${g.id} : battant bloqué en (${x.toFixed(2)}, ${z.toFixed(2)})`)
  }
 }
})
test('Mobilier : chaque modèle placé existe sur le disque et a ses dimensions',()=>{
 for(const p of [...PROPS,...EXTERIOR_PROPS]){const f=new URL(`../../public/assets/models/${p.m}.glb`,import.meta.url);assert.ok(fs.existsSync(f),`fichier ${p.m}`);assert.ok(MODEL_BOUNDS[p.m],`dimensions ${p.m}`)}
})
const startPlaying=(extra={})=>{runtime.lastScare=0;useGame.setState({phase:'playing',paused:false,modal:null,dialog:null,elapsed:0,penalty:0,penalties:noPenalties(),hintsUsed:{},lastPenalty:null,scare:null,capture:false,outside:false,endingReason:'',lastRecord:null,settings:{...useGame.getState().settings,jumpscares:true},...extra})}
test('Minuteur : 30 minutes, moins le temps écoulé et les pénalités, jamais négatif',()=>{
 assert.equal(GAME_TIME,1800);assert.equal(PENALTY_SECONDS,60)
 assert.equal(timeLeft({elapsed:0,penalty:0}),1800);assert.equal(timeLeft({elapsed:100,penalty:120}),1580);assert.equal(timeLeft({elapsed:1790,penalty:60}),0)
 assert.equal(timerLevel(301),'normal');assert.equal(timerLevel(300),'low');assert.equal(timerLevel(60),'critical')
})
test('Pénalités : une minute par screamer subi, erreur commise ou indice utilisé',()=>{
 startPlaying();const g=useGame.getState()
 g.fireScare();let s=useGame.getState();assert.equal(s.penalty,60);assert.equal(s.penalties.scare,1);assert.equal(s.lastPenalty.reason,'scare')
 startPlaying({modal:'puzzle',dialog:'patients'})
 assert.equal(g.solve('   '),false);assert.equal(useGame.getState().penalty,0,'un champ vide n’est pas une erreur')
 assert.equal(g.solve('0000'),false);s=useGame.getState();assert.equal(s.penalty,60,'erreur + screamer : une seule minute');assert.equal(s.penalties.error,1);assert.equal(s.penalties.scare,0);assert.ok(s.scare,'le screamer se déclenche quand même')
 assert.equal(g.solve('0000'),false);assert.equal(useGame.getState().penalty,120,'chaque erreur compte, même sans nouveau screamer')
 startPlaying({modal:'puzzle',dialog:'patients'});assert.equal(g.solve('203'),true);assert.equal(useGame.getState().penalty,0,'une bonne réponse ne coûte rien');g.closeModal()
 startPlaying();useGame.setState({phase:'menu'});useGame.getState().fireScare();assert.equal(useGame.getState().penalty,0,'hors partie, rien n’est retiré')
})
test('Indices : à la demande, un par un, une minute chacun, refusés s’ils videraient le chrono',()=>{
 for(const [id,p] of Object.entries(PUZZLES)){assert.ok(p.hints?.length>=2,`indices de ${id}`);assert.ok(p.clues.length>0)}
 assert.ok(!PUZZLES.lab.clues.join(' ').includes('WHERE'),'les notes gratuites ne donnent plus la requête')
 assert.ok(validateAnswer('lab',`SELECT * FROM patients ${PUZZLES.lab.hints.at(-1)}`),'le dernier indice SQL mène bien à la réponse')
 startPlaying({modal:'puzzle',dialog:'radio'});const g=useGame.getState(),n=PUZZLES.radio.hints.length
 for(let i=1;i<=n;i++){assert.equal(g.requestHint(),true);assert.equal(useGame.getState().hintsUsed.radio,i);assert.equal(useGame.getState().penalty,i*60)}
 assert.equal(g.requestHint(),false,'plus d’indice disponible');assert.equal(useGame.getState().penalty,n*60)
 startPlaying({modal:'puzzle',dialog:'radio',elapsed:GAME_TIME-60});assert.equal(g.requestHint(),false,'à une minute de la fin, plus d’indice');assert.equal(useGame.getState().penalty,0)
 startPlaying({modal:null,dialog:'radio'});assert.equal(g.requestHint(),false,'seulement pendant une énigme')
})
test('Minuteur à zéro : fin tragique non classée, après le dernier screamer',()=>{
 startPlaying({elapsed:GAME_TIME-1});const g=useGame.getState()
 g.tickElapsed(.25);assert.equal(useGame.getState().phase,'playing')
 useGame.setState({scare:{n:1,variant:'yeux',at:1}});g.tickElapsed(1);assert.equal(useGame.getState().phase,'playing','le screamer va jusqu’au bout')
 useGame.setState({scare:null});g.tickElapsed(.25);const s=useGame.getState();assert.equal(s.phase,'ending');assert.equal(s.endingReason,'timeout');assert.equal(s.lastRecord.ending,'timeout');assert.equal(s.lastRecord.isBest,false)
 assert.equal(rankedRecords([s.lastRecord]).length,0)
 startPlaying({elapsed:600,penalty:300,settings:{...useGame.getState().settings,difficulty:'hard'}});useGame.getState().end('exit');const r=useGame.getState().lastRecord;assert.equal(r.time,900,'le classement compte les pénalités');assert.equal(r.difficulty,'hard')
 startPlaying({settings:{...useGame.getState().settings,difficulty:'normal'}})
})
test('Minuteur : les alertes se déclenchent une seule fois',()=>{
 startPlaying({elapsed:GAME_TIME-301});runtime.timeWarned=0;const g=useGame.getState()
 g.tickElapsed(2);assert.equal(useGame.getState().notice,'PLUS QUE CINQ MINUTES.');useGame.setState({notice:''});g.tickElapsed(1);assert.equal(useGame.getState().notice,'')
 useGame.setState({elapsed:GAME_TIME-61});g.tickElapsed(2);assert.equal(useGame.getState().notice,'PLUS QU’UNE MINUTE.')
})
test('Sauvegarde : pénalités, indices et difficulté survivent au rechargement',()=>{
 const state={...flags(),hasKey:true,sectorOpen:true,elapsed:200,penalty:180,penalties:{scare:2,error:0,hint:1},hintsUsed:{patients:1},settings:{difficulty:'hard'}}
 const back=parseSave(JSON.stringify(serializeSave(state,{x:0,z:6.4,yaw:0})))
 assert.equal(back.elapsed,200);assert.equal(back.penalty,180);assert.deepEqual(back.penalties,{scare:2,error:0,hint:1});assert.deepEqual(back.hintsUsed,{patients:1});assert.equal(back.difficulty,'hard')
 const edge=parseSave(JSON.stringify(serializeSave({...state,elapsed:1790,penalty:60},{x:0,z:6.4,yaw:0})));assert.equal(timeLeft(edge),60,'une reprise laisse au moins une minute')
 const bad=parseSave(JSON.stringify({version:SAVE_VERSION,flags:{},elapsed:-5,penalty:'x',penalties:{scare:-1,hint:'y'},hintsUsed:{a:-2,b:'z'},difficulty:'impossible'}))
 assert.equal(bad.penalty,0);assert.equal(bad.elapsed,0);assert.deepEqual(bad.penalties,noPenalties());assert.deepEqual(bad.hintsUsed,{});assert.equal(bad.difficulty,null)
 const old=parseSave(JSON.stringify({version:3,flags:{hasKey:true},elapsed:5000}));assert.equal(old.elapsed,GAME_TIME-300,'une ancienne partie reprend avec cinq minutes');assert.equal(old.penalty,0)
})
test('Cachettes : chacune est accessible, visable et se quitte sur du sol libre',()=>{
 const s={sectorOpen:true,hasKey:true,chase:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{patients:true,radio:true,security:true,lab:true,morgue:true}}
 assert.ok(HIDE_SPOTS.length>=6)
 for(const h of HIDE_SPOTS){
  const [x,z]=h.out;assert.equal(isOccupied(x,z,s),false,`sortie libre ${h.id}`)
  const [cx,cy,cz]=h.hit,dx=cx-x,dz=cz-z,dy=cy-1.6,l=Math.hypot(dx,dy,dz)
  assert.equal(raycastTarget(x,1.6,z,dx/l,dy/l,dz/l,s)?.id,h.id,`visée de ${h.id}`)
 }
 assert.equal(raycastTarget(HIDE_SPOTS[0].out[0],1.6,HIDE_SPOTS[0].out[1],-1,-.4,0,{...s,hiding:'hide_hall'})?.type==='hide',false,'pas de cachette depuis une cachette')
 assert.equal(raycastTarget(HIDE_SPOTS[0].out[0],1.6,HIDE_SPOTS[0].out[1],-1,-.4,0,{...s,outside:true})?.type==='hide',false)
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();runtime.trapLocker=null
 useGame.getState().enterHiding('hide_morgue');assert.equal(useGame.getState().hiding,'hide_morgue');assert.deepEqual([runtime.player.x,runtime.player.z],[-4,47.4])
 useGame.setState({near:null});useGame.getState().interact();assert.equal(useGame.getState().hiding,null,'E ressort')
})
test('Monstre : il voit, il entend, et le joueur caché lui échappe',()=>{
 const s={sectorOpen:true,hasKey:true,chase:true,monster:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{patients:true,radio:true,security:true,lab:true,morgue:true}}
 const g=buildNavGrid((x,z)=>isOccupied(x,z,s,.28)),m={x:0,z:10},p={x:0,z:20}
 assert.equal(perceives(g,m,p,{},CHASE_SENSES),true,'à vue dans le couloir')
 assert.equal(perceives(g,m,p,{hiding:true},CHASE_SENSES),false,'caché')
 const wall={x:-11.2,z:20},behind={x:-12.3,z:20}
 assert.equal(perceives(g,wall,behind,{},CHASE_SENSES,30),false,'derrière le mur, immobile')
 assert.equal(perceives(g,wall,behind,{moving:true,running:true},CHASE_SENSES,12),true,'il entend courir')
 assert.equal(perceives(g,wall,behind,{moving:true},CHASE_SENSES,12),false,'pas la marche, à cette distance')
 assert.ok(huntSpeed(false,9)<huntSpeed(true,0));assert.equal(sawHiding(g,m,{x:0,z:15}),true);assert.equal(sawHiding(g,wall,behind),false)
 assert.ok(huntSpeed(false,9)<2.3,'qui ne fait que suivre la piste ne rattrape pas un marcheur')
})
test('Rencontres : une seule après chaque énigme résolue, jamais rejouée au chargement',()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();runtime.encounterSeen=-1;runtime.encounterIn=Infinity
 useGame.setState({done:{patients:true}});useGame.getState().tickEncounter(.1);assert.equal(runtime.encounterIn,Infinity,'déjà résolue au chargement')
 useGame.setState({done:{patients:true,radio:true}});useGame.getState().tickEncounter(.1);assert.ok(runtime.encounterIn>=10)
 runtime.encounterIn=.05;useGame.setState({modal:'puzzle'});useGame.getState().tickEncounter(.1);assert.equal(useGame.getState().encounter,false,'pas pendant une énigme')
 useGame.setState({modal:null});useGame.getState().tickEncounter(.1);assert.equal(useGame.getState().encounter,true)
 useGame.getState().tickDread(99);assert.notEqual(useGame.getState().lastEvent.type,'dread','pas d’autre événement pendant une rencontre')
 Object.assign(runtime.player,{x:50,z:50});useGame.getState().encounterCaught();const st=useGame.getState();assert.equal(st.encounter,false);assert.equal(st.phase,'playing','pas de fin de partie');assert.ok(runtime.player.x<20,'réveil sur un point sûr');useGame.getState().clearScare()
})
test('Relief : le terrain de la forêt ne traverse jamais le sol du bâtiment ni le parvis',()=>{
 for(const r of [...ROOMS,{x:0,z:22.75,w:4.5,d:54.7},{x:-13.25,z:21.9,w:2.7,d:47}])
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const x=r.x-r.w/2+r.w*i/8,z=r.z-r.d/2+r.d*j/8;assert.ok(groundHeight(x,z)<-.05,`terrain sous le sol (${x.toFixed(1)}, ${z.toFixed(1)})`)}
 for(let x=-15;x<=15;x+=1)for(let z=-24;z<=-5;z+=1)assert.ok(groundHeight(x,z)<=0,`parvis (${x}, ${z})`)
})
test('Zones nommées',()=>{
 assert.equal(zoneName(0,0),'COULOIR PRINCIPAL');assert.equal(zoneName(-7,13),'CHAMBRES 201–204');assert.equal(zoneName(-13.2,20),'PASSAGE SECRET')
 assert.equal(roomAt(10,31),'lab');assert.equal(roomAt(0,30),'couloir')
})
// ---------------------------------------------------------------------------
test('Validation des énigmes officielles du scénario',()=>{
 assert.equal(Object.keys(PUZZLES).length,4)
 assert.equal(validateAnswer('patients','203'),true);assert.equal(validateAnswer('patients','202'),false);assert.equal(validateAnswer('patients',' 203 '),true)
 assert.equal(validateAnswer('radio','0024'),true);assert.equal(validateAnswer('radio','24'),false)
 assert.equal(validateAnswer('security','0600'),true);assert.equal(validateAnswer('security','0400'),false)
 assert.equal(validateAnswer('lab',"SELECT * FROM patients WHERE nom = 'Vasseur' AND prenom = 'Eleonore' AND annee_deces = 2018;"),true)
 assert.equal(validateAnswer('lab',"select *   from patients\nwhere nom='Vasseur' and prenom=\"Eleonore\" and annee_deces = 2018"),true)
 assert.equal(validateAnswer('lab',"SELECT * FROM patients WHERE nom='Moreau' AND prenom='Emilie' AND annee_deces=2018;"),false)
 assert.equal(validateAnswer('lab','DROP TABLE patients;'),false);assert.equal(validateAnswer('lab',42),false);assert.equal(validateAnswer('inconnu','1'),false)
})
test('Actes clés, dialogues et révélations du scénario',()=>{
 for(const id of ['intro','squatter','disappearance','patients','radio','security','lab','morgue','note','tv','reception_pc','bed203'])assert.ok(STORIES[id],id)
 const all=JSON.stringify(STORIES)
 for(const needle of ['Adrien Vasseur','Victor Delmas','404-EM-2018','A.VASSEUR','H-404','PATIENTE 203','BACKUP_H404_FINAL'])assert.match(all,new RegExp(needle))
 // Les terminaux n'affichent plus « Sainte-Catherine » (demande du 6 novembre 2026).
 for(const [id,st] of Object.entries(STORIES))for(const l of st.lines)if(l.terminal||/terminal/i.test(l.speaker||''))assert.doesNotMatch(`${l.speaker||''} ${l.terminal||''} ${l.text||''}`,/sainte/i,`${id} : terminal sans Sainte-Catherine`)
})
// ---------------------------------------------------------------------------
test('Inventaire et journal dérivés : jamais de doublons, ordre stable',()=>{
 const f=flags();assert.deepEqual(inventoryFor(f),[]);assert.equal(journalFor(f).length,1)
 f.hasKey=true;f.hasKey=true
 assert.equal(inventoryFor(f).length,1)
 f.sectorOpen=true;f.done={patients:true,radio:true,security:true,lab:true};f.usb=true;f.readNote=true;f.seen={bed203:true}
 const inv=inventoryFor(f);assert.equal(inv.length,6);assert.equal(new Set(inv.map(i=>i.id)).size,6)
 const j=journalFor(f);assert.equal(new Set(j.map(e=>e.id)).size,j.length)
 assert.equal(j[j.length-1].id,'morgue');assert.equal(solvedCount(f),4);assert.equal(chapterFor(f),6)
 f.chase=true;assert.equal(chapterFor(f),7)
})
test('Normalisation : un état incohérent est ramené à une progression valide',()=>{
 const f=normalizeFlags({done:{lab:true,radio:true},usb:true,chase:true,sectorOpen:true,hasKey:false,chaseTime:-5})
 assert.equal(f.sectorOpen,false);assert.deepEqual(f.done,{});assert.equal(f.usb,false);assert.equal(f.chase,false);assert.equal(f.chapter,1);assert.equal(f.chaseTime,110)
 const g=normalizeFlags({hasKey:true,sectorOpen:true,done:{patients:true,lab:true,bidon:true},chaseTime:'x'})
 assert.deepEqual(g.done,{patients:true});assert.equal(g.chapter,3);assert.equal(g.chaseTime,110)
})
// ---------------------------------------------------------------------------
test('Sauvegarde : sérialisation, relecture et rejet des données corrompues',()=>{
 const st=memoryStorage()
 const state={...flags(),hasKey:true,sectorOpen:true,done:{patients:true},elapsed:123}
 assert.equal(writeSave(state,{x:-5.2,z:14.3,yaw:1},st),true)
 const back=readSave(st);assert.ok(back);assert.equal(back.flags.chapter,3);assert.equal(back.flags.hasKey,true);assert.deepEqual(back.player,{x:-5.2,z:14.3,yaw:1});assert.equal(back.elapsed,123);assert.equal(back.repaired,false)
 assert.equal(parseSave('{pas du json'),null);assert.equal(parseSave(''),null);assert.equal(parseSave('42'),null);assert.equal(parseSave('{"version":99}'),null)
 assert.equal(parseSave(JSON.stringify({version:SAVE_VERSION,flags:{hasKey:'oui'}})),null,'type de drapeau invalide')
 assert.equal(parseSave(JSON.stringify({version:SAVE_VERSION,flags:{done:[1]}})),null)
 clearSave(st);assert.equal(readSave(st),null)
})
test('Sauvegarde : position invalide ou dans un mur → point de reprise sûr',()=>{
 const inWall=parseSave(JSON.stringify({version:SAVE_VERSION,flags:{hasKey:true,sectorOpen:true,done:{patients:true}},player:{x:2.25,z:20,yaw:0}}))
 assert.ok(inWall.repaired);assert.deepEqual(inWall.player,SAFE_SPOTS[3])
 const noPos=parseSave(JSON.stringify({version:SAVE_VERSION,flags:{}}))
 assert.deepEqual(noPos.player,SAFE_SPOTS[1])
 const nan=parseSave(JSON.stringify({version:SAVE_VERSION,flags:{},player:{x:'a',z:1,yaw:0}}))
 assert.deepEqual(nan.player,SAFE_SPOTS[1])
})
test('Sauvegarde : reprise pendant la poursuite = entrée de la galerie, chrono complet',()=>{
 const s=parseSave(JSON.stringify({version:SAVE_VERSION,flags:{hasKey:true,sectorOpen:true,done:{patients:true,radio:true,security:true,lab:true},usb:true,chase:true,chaseTime:12,secretVisited:true},player:{x:-13.2,z:10,yaw:0}}))
 assert.equal(s.flags.chase,true);assert.equal(s.flags.chaseTime,110);assert.equal(s.flags.secretVisited,false);assert.deepEqual(s.player,SAFE_SPOTS[7])
})
test('Sauvegarde : migration des anciennes versions (inventaire/journal ignorés)',()=>{
 const old=parseSave(JSON.stringify({version:2,flags:{hasKey:true,sectorOpen:true,done:{patients:true}},inventory:['Clé','Clé','Clé'],journal:[1,2,3],player:{x:-7,z:14.5,yaw:0}}))
 assert.ok(old);assert.equal(old.flags.chapter,3);assert.equal(inventoryFor(old.flags).length,2)
 assert.equal(parseSave(JSON.stringify({version:0})),null)
})
// ---------------------------------------------------------------------------
test('Réglages : validation et persistance',()=>{
 assert.deepEqual(sanitizeSettings(null),DEFAULT_SETTINGS)
 const s=sanitizeSettings({quality:'ultra',volume:7,sensitivity:0,fov:'x',reduceMotion:'oui',layout:'azerty',brightness:9})
 assert.equal(s.quality,'medium');assert.equal(s.volume,1);assert.equal(s.sensitivity,.25);assert.equal(s.fov,75);assert.equal(s.reduceMotion,false);assert.equal(s.layout,'azerty');assert.equal(s.brightness,1.4)
 const st=memoryStorage();saveSettings({quality:'low',volume:.3},st);assert.equal(loadSettings(st).quality,'low');assert.equal(loadSettings(st).volume,.3)
 st.setItem('hospital404.settings','{corrompu');assert.deepEqual(loadSettings(st),DEFAULT_SETTINGS)
})
// ---------------------------------------------------------------------------
test('Magasin : nouvelle partie, parcours complet et fin',t=>{
 withoutInteractGuard(t)
 const g=useGame.getState()
 g.newGame();let s=useGame.getState()
 assert.equal(s.modal,'prologue');assert.equal(s.outside,true);assert.equal(runtime.player.z<-20,true,'la partie commence dehors')
 assert.equal(g.persist(),false,'pas de sauvegarde sur le parvis')
 g.closeModal();assert.equal(useGame.getState().modal,null,'le prologue se passe')
 g.setNear({id:'hospital_door'});g.interact();assert.equal(useGame.getState().entranceOpen,true,'E ouvre la porte')
 g.enterHospital();s=useGame.getState();assert.equal(s.outside,false);assert.equal(s.entranceOpen,false,'la porte se referme derrière Thomas')
 assert.equal(s.phase,'playing');assert.equal(s.modal,'story');assert.equal(s.dialog,'intro');assert.equal(s.chapter,1);assert.equal(s.hasKey,false)
 g.closeModal();assert.equal(useGame.getState().modal,null)
 // Le portail refuse sans clé.
 g.setNear({id:'sector'});g.interact();assert.equal(useGame.getState().sectorOpen,false)
 g.setNear({id:'squatter'});g.interact();s=useGame.getState();assert.equal(s.dialog,'squatter');assert.equal(s.modal,'story');assert.equal(s.hasKey,false,'la clé est remise pendant le dialogue');g.closeModal();assert.equal(useGame.getState().hasKey,true,'fermer le dialogue applique les effets restants')
 g.setNear({id:'sector'});g.interact();s=useGame.getState();assert.equal(s.dialog,'disappearance');assert.equal(s.sectorOpen,false,'le portail ne s’ouvre qu’à la fin du blackout');g.closeModal();s=useGame.getState();assert.equal(s.sectorOpen,true);assert.equal(s.chapter,2);assert.match(s.notice,/^OBJECTIF/)
 for(const [id,answer,chapter] of [['patients','203',3],['radio','0024',4],['security','0600',5],['lab',"SELECT * FROM patients WHERE nom='Vasseur' AND prenom='Eleonore' AND annee_deces=2018;",6]]){
  g.setNear({id});g.interact();assert.equal(useGame.getState().modal,'puzzle')
  assert.equal(g.solve('0000'),false);assert.equal(useGame.getState().done[id],undefined)
  assert.equal(g.solve(answer),true);s=useGame.getState();assert.equal(s.done[id],true);assert.equal(s.chapter,chapter);assert.equal(s.modal,'story');g.closeModal()
 }
 g.setNear({id:'morgue'});g.interact();s=useGame.getState();assert.equal(s.dialog,'morgue');assert.equal(s.usb,false);assert.equal(s.chase,false)
 g.closeModal();s=useGame.getState();assert.equal(s.usb,true);assert.equal(s.chase,true);assert.equal(s.chapter,7);assert.equal(s.chaseTime,110)
 assert.equal(inventoryFor(s).length,6)
 g.setNear({id:'exit'});g.interact();assert.equal(useGame.getState().phase,'playing','la sortie exige le passage par la galerie')
 g.markSecret();g.setNear({id:'exit'});g.interact();s=useGame.getState();assert.equal(s.phase,'ending');assert.equal(s.endingReason,'exit');assert.equal(s.chase,false)
 // « Nouvelle partie » réinitialise tout, y compris l'état transitoire.
 g.setPaused(true);g.newGame();s=useGame.getState()
 assert.equal(s.paused,false);assert.equal(s.chase,false);assert.equal(s.usb,false);assert.deepEqual(s.done,{});assert.equal(s.chapter,1);assert.equal(s.near,null);assert.equal(s.elapsed,0);assert.equal(inventoryFor(s).length,0)
 assert.deepEqual({x:runtime.player.x,z:runtime.player.z},{x:OUTSIDE_START.x,z:OUTSIDE_START.z})
})
test('Pause : les chronomètres et les interactions sont suspendus',()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 useGame.setState({chase:true,chaseTime:50})
 g.decrementChase(5);assert.equal(useGame.getState().chaseTime,45)
 g.setPaused(true);assert.equal(isSimRunning(useGame.getState()),false)
 g.decrementChase(5);assert.equal(useGame.getState().chaseTime,45,'le chrono de fuite n’avance pas en pause')
 g.setNear({id:'squatter'});g.interact();assert.equal(useGame.getState().hasKey,false,'aucune interaction en pause')
 g.setPaused(false);useGame.setState({modal:'puzzle',dialog:'patients'})
 g.decrementChase(5);assert.equal(useGame.getState().chaseTime,45,'une fenêtre ouverte suspend aussi le chrono')
 useGame.setState({modal:null,chase:false});g.openJournal('map');assert.equal(useGame.getState().journalTab,'map');assert.equal(isSimRunning(useGame.getState()),false)
 g.openJournal('map');assert.equal(useGame.getState().journalVisible,false)
})
test('Reprise : une sauvegarde corrompue est ignorée et une partie neuve démarre',()=>{
 const g=useGame.getState()
 g.newGame();useGame.setState({hasSave:true})
 g.continueGame();const s=useGame.getState()
 assert.equal(s.phase,'playing');assert.equal(s.chapter,1)
})

test('Screamer : déclenché à l’échec d’une énigme, délai entre deux, désactivable',async()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 runtime.lastScare=0
 useGame.setState({modal:'puzzle',dialog:'radio'})
 assert.equal(g.solve('1111'),false)
 let s=useGame.getState();assert.equal(s.failures,1);assert.ok(s.scare,'un screamer est déclenché');assert.equal(s.lastEvent.type,'scare')
 g.clearScare();assert.equal(useGame.getState().scare,null)
 assert.equal(g.solve('2222'),false)
 s=useGame.getState();assert.equal(s.failures,2);assert.equal(s.scare,null,'pas de second screamer pendant le délai');assert.equal(s.lastEvent.type,'deny')
 runtime.lastScare=0;g.updateSettings({jumpscares:false})
 assert.equal(g.solve('3333'),false);s=useGame.getState();assert.equal(s.scare,null,'désactivé dans les réglages');assert.equal(s.failures,3)
 g.updateSettings({jumpscares:true});runtime.lastScare=0
 assert.equal(g.solve('0024'),true);assert.equal(useGame.getState().scare,null,'une bonne réponse ne déclenche rien')
})

test('Variantes de screamer : images, animations et sons distincts, jamais deux fois la même d’affilée',()=>{
 assert.equal(SCARE_VARIANTS.length,5,'les cinq screamers fournis, et eux seuls')
 assert.ok(SCARE_VARIANTS.every(v=>v.image&&fs.existsSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public'+v.image))),'chaque image existe')
 assert.equal(new Set(SCARE_VARIANTS.map(v=>v.id)).size,SCARE_VARIANTS.length)
 assert.equal(new Set(SCARE_VARIANTS.map(v=>v.anim)).size,5);assert.equal(new Set(SCARE_VARIANTS.map(v=>v.sound)).size,5)
 let prev=null
 for(let i=0;i<200;i++){const v=pickScare(prev,Math.random);assert.notEqual(v.id,prev);prev=v.id}
 const ids=new Set();for(let i=0;i<300;i++)ids.add(pickScare(null,Math.random).id);assert.equal(ids.size,SCARE_VARIANTS.length,'toutes les variantes sortent')
 // deux échecs successifs (hors délai) donnent deux variantes différentes
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal();useGame.setState({modal:'puzzle',dialog:'lab'});g.updateSettings({jumpscares:true})
 runtime.lastScare=0;g.solve('x');const a=useGame.getState().scare.variant;g.clearScare();runtime.lastScare=0;g.solve('y');const b=useGame.getState().scare.variant
 assert.notEqual(a,b);assert.equal(useGame.getState().lastEvent.type,'scare');assert.ok(SCARE_VARIANTS.some(v=>v.sound===useGame.getState().lastEvent.payload))
})

test('Capture par le monstre : séquence courte qui gèle la simulation puis mène à la fin',()=>{
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 useGame.setState({chase:true,usb:true,chapter:7})
 assert.equal(isSimRunning(useGame.getState()),true)
 g.beginCapture();let s=useGame.getState()
 assert.equal(s.capture,true);assert.equal(isSimRunning(s),false,'le joueur ne bouge plus pendant la capture');assert.equal(s.lastEvent.type,'caught')
 g.beginCapture();assert.equal(useGame.getState().eventCount,s.eventCount,'une seule capture')
 g.end('caught');s=useGame.getState();assert.equal(s.phase,'ending');assert.equal(s.capture,false);assert.equal(s.chase,false)
})

test('Voix : chaque prise du manifeste existe, vise une ligne réelle du dialogue, gain raisonnable',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/assets/voices')
 let count=0
 for(const [id,takes] of Object.entries(VOICES)){
  if(id!=='ending'&&id!=='endingGood')assert.ok(STORIES[id],`dialogue ${id}`)
  const seen=new Set()
  for(const t of takes){
   count++
   assert.ok(fs.existsSync(path.join(root,t.file)),`fichier ${t.file}`)
   assert.ok(!/narrateur/.test(t.file),'plus aucune prise de narrateur');assert.ok(!t.hint,'les consignes ne sont plus lues')
   if(id!=='ending'){const line=STORIES[id].lines[t.line];assert.ok(line&&line.speaker,`étape ${t.line} de ${id} : réplique d’un personnage`)}
   const key=t.hint?'hint':t.line;assert.ok(!seen.has(key),`une seule prise par ligne (${id} ${key})`);seen.add(key)
   assert.ok(Math.abs(t.gain||0)<=14,'gain borné');if(t.fx)assert.ok(['pa','radio'].includes(t.fx),'effet connu')
  }
 }
 assert.equal(count,49,'les 49 prises de personnages sont référencées')
 // Les répliques déjà enregistrées restent doublées.
 for(const id of ['intro','squatter','disappearance','patients','radio','security','lab','morgue','ending'])assert.ok(VOICES[id]?.length,`voix de ${id}`)
})

test('Dialogues « bulle » : conversations sans narrateur, effets appliqués une fois et dans l’ordre',t=>{
 withoutInteractGuard(t)
 for(const [id,st] of Object.entries(STORIES)){
  for(const [i,l] of st.lines.entries()){
   assert.ok(l.speaker||l.item||l.blackout,`${id} étape ${i} : réplique, objet ou blackout (pas de narration)`)
   if(l.speaker)assert.ok(l.text||l.terminal,`${id} étape ${i} : texte`)
  }
  assert.ok(st.lines.some(l=>l.speaker),`${id} contient au moins une réplique`)
 }
 assert.ok(STORIES.squatter.lines.some(l=>l.item==='key'),'le squatteur remet la clé pendant la conversation')
 assert.ok(STORIES.disappearance.lines.some(l=>l.blackout&&l.effect==='openSector'),'Maxime disparaît pendant un blackout')
 assert.ok(STORIES.morgue.lines[MORGUE_ADRIEN_STEP]?.speaker==='ADRIEN','Adrien se tient devant la porte pour sa réplique')
 assert.deepEqual(focusFor(STORIES.squatter,0),STORIES.squatter.focus);assert.equal(focusFor(STORIES.morgue,0),null);assert.equal(focusFor(STORIES.morgue,MORGUE_ADRIEN_STEP),STORIES.morgue.focus2)
 for(const id of Object.keys(ITEMS))assert.ok(ITEMS[id].label&&ITEMS[id].caption&&fs.existsSync(new URL(`../../public/assets/items/${id}.png`,import.meta.url)),`objet ${id}`)
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 g.setNear({id:'squatter'});g.interact();let s=useGame.getState();assert.equal(s.dialogStep,0);assert.equal(s.dialogApplied,-1)
 g.applyStep(2);assert.equal(useGame.getState().hasKey,false,'rien avant l’étape de la clé')
 const n=useGame.getState().eventCount
 g.applyStep(3);s=useGame.getState();assert.equal(s.hasKey,true);assert.equal(s.lastEvent.type,'item');assert.equal(s.lastEvent.payload,'key');assert.equal(s.dialogApplied,3)
 g.applyStep(3);g.applyStep(1);assert.equal(useGame.getState().eventCount,n+1,'un objet n’est accordé qu’une fois')
 g.setDialogStep(5);assert.equal(useGame.getState().dialogStep,5)
 g.setItemShown('key');assert.equal(useGame.getState().itemShown,'key');g.setItemShown(null)
 g.closeModal();s=useGame.getState();assert.equal(s.modal,null);assert.equal(s.dialogStep,0);assert.equal(s.itemShown,null);assert.match(s.notice,/portail/)
 // Blackout : drapeau transitoire, portail ouvert à l’application de l’étape, tout est remis à zéro à la fermeture.
 g.setNear({id:'sector'});g.interact();g.setBlackout('dark');assert.equal(useGame.getState().blackout,'dark')
 g.applyStep(0);assert.equal(useGame.getState().sectorOpen,false)
 g.applyStep(1);s=useGame.getState();assert.equal(s.sectorOpen,true);assert.equal(s.chapter,2)
 g.closeModal();s=useGame.getState();assert.equal(s.blackout,null);assert.equal(s.modal,null)
 // Un dialogue d’énigme résolue repart à l’étape 0 et accorde le document (déjà dans l’inventaire via done).
 useGame.setState({modal:'puzzle',dialog:'patients'});assert.equal(g.solve('203'),true);s=useGame.getState();assert.equal(s.modal,'story');assert.equal(s.dialogStep,0);assert.equal(inventoryFor(s).some(i=>i.id==='fiche203'),true);g.closeModal()
})

// ---------- téléphone ----------
test('joystick : zone morte, marche jusqu’à l’anneau, course au-delà',()=>{
 assert.deepEqual([stickVector(3,-3).x,stickVector(3,-3).y,stickVector(3,-3).run],[0,0,false],'un tremblement du pouce ne fait pas bouger')
 const up=stickVector(0,-STICK.radius);assert.ok(Math.abs(up.y-1)<1e-9&&up.x===0&&!up.run,'à l’anneau : pleine marche vers l’avant')
 const half=stickVector(0,-STICK.radius/2);assert.ok(half.y>.3&&half.y<.55,'à mi-course : marche lente')
 assert.ok(stickVector(STICK.radius,0).x===1,'x positif à droite')
 const beyond=stickVector(0,-STICK.radius*1.5);assert.ok(beyond.run&&beyond.y===1,'au-delà de l’anneau : on court, sans dépasser la vitesse de base')
 assert.equal(Math.round(beyond.knobY),-STICK.radius,'le pouce visuel reste dans l’anneau')
})
test('champ de vision : inchangé sur ordinateur et en 16:9, corrigé en long et en portrait',()=>{
 assert.equal(viewFov(75,2.16,false),75,'ordinateur : le réglage est appliqué tel quel')
 assert.ok(Math.abs(viewFov(75,16/9)-75)<1e-9,'16:9 : référence')
 const hFov=(v,a)=>2*Math.atan(Math.tan(v*Math.PI/360)*a)*180/Math.PI
 assert.ok(Math.abs(hFov(viewFov(75,2.16),2.16)-hFov(75,16/9))<1e-6,'plus large que 16:9 : même champ horizontal')
 const portrait=viewFov(75,.46);assert.ok(portrait>95&&portrait<=104,'portrait : vertical élargi, plafonné')
 assert.ok(hFov(portrait,.46)>hFov(75,.46)*1.3,'portrait : on ne regarde plus par une fente')
 assert.equal(viewFov(90,.46)>=90,true,'le réglage du joueur reste un minimum')
})
test('lampe : même place à l’écran, quelle que soit sa forme',()=>{
 const base={x:.2,y:-.2,z:-.4}
 const same=lampPose(base,75,16/9);assert.ok(Math.abs(same.x-.2)<1e-9&&Math.abs(same.y+.2)<1e-9,'16:9 : position d’origine')
 const ndc=(p,fov,a)=>{const h=Math.tan(fov*Math.PI/360)*-p.z;return [p.x/(h*a),p.y/h]}
 for(const [fov,a] of [[100,.46],[64,2.16]]){const n=ndc(lampPose(base,fov,a),fov,a),r=ndc(base,75,16/9);assert.ok(Math.abs(n[0]-r[0])<1e-9&&Math.abs(n[1]-r[1])<1e-9,`écran ${a}`)}
})
test('textures : limites selon le rôle, ciel et atlas gardés plus grands',()=>{
 assert.equal(textureLimit('map',1024),TEXTURE_LIMIT.color)
 assert.equal(textureLimit('emissiveMap',1024),TEXTURE_LIMIT.color)
 for(const role of ['normalMap','roughnessMap','metalnessMap','aoMap'])assert.equal(textureLimit(role,1024),TEXTURE_LIMIT.data,role)
 assert.equal(textureLimit('map',4096),TEXTURE_LIMIT.atlas)
})
test('limitTextureDecode : réduit les grandes images sans toucher aux petites ni à leurs options',async()=>{
 const calls=[]
 const env={createImageBitmap:async(src,opts)=>{calls.push(opts);const big=src==='big';const r=opts?.resizeWidth;return {width:r||(big?1024:256),height:opts?.resizeHeight||(big?512:256),close(){this.closed=true}}}}
 assert.equal(limitTextureDecode(512,env),true)
 const small=await env.createImageBitmap('small',{premultiplyAlpha:'none'});assert.equal(small.width,256);assert.equal(calls.length,1,'petite image : aucun second décodage')
 const big=await env.createImageBitmap('big',{premultiplyAlpha:'none',imageOrientation:'flipY'});assert.deepEqual([big.width,big.height],[512,256],'proportions conservées')
 const opts=calls.at(-1);assert.equal(opts.premultiplyAlpha,'none');assert.equal(opts.imageOrientation,undefined,'pas de second retournement')
 assert.equal(limitTextureDecode(512,{}),false,'navigateur sans createImageBitmap : rien à faire')
})
test('aide à la visée : trouve une cible proche du centre, jamais à travers un mur',()=>{
 const s=emptyFlags(),t=INTERACTIVES.find(o=>o.id==='squatter');const [tx,ty,tz]=t.hit
 const px=-5.9,pz=3.7,eye=1.68,yaw=Math.atan2(tx-px,tz-pz),pitch=Math.atan2(ty-eye,Math.hypot(tx-px,tz-pz))
 assert.equal(assistedTarget(px,eye,pz,yaw,pitch,s)?.id,'squatter','en plein dessus')
 const ray=(y,p)=>raycastTarget(px,eye,pz,Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p),s)
 let edge=0;while(edge<1&&ray(yaw+edge,pitch))edge+=.01
 assert.ok(edge>0&&edge<1,'le rayon central finit par manquer la cible')
 assert.equal(ray(yaw+edge+.05,pitch),null,'juste à côté : le rayon central seul ne donne rien')
 assert.equal(assistedTarget(px,eye,pz,yaw+edge+.05,pitch,s)?.id,'squatter','regard imprécis : la cible est trouvée')
 assert.equal(assistedTarget(px,eye,pz,yaw+Math.PI,pitch,s),null,'dos à la cible : rien')
 assert.equal(assistedTarget(px,eye,pz,yaw,pitch,s,.5),null,'hors de portée : rien')
 // De l'autre côté d'un mur, l'aide ne doit rien trouver : le couloir longe l'accueil.
 assert.equal(assistedTarget(0,eye,3.7,-Math.PI/2,pitch,s),null,'à travers le mur : rien')
})

// ---------- rafale de E à la fin d'un dialogue ----------
const openedMorgue=()=>useGame.setState({phase:'playing',paused:false,capture:false,journalVisible:false,settingsVisible:false,hiding:null,chase:false,usb:true,done:{lab:true},modal:'story',dialog:'morgue',dialogStep:9,dialogApplied:9,dialogWalk:false,near:{id:'morgue',type:'evidence',hit:[-6.18,.86,42.12,.32,.16,.32]},notice:''})
test('clé USB : un E de plus après la scène ne la relance pas pendant la poursuite',()=>{
 runtime.player.x=-6.8
 openedMorgue()
 useGame.getState().closeModal()
 let s=useGame.getState();assert.equal(s.chase,true,'la poursuite démarre');assert.equal(s.near,null,'la cible d’avant le dialogue est oubliée')
 const objectif=s.notice
 s.interact();s=useGame.getState()
 assert.equal(s.modal,null,'pas de seconde scène');assert.equal(s.dialog,null);assert.equal(s.notice,objectif,'l’objectif reste affiché')
})
test('une cible devenue indisponible ne s’active plus, même si le rayon n’a pas encore suivi',()=>{
 runtime.player.x=-6.8;runtime.dialogClosedAt=-1e9
 useGame.setState({phase:'playing',paused:false,capture:false,journalVisible:false,settingsVisible:false,hiding:null,modal:null,dialog:null,chase:true,usb:true,done:{lab:true},near:{id:'morgue',type:'evidence'}})
 useGame.getState().interact()
 const s=useGame.getState();assert.equal(s.modal,null);assert.equal(s.dialog,null);assert.equal(s.near,null)
 useGame.setState({chase:false,usb:false})
})
test('dialogue en marchant : la cible reste connue pour enchaîner sur un objet',()=>{
 runtime.dialogClosedAt=-1e9
 const near={id:'tv',type:'look'}
 useGame.setState({phase:'playing',paused:false,chase:false,modal:'story',dialog:'note',dialogStep:0,dialogApplied:0,dialogWalk:true,near})
 useGame.getState().closeModal()
 assert.equal(useGame.getState().near,near);assert.equal(runtime.dialogClosedAt,-1e9,'pas d’attente après un dialogue en marchant')
})
test('après un dialogue, la main revient une fois l’anti-rebond passé',()=>{
 runtime.player.x=-3;useGame.setState({phase:'playing',paused:false,chase:false,modal:null,dialog:null,hiding:null,capture:false,journalVisible:false,settingsVisible:false,near:{id:'tv',type:'look'},seen:{}})
 runtime.dialogClosedAt=performance.now();useGame.getState().interact();assert.equal(useGame.getState().modal,null,'juste après : ignoré')
 runtime.dialogClosedAt=performance.now()-600;useGame.getState().interact();assert.equal(useGame.getState().dialog,'tv','plus tard : on peut relire')
 useGame.setState({modal:null,dialog:null,near:null})
})

// ---------- rapport qualité : monstre et portes, dialogue et cachette ----------
test('porte fermée : elle coupe la vue, ouverte non, et le monstre qui force la morgue l’ouvre seulement pour lui',()=>{
 const g=GATES.find(x=>x.id==='radio'),base={sectorOpen:true,hasKey:true,done:{patients:true,radio:true,security:true,lab:true},doorsOpened:{}}
 assert.equal(closedDoorBetween(g.x-1,g.z,g.x+1,g.z,base),'radio','à travers la porte')
 assert.equal(closedDoorBetween(g.x-1,g.z+g.w,g.x+1,g.z+g.w,base),null,'à côté de la porte : pas ce test')
 assert.equal(closedDoorBetween(g.x-1,g.z,g.x-.5,g.z,base),null,'du même côté')
 assert.equal(closedDoorBetween(g.x-1,g.z,g.x+1,g.z,{...base,doorsOpened:{radio:true}}),null,'ouverte')
 const m=GATES.find(x=>x.id==='morgue'),chase={...base,chase:true,doorsOpened:{morgue:true}}
 assert.equal(isDoorShut('morgue',chase),true,'condamnée pendant la fuite, même déjà ouverte avant')
 assert.equal(closedDoorBetween(m.x-1,m.z,m.x+1,m.z,chase),'morgue')
 assert.equal(isDoorShut('morgue',{...chase,monsterDoor:'morgue'}),false,'le temps de son passage')
 assert.equal(isOccupied(m.x,m.z,{...chase,monsterDoor:'morgue'}),true,'le joueur reste bloqué')
})
test('le monstre ne voit pas à travers une porte fermée, mais l’entend',()=>{
 const grid=buildNavGrid(()=>false),m={x:1,z:5},p={x:3,z:5}
 assert.equal(perceives(grid,m,p,{},CHASE_SENSES,3),true)
 assert.equal(perceives(grid,m,p,{doorBetween:true},CHASE_SENSES,30),false,'immobile derrière la porte')
 assert.equal(perceives(grid,m,p,{doorBetween:true,moving:true,running:true},CHASE_SENSES,3),true,'il entend courir')
})
test('le monstre force une porte : ouverte pour de bon, sauf la morgue pendant la fuite',()=>{
 useGame.setState({phase:'playing',chase:false,doorsOpened:{},monsterDoor:null})
 useGame.getState().monsterOpensDoor('radio');assert.equal(useGame.getState().doorsOpened.radio,true)
 useGame.setState({chase:true,doorsOpened:{}})
 useGame.getState().monsterOpensDoor('morgue');let s=useGame.getState();assert.equal(s.monsterDoor,'morgue');assert.equal(s.doorsOpened.morgue,undefined)
 useGame.getState().monsterLeavesDoor();assert.equal(useGame.getState().monsterDoor,null)
 useGame.setState({chase:false})
})
test('dialogue en marchant et cachette : pas d’interruption par inadvertance, sauf danger',()=>{
 const spot=INTERACTIVES.find(o=>o.type==='hide'),s={modal:'story',dialogWalk:true}
 assert.equal(isInteractiveAvailable(spot,s),false,'on ne se cache pas au milieu d’une discussion')
 assert.equal(isInteractiveAvailable(spot,{...s,encounter:true}),true,'sauf s’il rôde')
 assert.equal(isInteractiveAvailable(spot,{...s,chase:true}),true,'ou pendant la fuite')
 assert.equal(isInteractiveAvailable(spot,{}),true,'sans discussion en cours : normal')
})
test('entrer dans une cachette ferme la discussion : ses effets restent appliqués, E sert ensuite à sortir',()=>{
 runtime.dialogClosedAt=-1e9
 useGame.setState({phase:'playing',paused:false,capture:false,journalVisible:false,settingsVisible:false,hiding:null,encounter:true,chase:false,modal:'story',dialog:'note',dialogStep:0,dialogApplied:0,dialogWalk:true,near:null})
 useGame.getState().enterHiding('hide_hall')
 let s=useGame.getState();assert.equal(s.hiding,'hide_hall');assert.equal(s.modal,null);assert.equal(s.dialog,null)
 s.interact();s=useGame.getState();assert.equal(s.hiding,null,'E fait sortir');assert.equal(s.modal,null)
 useGame.setState({encounter:false})
})
test('porte de la morgue pendant la fuite : le message dit où aller',()=>{
 runtime.dialogClosedAt=-1e9
 useGame.setState({phase:'playing',paused:false,capture:false,journalVisible:false,settingsVisible:false,hiding:null,modal:null,chase:true,notice:'',near:{id:'locked_morgue',door:'morgue',type:'locked'}})
 useGame.getState().interact();assert.match(useGame.getState().notice,/galerie secrète/);useGame.setState({chase:false,notice:''})
})

// ---------- rapport qualité T04 : le mobilier ne doit jamais fermer un objectif ----------
test('chaque cible du scénario s’atteint à pied, avec de la marge, depuis un endroit d’où on peut la viser',()=>{
 const all={patients:true,radio:true,security:true,lab:true},common={hasKey:true,sectorOpen:true}
 const steps={squatter:{},tv:{},reception_pc:{},note:{},sector:{hasKey:true},bed203:common,patients:common,radio:{...common,done:{patients:true}},security:{...common,done:{patients:true,radio:true}},lab:{...common,done:{patients:true,radio:true,security:true}},morgue:{...common,done:all},exit:{...common,usb:true,chase:true,done:all}}
 // Rayon plus large que celui du joueur (0,32) : un passage où il faudrait se glisser au centimètre près ne compte pas.
 const MARGIN=.46,EYE=1.68
 for(const [id,flags] of Object.entries(steps)){
  const s={done:{},...flags,doorsOpened:Object.fromEntries(ROOM_DOORS.map(d=>[d,true]))}
  const from=id==='exit'?[-6.8,43.1]:[0,1],[cx,cy,cz]=INTERACTIVES.find(o=>o.id===id).hit
  const g=buildNavGrid((x,z)=>isOccupied(x,z,s,MARGIN),{...NAV_BOUNDS,cell:.2}),dist=computeDistances(g,from[0],from[1])
  let spots=0
  for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){
   if(dist[r*g.cols+c]<0)continue
   const x=g.xMin+(c+.5)*g.cell,z=g.zMin+(r+.5)*g.cell,dx=cx-x,dy=cy-EYE,dz=cz-z,l=Math.hypot(dx,dy,dz)
   if(l<=2.4&&raycastTarget(x,EYE,z,dx/l,dy/l,dz/l,{...s,_px:x})?.id===id)spots++
  }
  assert.ok(spots>=10,`${id} : ${spots} endroits atteignables d’où le viser`)
 }
})

// ---------- capture par le monstre : son visage, le cri le plus fort ----------
test('capture : la caméra se lève, puis le visage du monstre en plein écran, puis la fin',t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 startPlaying({chase:true,chaseTime:60})
 useGame.getState().beginCapture()
 let s=useGame.getState();assert.equal(s.capture,true);assert.equal(s.scare,null,'pas tout de suite : le temps de lever les yeux vers lui')
 t.mock.timers.tick(CAPTURE_SCARE_DELAY)
 s=useGame.getState();assert.equal(s.scare?.variant,'capture');assert.equal(s.lastEvent.type,'scare');assert.deepEqual(s.lastEvent.payload,{sound:'scare-jumpscare',impact:true})
 assert.equal(s.penalty,0,'la partie est perdue : pas de minute en plus');assert.equal(s.phase,'playing','le screamer va jusqu’au bout')
 t.mock.timers.tick(CAPTURE_SCARE.duration)
 s=useGame.getState();assert.equal(s.phase,'ending');assert.equal(s.endingReason,'caught')
})
test('capture, screamers désactivés dans les réglages : pas d’image, fin comme avant',t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 startPlaying({chase:true,chaseTime:60,settings:{...useGame.getState().settings,jumpscares:false}})
 useGame.getState().beginCapture();t.mock.timers.tick(1699)
 let s=useGame.getState();assert.equal(s.scare,null);assert.equal(s.phase,'playing')
 t.mock.timers.tick(1);s=useGame.getState();assert.equal(s.phase,'ending');assert.equal(s.lastEvent.type,'ending')
})
test('attrapé pendant une rencontre : même visage, une minute perdue, on se réveille plus loin',()=>{
 startPlaying({encounter:true,chapter:3})
 useGame.getState().encounterCaught()
 const s=useGame.getState();assert.equal(s.scare?.variant,'capture');assert.equal(s.penalty,60);assert.equal(s.phase,'playing');assert.equal(s.encounter,false)
 startPlaying({encounter:true,chapter:3,settings:{...useGame.getState().settings,jumpscares:false}})
 useGame.getState().encounterCaught();assert.equal(useGame.getState().scare,null);assert.equal(useGame.getState().lastEvent.type,'caught')
})
test('le screamer de la capture n’appartient qu’à elle',()=>{
 assert.ok(!SCARE_VARIANTS.includes(CAPTURE_SCARE),'jamais tiré au sort à une énigme ratée')
 for(let i=0;i<300;i++)assert.notEqual(pickScare(null,Math.random).id,'capture')
 assert.equal(scareVariant('capture'),CAPTURE_SCARE);assert.equal(scareVariant('masque').id,'masque');assert.equal(scareVariant('inconnu'),SCARE_VARIANTS[0])
 assert.ok(fs.existsSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public'+CAPTURE_SCARE.image)),'image présente')
 assert.ok(fs.existsSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/assets/sounds/scares/jumpscare.mp3')),'son présent')
})

test('Succès : chacun se débloque une seule fois, survit au rechargement et ignore les données douteuses',()=>{
 const ids=new Set();for(const a of ACHIEVEMENTS){assert.ok(!ids.has(a.id),`id unique ${a.id}`);ids.add(a.id);assert.ok(a.title&&a.desc,`${a.id} : titre et description`)}
 const st=memoryStorage()
 assert.deepEqual(loadAchievements(st),{},'rien au départ')
 saveAchievements({oiia:123},st);assert.deepEqual(loadAchievements(st),{oiia:123})
 st.setItem(ACHIEVEMENT_KEY,JSON.stringify({oiia:'hier',inconnu:5}));assert.deepEqual(loadAchievements(st),{},'date invalide et succès inconnu ignorés')
 st.setItem(ACHIEVEMENT_KEY,'{pas du json');assert.deepEqual(loadAchievements(st),{})
 useGame.setState({achievements:{}})
 const g=useGame.getState()
 assert.equal(g.unlockAchievement('inconnu'),false,'un succès inconnu ne se débloque pas')
 assert.equal(g.unlockAchievement('oiia'),true);const first=useGame.getState().achievements.oiia
 assert.ok(Number.isFinite(first));assert.equal(useGame.getState().achievementShown.id,'oiia');assert.equal(useGame.getState().lastEvent.type,'achievement')
 assert.equal(useGame.getState().unlockAchievement('oiia'),false,'pas de second déblocage');assert.equal(useGame.getState().achievements.oiia,first)
 useGame.getState().newGame();assert.equal(useGame.getState().achievements.oiia,first,'une nouvelle partie garde les succès')
})
test('Chat OIIA : E le fait chanter une fois à la fois et débloque son succès',t=>{
 withoutInteractGuard(t)
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 useGame.setState({achievements:{}});runtime.catSongUntil=0
 const events=[];const off=useGame.subscribe((s,p)=>{if(s.lastEvent!==p.lastEvent)events.push(s.lastEvent.type)});t.after(off)
 assert.ok(INTERACTIVES.some(o=>o.id==='cat'&&o.type==='talk'),'le chat est une cible de discussion')
 g.setNear({id:'cat'});useGame.getState().interact()
 assert.deepEqual(events,['oiia','achievement'],'chanson puis succès');assert.ok(useGame.getState().achievements.oiia)
 assert.ok(runtime.catSongUntil>performance.now()+12000,'il chante environ 13 s')
 useGame.getState().interact();assert.deepEqual(events,['oiia','achievement'],'un E pendant la chanson ne la relance pas')
 runtime.catSongUntil=0;useGame.getState().interact();assert.deepEqual(events,['oiia','achievement','oiia'],'chanson finie : on peut la relancer, sans second succès')
})
test('Prologue : une prise de Paul par carte, fichiers présents, gain raisonnable',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/assets/voices')
 assert.equal(PROLOGUE_VOICES.length,PROLOGUE.length,'une prise par carte')
 PROLOGUE.forEach((_,i)=>{const v=prologueVoice(i);assert.ok(v,`carte ${i}`);assert.ok(fs.existsSync(path.join(root,v.file)),v.file);assert.ok(Math.abs(v.gain)<=14)})
})

test('Rafale de E : une porte déjà ouverte ou déjà fermée ne rejoue rien ; le screamer du chat tombe à l’heure dite',t=>{
 withoutInteractGuard(t)
 const g=useGame.getState();g.newGame();g.closeModal();g.enterHospital();g.closeModal()
 useGame.setState({hasKey:true,sectorOpen:true,doorsOpened:{}})
 const events=[];const off=useGame.subscribe((s,p)=>{if(s.lastEvent!==p.lastEvent)events.push(s.lastEvent.type)});t.after(off)
 const door={id:'door_patients',type:'door',door:'patients'}
 useGame.getState().setNear(door);useGame.getState().interact();assert.equal(useGame.getState().doorsOpened.patients,true)
 useGame.getState().setNear(door);useGame.getState().interact()
 assert.equal(events.filter(e=>e==='latch').length,1,'un seul loquet malgré la cible périmée')
 // Screamer du chat : à l'heure, seulement si les screamers sont activés, jamais en retard.
 const fire=(at,jumpscares)=>{useGame.setState({scare:null,settings:{...useGame.getState().settings,jumpscares}});runtime.catScareAt=at;useGame.getState().tickCatScare();return useGame.getState().scare}
 assert.equal(fire(performance.now()+5000,true),null,'pas avant l’heure');assert.ok(runtime.catScareAt>0,'toujours programmé')
 assert.equal(fire(performance.now()-10,true)?.variant,'capture','le plus gros screamer, celui de la capture')
 assert.equal(runtime.catScareAt,0,'une seule fois')
 assert.equal(fire(performance.now()-10,false),null,'screamers désactivés : rien')
 assert.equal(fire(performance.now()-3000,true),null,'trop tard (énigme ouverte, pause) : rien')
})

test('Qualité : préréglages complets, réglages graphiques validés, choix selon la carte graphique',()=>{
 for(const q of QUALITIES){const p=QUALITY_PRESETS[q];for(const k of ['dpr','minScale','antialias','shadows','exteriorShadows','flashlightShadow','postprocessing','anisotropy','lights','fogPuffs','forest'])assert.ok(k in p,`${q}.${k}`)
  for(const k of ['cell','meshRange','nearRange','backCell','thin','leaves','blown','mist','terrain'])assert.ok(Number.isFinite(p.forest[k]),`${q}.forest.${k}`)}
 // Chaque cran coûte moins que le suivant.
 for(let i=1;i<QUALITIES.length;i++){const a=QUALITY_PRESETS[QUALITIES[i-1]],b=QUALITY_PRESETS[QUALITIES[i]];assert.ok(a.lights<=b.lights&&a.fogPuffs<=b.fogPuffs&&a.forest.terrain<=b.forest.terrain,`${QUALITIES[i-1]} ≤ ${QUALITIES[i]}`)}
 assert.equal(sanitizeSettings({}).autoQuality,true,'nouvelle installation : qualité automatique')
 assert.equal(sanitizeSettings({quality:'low'}).autoQuality,false,'qualité choisie à la main dans une ancienne version : respectée')
 assert.equal(sanitizeSettings({quality:'minimal',autoQuality:true}).quality,'minimal')
 const g=sanitizeSettings({renderScale:.75,fpsCap:30,showFps:true});assert.equal(g.renderScale,.75);assert.equal(g.fpsCap,30);assert.equal(g.showFps,true)
 const bad=sanitizeSettings({renderScale:.33,fpsCap:144,showFps:'oui'});assert.equal(bad.renderScale,0);assert.equal(bad.fpsCap,0);assert.equal(bad.showFps,false)
 assert.equal(qualityForGpu('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'),'minimal','rendu logiciel')
 assert.equal(qualityForGpu('llvmpipe (LLVM 15.0.7, 256 bits)'),'minimal')
 assert.equal(qualityForGpu('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)'),'low','puce Intel intégrée')
 assert.equal(qualityForGpu('Mali-G52'),'low');assert.equal(qualityForGpu('Adreno (TM) 610'),'low')
 assert.equal(qualityForGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)'),'medium');assert.equal(qualityForGpu('Apple M2'),'medium')
 assert.equal(qualityForGpu('Apple M2',{cores:2}),'minimal','deux cœurs');assert.equal(qualityForGpu('Apple M2',{phone:true}),'low','téléphone')
 // Abaissement automatique : un cran à la fois, jamais sous Minimale, et le joueur est prévenu.
 useGame.setState({settings:sanitizeSettings({quality:'medium',autoQuality:true})})
 assert.equal(useGame.getState().lowerQuality(),true);assert.equal(useGame.getState().settings.quality,'low');assert.match(useGame.getState().notice,/abaissée automatiquement : Basse/)
 assert.equal(useGame.getState().settings.autoQuality,true,'reste en automatique')
 useGame.getState().lowerQuality();assert.equal(useGame.getState().settings.quality,'minimal');assert.equal(useGame.getState().lowerQuality(),false)
 useGame.setState({settings:sanitizeSettings({})})
})

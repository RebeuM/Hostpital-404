// Moteur audio Web Audio entièrement synthétisé (aucun fichier son tiers) :
// ambiance, pas, portes, interface, événements narratifs, poursuite.
// Démarre uniquement après un geste utilisateur et respecte le volume des réglages.
// Niveaux exprimés en dBFS (0 dB = pleine échelle) ; un compresseur sur le bus principal évite l'écrêtage.
let ctx=null,master=null,comp=null,ambient=null,noiseBuffer=null,started=false,volume=.7,muted=false
// Bus des screamers : toujours à fond (ignore le curseur de volume, seul « couper le son » l'éteint), poussé puis limité.
let scareBus=null
let heartbeat=null,alarm=null,footIndex=0,tvNode=null,reverb=null,reverbSend=null,shaperCurve=null
import {roomSoundOf,roomEventDelay,pickRoomEvent} from './roomSound.js'
import {windGust} from './wind.js'
import {pickGrowl,growlDelay} from './growls.js'
import {pickLaughSpot} from './scares.js'
import {CAT} from './layout.js'
import {dangerLevel,heartPeriod} from './dread.js'
import {runtime} from './store.js'
import {SAMPLE_SETS,sampleUrl} from './sounds.js'
const samples={};let samplesLoading=false;const lastIndex={}
const dB=v=>Math.pow(10,v/20)

function makeNoise(c){
 const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0)
 for(let i=0;i<len;i++)d[i]=Math.random()*2-1
 return b
}
export function initAudio(){
 if(started)return true
 const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false
 try{ctx=new AC()}catch{return false}
 comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.22
 master=ctx.createGain();master.gain.value=muted?0:volume
 master.connect(comp);comp.connect(ctx.destination)
 const lim=ctx.createDynamicsCompressor();lim.threshold.value=-1;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.15
 scareBus=ctx.createGain();scareBus.gain.value=muted?0:dB(12);scareBus.connect(lim);lim.connect(ctx.destination)
 noiseBuffer=makeNoise(ctx);started=true
 // Réverbération de couloir : réponse impulsionnelle synthétique (bruit à décroissance exponentielle, 1,4 s).
 reverb=ctx.createConvolver();reverb.buffer=makeImpulse(ctx,1.4,2.8);reverbSend=ctx.createGain();reverbSend.gain.value=dB(-12)
 reverbSend.connect(reverb);reverb.connect(master)
 if(ctx.state==='suspended')ctx.resume().catch(()=>{})
 return true
}
// Charge les échantillons CC0 (une fois) ; chaque fichier manquant est simplement ignoré (repli synthétisé).
export function loadSamples(){
 if(!started||samplesLoading)return;samplesLoading=true
 for(const [name,files] of Object.entries(SAMPLE_SETS)){
  samples[name]=[]
  files.forEach(async file=>{
   try{const res=await fetch(sampleUrl(file));if(!res.ok)throw new Error(res.status+'');const buf=await res.arrayBuffer();if(!ctx)return
    const audio=await ctx.decodeAudioData(buf);samples[name].push(audio)}
   catch(e){console.warn(`[audio] échantillon indisponible : ${file} (${e.message}) — synthèse utilisée`)}
  })
 }
}
export function samplesLoaded(){return Object.values(samples).some(a=>a.length>0)}
function pickSample(name){
 const list=samples[name];if(!list||!list.length)return null
 let i=Math.floor(Math.random()*list.length);if(list.length>1&&i===lastIndex[name])i=(i+1)%list.length
 lastIndex[name]=i;return list[i]
}
function playSample(buffer,t,level,rate=1,dest=master,send=0){
 const src=ctx.createBufferSource();src.buffer=buffer;src.playbackRate.value=rate
 const g=ctx.createGain();g.gain.value=dB(level);src.connect(g);g.connect(dest)
 if(send&&reverbSend){const sg=ctx.createGain();sg.gain.value=dB(send);g.connect(sg);sg.connect(reverbSend)}
 src.start(t);return src
}
function makeImpulse(c,seconds,decay){
 const len=Math.floor(c.sampleRate*seconds),b=c.createBuffer(2,len,c.sampleRate)
 for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++){const x=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-x,decay)*(i<200?i/200:1)}}
 return b
}
function distortionCurve(k=60){
 if(shaperCurve)return shaperCurve
 const n=2048,curve=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;curve[i]=(1+k)*x/(1+k*Math.abs(x))}
 return shaperCurve=curve
}
export function setVolume(v){volume=Math.max(0,Math.min(1,v));if(master){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.05)}}
export function setMuted(m){muted=m;if(master){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.05)}if(scareBus)scareBus.gain.setTargetAtTime(muted?0:dB(12),ctx.currentTime,.05)}
export function isMuted(){return muted}
export function suspendAudio(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{})}
export function resumeAudio(){if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{})}
export function disposeAudio(){
 stopAmbient();stopHeartbeat();stopAlarm();stopTv();stopVoice();stopMusic();stopCat()
 if(ctx){ctx.close().catch(()=>{})}
 ctx=null;master=null;comp=null;scareBus=null;started=false;ambient=null;reverb=null;reverbSend=null
}
export function isAudioStarted(){return started}
// ---- voix (dialogues enregistrés) : lecture séquentielle, décodage à la demande, interruptible.
const voiceCache={};let voiceRun=null,voiceBus=null
async function voiceBuffer(url){
 if(voiceCache[url])return voiceCache[url]
 const res=await fetch(url);if(!res.ok)throw new Error('HTTP '+res.status)
 const buf=await res.arrayBuffer();if(!ctx)throw new Error('audio fermé')
 return voiceCache[url]=await ctx.decodeAudioData(buf)
}
// items : [{url, gain (dB), key}] ; onLine(key, durée en s) est appelé au début de chaque prise puis onLine(null) à la fin.
export function playVoiceSequence(items,onLine){
 stopVoice()
 if(!started){onLine?.(null);return {stop(){}}}
 if(!voiceBus){voiceBus=ctx.createGain();voiceBus.gain.value=1;voiceBus.connect(master)}
 const run={cancelled:false,src:null}
 voiceRun=run
 ;(async()=>{
  for(const it of items){
   if(run.cancelled)return
   let buf=null
   try{buf=await voiceBuffer(it.url)}catch(e){console.warn(`[voix] fichier indisponible : ${it.url} (${e.message})`);continue}
   if(run.cancelled)return
   if(ctx.state!=='running'){try{await ctx.resume()}catch{}}
   onLine?.(it.key,buf.duration)
   await new Promise(res=>{
    const src=ctx.createBufferSource();src.buffer=buf;const g=ctx.createGain();g.gain.value=dB(it.gain||0)
    let tail=g
    if(it.fx==='pa'||it.fx==='radio'){
     // Bande étroite type haut-parleur / enregistrement, légère saturation, plus d'écho pour le haut-parleur.
     const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=it.fx==='pa'?350:300
     const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=it.fx==='pa'?3600:3000
     const sh=ctx.createWaveShaper();sh.curve=distortionCurve(it.fx==='pa'?12:22);sh.oversample='2x'
     const out=ctx.createGain();out.gain.value=dB(it.fx==='pa'?-3:-2)
     g.connect(hp);hp.connect(lp);lp.connect(sh);sh.connect(out);tail=out
    }
    tail.connect(voiceBus);if(reverbSend){const sg=ctx.createGain();sg.gain.value=dB(it.fx==='pa'?-9:-18);tail.connect(sg);sg.connect(reverbSend)}
    src.connect(g);src.onended=res;run.src=src;src.start()
   })
   run.src=null
   if(run.cancelled)return
   await new Promise(res=>setTimeout(res,380))
  }
  if(!run.cancelled){voiceRun=null;onLine?.(null)}
 })()
 return {stop(){run.cancelled=true;try{run.src?.stop()}catch{};if(voiceRun===run)voiceRun=null}}
}
export function stopVoice(){if(voiceRun){voiceRun.cancelled=true;try{voiceRun.src?.stop()}catch{};voiceRun=null}}
export function isVoicePlaying(){return !!voiceRun}
export function audioState(){return ctx?ctx.state:'none'}
const now=()=>ctx.currentTime
function env(g,t,a,peak,d,s=0,r=.1){const p=g.gain;p.cancelScheduledValues(t);p.setValueAtTime(0,t);p.linearRampToValueAtTime(peak,t+a);p.linearRampToValueAtTime(peak*s,t+a+d);p.linearRampToValueAtTime(0,t+a+d+r)}
function osc(type,freq,t,dur,level,dest=master,detune=0,sweepTo=null){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune
 if(sweepTo)o.frequency.exponentialRampToValueAtTime(sweepTo,t+dur)
 o.connect(g);g.connect(dest);env(g,t,.005,dB(level),dur*.6,.3,dur*.4);o.start(t);o.stop(t+dur+.05);return o
}
function noise(t,dur,level,filterType='lowpass',freq=800,q=.7,dest=master,attack=.004){
 const s=ctx.createBufferSource();s.buffer=noiseBuffer;s.loop=true;s.playbackRate.value=.9+Math.random()*.2
 const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.value=freq;f.Q.value=q
 const g=ctx.createGain();s.connect(f);f.connect(g);g.connect(dest);env(g,t,attack,dB(level),dur*.5,.4,dur*.5);s.start(t);s.stop(t+dur+.05);return {s,f,g}
}
// ---- ambiance continue ----------------------------------------------------
export function startAmbient(){
 if(!started||ambient)return
 const bus=ctx.createGain();bus.gain.value=0;bus.connect(master);bus.gain.linearRampToValueAtTime(1,now()+2.5)
 const nodes=[]
 // Bourdon grave (ventilation lointaine) : deux sous-basses légèrement désaccordées + une octave.
 for(const [f,type,lvl,cut] of [[55,'sawtooth',-26,220],[56.5,'sawtooth',-28,220],[110,'triangle',-24,400]]){
  const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();o.type=type;o.frequency.value=f;lp.type='lowpass';lp.frequency.value=cut;g.gain.value=dB(lvl)
  o.connect(lp);lp.connect(g);g.connect(bus);o.start();nodes.push(o)
 }
 // Tonalité de pièce : souffle filtré dans les médiums, modulé lentement (courant d'air dans les couloirs).
 const room=ctx.createBufferSource();room.buffer=noiseBuffer;room.loop=true
 const roomF=ctx.createBiquadFilter();roomF.type='bandpass';roomF.frequency.value=520;roomF.Q.value=.5
 const roomG=ctx.createGain();roomG.gain.value=dB(-30);room.connect(roomF);roomF.connect(roomG);roomG.connect(bus);room.start();nodes.push(room)
 const lfo=ctx.createOscillator(),lfoG=ctx.createGain();lfo.frequency.value=.06;lfoG.gain.value=dB(-34);lfo.connect(lfoG);lfoG.connect(roomG.gain);lfo.start();nodes.push(lfo)
 // Nappe dissonante presque inaudible, qui enfle et retombe lentement : on ne l'entend pas, on la ressent.
 const tense=ctx.createGain();tense.gain.value=dB(-46);tense.connect(bus)
 for(const f of [207.65,220,233.08,311.13]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(tense);o.start();nodes.push(o)}
 const tenseLfo=ctx.createOscillator(),tenseDepth=ctx.createGain();tenseLfo.frequency.value=.037;tenseDepth.gain.value=dB(-40);tenseLfo.connect(tenseDepth);tenseDepth.connect(tense.gain);tenseLfo.start();nodes.push(tenseLfo)
 // Grésillement des néons.
 const buzz=ctx.createOscillator(),buzzG=ctx.createGain(),buzzF=ctx.createBiquadFilter();buzz.type='square';buzz.frequency.value=100;buzzF.type='bandpass';buzzF.frequency.value=1900;buzzF.Q.value=6;buzzG.gain.value=dB(-38)
 buzz.connect(buzzF);buzzF.connect(buzzG);buzzG.connect(bus);buzz.start();nodes.push(buzz)
 // Nappes enregistrées (si chargées) en boucle, filtrées, à bas niveau ; deux longueurs différentes masquent les points de boucle.
 const droneNodes=[]
 const startDrones=()=>{const list=samples['drone']||[];list.forEach((buf,i)=>{const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;src.playbackRate.value=i?.97:1
   const g=ctx.createGain();g.gain.value=dB(i?-9:-7);src.connect(g);g.connect(bus);src.start(now()+i*4);droneNodes.push(src)})}
 if((samples['drone']||[]).length)startDrones();else setTimeout(()=>{if(ambient&&ambient.bus===bus&&(samples['drone']||[]).length)startDrones()},4000)
 const timer=setInterval(()=>{if(!ctx||ctx.state!=='running')return;const r=Math.random();const pan=Math.random()*2-1
  if(r<.3){const b=pickSample('creak');if(b)playSample(b,now(),-16-Math.random()*6,.85+Math.random()*.3,spatial(pan,6+Math.random()*8));else creak(-18-Math.random()*6)}
  else if(r<.5)knock(-16-Math.random()*6)
  else if(r<.62)pipeTick()
  else if(r<.72)gust()
  else if(r<.8){const b=pickSample('moan');if(b)playSample(b,now(),-14,.9+Math.random()*.2,spatial(pan,10+Math.random()*10))}
  else if(r<.86){const b=pickSample('door-close');if(b)playSample(b,now(),-18,.75,spatial(pan,14+Math.random()*10))}
 },4800)
 ambient={bus,nodes:[...nodes,...droneNodes],timer}
}
// ---- vent : deux prises en boucle (pins et rafales), suivant windGust ; étouffé derrière les murs une fois entré.
let wind=null
export function startWind(){
 if(!started||wind)return
 const bus=ctx.createGain(),filter=ctx.createBiquadFilter(),howlGain=ctx.createGain()
 filter.type='lowpass';filter.frequency.value=18000;bus.gain.value=0;howlGain.gain.value=0
 filter.connect(bus);bus.connect(master)
 const state={bus,filter,howlGain,nodes:[],outside:true,timer:null,owlAt:now()+14,started:false}
 const begin=()=>{
  const pines=(samples['wind-pines']||[])[0],howl=(samples['wind-howl']||[])[0];if(!pines||state.started)return
  state.started=true
  const a=ctx.createBufferSource();a.buffer=pines;a.loop=true;const ag=ctx.createGain();ag.gain.value=dB(-3);const air=ctx.createBiquadFilter();air.type='highshelf';air.frequency.value=2200;air.gain.value=9;a.connect(air);air.connect(ag);ag.connect(filter);a.start();state.nodes.push(a)
  if(howl){const h=ctx.createBufferSource();h.buffer=howl;h.loop=true;h.connect(howlGain);howlGain.connect(filter);h.start();state.nodes.push(h)}
 }
 begin()
 state.timer=setInterval(()=>{
  if(!ctx||ctx.state!=='running')return
  begin()
  const t=now(),g=windGust(performance.now()/1000)
  state.bus.gain.setTargetAtTime(state.outside?dB(-13+g*7):dB(-34+g*5),t,.5)
  state.howlGain.gain.setTargetAtTime(dB(-26+Math.pow(g,2)*18),t,.6)
  state.filter.frequency.setTargetAtTime(state.outside?2600+g*9000:480,t,.5)
  // Un hibou, parfois, quelque part dans la forêt.
  if(state.outside&&t>state.owlAt){state.owlAt=t+26+Math.random()*38;const b=pickSample('owl');if(b)playSample(b,t,-15-Math.random()*5,.94+Math.random()*.1,spatial(Math.random()*2-1,16+Math.random()*16),-8)}
 },250)
 wind=state
}
export function stopWind(){
 if(!wind)return
 clearInterval(wind.timer);const w=wind;wind=null
 try{w.bus.gain.setTargetAtTime(0,now(),.3)}catch{}
 setTimeout(()=>{w.nodes.forEach(n=>{try{n.stop()}catch{}});try{w.bus.disconnect()}catch{}},900)
}
// Dehors : le vent domine et la tonalité de l'hôpital (néons, nappes) disparaît ; dedans, l'inverse.
export function setOutsideAudio(outside){
 if(wind)wind.outside=outside
 if(ambient&&ctx)ambient.bus.gain.setTargetAtTime(outside?dB(-26):1,now(),outside?.05:.6)
}
// ---- grognements pendant les énigmes : lointains et étouffés, ou tout près ; coupés dès que l'énigme se ferme.
let growls=null
export function playGrowl(pick=pickGrowl()){
 const buf=pickSample('growl');if(!buf||!ctx)return null
 const src=ctx.createBufferSource(),g=ctx.createGain(),t=now()
 src.buffer=buf;src.playbackRate.value=pick.rate;g.gain.value=dB(pick.close?8:11)
 src.connect(g);g.connect(spatial(pick.pan,pick.dist));src.start(t,pick.offset,pick.duration)
 return {src,g}
}
export function startGrowls(canPlay=()=>true){
 if(growls||!started)return
 const state={timer:null,voice:null}
 const schedule=first=>{state.timer=setTimeout(()=>{
  if(ctx&&ctx.state==='running'&&canPlay())state.voice=playGrowl()
  schedule(false)},growlDelay(Math.random,first)*1000)}
 schedule(true);growls=state
}
export function stopGrowls(){
 if(!growls)return
 clearTimeout(growls.timer);const v=growls.voice;growls=null
 if(v&&ctx){try{v.g.gain.setTargetAtTime(0,now(),.12);v.src.stop(now()+.6)}catch{}}
}
// ---- musique de fond : lue en continu (143 s décodées d'un coup prendraient 55 Mo de mémoire), s'efface sous les voix et la fuite.
const MUSIC_URL='/assets/sounds/music/musique-arriere-plan-jeu.mp3'
const MUSIC_LEVEL=-15
let music=null,musicDuckUntil=0,chaseAudioTimer=null
// Efface la musique quelques secondes sous un son important (transformation, screamer).
function duckMusic(seconds){musicDuckUntil=performance.now()+seconds*1000}
export function startMusic(){
 if(!started||music)return
 const el=new Audio(MUSIC_URL);el.loop=true;el.preload='auto'
 const src=ctx.createMediaElementSource(el),g=ctx.createGain();g.gain.value=0;src.connect(g);g.connect(master)
 const state={el,g,src,timer:null,target:null}
 state.timer=setInterval(()=>{
  if(!ctx)return
  const level=performance.now()<musicDuckUntil?-34:MUSIC_LEVEL-(voiceRun?7:heartbeat?5:0)
  if(level!==state.target){g.gain.setTargetAtTime(dB(level),now(),state.target===null?1.5:.5);state.target=level}
 },200)
 el.play().catch(()=>{});music=state
}
export function stopMusic(){
 if(!music)return
 const m=music;music=null;clearInterval(m.timer)
 try{m.g.gain.setTargetAtTime(0,now(),.35)}catch{}
 setTimeout(()=>{m.el.pause();try{m.src.disconnect();m.g.disconnect()}catch{}},1400)
}
export function setMusicPaused(paused){if(!music)return;if(paused)music.el.pause();else music.el.play().catch(()=>{})}
export function isMusicPlaying(){return !!music&&!music.el.paused}
export function stopAmbient(){
 stopRoomBed(.4)
 if(!ambient)return
 clearInterval(ambient.timer)
 try{ambient.bus.gain.setTargetAtTime(0,now(),.3)}catch{}
 const a=ambient;setTimeout(()=>{a.nodes.forEach(n=>{try{n.stop()}catch{}})},800);ambient=null
}
// ---- sons propres à chaque lieu : fondu entre les pièces, bruits ponctuels situés autour du joueur.
let roomBed=null
const ROOM_FADE=1.4
function stopRoomBed(fade=ROOM_FADE){
 if(!roomBed)return
 const b=roomBed;roomBed=null;clearTimeout(b.timer)
 try{b.bus.gain.setTargetAtTime(0,now(),fade/3)}catch{}
 setTimeout(()=>{b.nodes.forEach(n=>{try{n.stop()}catch{}});try{b.bus.disconnect()}catch{}},fade*1000+600)
}
export function setRoomAudio(room){
 if(!started||!ambient||roomBed?.room===room)return
 stopRoomBed()
 const sound=roomSoundOf(room);if(!sound){roomBed={room,nodes:[],bus:ctx.createGain(),timer:null};return}
 const bus=ctx.createGain(),nodes=[];bus.gain.value=0;bus.connect(master);bus.gain.setTargetAtTime(1,now(),ROOM_FADE/3)
 for(const [freq,type,level,cut] of sound.tones){
  const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=cut;g.gain.value=dB(level)
  o.connect(f);f.connect(g);g.connect(bus);o.start();nodes.push(o)
 }
 if(sound.air){
  const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noiseBuffer;src.loop=true;f.type='bandpass';f.frequency.value=sound.air.freq;f.Q.value=sound.air.q;g.gain.value=dB(sound.air.level)
  src.connect(f);f.connect(g);g.connect(bus);src.start();nodes.push(src)
 }
 const state={room,bus,nodes,timer:null,last:null,played:[]}
 const schedule=()=>{state.timer=setTimeout(()=>{
  if(roomBed!==state)return
  if(ctx&&ctx.state==='running'&&!muted){state.last=pickRoomEvent(sound,state.last);state.played.push(state.last);roomEvent(state.last)}
  schedule()},roomEventDelay(sound)*1000)}
 schedule();roomBed=state
}
export const roomAudioState=()=>roomBed?{room:roomBed.room,voices:roomBed.nodes.length,played:roomBed.played||[]}:null
// Bruits ponctuels : tous synthétisés, sans fichier à charger.
function roomEvent(id){
 const t=now(),pan=Math.random()*2-1,dest=spatial(pan,3+Math.random()*5)
 switch(id){
  case 'drip':{const f=900+Math.random()*700;osc('sine',f,t,.07,-16,dest,0,f*.45);if(Math.random()<.5)osc('sine',f*.8,t+.32+Math.random()*.2,.06,-20,dest,0,f*.4);break}
  case 'pipe':for(let i=0;i<5;i++)osc('triangle',1500+Math.random()*900,t+i*(.1+Math.random()*.16),.05,-22,dest);break
  case 'phone':for(let i=0;i<2;i++){for(let k=0;k<14;k++)osc('square',k%2?440:480,t+i*1.6+k*.05,.05,-30,dest)}break
  case 'clock':for(let i=0;i<6;i++)noise(t+i*.98,.012,-22,'highpass',3200,.7,dest);break
  case 'chair':{const o=pickSample('creak');if(o)playSample(o,t,-14,1.3+Math.random()*.3,dest);else creak(-22);break}
  case 'monitor':for(let i=0;i<4;i++)osc('sine',880,t+i*.82,.11,-24,dest);break
  case 'relay':for(let i=0;i<2;i++)noise(t+i*.11,.018,-18,'bandpass',2200,3,dest);osc('sine',100,t,.16,-26,dest);break
  case 'tick':for(let i=0;i<9;i++)noise(t+i*(.05+Math.random()*.32),.01,-22,'highpass',4200,.7,dest);break
  case 'static':noise(t,1.3,-27,'bandpass',3400,.4,dest,.2);break
  case 'bubble':for(let i=0;i<8;i++){const f=280+Math.random()*420,at=t+i*(.06+Math.random()*.14);osc('sine',f,at,.09,-24,dest,0,f*1.7)}break
  case 'metal':{osc('triangle',310,t,.9,-22,dest,0,285);osc('sine',743,t,.6,-27,dest,0,720);noise(t,.04,-20,'bandpass',1400,2,dest);break}
  case 'compressor':osc('sawtooth',43,t,1.8,-20,dest,0,58);noise(t,.2,-24,'lowpass',260,.7,dest);break
  case 'moan':{const b=pickSample('moan');if(b)playSample(b,t,-16,.8+Math.random()*.15,dest);break}
  default:break
 }
}
function creak(level=-18){const t=now();const o=ctx.createOscillator(),gain=ctx.createGain(),f=ctx.createBiquadFilter()
 o.type='sawtooth';o.frequency.setValueAtTime(110+Math.random()*80,t);o.frequency.exponentialRampToValueAtTime(45+Math.random()*30,t+1.3)
 f.type='bandpass';f.frequency.value=700;f.Q.value=5;o.connect(f);f.connect(gain);gain.connect(master);env(gain,t,.3,dB(level),.6,.5,.6);o.start(t);o.stop(t+1.8)}
function knock(level=-16){const t=now();for(let i=0;i<2;i++){osc('sine',64,t+i*.24,.28,level);noise(t+i*.24,.09,level-4,'lowpass',500)}}
function pipeTick(){const t=now();for(let i=0;i<4;i++)osc('triangle',1800+Math.random()*900,t+i*(.12+Math.random()*.2),.05,-24)}
function gust(){const t=now();noise(t,2.4,-22,'bandpass',380,.7,master,.9)}
// ---- pas ---------------------------------------------------------------------
// Un pas = impact du talon (clic bref filtré), corps (sinus à chute de hauteur rapide), pose de la semelle
// (second souffle plus doux 70–110 ms après), frottement léger, parfois un couinement sur le sol lisse ;
// alternance gauche/droite par panoramique et envoi vers la réverbération du couloir.
const SURFACE={
 lino:{click:2600,clickQ:1.1,thump:150,thumpLvl:-8,sole:1100,scuff:-28,squeak:.1,level:-12},
 tile:{click:3600,clickQ:1.6,thump:190,thumpLvl:-10,sole:1600,scuff:-32,squeak:.03,level:-11},
 concrete:{click:1900,clickQ:.9,thump:120,thumpLvl:-6,sole:900,scuff:-24,squeak:0,level:-12}
}
function burst(t,dur,level,type,freq,q,dest,attack=.0015){
 const src=ctx.createBufferSource();src.buffer=noiseBuffer;src.loop=true;src.playbackRate.value=.85+Math.random()*.3
 const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q
 const g=ctx.createGain();const peak=dB(level)
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(peak*.002,t+attack+dur)
 src.connect(f);f.connect(g);g.connect(dest);src.start(t);src.stop(t+attack+dur+.02)
}
export function footstep(surface='lino',running=false){
 if(!started||ctx.state!=='running')return
 const p=SURFACE[surface]||SURFACE.lino;const t=now();footIndex++
 // Vraies prises de chaussures (Freesound, CC0) : la variation reste faible pour garder le timbre naturel,
 // et le pas est à peine panoramiqué : il vient du joueur lui-même.
 const buf=pickSample(running?'step-run':'step-'+surface)
 if(buf){
  const pan=ctx.createStereoPanner();pan.pan.value=(footIndex%2?1:-1)*.06;pan.connect(master)
  const level=(running?-5:-4)+(Math.random()*2.4-1.2)
  playSample(buf,t,level,.97+Math.random()*.06,pan,surface==='concrete'?-10:-14)
  return
 }
 const pan=ctx.createStereoPanner();pan.pan.value=(footIndex%2?1:-1)*.22;pan.connect(master)
 if(reverbSend)pan.connect(reverbSend)
 const vel=(running?3:0)+(Math.random()*3-1.5)
 const lvl=p.level+vel
 // talon
 burst(t,.028,lvl,'bandpass',p.click*(.85+Math.random()*.3),p.clickQ,pan)
 // corps : chute de hauteur 1,6× → 0,35× en 120 ms
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine'
 const f0=p.thump*(.9+Math.random()*.2);o.frequency.setValueAtTime(f0*1.6,t);o.frequency.exponentialRampToValueAtTime(f0*.35,t+.12)
 const pk=dB(p.thumpLvl+vel);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.003);g.gain.exponentialRampToValueAtTime(pk*.002,t+.16)
 o.connect(g);g.connect(pan);o.start(t);o.stop(t+.2)
 // semelle
 const dt=.07+Math.random()*.04
 burst(t+dt,.045,lvl-7,'lowpass',p.sole,.7,pan,.004)
 // frottement
 burst(t+dt+.01,.11,p.scuff+vel,'bandpass',650,.8,pan,.02)
 // couinement occasionnel (sol lisse)
 if(Math.random()<p.squeak){const q=ctx.createOscillator(),qg=ctx.createGain();q.type='sine';q.frequency.setValueAtTime(2300+Math.random()*600,t+dt);q.frequency.exponentialRampToValueAtTime(2900,t+dt+.08)
  const qp=dB(lvl-14);qg.gain.setValueAtTime(0,t+dt);qg.gain.linearRampToValueAtTime(qp,t+dt+.01);qg.gain.exponentialRampToValueAtTime(qp*.01,t+dt+.09);q.connect(qg);qg.connect(pan);q.start(t+dt);q.stop(t+dt+.1)}
}
// ---- monstre de la poursuite (spatialisé : panoramique selon la direction, atténuation et filtrage selon la distance)
// Son placé dans le monde (vraie 3D HRTF) : il reste au même endroit et l'oreille suit la position et le regard du joueur.
function syncListener(){
 const l=ctx.listener,p=runtime.player,fx=Math.sin(p.yaw),fz=Math.cos(p.yaw)
 if(l.positionX){l.positionX.value=p.x;l.positionY.value=1.6;l.positionZ.value=p.z;l.forwardX.value=fx;l.forwardY.value=0;l.forwardZ.value=fz;l.upX.value=0;l.upY.value=1;l.upZ.value=0}
 else{l.setPosition(p.x,1.6,p.z);l.setOrientation(fx,0,fz,0,1,0)}
}
// Joue un échantillon en un point du monde.
function playAt(buf,spot,{level=4,rate=1,offset=0,duration}={}){
 if(!buf||!ctx)return null
 syncListener()
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),panner=ctx.createPanner(),g=ctx.createGain()
 src.buffer=buf;src.playbackRate.value=rate
 // Plus il est loin, plus il est étouffé : on l'entend à travers les murs.
 const dist=Math.hypot(spot.x-runtime.player.x,spot.z-runtime.player.z)
 f.type='lowpass';f.frequency.value=Math.max(1400,9000/(1+dist/7))
 panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=3;panner.rolloffFactor=1
 if(panner.positionX){panner.positionX.value=spot.x;panner.positionY.value=spot.y;panner.positionZ.value=spot.z}else panner.setPosition(spot.x,spot.y,spot.z)
 g.gain.value=dB(level)
 src.connect(f);f.connect(panner);panner.connect(g);g.connect(master)
 // Peu de réverbération : elle revient des deux côtés et brouillerait la direction.
 if(reverbSend){const wet=ctx.createGain();wet.gain.value=.12;f.connect(wet);wet.connect(reverbSend)}
 const follow=setInterval(()=>{if(ctx)syncListener()},50)
 src.onended=()=>clearInterval(follow)
 if(duration)src.start(now(),offset,duration);else src.start(now(),offset)
 return {spot,dist,src}
}
// Le chat « OIIA » chante depuis sa table basse : le son vient de lui, s'éloigne et s'étouffe quand on part.
let catSrc=null
function playCat(){
 stopCat()
 const r=playAt(pickSample('oiia'),{x:CAT.x,y:CAT.y+.25,z:CAT.z},{level:-1})
 if(r)catSrc=r.src
}
export function stopCat(){if(catSrc){try{catSrc.stop()}catch{};catSrc=null}}
export function playLaugh(spot=pickLaughSpot(runtime.player.x,runtime.player.z)){
 return playAt(pickSample('laugh'),spot,{rate:.94+Math.random()*.12})
}
// Un point dans le dos du joueur (ou ailleurs, selon l'angle par rapport au regard).
function spotAround(angle,dist){
 const p=runtime.player,a=p.yaw+angle
 return {x:p.x+Math.sin(a)*dist,y:.3,z:p.z+Math.cos(a)*dist}
}
// Des pas derrière le joueur, de plus en plus près ; quand il s'arrête, ils s'arrêtent aussi.
function stalkerSteps(){
 const buf=pickSample('step-concrete')||pickSample('step-tile');if(!buf)return
 let n=0,last={x:runtime.player.x,z:runtime.player.z},still=0
 const total=4+Math.floor(Math.random()*3)
 const timer=setInterval(()=>{
  const p=runtime.player,moved=Math.hypot(p.x-last.x,p.z-last.z);last={x:p.x,z:p.z}
  still=moved<.08?still+1:0
  if(!ctx||ctx.state!=='running'||n>=total||still>=2){clearInterval(timer);return}
  playAt(pickSample('step-concrete')||buf,spotAround(Math.PI+(Math.random()-.5)*.4,7.5-n*.7),{level:5,rate:.72+Math.random()*.06});n++
 },560)
}
// Une respiration juste derrière : du souffle filtré, sans échantillon.
function breathBehind(){
 const spot=spotAround(Math.PI+(Math.random()-.5)*.8,1.1);spot.y=1.6
 syncListener()
 const panner=ctx.createPanner();panner.panningModel='HRTF';panner.refDistance=1
 if(panner.positionX){panner.positionX.value=spot.x;panner.positionY.value=spot.y;panner.positionZ.value=spot.z}else panner.setPosition(spot.x,spot.y,spot.z)
 const g=ctx.createGain();g.gain.value=dB(11);panner.connect(g);g.connect(master)
 for(const [at,dur,freq] of [[0,.9,780],[1.15,1.15,520],[2.6,.85,800]]){
  const t=now()+at,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),e=ctx.createGain()
  src.buffer=noiseBuffer;src.loop=true;f.type='bandpass';f.frequency.value=freq;f.Q.value=1.1
  e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.55,t+dur*.4);e.gain.linearRampToValueAtTime(0,t+dur)
  src.connect(f);f.connect(e);e.connect(panner);src.start(t);src.stop(t+dur+.05)
 }
}
// Le néon qui lâche : crépitements et claquement du ballast.
function flickerBuzz(){
 const t=now();for(let i=0;i<9;i++)noise(t+i*.09+Math.random()*.05,.035,-20-Math.random()*8,'highpass',2600,.7)
 osc('square',100,t,.5,-30);osc('sine',60,t+.6,.14,-14)
}
function buildingNoise(){
 const r=Math.random(),spot=spotAround(Math.random()*Math.PI*2,4+Math.random()*9)
 if(r<.3)playAt(pickSample('door-close'),spot,{level:10,rate:.7+Math.random()*.2})
 else if(r<.55)playAt(pickSample('creak'),spot,{level:11,rate:.75+Math.random()*.3})
 else if(r<.8)playAt(pickSample('moan'),spot,{level:10,rate:.85+Math.random()*.2})
 else{const g=pickGrowl();playAt(pickSample('growl'),spot,{level:10,rate:g.rate,offset:g.offset,duration:g.duration})}
}
// Essoufflement : plus l'endurance est basse, plus le souffle est rapide et fort.
let pantIn=0
export function pantTick(dt,level){
 if(!ctx||ctx.state!=='running'||level>=.3){pantIn=0;return}
 pantIn-=dt;if(pantIn>0)return
 pantIn=.52+level*1.4
 const t=now(),src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain()
 src.buffer=noiseBuffer;src.loop=true;f.type='bandpass';f.frequency.value=850+Math.random()*250;f.Q.value=1.3
 const peak=.16+(.3-level)*.5
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+.12);g.gain.linearRampToValueAtTime(0,t+.36)
 src.connect(f);f.connect(g);g.connect(master);src.start(t);src.stop(t+.4)
}
function playDread(id){
 if(!ctx||ctx.state!=='running')return
 if(['stalker','breath','apparition'].includes(id))playHeartBurst()
 if(id==='stalker')stalkerSteps()
 else if(id==='noise')buildingNoise()
 else if(id==='breath')breathBehind()
 else if(id==='flicker')flickerBuzz()
 else if(id==='torch'){const b=pickSample('click');if(b){playSample(b,now(),-8,.8);playSample(b,now()+.32,-10,.7)}}
 else if(id==='apparition'){const t=now();[0,.72,1.36,1.92].forEach((d,i)=>{osc('sine',50,t+d,.2,-8+i);osc('sine',46,t+d+.2,.17,-11+i)})}
}
function spatial(pan,dist){
 const p=ctx.createStereoPanner();p.pan.value=pan*.85
 const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=Math.max(500,6000/(1+dist/4))
 const g=ctx.createGain();g.gain.value=Math.min(1,4.5/(dist+1.2))
 f.connect(p);p.connect(g);g.connect(master);if(reverbSend)g.connect(reverbSend)
 return f
}
export function monsterStep(pan,dist){
 if(!started||ctx.state!=='running')return
 const t=now();const dest=spatial(pan,dist)
 const buf=pickSample('monster-step')
 if(buf)playSample(buf,t,-2,.9+Math.random()*.2,dest)
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(32,t+.18)
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(dB(-4),t+.006);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);g.connect(dest);o.start(t);o.stop(t+.3)
}
export function monsterRoar(pan,dist){
 if(!started||ctx.state!=='running')return
 // Le grognement fourni par le propriétaire, placé là où se trouve le monstre.
 if(!playGrowl({...pickGrowl(),close:true,pan,dist}))osc('sawtooth',70,now(),1.2,-8,spatial(pan,dist))
}
// ---- interface et événements --------------------------------------------------
export function sfx(type,payload=null){
 // Son coupé : aucun effet n'est créé. Le volume à zéro devrait suffire, mais un cri de capture a parfois traversé
 // la coupure lors des contrôles (cause non trouvée) ; ne rien jouer garantit le silence et épargne le processeur.
 if(!started||muted||ctx.state!=='running')return
 const t=now()
 switch(type){
  case 'scare':playScare(payload);break
  case 'ui':{const b=pickSample('ui-click');if(b)playSample(b,t,-12);else osc('square',1200,t,.05,-18);break}
  case 'paper':{const b=pickSample('paper');if(b)playSample(b,t,-8,.95+Math.random()*.1,master,-10);else{noise(t,.35,-16,'highpass',2500,.7);noise(t+.18,.25,-18,'highpass',3200,.7)}break}
  case 'pickup':{const b=pickSample('pickup');if(b)playSample(b,t,-8,1,master,-10);osc('sine',660,t+.05,.12,-16);osc('sine',990,t+.15,.2,-17);break}
  // Objet récupéré (animation « clé récupérée ») : ramassage + petit arpège clair, puis note tenue.
  case 'oiia':playCat();break
  // Succès débloqué : carillon montant, discret, par-dessus le reste.
  case 'achievement':{const b=pickSample('ui-confirm');if(b)playSample(b,t,-10);[659,880,1319].forEach((f,i)=>osc('sine',f,t+.06+i*.12,.5,-17));break}
  case 'item':{const b=pickSample('pickup');if(b)playSample(b,t,-9,1,master,-10);[587,740,880,1175].forEach((f,i)=>osc('triangle',f,t+.08+i*.11,.26,-15));osc('sine',1480,t+.55,.7,-18);break}
  // Retour de la lumière après le blackout : relais, cliquetis de néon, souffle bref.
  case 'relight':{const c=pickSample('click');for(let i=0;i<4;i++){if(c)playSample(c,t+i*.09,-12,.9+i*.1);else osc('square',2200+i*300,t+i*.09,.02,-20)}noise(t,.5,-20,'bandpass',1800,2);osc('sine',100,t+.3,.4,-18);break}
  // Déclic du portail ouvert par la clé.
  case 'latch':{const b=pickSample('latch');if(b)playSample(b,t,-8,1,master,-8);else osc('square',900,t,.05,-18);break}
  case 'solved':{const b=pickSample('ui-confirm');if(b)playSample(b,t,-8);[523,659,784,1047].forEach((f,i)=>osc('triangle',f,t+.05+i*.1,.32,-16));break}
  case 'deny':{const b=pickSample('ui-error');if(b)playSample(b,t,-8);else{osc('square',180,t,.25,-14);osc('square',170,t+.28,.3,-14)}break}
  case 'locked':{const b=pickSample('latch');if(b)playSample(b,t,-6,1,master,-8);const c=pickSample('door-close');if(c)playSample(c,t+.12,-12,.8,master,-6);osc('sine',60,t,.18,-10);break}
  case 'door-slam':{const c=pickSample('door-close');if(c)playSample(c,t,-5,.85,master,-5);osc('sine',70,t,.22,-12);break}
  case 'door':{const o=pickSample('door-open'),c=pickSample('creak');if(o||c){if(c)playSample(c,t,-9,.8+Math.random()*.2,master,-6);if(o)playSample(o,t+.15,-7,.95,master,-6)}
   else{const os=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();os.type='sawtooth';os.frequency.setValueAtTime(150,t);os.frequency.exponentialRampToValueAtTime(52,t+1.2)
   f.type='lowpass';f.frequency.value=900;f.Q.value=2;os.connect(f);f.connect(g);g.connect(master);env(g,t,.1,dB(-12),.5,.5,.6);os.start(t);os.stop(t+1.4)}
   noise(t+1.1,.14,-10,'lowpass',320);osc('sine',58,t+1.1,.25,-12);break}
  case 'blackout':{const l=pickSample('latch');if(l)playSample(l,t,-2,.6,master,-4);const c=pickSample('door-close');if(c)playSample(c,t+.08,-4,.7,master,-4);osc('sawtooth',55,t,1.5,-4);noise(t,1.0,-6,'lowpass',260);osc('square',1800,t+.05,.4,-16);setTimeout(()=>{if(ctx)stinger(-6)},600);break}
  case 'stinger':stinger(-4);break
  case 'static':noise(t,2.2,-14,'bandpass',2200,.3);break
  // La transformation s'entend seule : la sirène et le cœur n'arrivent qu'après, et la musique s'efface.
  case 'chase_start':{const b=pickSample('monster-transform');duckMusic(3.2)
   if(b)playSample(b,t,6,1,master,-8);else stinger(-3)
   clearTimeout(chaseAudioTimer);chaseAudioTimer=setTimeout(()=>{startAlarm();startHeartbeat()},b?2500:0);break}
  case 'ending':stopAlarm();stopHeartbeat();osc('sine',110,t,2.5,-10);osc('sine',116,t+.1,2.5,-12);setTimeout(()=>{if(ctx)machineBeeps()},1800);break
  case 'caught':{stopAlarm();stopHeartbeat();const m=pickSample('monster-transform');if(m)playSample(m,t,4,.8,master,-8);playGrowl({offset:7.93,duration:4.27,close:true,dist:1.6,pan:0,rate:.82});noise(t,.5,-4,'lowpass',200);osc('sine',40,t,1.4,-3);break}
  case 'flashlight':{const b=pickSample('click');if(b)playSample(b,t,-14,1.1);else{noise(t,.03,-16,'highpass',3000,.6);osc('square',2400,t,.02,-22)}break}
  case 'laugh':playLaugh();break
  case 'dread':playDread(payload);break
  // Une porte qui bouge : au loin, le son baisse moins que ne le voudrait la distance, sinon on ne l'entendrait plus du tout.
  case 'door-move':{
   const dist=Math.hypot(payload.x-runtime.player.x,payload.z-runtime.player.z),level=Math.max(-2,Math.min(12,-2+(dist-3)*1.6)),spot={x:payload.x,y:1,z:payload.z}
   if(payload.opened){const c=pickSample('creak'),o=pickSample('door-open');if(c)playAt(c,spot,{level:level-2,rate:.8+Math.random()*.2});if(o)playAt(o,spot,{level,rate:.95})}
   else{const c=pickSample('door-close');if(c)playAt(c,spot,{level:level+1,rate:.85})}
   break}
  case 'slam':playAt(pickSample(payload.sample),{x:payload.x,y:1,z:payload.z},{level:12,rate:.85+Math.random()*.15});break
  case 'encounter':{if(payload==='ambush'){flickerBuzz();break}const c=pickSample('door-close');if(c)playAt(c,spotAround(Math.random()*Math.PI*2,14),{level:14,rate:.7});osc('sine',44,t,1.6,-8);startHeartbeat();break}
  case 'encounter-alert':osc('sine',44,t,1.2,-6);startHeartbeat();break
  case 'scream':scream();break
  case 'test':[440,554,659].forEach((f,i)=>osc('triangle',f,t+i*.14,.35,-10));footstep('tile');setTimeout(()=>{if(ctx)footstep('tile')},420);break
  default:break
 }
}
// Screamer : échantillon CC0 (si chargé) + impact grave + souffle, sinon cri synthétisé ; variantes spéciales.
function playScare(payload){
 const name=typeof payload==='string'?payload:payload?.sound,impact=!!payload?.impact
 const t=now(),buf=pickSample(name),out=scareBus||master
 duckMusic(impact?4:3)
 // Capture : tout le reste du jeu s'efface le temps du cri, qui n'en paraît que plus fort.
 if(impact){duckWorld(2.4);stopCat()}
 // La capture est poussée de 6 dB de plus avant le limiteur : au plafond et plus dense, sans saturer.
 if(buf)playSample(buf,t,impact?6:0,impact?1:.98+Math.random()*.04,out,-8);else scream()
 // Et un choc dans le grave avec un souffle, sur le même bus à fond.
 if(impact){osc('sine',38,t,1.3,0,out);osc('sine',57,t+.015,.7,-3,out);noise(t,.4,-2,'lowpass',240,.7,out);noise(t+.02,.25,-6,'highpass',2500,.7,out)}
}
function duckWorld(seconds){
 if(!master||muted)return
 const t=now();master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(volume*dB(-16),t,.03);master.gain.setTargetAtTime(volume,t+seconds,.4)
}
// Cri du screamer : impact grave, souffle, trois voix en dents de scie distordues à vibrato et balayage de hauteur, aigus métalliques.
function scream(){
 const t=now(),out=scareBus||master
 osc('sine',46,t,1.0,-2,out);noise(t,.3,-4,'lowpass',380,.7,out)
 const shaper=ctx.createWaveShaper();shaper.curve=distortionCurve(70);shaper.oversample='2x'
 const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(800,t);bp.frequency.exponentialRampToValueAtTime(2800,t+.32);bp.frequency.exponentialRampToValueAtTime(700,t+1.0)
 const g=ctx.createGain();env(g,t,.012,dB(-7),.55,.6,.4);shaper.connect(bp);bp.connect(g);g.connect(out);if(reverbSend)g.connect(reverbSend)
 for(const [f,det] of [[540,0],[545,14],[810,-9]]){
  const o=ctx.createOscillator();o.type='sawtooth';o.detune.value=det
  o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*2.7,t+.28);o.frequency.exponentialRampToValueAtTime(f*1.25,t+1.0)
  const vib=ctx.createOscillator(),vg=ctx.createGain();vib.frequency.value=21+Math.random()*6;vg.gain.value=40;vib.connect(vg);vg.connect(o.detune);vib.start(t);vib.stop(t+1.1)
  o.connect(shaper);o.start(t);o.stop(t+1.1)
 }
 noise(t+.04,.45,-10,'highpass',3600,.8,out)
 noise(t+.5,.5,-14,'bandpass',1800,.6,out)
}
function stinger(level=-4){const t=now();osc('sawtooth',58,t,1.8,level-2);osc('sawtooth',61.5,t,1.8,level-4,master,12);osc('sine',29,t,2.0,level);noise(t,.6,level-4,'lowpass',320)}
function machineBeeps(){for(let i=0;i<6;i++)osc('sine',880,now()+i*.9,.12,-14)}
// Un battement, « poum-poum ». Le grave seul ne sort pas d'un téléphone ou d'un portable : on y ajoute ses harmoniques et un choc étouffé.
function heartThump(k,period){
 const t=now(),gap=Math.min(.22,period*.0003+.08)
 for(const [at,level,top] of [[0,0,1],[gap,-4,1.2]]){
  const l=level-3+k*5,w=t+at
  osc('sine',62*top,w,.17,l,master,0,42*top)
  osc('triangle',124*top,w,.13,l-4,master,0,70*top)
  noise(w,.05,l-6,'bandpass',190*top,1.1)
  noise(w,.04,l-8,'bandpass',420*top,1.4)
 }
}
// Quelques battements seuls, après un bruit qui inquiète : le cœur s'emballe, puis se calme.
let heartBurst=null
function playHeartBurst(){
 if(heartbeat||heartBurst)return
 let n=0
 const beat=()=>{
  if(heartbeat||n>=7||!ctx){heartBurst=null;return}
  const k=.28*(1-n/7),period=720+n*45
  if(ctx.state==='running')heartThump(k,period)
  n++;heartBurst=setTimeout(beat,period)
 }
 beat()
}
export const isHeartbeating=()=>!!heartbeat||!!heartBurst
export function startHeartbeat(){
 if(!started||heartbeat)return
 // Le cœur s'emballe à l'approche du monstre.
 const state={timer:null}
 const beat=()=>{
  if(ctx&&ctx.state==='running')heartThump(dangerLevel(runtime.chaseDist),heartPeriod(runtime.chaseDist))
  state.timer=setTimeout(beat,heartPeriod(runtime.chaseDist))
 }
 beat();heartbeat=state
}
export function stopHeartbeat(){clearTimeout(heartBurst);heartBurst=null;if(heartbeat){clearTimeout(heartbeat.timer);heartbeat=null}}
export function startAlarm(){
 if(!started||alarm)return
 const g=ctx.createGain();g.gain.value=dB(-20);g.connect(master)
 const o=ctx.createOscillator();o.type='square';o.frequency.value=620;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1500
 o.connect(f);f.connect(g);o.start()
 const timer=setInterval(()=>{if(!ctx)return;const t=now();o.frequency.setValueAtTime(620,t);o.frequency.setValueAtTime(470,t+.45)},900)
 alarm={o,g,timer}
}
export function stopAlarm(){clearTimeout(chaseAudioTimer);if(!alarm)return;clearInterval(alarm.timer);try{alarm.g.gain.setTargetAtTime(0,now(),.2);const a=alarm;setTimeout(()=>{try{a.o.stop()}catch{}},600)}catch{};alarm=null}
// ---- téléviseur de l'accueil (atténué selon la distance) ---------------------
export function startTv(){
 if(!started||tvNode)return
 const s=ctx.createBufferSource();s.buffer=noiseBuffer;s.loop=true
 const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=2600;f.Q.value=.5
 const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(master);s.start()
 tvNode={s,g}
}
export function updateTv(distance){
 if(!tvNode||!ctx)return
 const target=distance>14?0:dB(-16)*Math.max(0,1-distance/14)**2
 tvNode.g.gain.setTargetAtTime(target,ctx.currentTime,.2)
}
export function stopTv(){if(tvNode){try{tvNode.s.stop()}catch{};tvNode=null}}

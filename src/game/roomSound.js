// Identité sonore de chaque lieu : un fond continu (bourdonnement, souffle) et de petits bruits ponctuels.
// tones : [fréquence, forme, niveau dB, coupure] ; air : souffle filtré ; events : bruits tirés au hasard toutes les [min,max] secondes.
export const ROOM_SOUNDS={
 couloir:{tones:[],air:{freq:340,q:.6,level:-31},events:['drip','pipe'],every:[9,20]},
 accueil:{tones:[[120,'sine',-33,300]],air:{freq:900,q:.5,level:-37},events:['phone','clock'],every:[11,24]},
 attente:{tones:[[100,'square',-42,1500]],air:{freq:700,q:.5,level:-38},events:['clock','chair'],every:[10,22]},
 patients:{tones:[],air:{freq:1100,q:.7,level:-36},events:['monitor','drip','chair'],every:[8,18]},
 radio:{tones:[[50,'sawtooth',-27,260],[100,'triangle',-34,500],[2640,'sine',-50,4000]],air:{freq:300,q:.5,level:-38},events:['relay','tick'],every:[7,16]},
 security:{tones:[[7800,'sine',-52,9000],[60,'sine',-34,200]],air:{freq:3400,q:.5,level:-41},events:['static','relay'],every:[7,17]},
 lab:{tones:[[73,'sawtooth',-29,320],[146,'triangle',-37,500]],air:{freq:520,q:.8,level:-35},events:['bubble','monitor','relay'],every:[6,14]},
 morgue:{tones:[[58,'sawtooth',-25,240],[87,'sine',-32,240]],air:{freq:240,q:.7,level:-30},events:['drip','metal','compressor'],every:[8,18]},
 secret:{tones:[],air:{freq:180,q:.9,level:-26},events:['drip','drip','metal','moan'],every:[6,14]}
}
export const roomSoundOf=room=>ROOM_SOUNDS[room]||null
export const roomEventDelay=(sound,random=Math.random)=>sound.every[0]+random()*(sound.every[1]-sound.every[0])
export function pickRoomEvent(sound,last,random=Math.random){
 const pool=sound.events.filter(e=>e!==last),list=pool.length?pool:sound.events
 return list[Math.floor(random()*list.length)%list.length]
}

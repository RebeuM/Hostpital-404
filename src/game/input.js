// Commandes hors clavier-souris : la manette et l'écran tactile écrivent ici, le joueur lit à chaque image.
export const input={
 touch:{x:0,y:0,run:false,runLatch:false},
 pad:{x:0,y:0,lookX:0,lookY:0,run:false}
}
export function isTouchDevice(env=globalThis){
 try{return !!env.matchMedia?.('(pointer:coarse)').matches&&(env.navigator?.maxTouchPoints||0)>0}catch{return false}
}
// Passe par les mêmes gestionnaires que le vrai clavier : dialogues, menus et objets se comportent à l'identique.
export function keyDown(key,code=key){window.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true}))}
export function keyUp(key,code=key){window.dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true,cancelable:true}))}
export function tapKey(key,code=key){keyDown(key,code);keyUp(key,code)}
export const KEY={interact:['e','KeyE'],jump:[' ','Space'],torch:['f','KeyF'],journal:['j','KeyJ'],map:['m','KeyM'],escape:['Escape','Escape'],enter:['Enter','Enter'],up:['ArrowUp','ArrowUp'],down:['ArrowDown','ArrowDown']}

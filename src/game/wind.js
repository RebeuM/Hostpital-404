// Force du vent (0 à 1) à un instant donné : même courbe pour le son et le balancement des arbres, les rafales se voient et s'entendent ensemble.
export function windGust(t){
 const v=.42+.3*Math.sin(t*.13)+.2*Math.sin(t*.37+1.7)+.14*Math.sin(t*.91+.4)+.06*Math.sin(t*2.3)
 return Math.max(0,Math.min(1,v))
}

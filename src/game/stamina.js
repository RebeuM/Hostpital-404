// Endurance : environ 12 s de course. Une fois à bout, il faut souffler un peu avant de pouvoir recourir.
export const STAMINA={regenWalk:.09,regenStill:.17,regenHidden:.22,recoverAt:.35}
export function stepStamina(st,dt,{wantsRun=false,moving=false,hidden=false,seconds=12}={}){
 const running=wantsRun&&moving&&!st.exhausted&&!hidden
 let value=st.value
 if(running)value-=dt/seconds
 else value+=(hidden?STAMINA.regenHidden:moving?STAMINA.regenWalk:STAMINA.regenStill)*dt
 value=Math.max(0,Math.min(1,value))
 const exhausted=value<=0?true:st.exhausted&&value<STAMINA.recoverAt
 return {value,exhausted,running}
}

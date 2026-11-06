import React,{useMemo} from 'react'
import {Uniform} from 'three'
import {EffectComposer,Bloom,Noise,Vignette,SMAA} from '@react-three/postprocessing'
import {BlendFunction,Effect} from 'postprocessing'
import {useGame} from '../game/store'
import {QUALITY_PRESETS} from '../game/settings'

// Gain final (luminosité et panne de courant), réglé par ExposureSync dans App.jsx : remplace l'ancien filtre CSS du canevas,
// qui coûtait une passe de composition supplémentaire à chaque image. Fusionné avec le grain et le vignettage dans la même passe.
export const POST_GAIN=new Uniform(1)
class GainEffect extends Effect{
 constructor(){super('GainEffect','uniform float uGain;\nvoid mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){outputColor=vec4(inputColor.rgb*uGain,inputColor.a);}',{uniforms:new Map([['uGain',POST_GAIN]])})}
}
// Post-traitement modéré : bloom léger (sources émissives), vignettage, grain discret, SMAA en qualité élevée.
export default function Effects(){
 const quality=useGame(s=>s.settings.quality),chase=useGame(s=>s.chase)
 const preset=QUALITY_PRESETS[quality]
 const gain=useMemo(()=>new GainEffect(),[])
 if(!preset.postprocessing)return null
 const effects=[
  <Bloom key="bloom" luminanceThreshold={.8} luminanceSmoothing={.3} mipmapBlur intensity={.4}/>,
  <Noise key="noise" opacity={preset.noise} blendFunction={BlendFunction.OVERLAY}/>,
  <Vignette key="vignette" eskil={false} offset={.14} darkness={chase?.95:.9}/>,
  <primitive key="gain" object={gain}/>
 ]
 if(preset.smaa)effects.push(<SMAA key="smaa"/>)
 return <EffectComposer multisampling={0} enableNormalPass={false}>{effects}</EffectComposer>
}

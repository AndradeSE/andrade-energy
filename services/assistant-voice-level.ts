/** Normaliza amplitude real para a animação; não armazena nem transmite áudio. */
export function voiceLevel(samples:ArrayLike<number>){
 if(!samples.length)return 0;
 let sum=0,count=0;
 for(let i=0;i<samples.length;i+=4){const n=samples[i];if(Number.isFinite(n)){sum+=n*n;count++;}}
 const rms=count?Math.sqrt(sum/count):0;
 return rms<0.004?0:Math.min(1,rms*7);
}

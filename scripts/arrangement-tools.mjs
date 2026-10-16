// Shared deterministic arrangement renderer. Musical plans are supplied per song.
const chords = {
  F: [53,57,60], C: [48,55,64], C7: [48,58,64], Gm: [55,58,62],
  G: [55,59,62], D: [50,57,62], Em: [52,55,59], A: [45,52,61], Bm: [47,54,62]
};

export function arrange(score, {title = score.title, measure, pickup, defaultInstrument, plan}, variant) {
  const expressive = variant !== 'reference';
  const lead = variant === 'lively' ? 'flute' : expressive ? 'clarinet' : defaultInstrument;
  const melody = score.notes.map(n => ({...n, ...(expressive ? {velocity:
    Math.round(77 + 7*Math.sin(Math.PI * ((n.at-pickup+measure*4)%(measure*4))/(measure*4)) + (Number.isInteger((n.at-pickup)/measure)?3:0))} : {})}));
  const tracks = [{role:'melody',instrument:lead,volume:expressive?94:100,pan:64,notes:melody}];
  if (['gentle','lively'].includes(variant)) {
    const keys = [], bass = [], pulse = [];
    const end = score.quarters;
    const add = (target, at, duration, midi, velocity) => {
      if (at < end) target.push({at, duration: Math.min(duration,end-at), midi, velocity});
    };
    // Anchor accompaniment after the pickup; clip every event at the musical end.
    for (let q=pickup; q<end; q+=measure) {
      const points = [...new Set([q, ...plan.filter(([p])=>p>q&&p<Math.min(q+measure,end)).map(([p])=>p)])];
      points.forEach((p,index)=> {
        const name = plan.filter(([start])=>start<=p).at(-1)[1];
        const chord = chords[name], span = (points[index+1]??Math.min(q+measure,end))-p;
        add(bass,p,Math.min(span*.78,1.6),chord[0]-12,variant==='gentle'?62:69);
        if (variant==='gentle') chord.forEach((m,i)=>add(keys,p+i*.12,Math.max(.1,span-i*.12-.16),m,52+i*2));
        else for(let step=0;step<span;step+=.5) add(keys,p+step,.38,chord[Math.round(step*2)%3],step%1===0?65:53);
      });
      if (variant==='lively') for(let step=0;step<measure;step+=.5) add(pulse,q+step,.09,step%1===0?76:77,step%1===0?43:32);
    }
    tracks.push({role:'backing',instrument:variant==='gentle'?'piano':'guitar',volume:74,pan:49,notes:keys},
      {role:'backing',instrument:'bass',volume:80,pan:67,notes:bass});
    if(variant==='lively') tracks.push({role:'backing',instrument:'woodblock',volume:47,pan:82,notes:pulse});
  }
  return {schema_version:2,title, bpm:score.bpm,quarters:score.quarters,room:expressive?.27:1,tracks};
}

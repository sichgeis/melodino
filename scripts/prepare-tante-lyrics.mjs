// First verse explicitly requested from the user's photograph; no invented speech pitches.
import {readFileSync,writeFileSync} from 'node:fs';
import {validateLyrics} from '../docs/lyric-timing.js';
const score=JSON.parse(readFileSync('docs/assets/hab-ne-tante-aus-marokko/playback.json','utf8'));
const phrases=[
 ['Hab ’ne Tan|te aus Ma|rok|ko, und die kommt, hipp hopp,',0],
 ['’hab ’ne Tan|te aus Ma|rok|ko, und die kommt, hipp hopp,',8],
 ['hab ’ne Tan|te aus Ma|rok|ko,',16],
 ['hab ’ne Tan|te aus Ma|rok|ko,',20],
 ['hab ’ne Tan|te aus Ma|rok|ko, und die kommt, hipp hopp.',24]
];
const speech=[6,7,14,15,30,31];
const lines=phrases.map(([text,start])=>{
 let at=start;
 const cues=text.split(' ').flatMap(word=>word.split('|').map((text,j,parts)=>{
  const spoken=text.startsWith('hipp')||text.startsWith('hopp');
  const n=score.notes.find(n=>n.at===at);
  const duration=spoken?1:n?.duration;
  if(!duration||(spoken&&!speech.includes(at)))throw Error(`Invalid cue ${text} at ${at}`);
  const cue={at,duration,text,spaceAfter:j===parts.length-1,...(spoken?{kind:'spoken'}:{})};
  at+=duration;return cue;
 }));
 return {text:text.replaceAll('|',''),cues};
});
const data={schema_version:1,title:score.title,quarters:score.quarters,
 credit:'Volkslied · Erste Strophe und Melodie gemäß dem bereitgestellten Notenfoto.',
 source:'Auf ausdrücklichen Nutzerauftrag übertragen. Die weiteren kumulativen Strophen enthalten nicht ausnotierte Sprechzusätze und sind hier noch nicht enthalten.',
 verses:[{id:'aunt',label:'Tante aus Marokko',historical_number:1,
 performance_note:'„Hipp–hopp“ sprechen; das Melodieinstrument bleibt dort still. Enthalten ist die vollständig notierte erste Strophe. Weitere Strophen mit zusätzlichen Geräuschen sind noch nicht vertont.',lines}]};
validateLyrics(data,score);
writeFileSync('docs/lyrics/hab-ne-tante-aus-marokko.json',JSON.stringify(data,null,2)+'\n');

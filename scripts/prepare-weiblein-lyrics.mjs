// User-provided text, explicitly requested for this song. Keep the book photo private.
import {readFileSync,writeFileSync} from 'node:fs';
import {validateLyrics} from '../docs/lyric-timing.js';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const score=read('docs/assets/ging-ein-weiblein/playback.json');
const verses=[
 {id:'nuts',label:'Nüsse schütteln',lines:['Ging ein Weib|lein Nüs|se schüt|teln,','Nüs|se schüt|teln, Nüs|se schüt|teln;','al|le Kin|der hal|fen rüt|teln,','hal|fen rüt|teln, rums.']},
 {id:'raspberries',label:'Himbeern pflücken',lines:['Ging ein Weib|lein Him|beern pflü|cken,','Him|beern pflü|cken, Him|beern pflü|cken;','riss da|bei den Rock in Stü|cken,','Rock in Stü|cken, rums.']},
 {id:'mending',label:'Flicken müssen',lines:['Hat nicht nur den Rock zer|ris|sen,','Rock zer|ris|sen, Rock zer|ris|sen;','wird die Schuh auch fli|cken müs|sen,','fli|cken müs|sen, rums.']}
];
const data={schema_version:1,title:score.title,quarters:score.quarters,
 credit:'Volkslied · Text und Melodie gemäß dem bereitgestellten Notenfoto.',
 source:'Drei Strophen auf ausdrücklichen Nutzerauftrag aus dem Foto übertragen. Jede Strophe wird auf beide Kanonabschnitte gesungen. Gedruckte Formen „Himbeern“ und „die Schuh“ beibehalten.',
 verses:verses.map((v,i)=>{
  let index=0;
  const lines=[...v.lines,...v.lines].map(line=>({text:line.replaceAll('|',''),cues:line.split(' ').flatMap(word=>word.split('|').map((text,j,parts)=>{
   const n=score.notes[index++];if(!n)throw Error(`Zu viele Silben: ${v.id}`);
   return {at:n.at,duration:n.duration,text,spaceAfter:j===parts.length-1};
  }))}));
  if(index!==score.notes.length)throw Error(`Fehlende Silben: ${v.id}`);
  return {...v,historical_number:i+1,performance_note:'Den Text in beiden Melodieabschnitten singen. Die Ziffern 1 und 2 in der Vorlage markieren Kanoneinsätze; der Player spielt die Melodie einstimmig.',lines};
 })};
validateLyrics(data,score);
writeFileSync('docs/lyrics/ging-ein-weiblein.json',JSON.stringify(data,null,2)+'\n');

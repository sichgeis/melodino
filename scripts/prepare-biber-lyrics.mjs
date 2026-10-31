// User-provided text, explicitly requested for publication. Photograph stays private.
import {readFileSync,writeFileSync} from 'node:fs';
import {validateLyrics} from '../docs/lyric-timing.js';
const score=JSON.parse(readFileSync('docs/assets/meine-biber-haben-fieber/playback.json','utf8'));
const refrain='Will sich kei|ner denn der ar|men Tier’ er|bar|men?';
const verses=[
  {id:'beavers',label:'Biber',lines:['Mei|ne Bi|ber ha|ben Fie|ber, o die Ar|men!',refrain,'Mei|ne Bi|ber ha|ben Fie|ber,','sagt der Farm|be|sit|zer Sie|ber,','hätt ich sel|ber lie|ber Fie|ber','und den Bi|bern ging’ es gut.']},
  {id:'mice',label:'Mäuse',lines:['Mei|ne Mäu|se ha|ben Läu|se, o die Ar|men!',refrain,'Mei|ne Mäu|se ha|ben Läu|se,','ach, es krab|belt im Ge|häu|se.','Hätt ich sel|ber lie|ber Läu|se','und den Mäu|sen ging’ es gut.']},
  {id:'hares',label:'Hasen',performance_note:'Melisma: „Gra-“ in „Grasen“ über zwei Töne singen (doppelt unterstrichen).',lines:['Mei|ne Ha|sen ha|ben Bla|sen, o die Ar|men!',refrain,'Mei|ne Ha|sen ha|ben Bla|sen','vom Gra|sen auf dem Ra|sen.','Hätt ich sel|ber lie|ber Bla|sen','und den Ha|sen ging’ es gut.']},
  {id:'lobsters',label:'Hummer',lines:['Mei|ne Hum|mer ha|ben Kum|mer, o die Ar|men!',refrain,'Mei|ne Hum|mer ha|ben Kum|mer,','sagt der Zo|o|lo|ge Brum|mer.','Hätt ich sel|ber lie|ber Kum|mer','und den Hum|mern ging’ es gut.']},
  {id:'swans',label:'Schwäne',performance_note:'Mitsing-Anpassung: „eigent-“ mit zwei kurzen Silben auf einem Ton, danach „lich“. Die Melodie bleibt unverändert.',lines:['Mei|ne Schwä|ne krie|gen Zäh|ne, o die Ar|men!',refrain,'Mei|ne Schwä|ne krie|gen Zäh|ne,','eigent|lich Quatsch, dass ich’s er|wäh|ne.','Kriegt ich sel|ber lie|ber Zäh|ne','und den Schwä|nen ging’ es gut.']}
];
const data={schema_version:1,title:score.title,quarters:score.quarters,
 credit:'Text: traditionell und Wolfgang Hering / Bernd Meyerholz · Vorlage: Fidula-Verlag, Boppard/Rhein. Melodie: überliefert.',
 source:'Aus dem vom Nutzer bereitgestellten Notenfoto auf ausdrücklichen Auftrag übertragen. Melodie: überliefert. Text: traditionell und Wolfgang Hering / Bernd Meyerholz; Fidula-Verlag, Boppard/Rhein. Mitsing-Zuordnung der Strophen 3 und 5 vom Nutzer freigegeben.',
 verses:verses.map((v,i)=>{
 let index=0;
 const lines=v.lines.map(line=>({text:line.replaceAll('|',''),cues:line.split(' ').flatMap(word=>word.split('|').map((text,j,parts)=>{
 const n=score.notes[index++];if(!n)throw Error('Zu viele Silben');
 let duration=n.duration;
 if(v.id==='hares'&&n.at===20.75)duration+=score.notes[index++].duration;
 return {at:n.at,duration,text,spaceAfter:j===parts.length-1};
 }))}));
 if(index!==score.notes.length)throw Error(`Fehlende Silben: ${v.id} ${index}`);
 return {...v,historical_number:i+1,lines};
 })};
validateLyrics(data,score);
writeFileSync('docs/lyrics/meine-biber-haben-fieber.json',JSON.stringify(data,null,2)+'\n');

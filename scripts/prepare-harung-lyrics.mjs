// Explicitly requested user-provided text. No photograph or book art is published.
import {readFileSync,writeFileSync} from 'node:fs';
import {validateLyrics} from '../docs/lyric-timing.js';
const score=JSON.parse(readFileSync('docs/assets/in-einem-harung/playback.json','utf8'));
const refrain='zwo, drei, vier, ss-|ta-|ta, ti-|ral-|la-|la,';
const verses=[
 {id:'flounder',label:'Harung und Flunder',lines:['In ei|nen Ha|rung, jung und stramm,',refrain,'der auf dem Mee|res|grun|de schwamm,',refrain,'ver|lieb|te sich, o Wun|der,','’ne ol|le Flun|der, ’ne ol|le Flun|der,','ver|lieb|te sich, o Wun|der, ’ne ol|le Flun|der.']},
 {id:'herring',label:'Du bist verrückt',lines:['Der Ha|rung sprach: „Du bist ver|rückt,',refrain,'du bist mir viel zu platt ge|drückt,',refrain,'rutsch mir den Bu|ckel run|ter,','du ol|le Flun|der, du ol|le Flun|der,','rutsch mir den Bu|ckel run|ter, du ol|le Flun|der!“']},
 {id:'gold',label:'Ein Goldstück',lines:['Da stieß die Flun|der auf den Grund,',refrain,'wo sie ein gro|ßes Geld|stück fund,',refrain,'ein Gold|stück von zehn Ru|bel,','o welch ein Ju|bel, o welch ein Ju|bel,','ein Gold|stück von zehn Ru|bel, o welch ein Ju|bel!']},
 {id:'rich',label:'Die olle Schrulle',lines:['Da war die ol|le Schru|lle reich,',refrain,'da nahm der Ha|rung sie so|gleich,',refrain,'denn so ein al|ter Ha|rung,','der hat Er|fah|rung, der hat Er|fah|rung,','denn so ein al|ter Ha|rung, der hat Er|fah|rung.']},
 {id:'moral',label:'Die Moral',lines:['Und die Mo|ral von der Ge|schicht?',refrain,'Ver|lieb dich in ’nen Ha|rung nicht,',refrain,'denn so ein al|ter Ha|rung,','der hat Er|fah|rung, der hat Er|fah|rung,','denn so ein al|ter Ha|rung, der hat Er|fah|rung.']}
];
const data={schema_version:1,title:score.title,quarters:score.quarters,
 credit:'Volkslied · Text und Melodie gemäß dem bereitgestellten Notenfoto.',
 source:'Fünf Strophen aus dem Nutzerfoto auf ausdrücklichen Auftrag übertragen. Wiederholung ausgeschrieben. Gedruckter Wortlaut einschließlich „fund“ beibehalten; Apostrophe und Satzzeichen typografisch normalisiert.',
 verses:verses.map((v,i)=>{
 let index=0;
 const lines=v.lines.map(line=>({text:line.replaceAll('|',''),cues:line.split(' ').flatMap(word=>word.split('|').map((text,j,parts)=>{
 const n=score.notes[index++];if(!n)throw Error(`Zu viele Silben: ${v.id}`);
 let duration=n.duration;
 // The slur in the printed ending carries the penultimate syllable over four pitches.
 if(n.at===57.5)for(let k=0;k<3;k++)duration+=score.notes[index++].duration;
 return {at:n.at,duration,text,spaceAfter:j===parts.length-1};
 }))}));
 if(index!==score.notes.length)throw Error(`Fehlende Silben: ${v.id} (${index}/${score.notes.length})`);
 return {...v,historical_number:i+1,performance_note:'Die vorletzte Silbe am Schluss über vier Töne singen (doppelt unterstrichen).',lines};
 })};
validateLyrics(data,score);
writeFileSync('docs/lyrics/in-einem-harung.json',JSON.stringify(data,null,2)+'\n');

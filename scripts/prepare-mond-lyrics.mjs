// Text transcribed from the user's photograph; the original image stays private.
import {readFileSync,writeFileSync} from 'node:fs';
const score=JSON.parse(readFileSync('docs/assets/der-mond-ist-aufgegangen/playback.json','utf8'));
const verses=[
  {id:'moon',label:'Der Mond ist aufgegangen',historical_number:1,lines:[
    'Der Mond ist auf|ge|gan|gen,','die gold|nen Stern|lein pran|gen','am Him|mel hell und klar.',
    'Der Wald steht schwarz und schwei|get,','und aus den Wie|sen stei|get','der wei|ße Ne|bel wun|der|bar.']},
  {id:'world',label:'Wie ist die Welt so stille',historical_number:2,lines:[
    'Wie ist die Welt so stil|le','und in der Dämm|rung Hül|le','so trau|lich und so hold',
    'als ei|ne stil|le Kam|mer,','wo ihr des Ta|ges Jam|mer','ver|schla|fen und ver|ges|sen sollt.']},
  {id:'seeing',label:'Seht ihr den Mond dort stehen?',historical_number:3,lines:[
    'Seht ihr den Mond dort ste|hen?','Er ist nur halb zu se|hen','und ist doch rund und schön:',
    'So sind wohl man|che Sa|chen,','die wir ge|trost be|la|chen,','weil uns|re Au|gen sie nicht sehen.']},
  {id:'people',label:'Wir stolzen Menschenkinder',historical_number:4,lines:[
    'Wir stol|zen Men|schen|kin|der','sind ei|tel ar|me Sün|der','und wis|sen gar nicht viel.',
    'Wir spin|nen Luft|ge|spins|te','und su|chen vie|le Küns|te','und kom|men wei|ter von dem Ziel.']},
  {id:'night',label:'So legt euch denn, ihr Brüder',historical_number:5,lines:[
    'So legt euch denn, ihr Brü|der,','in Got|tes Na|men nie|der;','kalt ist der A|bend|hauch.',
    'Ver|schon uns, Gott, mit Stra|fen','und lass uns ru|hig schla|fen','und un|sern kran|ken Nach|barn auch.']}
];
const data={schema_version:1,title:score.title,quarters:score.quarters,
  source:'Matthias Claudius; fünf Strophen gemäß dem vom Nutzer bereitgestellten Notenfoto, auf ausdrücklichen Auftrag übertragen. Gedruckte Auswahl und Wortlaut beibehalten; sehen am Ende von Strophe 3 wird auf einem Ton als sehn gesungen.',
  verses:verses.map(v=>{
    let index=0;
    const lines=v.lines.map(line=>({text:line.replaceAll('|',''),cues:line.split(' ').flatMap(word=>{
      const parts=word.split('|');return parts.map((text,i)=>{
        const note=score.notes[index++];if(!note)throw Error(`Zu viele Textteile: ${v.id}`);
        return {at:note.at,duration:note.duration,text,spaceAfter:i===parts.length-1};
      });
    })}));
    if(index!==score.notes.length)throw Error(`Textteile fehlen: ${v.id} (${index})`);
    if(lines.some((line,i)=>line.cues[0].at!==[0,8,16,24,32,40][i]))throw Error(`Zeilenposition: ${v.id}`);
    return {...v,lines};
  })};
writeFileSync('docs/lyrics/der-mond-ist-aufgegangen.json',JSON.stringify(data,null,2)+'\n');

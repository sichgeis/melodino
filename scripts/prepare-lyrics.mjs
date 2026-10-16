// Explicit syllable alignment to the checked melody; no text copied from book images.
import {readFileSync,writeFileSync} from 'node:fs';
const score=JSON.parse(readFileSync('docs/arrangements/schlaf-kindlein-schlaf-klarinette-researched-source.json','utf8'));
const verses=[
  {id:'home',label:'Vater und Mutter',historical_number:1,lines:[
    'Schlaf, Kind|lein, schlaf!','Der Va|ter hüt’ die Schaf,','die Mut|ter schüt|telt’s Bäu|me|lein,','da fällt he|rab ein Träu|me|lein.','Schlaf, Kind|lein, schlaf!']},
  {id:'sky',label:'Schäfchen am Himmel',historical_number:2,lines:[
    'Schlaf, Kind|lein, schlaf!','Am Him|mel ziehn die Schaf,','die Stern|lein sind die Läm|mer|lein,','der Mond, der ist das Schä|fer|lein.','Schlaf, Kind|lein, schlaf!']},
  {id:'bell',label:'Die goldene Schelle',historical_number:4,lines:[
    'Schlaf, Kind|lein, schlaf!','So schenk ich dir ein Schaf','mit ei|ner gold|nen Schel|le fein,','das soll dein Spiel|ge|sel|le sein.','Schlaf, Kind|lein, schlaf!']}
];
const data={schema_version:1,title:'Schlaf, Kindlein, schlaf',quarters:score.quarters,
  source:'Historische Strophen 1, 2 und 4 aus Des Knaben Wunderhorn (1808); Rechtschreibung und Interpunktion leicht normalisiert.',
  sources:['https://textgridrep.de/browse/4bjqm.0?lang=de','https://www.liederkiste.com/index.php?a=schlaf-kindlein-schlaf&l=de'],
  verses:verses.map(v=>{
    let index=0;
    const lines=v.lines.map(line=>({text:line.replaceAll('|',''),cues:line.split(' ').flatMap(word=>{
      const parts=word.split('|');
      return parts.map((text,i)=>{
        const note=score.notes[index++];if(!note)throw Error('Zu viele Silben.');
        return {at:note.at,duration:note.duration,text,spaceAfter:i===parts.length-1};
      });
    })}));
    if(index!==score.notes.length)throw Error('Silben fehlen.');
    return {...v,lines};
  })};
writeFileSync('docs/lyrics/schlaf-kindlein-schlaf.json',JSON.stringify(data,null,2)+'\n');

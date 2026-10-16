import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {arrange} from './arrangement-tools.mjs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const write=(path,data)=>writeFileSync(path,JSON.stringify(data,null,2)+'\n');
const output='docs/arrangements';mkdirSync(output,{recursive:true});
const curated={
  'schlaf-kindlein-suesse':{measure:3,pickup:0,plan:[[0,'F'],[3,'F'],[6,'C7'],[9,'F'],[12,'C'],[15,'F'],[18,'C'],[21,'F'],[24,'F'],[27,'C7'],[28.5,'F']]},
  'die-kuh-die-sass-im-schwalbennest':{measure:2,pickup:.5,plan:[[.5,'G'],[4.5,'D'],[6.5,'G'],[12.5,'D'],[14.5,'G'],[16.5,'G'],[17.5,'Em'],[18.5,'G'],[20.5,'D'],[22.5,'G'],[24.5,'G'],[25.5,'Em'],[26.5,'G'],[28.5,'D'],[30.5,'G']]},
  'viel-glueck-und-viel-segen':{measure:3,pickup:1,plan:[[1,'D'],[2,'A'],[3,'Bm'],[4,'D'],[5,'A'],[7,'G'],[10,'D'],[13,'G'],[16,'D'],[19,'G'],[20,'A'],[22,'D'],[24,'A'],[25,'D'],[26,'A'],[27,'Bm'],[28,'D'],[29,'A'],[31,'G'],[34,'D'],[37,'G'],[40,'D'],[43,'G'],[44,'A'],[46,'D']]}
};
const established={'schlaf-kindlein-schlaf-klarinette':'sleep','was-muessen-das-fuer-baeume-sein-glocke':'trees'};
const labels={reference:'Solo · ohne Begleitung',warm:'Pur und warm',gentle:'Sanft begleitet',lively:'Lebhaft begleitet'};
const descriptions={reference:'Nur die Melodie, mit eurem Wunschinstrument.',warm:'Sanfte Phrasendynamik und dezenter Raumklang.',gentle:'Klarinette mit leisen Klavierakkorden und akustischem Bass.',lively:'Flöte mit Nylongitarre, Bass und einem leisen Holzpuls.'};
const catalog={schema_version:1,songs:[]};
for(const song of read('docs/library.json')){
  const score=read(`docs/${song.files.playback}`),settings=curated[song.slug],experiment=established[song.slug];
  if(!settings&&!experiment)continue; // New songs remain fully usable as solo melodies.
  const versions=[['original','Übertragene Melodie',score]];
  if(experiment==='sleep'){
    const s=read('docs/experiments/data/sleep-standard-reference.json');
    versions.push(['researched','Recherchierte Melodie',{...score,notes:s.tracks[0].notes}]);
  }
  const entry={slug:song.slug,versions:[]};
  for(const [id,label,source] of versions){
    const version={id,label,variants:[]};
    if(id==='researched'){
      // Its own exported source allows playback validation independently of the old melody.
      const path=`${song.slug}-researched-source.json`;
      write(`${output}/${path}`,source);version.source=`arrangements/${path}`;
    }
    for(const variant of Object.keys(labels)){
      let data;
      if(experiment){
        const key=id==='researched'?'sleep-standard':experiment;
        data=read(`docs/experiments/data/${key}-${variant}.json`);
      }else data=arrange(source,{...settings,defaultInstrument:song.instrument==='bell'?'glockenspiel':'clarinet'},variant);
      data.title=song.title;
      // Distinguish percussion so its switch works independently of harmonic backing.
      data.tracks=data.tracks.map(t=>({...t,role:t.instrument==='woodblock'?'rhythm':t.role}));
      const path=`${song.slug}-${id}-${variant}.json`;
      write(`${output}/${path}`,data);
      version.variants.push({id:variant,label:labels[variant],description:descriptions[variant],url:`arrangements/${path}`});
    }
    entry.versions.push(version);
  }
  catalog.songs.push(entry);
}
write(`${output}/catalog.json`,catalog);

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {validateTextCatalog} from '../../docs/strophe-panel.js';
import {validateLyrics} from '../../docs/lyric-timing.js';
const read=p=>JSON.parse(readFileSync(new URL(`../../docs/${p}`,import.meta.url)));
const library=read('library.json'),catalog=read('lyrics/catalog.json');
test('main text catalog refers only to known songs and rhythm-checked versions',()=>{
  assert.equal(validateTextCatalog(catalog,library),catalog);
  const arrangements=read('arrangements/catalog.json');
  for(const e of catalog.songs){
    const song=library.find(s=>s.slug===e.slug),versions=arrangements.songs.find(s=>s.slug===e.slug).versions;
    assert.ok(versions.some(v=>v.id===e.preferredVersion));
    for(const v of versions)validateLyrics(read(e.url),read(v.source??song.files.playback));
  }
});
test('text catalog rejects unknown songs, traversal, external URLs and duplicate entries',()=>{
  for(const mutate of [c=>c.songs[0].slug='missing',c=>c.songs[0].url='../private.json',c=>c.songs[0].url='https://example.org/text.json',c=>c.songs[0].url='lyrics/%2e%2e/text.json',c=>c.songs.push(c.songs[0]),c=>c.songs[0].preferredVersion='other']){
    const copy=structuredClone(catalog);mutate(copy);assert.throws(()=>validateTextCatalog(copy,library));
  }
});
test('every public HTML entry asks crawlers not to index it',()=>{
  for(const name of readdirSync(new URL('../../docs/',import.meta.url)).filter(n=>n.endsWith('.html'))){
    assert.match(readFileSync(new URL(`../../docs/${name}`,import.meta.url),'utf8'),/<meta name="robots" content="noindex, nofollow">/);
  }
});

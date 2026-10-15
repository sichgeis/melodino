// Run after npm ci (see README).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {SoundBankLoader,BasicSoundBank} from 'spessasynth_core';
const input=process.argv[2];
if(!input) throw Error('Usage: node scripts/prepare-soundbanks.mjs /path/FluidR3_GM.sf2');
const data=readFileSync(input);
const original=SoundBankLoader.fromArrayBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
mkdirSync('docs/samples',{recursive:true});
for(const [name,program] of [['piano',0],['glockenspiel',9],['clarinet',71],['flute',73]]) {
  const preset=original.presets.find(p=>p.bankMSB===0&&p.bankLSB===0&&!p.isGMGSDrum&&p.program===program);
  if(!preset) throw Error(`Missing GM program ${program}`);
  const bank=new BasicSoundBank();
  bank.soundBankInfo={...original.soundBankInfo};
  bank.addCompletePresets([preset]);
  const binary=bank.writeSF2();
  writeFileSync(resolve('docs/samples',`${name}.sf2`),new Uint8Array(binary));
  console.log(`${name}: ${binary.byteLength} bytes`);
}

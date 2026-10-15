import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BrowserPlayer} from '../../docs/player.js';

test('stop while initializing prevents a late start',async()=>{
  const player=new BrowserPlayer(), events=[], commands=[];
  let finish;
  player.initialize=()=>new Promise(resolve=>{finish=resolve;});
  player.request=async data=>{commands.push(data.type);};
  const owner={};
  const start=player.start(owner,{},e=>events.push(e.state));
  player.stop(owner); finish(); await start;
  assert.deepEqual(events,['loading','idle']);
  assert.deepEqual(commands,[]);
});
test('an old asynchronous failure cannot replace a new card state',async()=>{
  const player=new BrowserPlayer(), states=[];
  let rejectFirst;
  player.initialize=()=>new Promise((resolve,reject)=>{rejectFirst=reject;});
  const old=player.start('first',{},()=>{});
  player.stop('first');
  player.initialize=async()=>{throw Error('new error');};
  await player.start('second',{},e=>states.push([e.state,e.message]));
  rejectFirst(Error('old error'));await old;
  assert.equal(player.owner,'second');
  assert.deepEqual(states,[['loading',undefined],['error','new error']]);
});

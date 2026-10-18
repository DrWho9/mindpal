import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBrainBank, difficultyBank, sessionDifficulty } from '../../src/brain/difficulty.js';
import { validateBank, startQuizSession, normalizeQuizSession, questionKey, getQuizView, createQuizStore, QUIZ_STORAGE_KEY } from '../../src/brain/core.js';

const foundation = JSON.parse(readFileSync(new URL('../../src/brain/questions.json', import.meta.url)));
const fixture = () => ({schemaVersion:'1.0',title:'Brain',questions:['umat','challenge'].flatMap(difficulty=>Array.from({length:9},(_,i)=>({
  id:`brain-${difficulty}-${String(i+1).padStart(3,'0')}`,difficulty,level:1,position:i+1,skill:'reasoning',prompt:`Original ${difficulty} item ${i+1}`,
  options:['A','B','C','D'].map(id=>({id,text:`Option ${id}`})),correctOptionId:'B',explanation:'The stated facts imply B; alternatives introduce unsupported assumptions.',
}))) });

test('catalog preserves exact Foundation identity and separates both nine-question higher levels',()=>{
 const original=validateBank(foundation),catalog=createBrainBank(foundation,fixture());
 assert.equal(catalog.questions.length,338);
 assert.deepEqual(catalog.questions.slice(0,320),original.questions);
 for(let i=0;i<320;i++)assert.equal(questionKey(catalog.questions[i]),questionKey(original.questions[i]));
 for(const difficulty of ['umat','challenge']){
  const bank=difficultyBank(catalog,difficulty);
  assert.equal(bank.questions.length,9);
  const round=startQuizSession(bank,{count:9,startId:`brain-${difficulty}-009`,sessionId:'wrap'});
  assert.equal(round.questionIds[1],`brain-${difficulty}-001`);
  assert.equal(new Set(round.questionIds).size,9);
  assert.equal(sessionDifficulty(round,catalog),difficulty);
  assert.deepEqual(normalizeQuizSession(round,catalog),round);
  assert.equal(getQuizView(round,catalog).current.feedback,undefined);
 }
 assert.throws(()=>difficultyBank(catalog,'unknown'),/difficulty/);
 assert.throws(()=>startQuizSession(difficultyBank(catalog,'umat'),{count:10}),/whole number/);
});

test('reasoning content fails closed on incomplete, duplicated, mislabelled or malformed banks',()=>{
 for(const mutate of [
  b=>b.questions.pop(),b=>b.questions[0].id='brain-001',b=>b.questions[0].difficulty='foundation',
  b=>b.questions[0].difficulty='challenge',b=>b.questions[0].position=2,
  b=>b.questions[0].options[1].text=b.questions[0].options[0].text,
  b=>b.questions[0].correctOptionId='E',b=>b.questions[0].explanation='',
  b=>b.questions[0].prompt='x'.repeat(2001),b=>b.schemaVersion='2.0',
 ]){const b=fixture();mutate(b);assert.throws(()=>createBrainBank(foundation,b),/Brain content/);}
 assert.throws(()=>createBrainBank(foundation,null),/Brain content/);
 assert.throws(()=>validateBank(foundation,{difficulty:'unknown'}),/difficulty/);
});

test('mixed-bank sessions cannot be started, restored or stored',()=>{
 const catalog=createBrainBank(foundation,fixture());
 assert.throws(()=>startQuizSession(catalog,{startId:'brain-320',count:2}),/one difficulty/);
 const raw=startQuizSession(difficultyBank(catalog,'umat'),{count:2,sessionId:'mixed'});
 raw.questionIds[1]='brain-challenge-001';raw.questionKeys['brain-challenge-001']=questionKey(catalog.questions[329]);
 assert.equal(normalizeQuizSession(raw,catalog),null);
 assert.throws(()=>createQuizStore({bank:catalog,storage:null}).start(raw),/invalid/);
});

test('a concurrent tab can move from UMAT to Challenge without reinterpreting IDs or leaking batch answers',()=>{
 const catalog=createBrainBank(foundation,fixture()),data=new Map();
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const first=createQuizStore({bank:catalog,storage}),second=createQuizStore({bank:catalog,storage});
 const umat=first.start(startQuizSession(difficultyBank(catalog,'umat'),{count:1,mode:'batch',sessionId:'umat'}));
 const challenge=second.start(startQuizSession(difficultyBank(catalog,'challenge'),{count:1,mode:'batch',sessionId:'challenge'}));
 const adopted=first.save({...umat,revision:1,choices:{'brain-umat-001':'A'}});
 assert.deepEqual(adopted,challenge);assert.equal(first.status(),'conflict');
 assert.equal(getQuizView(adopted,catalog).current.feedback,undefined);
 assert.equal(JSON.parse(storage.getItem(QUIZ_STORAGE_KEY)).sessionId,'challenge');
});


test('accepted original bank has 18 distinct prompts and exact nine-question pools',()=>{
 const accepted=JSON.parse(readFileSync(new URL('../../src/brain/reasoning-questions.json',import.meta.url)));
 const combined=createBrainBank(foundation,accepted);
 assert.equal(accepted.questions.length,18);
 assert.equal(new Set(accepted.questions.map(q=>q.prompt)).size,18);
 for(const difficulty of ['umat','challenge'])assert.equal(difficultyBank(combined,difficulty).questions.length,9);
});
